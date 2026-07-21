import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activities, users } from "@/db/schema";
import { ActivityError, getChallengeWindow } from "@/lib/activities-service";
import { deleteBlobUrl, uploadBlob } from "@/lib/blob-storage";
import { CERTIFICATE_TYPES, weekTarget } from "@/lib/certificate-types";
import { parseDivision } from "@/lib/divisions";
import { compareDateStrings, formatDisplayDate, weekdayShortLabel } from "@/lib/dates";
import {
  findUserCertificate,
  insertUserCertificate,
  listUserCertificatesByType,
  updateUserCertificate,
} from "@/lib/user-certificate-store";
import { mapWeekProgressRow } from "@/lib/certificate-service";
import {
  renderWeekProgressCertificate,
  WEEK_PROGRESS_TEMPLATE_VERSION,
} from "@/lib/week-progress-template";

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

function formatTargetBand(minTarget: number, maxTarget: number): string {
  if (minTarget === maxTarget) {
    return `${(minTarget / 1000).toFixed(0)}k`;
  }

  return `${(minTarget / 1000).toFixed(0)}k–${(maxTarget / 1000).toFixed(0)}k`;
}

function formatWeekDateRange(startDate: string, endDate: string): string {
  const start = formatDisplayDate(startDate).replace(/, \d{4}$/, "");
  const end = formatDisplayDate(endDate).replace(/, \d{4}$/, "");
  return `${start} – ${end}`;
}

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

async function computeWeekProgressStats(
  userId: string,
  weekNo: number,
): Promise<{
  recipientName: string;
  division: ReturnType<typeof parseDivision>;
  weekNo: number;
  dateRange: string;
  targetLabel: string;
  daysMet: number;
  totalDays: number;
  totalSteps: number;
  totalDistanceKm: number;
  dailySteps: Array<{
    label: string;
    steps: number;
    targetSteps: number;
    metTarget: boolean;
  }>;
}> {
  const db = getDb();
  const { days, today } = await getChallengeWindow();
  const weekDays = days.filter((day) => day.weekNo === weekNo);

  if (weekDays.length === 0) {
    throw new ActivityError("Challenge week not found.", 404);
  }

  const sortedWeekDays = [...weekDays].sort((a, b) =>
    compareDateStrings(a.date, b.date),
  );
  const weekStart = sortedWeekDays[0]!.date;
  const weekEnd = sortedWeekDays.at(-1)!.date;
  const currentWeekNo = getCurrentWeekNo(days, today);
  const status = getWeekStatus(weekNo, currentWeekNo, weekStart, today);

  if (status === "upcoming") {
    throw new ActivityError(
      "Progress reports are available once the week has started.",
      400,
    );
  }

  const [user] = await db
    .select({
      name: users.name,
      division: users.division,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new ActivityError("User not found.", 404);
  }

  const dayMap = new Map(sortedWeekDays.map((day) => [day.date, day]));
  const approvedActivities = await db
    .select({
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
    })
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.status, "approved"),
      ),
    );

  let totalSteps = 0;
  let totalDistanceKm = 0;
  const stepsByDate = new Map<string, number>();

  for (const activity of approvedActivities) {
    const day = dayMap.get(activity.activityDate);
    if (!day) {
      continue;
    }

    totalSteps += activity.steps;
    totalDistanceKm += Number(activity.distanceKm);
    stepsByDate.set(
      activity.activityDate,
      (stepsByDate.get(activity.activityDate) ?? 0) + activity.steps,
    );
  }

  const dailySteps = sortedWeekDays.map((day) => {
    const steps = stepsByDate.get(day.date) ?? 0;
    return {
      label: weekdayShortLabel(day.date),
      steps,
      targetSteps: day.targetSteps,
      metTarget: steps >= day.targetSteps,
    };
  });

  const daysMet = dailySteps.filter((day) => day.metTarget).length;

  const targets = sortedWeekDays.map((day) => day.targetSteps);
  const minTarget = Math.min(...targets);
  const maxTarget = Math.max(...targets);

  return {
    recipientName: user.name,
    division: parseDivision(user.division),
    weekNo,
    dateRange: formatWeekDateRange(weekStart, weekEnd),
    targetLabel: formatTargetBand(minTarget, maxTarget),
    daysMet,
    totalDays: sortedWeekDays.length,
    totalSteps,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    dailySteps,
  };
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
  stats: Awaited<ReturnType<typeof computeWeekProgressStats>>,
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
    metadata.totalDistanceKm !== stats.totalDistanceKm
  );
}

async function saveWeekProgressCertificate(
  userId: string,
  weekNo: number,
  target: string,
  stats: Awaited<ReturnType<typeof computeWeekProgressStats>>,
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

  const stats = await computeWeekProgressStats(userId, weekNo);

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
