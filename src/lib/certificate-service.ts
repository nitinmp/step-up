import { ActivityError, getChallengeWindow } from "@/lib/activities-service";
import {
  CERTIFICATE_TYPES,
  certificateTypeToKind,
  parseWeekTarget,
  weekTarget,
} from "@/lib/certificate-types";
import type { Division } from "@/lib/divisions";
import { parseDivision } from "@/lib/divisions";
import {
  findUserCertificate,
  findUserCertificateById,
  insertUserCertificate,
  listUserCertificatesByType,
  rowDivision,
  type UserCertificateRow,
} from "@/lib/user-certificate-store";
import { getEligibleWeekNumbers } from "@/lib/week-progress-certificate-service";

export type StarDayCertificate = {
  kind: "star-day";
  id: string;
  activityDate: string;
  division: Division;
  steps: number;
  imageUrl: string;
};

export type WeekProgressCertificate = {
  kind: "week-progress";
  id: string;
  weekNo: number;
  imageUrl: string;
  daysMet: number;
  totalDays: number;
  totalSteps: number;
  totalDistanceKm: number;
  generatedAt: string;
};

export type StarWeekCertificate = {
  kind: "star-week";
  id: string;
  weekNo: number;
  steps: number;
  imageUrl: string;
  generatedAt: string;
};

export type ParticipantCertificate =
  | StarDayCertificate
  | WeekProgressCertificate
  | StarWeekCertificate;

export type ParticipantCertificatesPayload = {
  starDay: StarDayCertificate[];
  weekProgress: WeekProgressCertificate[];
  eligibleWeeks: number[];
};

function mapStarDayRow(row: UserCertificateRow): StarDayCertificate {
  return {
    kind: "star-day",
    id: row.id,
    activityDate: row.target,
    division: rowDivision(row),
    steps: row.steps ?? 0,
    imageUrl: row.imageUrl,
  };
}

export function mapWeekProgressRow(row: UserCertificateRow): WeekProgressCertificate {
  return {
    kind: "week-progress",
    id: row.id,
    weekNo: parseWeekTarget(row.target),
    imageUrl: row.imageUrl,
    daysMet: row.metadata?.daysMet ?? 0,
    totalDays: row.metadata?.totalDays ?? 0,
    totalSteps: row.metadata?.totalSteps ?? row.steps ?? 0,
    totalDistanceKm: row.metadata?.totalDistanceKm ?? 0,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export function mapStarWeekRow(row: UserCertificateRow): StarWeekCertificate {
  return {
    kind: "star-week",
    id: row.id,
    weekNo: parseWeekTarget(row.target),
    steps: row.steps ?? 0,
    imageUrl: row.imageUrl,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export function mapRowToParticipantCertificate(
  row: UserCertificateRow,
): ParticipantCertificate {
  const kind = certificateTypeToKind(row.certificateType);
  if (kind === "star-day") {
    return mapStarDayRow(row);
  }
  if (kind === "star-week") {
    return mapStarWeekRow(row);
  }
  return mapWeekProgressRow(row);
}

export async function listStarDayCertificates(
  userId: string,
): Promise<StarDayCertificate[]> {
  const rows = await listUserCertificatesByType(
    userId,
    CERTIFICATE_TYPES.STAR_DAY,
  );
  return rows
    .map(mapStarDayRow)
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
}

export async function getParticipantStarCertificateDates(
  userId: string,
): Promise<string[]> {
  const rows = await listUserCertificatesByType(
    userId,
    CERTIFICATE_TYPES.STAR_DAY,
  );
  return rows.map((row) => row.target);
}

export async function getStarDayCertificate(
  userId: string,
  certificateId: string,
): Promise<StarDayCertificate | null> {
  const row = await findUserCertificateById(userId, certificateId);
  if (!row || row.certificateType !== CERTIFICATE_TYPES.STAR_DAY) {
    return null;
  }

  return mapStarDayRow(row);
}

export async function loadWeekProgressCertificate(
  userId: string,
  weekNo: number,
): Promise<WeekProgressCertificate> {
  const { ensureWeekProgressCertificate } = await import(
    "@/lib/week-progress-certificate-service"
  );
  const certificate = await ensureWeekProgressCertificate(userId, weekNo);
  return {
    ...certificate,
    kind: "week-progress",
  };
}

export async function loadStarWeekCertificate(
  userId: string,
  weekNo: number,
): Promise<StarWeekCertificate> {
  const { ensureStarWeekCertificate } = await import(
    "@/lib/star-week-certificate-service"
  );
  const certificate = await ensureStarWeekCertificate(userId, weekNo);
  return {
    ...certificate,
    kind: "star-week",
  };
}

export async function loadParticipantCertificates(input: {
  userId: string;
  ensureWeeks?: boolean;
}): Promise<ParticipantCertificatesPayload> {
  const { days, today } = await getChallengeWindow();
  const eligibleWeeks = getEligibleWeekNumbers(days, today);

  const starDay = await listStarDayCertificates(input.userId);

  let weekProgress: WeekProgressCertificate[];
  if (input.ensureWeeks) {
    const { ensureEligibleWeekProgressCertificates } = await import(
      "@/lib/week-progress-certificate-service"
    );
    const rows = await ensureEligibleWeekProgressCertificates(input.userId);
    weekProgress = rows.map((row) => ({ ...row, kind: "week-progress" as const }));
  } else {
    const rows = await listUserCertificatesByType(
      input.userId,
      CERTIFICATE_TYPES.WEEK_PROGRESS,
    );
    weekProgress = rows.map(mapWeekProgressRow);
  }

  return {
    starDay,
    weekProgress,
    eligibleWeeks,
  };
}

/** @deprecated Use listStarDayCertificates */
export async function getParticipantCertificates(
  userId: string,
): Promise<StarDayCertificate[]> {
  return listStarDayCertificates(userId);
}

export { findUserCertificate, insertUserCertificate, weekTarget };
