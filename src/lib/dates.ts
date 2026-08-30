/**
 * All scheduling math works on plain calendar dates ("YYYY-MM-DD" strings) so it
 * never drifts with the server's UTC clock. "Today" is resolved in the app's
 * configured timezone (APP_TIMEZONE, default Asia/Dhaka).
 */

export const APP_TZ =
  process.env.APP_TIMEZONE ||
  process.env.NEXT_PUBLIC_APP_TIMEZONE ||
  "Asia/Dhaka";

export type ISODate = string; // "YYYY-MM-DD"

/** Current calendar date in the app timezone, as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Add (or subtract) whole days to an ISO date, returning an ISO date. */
export function addDaysISO(iso: ISODate, days: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Day of week for an ISO date. 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isSaturday(iso: ISODate): boolean {
  return weekdayOf(iso) === 6;
}

/**
 * The coming Saturday relative to `iso`. If `iso` is already a Saturday, this
 * returns the *next* Saturday (7 days out) — overdue items rolled forward on a
 * Saturday should not immediately reappear that same day.
 */
export function comingSaturdayISO(iso: ISODate): ISODate {
  const wd = weekdayOf(iso);
  const delta = ((6 - wd + 7) % 7) || 7;
  return addDaysISO(iso, delta);
}

/** "HH:MM:SS" or "HH:MM" -> "HH:MM". */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}

/** Minutes since midnight for an "HH:MM[:SS]" string. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Human label like "Sat, 30 Aug". */
export function formatShort(iso: ISODate): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
