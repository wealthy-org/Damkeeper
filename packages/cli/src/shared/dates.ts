// Calendar arithmetic for the create-flow date pickers. Months are added as
// calendar months (31 Jan + 1 month = 28/29 Feb), never as a fixed 30 days —
// brief.md 8.5: "jangan menganggap setiap bulan memiliki durasi yang sama".

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

export function addMonths(d: Date, months: number) {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + months);
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, lastDay));
  return x;
}

/** Next 5-minute mark strictly after `d`, seconds zeroed. */
export function roundUpToStep(d: Date, stepMinutes = 5) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  const next = Math.floor(x.getMinutes() / stepMinutes) * stepMinutes + stepMinutes;
  x.setMinutes(next);
  return x;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toUnixSeconds(d: Date) {
  return BigInt(Math.floor(d.getTime() / 1000));
}

export function formatLocal(d: Date) {
  const text = d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const tz = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  return tz ? `${text} ${tz}` : text;
}

export function formatUtc(d: Date) {
  return `${d.toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} UTC`;
}

export function formatShort(d: Date) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function relativeFromNow(d: Date, now = new Date()) {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 45 * day) return rtf.format(Math.round(diff / day), "day");
  if (abs < 365 * day) return rtf.format(Math.round(diff / (30.44 * day)), "month");
  return rtf.format(Math.round((diff / (365.25 * day)) * 10) / 10, "year");
}
