const IST_TIMEZONE = "Asia/Kolkata";

export function getTodayDateString(timezone = IST_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDisplayDate(date: string): string {
  const parsed = parseDateString(date);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed);
}

export function parseDateString(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function compareDateStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isDateWithinRange(
  date: string,
  startDate: string,
  endDate: string,
): boolean {
  return date >= startDate && date <= endDate;
}

export function isFutureDate(date: string, timezone = IST_TIMEZONE): boolean {
  return compareDateStrings(date, getTodayDateString(timezone)) > 0;
}

export { IST_TIMEZONE };
