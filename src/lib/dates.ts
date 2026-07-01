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

export function addDaysToDateString(date: string, days: number): string {
  const parsed = parseDateString(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function isLoggableChallengeDate(
  date: string,
  startDate: string,
  endDate: string,
  options: {
    timezone?: string;
    allowOpenChallengeLogging?: boolean;
  } = {},
): boolean {
  if (!isDateWithinRange(date, startDate, endDate)) {
    return false;
  }

  if (options.allowOpenChallengeLogging) {
    return true;
  }

  const timezone = options.timezone ?? IST_TIMEZONE;
  return date === getTodayDateString(timezone);
}

/** Today and the previous `lookbackDays` calendar dates (default: 3-day window). */
export function getAdminLoggableDateCandidates(
  today: string,
  lookbackDays = 2,
): string[] {
  const dates: string[] = [];
  for (let offset = 0; offset <= lookbackDays; offset += 1) {
    dates.push(addDaysToDateString(today, -offset));
  }
  return dates;
}

export function isAdminLoggableDate(
  date: string,
  today: string,
  startDate: string,
  endDate: string,
  lookbackDays = 2,
): boolean {
  return (
    getAdminLoggableDateCandidates(today, lookbackDays).includes(date) &&
    isDateWithinRange(date, startDate, endDate)
  );
}

export { IST_TIMEZONE };
