import { addDays, addMinutes, addMonths } from "./shared/dates";
import { CliError } from "./ui";

/**
 * "+30s" seconds · "+10m" minutes · "+2h" hours · "+3d" days · "+1w" weeks · "+3mo" months · "+1y" years
 * "now", or a date like "2027-03-30" / "2027-03-30 17:00" (your local time).
 * Months and years are calendar months, never a fixed 30/365 days (brief.md 8.5).
 * Relative times are exact — the web calendar rounds to 5 minutes, but "+1m" here means one minute.
 */
export function parseWhen(input: string, from = new Date()): Date | null {
  const s = input.trim().toLowerCase();
  if (s === "now" || s === "confirm") return null;
  const rel = s.match(/^\+?(\d+)\s*(s|m|min|h|d|w|mo|y)$/);
  if (rel) {
    const n = Number(rel[1]);
    switch (rel[2]) {
      case "s": return new Date(from.getTime() + n * 1000);
      case "m":
      case "min": return addMinutes(from, n);
      case "h": return addMinutes(from, n * 60);
      case "d": return addDays(from, n);
      case "w": return addDays(from, n * 7);
      case "mo": return addMonths(from, n);
      case "y": return addMonths(from, n * 12);
    }
  }
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) return d;
  throw new CliError(`Can't read "${input}" as a date.`, 'Try +30s, +10m, +2h, +3d, +1w, +3mo, +1y, or 2027-03-30 17:00. ("m" is minutes, "mo" is months.)');
}

/** Same as parseWhen, but relative to an anchor (e.g. a cliff/end measured from the start). */
export const parseWhenFrom = (input: string, anchor: Date | null) => parseWhen(input, anchor ?? new Date());
