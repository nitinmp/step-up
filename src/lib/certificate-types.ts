export const CERTIFICATE_TYPES = {
  STAR_DAY: "star_day",
  STAR_WEEK: "star_week",
  WEEK_PROGRESS: "week_progress",
} as const;

export type CertificateType =
  (typeof CERTIFICATE_TYPES)[keyof typeof CERTIFICATE_TYPES];

export type CertificateMetadata = {
  daysMet?: number;
  totalDays?: number;
  totalSteps?: number;
  totalDistanceKm?: number;
  weekPoints?: number;
  templateVersion?: number;
};

export function weekTarget(weekNo: number): string {
  return String(weekNo);
}

export function parseWeekTarget(target: string): number {
  return Number.parseInt(target, 10);
}

export function isCertificateType(value: string): value is CertificateType {
  return (
    value === CERTIFICATE_TYPES.STAR_DAY ||
    value === CERTIFICATE_TYPES.STAR_WEEK ||
    value === CERTIFICATE_TYPES.WEEK_PROGRESS
  );
}

export function certificateTypeToKind(
  type: CertificateType,
): "star-day" | "star-week" | "week-progress" {
  if (type === CERTIFICATE_TYPES.STAR_DAY) {
    return "star-day";
  }
  if (type === CERTIFICATE_TYPES.STAR_WEEK) {
    return "star-week";
  }
  return "week-progress";
}

export function kindToCertificateType(
  kind: "star-day" | "star-week" | "week-progress",
): CertificateType {
  if (kind === "star-day") {
    return CERTIFICATE_TYPES.STAR_DAY;
  }
  if (kind === "star-week") {
    return CERTIFICATE_TYPES.STAR_WEEK;
  }
  return CERTIFICATE_TYPES.WEEK_PROGRESS;
}
