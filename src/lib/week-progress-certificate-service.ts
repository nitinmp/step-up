import { ActivityError, getChallengeWindow } from "@/lib/activities-service";
import { deleteBlobUrl, uploadBlob } from "@/lib/blob-storage";
import { mapWeekProgressRow } from "@/lib/certificate-service";
import { CERTIFICATE_TYPES, weekTarget } from "@/lib/certificate-types";
import { compareDateStrings } from "@/lib/dates";
import {
  findUserCertificate,
  insertUserCertificate,
  listUserCertificatesByType,
  updateUserCertificate,
} from "@/lib/user-certificate-store";
import {
  renderWeekProgressCertificate,
  WEEK_PROGRESS_TEMPLATE_VERSION,
} from "@/lib/week-progress-template";
import { computeWeekProgressReportData } from "@/lib/week-progress-stats";

export type WeekProgressCertificateRecord = {
  id: string;
  weekNo: number;
  imageUrl: string;
  daysMet: number;
  totalDays: number;
  totalSteps: number;
  totalDistanceKm: number;
  generatedAt: string;
};

function getCurrentWeekNo(
  days: Array<{ date: string; weekNo: number }>,
  today: string,
): number {
  return (
    days.find((day) => day.date === today)?.weekNo ??
    days.filter((day) => day.date <= today).at(-1)?.weekNo ??
    1
  );
}

function getWeekStatus(
  weekNo: number,
  currentWeekNo: number,
  weekStart: string,
  today: string,
): "completed" | "current" | "upcoming" {
  if (weekNo < currentWeekNo) {
    return "completed";
  }

  if (weekNo === currentWeekNo || weekStart <= today) {
    return "current";
  }

  return "upcoming";
}

export function getEligibleWeekNumbers(
  days: Array<{ date: string; weekNo: number }>,
  today: string,
): number[] {
  const currentWeekNo = getCurrentWeekNo(days, today);
  const weekStarts = new Map<number, string>();

  for (const day of days) {
    const existing = weekStarts.get(day.weekNo);
    if (!existing || compareDateStrings(day.date, existing) < 0) {
      weekStarts.set(day.weekNo, day.date);
    }
  }

  return [1, 2, 3, 4].filter((weekNo) => {
    const weekStart = weekStarts.get(weekNo);
    if (!weekStart) {
      return false;
    }

    return (
      getWeekStatus(weekNo, currentWeekNo, weekStart, today) !== "upcoming"
    );
  });
}

function toRecord(
  row: ReturnType<typeof mapWeekProgressRow>,
): WeekProgressCertificateRecord {
  return {
    id: row.id,
    weekNo: row.weekNo,
    imageUrl: row.imageUrl,
    daysMet: row.daysMet,
    totalDays: row.totalDays,
    totalSteps: row.totalSteps,
    totalDistanceKm: row.totalDistanceKm,
    generatedAt: row.generatedAt,
  };
}

export async function listWeekProgressCertificates(
  userId: string,
): Promise<WeekProgressCertificateRecord[]> {
  const rows = await listUserCertificatesByType(
    userId,
    CERTIFICATE_TYPES.WEEK_PROGRESS,
  );

  return rows
    .map((row) => toRecord(mapWeekProgressRow(row)))
    .sort((a, b) => b.weekNo - a.weekNo);
}

function weekProgressNeedsRegeneration(
  existing: Awaited<ReturnType<typeof findUserCertificate>>,
  stats: Awaited<ReturnType<typeof computeWeekProgressReportData>>,
): boolean {
  if (!existing) {
    return true;
  }

  const metadata = existing.metadata;
  if (metadata?.templateVersion !== WEEK_PROGRESS_TEMPLATE_VERSION) {
    return true;
  }

  return (
    metadata.daysMet !== stats.daysMet ||
    metadata.totalDays !== stats.totalDays ||
    metadata.totalSteps !== stats.totalSteps ||
    metadata.totalDistanceKm !== stats.totalDistanceKm ||
    metadata.weekPoints !== stats.weekPoints
  );
}

async function saveWeekProgressCertificate(
  userId: string,
  weekNo: number,
  target: string,
  stats: Awaited<ReturnType<typeof computeWeekProgressReportData>>,
  existing: Awaited<ReturnType<typeof findUserCertificate>>,
): Promise<NonNullable<Awaited<ReturnType<typeof findUserCertificate>>>> {
  const png = await renderWeekProgressCertificate(stats);
  const pathname = `certificates/week-progress/${userId}/week-${weekNo}.png`;
  const blob = await uploadBlob(pathname, png, "image/png", {
    allowOverwrite: true,
  });

  const metadata = {
    daysMet: stats.daysMet,
    totalDays: stats.totalDays,
    totalSteps: stats.totalSteps,
    totalDistanceKm: stats.totalDistanceKm,
    weekPoints: stats.weekPoints,
    templateVersion: WEEK_PROGRESS_TEMPLATE_VERSION,
  };

  if (existing) {
    const record = await updateUserCertificate(existing.id, {
      imageUrl: blob.url,
      recipientName: stats.recipientName,
      division: stats.division,
      steps: stats.totalSteps,
      metadata,
    });

    if (!record) {
      await deleteBlobUrl(blob.url);
      throw new ActivityError("Could not save progress report.", 500);
    }

    return record;
  }

  const record = await insertUserCertificate({
    userId,
    certificateType: CERTIFICATE_TYPES.WEEK_PROGRESS,
    target,
    imageUrl: blob.url,
    recipientName: stats.recipientName,
    division: stats.division,
    steps: stats.totalSteps,
    metadata,
  });

  if (!record) {
    await deleteBlobUrl(blob.url);
    throw new ActivityError("Could not save progress report.", 500);
  }

  return record;
}

export async function ensureWeekProgressCertificate(
  userId: string,
  weekNo: number,
): Promise<WeekProgressCertificateRecord> {
  const target = weekTarget(weekNo);
  const existing = await findUserCertificate(
    userId,
    CERTIFICATE_TYPES.WEEK_PROGRESS,
    target,
  );

  const stats = await computeWeekProgressReportData(userId, weekNo);

  if (existing && !weekProgressNeedsRegeneration(existing, stats)) {
    return toRecord(mapWeekProgressRow(existing));
  }

  const record = await saveWeekProgressCertificate(
    userId,
    weekNo,
    target,
    stats,
    existing,
  );

  return toRecord(mapWeekProgressRow(record));
}

export async function ensureEligibleWeekProgressCertificates(
  userId: string,
): Promise<WeekProgressCertificateRecord[]> {
  const { days, today } = await getChallengeWindow();
  const eligibleWeeks = getEligibleWeekNumbers(days, today);

  const certificates = await Promise.all(
    eligibleWeeks.map((weekNo) => ensureWeekProgressCertificate(userId, weekNo)),
  );

  return certificates.sort((a, b) => b.weekNo - a.weekNo);
}
