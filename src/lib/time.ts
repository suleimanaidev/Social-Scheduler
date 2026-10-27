/**
 * Time helpers.
 *
 * - Database timestamps are always stored in UTC (ISO 8601 with Z).
 * - The user-facing calendar/composer uses Asia/Karachi.
 *
 * Pakistan does not currently observe daylight saving time, so the offset is a
 * fixed +05:00. The offset is still computed via Intl so the code stays correct
 * if the region ever reintroduces DST.
 */

export const DISPLAY_TIMEZONE = "Asia/Karachi";

/** Offset (in ms) to add to a UTC instant to get Karachi wall time. */
function karachiOffsetMs(date: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour % 24,
    map.minute,
    map.second,
  );
  return asUtc - date.getTime();
}

/**
 * Convert a Karachi wall-clock datetime string (as produced by
 * `<input type="datetime-local">`, e.g. "2026-10-31T14:30") into a UTC ISO string.
 */
export function karachiToUTC(localDateTime: string): string {
  const d = new Date(localDateTime); // parsed as browser/server local time
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const h = d.getHours();
  const mi = d.getMinutes();

  // Build the wall time as if it were UTC, then subtract the Karachi offset.
  const wallAsUtc = Date.UTC(y, m, day, h, mi, 0, 0);
  const offset = karachiOffsetMs(new Date(wallAsUtc));
  return new Date(wallAsUtc - offset).toISOString();
}

/** Format a UTC ISO string for display in Asia/Karachi. */
export function formatKarachi(
  utcISO: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (!utcISO) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(new Date(utcISO));
}

/** Convert a UTC ISO string to a `datetime-local` input value in Karachi time. */
export function toKarachiInputValue(utcISO: string | null | undefined): string {
  if (!utcISO) return "";
  const d = new Date(utcISO);
  const offset = karachiOffsetMs(d);
  const local = new Date(d.getTime() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(
    local.getUTCDate(),
  )}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** Group a UTC instant into a YYYY-MM-DD key in Karachi time (for the calendar). */
export function karachiDayKey(utcISO: string | null | undefined): string {
  if (!utcISO) return "";
  const d = new Date(utcISO);
  const offset = karachiOffsetMs(d);
  const local = new Date(d.getTime() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(
    local.getUTCDate(),
  )}`;
}
