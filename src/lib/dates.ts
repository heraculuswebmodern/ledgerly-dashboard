/**
 * Date formatting. Ledger dates (posting days) are shown in UTC so that a transaction's
 * displayed day always matches the day used by filters and exports. Event timestamps
 * (timelines, notifications) are shown in the viewer's local time.
 */

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const shortFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toDate(value: string) {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
}

export const formatDate = (value: string) => dateFmt.format(toDate(value));
export const formatShortDate = (value: string) => shortFmt.format(toDate(value));
export const formatWeekdayDate = (value: string) => weekdayFmt.format(toDate(value));
export const formatDateTime = (value: string) => dateTimeFmt.format(toDate(value));

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function formatRelative(value: string, now = Date.now()): string {
  const diffSeconds = Math.round((toDate(value).getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86_400 * 30) return relative.format(Math.round(diffSeconds / 86_400), "day");
  return formatDate(value);
}

/** "Today", "Tomorrow", "In 3 days" for a YYYY-MM-DD due date. */
export function formatDueIn(day: string, today = new Date().toISOString().slice(0, 10)): string {
  const days = Math.round((toDate(day).getTime() - toDate(today).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
