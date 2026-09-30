"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { formatLocal, formatUtc, relativeFromNow, roundUpToStep, sameDay, startOfDay } from "@/lib/dates";

export interface DatePreset {
  label: string;
  get: () => Date | null;
}

interface Props {
  id: string;
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  /** Earliest selectable moment. Days entirely before it are disabled. */
  min?: Date | null;
  presets?: DatePreset[];
  /** When set, an empty value is valid and is shown with this text (e.g. "No cliff"). */
  emptyLabel?: string;
  placeholder?: string;
  error?: string | null;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

export function DateTimePicker({ id, label, value, onChange, min, presets, emptyLabel, placeholder, error }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => monthStart(value ?? new Date()));
  const [popStyle, setPopStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // The popover is position: fixed so it can extend past a scrolling container
  // (e.g. the create modal's body) instead of being clipped by it. It stays in
  // this component's DOM, so inside a modal <dialog> it's still interactive.
  useLayoutEffect(() => {
    if (!open) {
      setPopStyle({ visibility: "hidden" });
      return;
    }
    const place = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const pop = popRef.current;
      if (!anchor || !pop) return;
      const gap = 6;
      const margin = 8;
      const width = Math.min(320, window.innerWidth - margin * 2);
      const height = pop.offsetHeight;
      const below = window.innerHeight - anchor.bottom - gap - margin;
      const above = anchor.top - gap - margin;
      const top =
        height <= below || below >= above
          ? Math.min(anchor.bottom + gap, window.innerHeight - margin - height)
          : Math.max(margin, anchor.top - gap - height);
      const left = Math.min(Math.max(margin, anchor.left), window.innerWidth - margin - width);
      setPopStyle({ top: Math.max(margin, top), left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) setView(monthStart(value ?? min ?? new Date()));
    // Re-centre the calendar on the current value each time it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const today = new Date();
  const minDay = min ? startOfDay(min) : null;

  function clampToMin(d: Date) {
    if (min && d.getTime() < min.getTime()) return roundUpToStep(min);
    return d;
  }

  function pickDay(day: Date) {
    const base = value ?? roundUpToStep(min ?? new Date());
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    onChange(clampToMin(next));
  }

  function setTime(hours: number, minutes: number) {
    const base = value ?? roundUpToStep(min ?? new Date());
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    onChange(clampToMin(next));
  }

  function applyPreset(p: DatePreset) {
    onChange(p.get());
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  }

  const cells = monthCells(view);
  const triggerText = value ? formatLocal(value) : emptyLabel ?? placeholder ?? "Pick a date";
  const minuteValue = value ? Math.floor(value.getMinutes() / 5) * 5 : 0;

  return (
    <div className="field" ref={rootRef} onKeyDown={onKeyDown}>
      <label className="field-label" htmlFor={id}>{label}</label>

      <div className="dtp-anchor" ref={anchorRef}>
      <button
        id={id}
        type="button"
        className="dtp-trigger"
        data-empty={!value}
        data-invalid={Boolean(error)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg>
        <span>{triggerText}</span>
      </button>

      {open && (
        <div className="dtp-pop" ref={popRef} style={popStyle} role="dialog" aria-label={`Choose ${label.toLowerCase()}`}>
          {presets && presets.length > 0 && (
            <div className="dtp-presets" role="group" aria-label="Quick picks">
              {presets.map((p) => {
                const preview = p.get();
                const active = preview === null ? value === null : value !== null && Math.abs(preview.getTime() - value.getTime()) < 60_000 * 5;
                return (
                  <button key={p.label} type="button" className="dtp-chip" aria-pressed={active} onClick={() => applyPreset(p)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="dtp-head">
            <button type="button" className="dtp-nav" aria-label="Previous month" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}>
              ‹
            </button>
            <span>{view.toLocaleString("en-GB", { month: "long", year: "numeric" })}</span>
            <button type="button" className="dtp-nav" aria-label="Next month" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}>
              ›
            </button>
          </div>

          <div className="dtp-grid" role="grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dtp-wd" role="columnheader">{w}</span>
            ))}
            {cells.map((day) => {
              const outside = day.getMonth() !== view.getMonth();
              const disabled = minDay !== null && day.getTime() < minDay.getTime();
              const selected = value !== null && sameDay(day, value);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  role="gridcell"
                  className="dtp-day"
                  data-outside={outside}
                  data-today={sameDay(day, today)}
                  aria-selected={selected}
                  disabled={disabled}
                  aria-label={day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  onClick={() => pickDay(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="dtp-time">
            <span>Time</span>
            <select
              aria-label="Hour"
              value={value ? value.getHours() : ""}
              onChange={(e) => setTime(Number(e.target.value), minuteValue)}
            >
              {!value && <option value="" disabled>--</option>}
              {HOURS.map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
            <b>:</b>
            <select
              aria-label="Minute"
              value={value ? minuteValue : ""}
              onChange={(e) => setTime(value ? value.getHours() : roundUpToStep(min ?? new Date()).getHours(), Number(e.target.value))}
            >
              {!value && <option value="" disabled>--</option>}
              {MINUTES.map((m) => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </select>
            <small>local time</small>
          </div>

          <div className="dtp-foot">
            {emptyLabel ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onChange(null); setOpen(false); }}>
                {emptyLabel}
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
      </div>

      {error ? (
        <p className="field-note" style={{ color: "var(--danger)" }}>{error}</p>
      ) : value ? (
        <p className="field-note">
          {formatUtc(value)} · {relativeFromNow(value)}
        </p>
      ) : null}
    </div>
  );
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 6 weeks, Monday-first, covering the month of `view`. */
function monthCells(view: Date) {
  const offset = (view.getDay() + 6) % 7;
  const first = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
}
