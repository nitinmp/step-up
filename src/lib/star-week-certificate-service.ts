import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ActivityError, getChallengeWindow } from "@/lib/activities-service";
import { deleteBlobUrl, uploadBlob } from "@/lib/blob-storage";
import { mapStarWeekRow } from "@/lib/certificate-service";
import { CERTIFICATE_TYPES, weekTarget } from "@/lib/certificate-types";
import { formatDisplayDate } from "@/lib/dates";
import { parseDivision } from "@/lib/divisions";
import {
  computeParticipantBadges,
  type StarWeekBadge,
} from "@/lib/participant-badges";
import { loadScoringDataset } from "@/lib/scoring-dataset";
import {
  findUserCertificate,
  insertUserCertificate,
} from "@/lib/user-certificate-store";
import { renderStarWeekCertificate } from "@/lib/star-week-template";

export type StarWeekCertificateRecord = {
  id: string;
  weekNo: number;
  steps: number;
  imageUrl: string;
  generatedAt: string;
};

function formatWeekDateRange(startDate: string, endDate: string): string {
  const start = formatDisplayDate(startDate).replace(/, \d{4}$/, "");
  const end = formatDisplayDate(endDate).replace(/, \d{4}$/, "");
  return `${start} – ${end}`;
}

async function assertStarWeekWinner(
  userId: string,
  weekNo: number,
): Promise<StarWeekBadge> {
  const dataset = await loadScoringDataset();
  const badges = computeParticipantBadges(userId, dataset);
  const starWeek = badges.find(
    (badge): badge is StarWeekBadge =>
      badge.kind === "star_week" && badge.weekNo === weekNo,
  );

  if (!starWeek) {
    throw new ActivityError(
      "You have not earned Star of the Week for this week.",
      403,
    );
  }

  return starWeek;
}

function toRecord(
  row: ReturnType<typeof mapStarWeekRow>,
): StarWeekCertificateRecord {
  return {
    id: row.id,
    weekNo: row.weekNo,
    steps: row.steps,
    imageUrl: row.imageUrl,
    generatedAt: row.generatedAt,
  };
}

export async function ensureStarWeekCertificate(
  userId: string,
  weekNo: number,
): Promise<StarWeekCertificateRecord> {
  const starWeek = await assertStarWeekWinner(userId, weekNo);
  const target = weekTarget(weekNo);
  const existing = await findUserCertificate(
    userId,
    CERTIFICATE_TYPES.STAR_WEEK,
    target,
  );

  if (existing) {
    return toRecord(mapStarWeekRow(existing));
  }

  const db = getDb();
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

  await getChallengeWindow();

  const png = await renderStarWeekCertificate({
    recipientName: user.name,
    division: parseDivision(user.division),
    weekNo,
    dateRange: formatWeekDateRange(starWeek.startDate, starWeek.endDate),
    steps: starWeek.steps,
  });

  const pathname = `certificates/star-week/${userId}/week-${weekNo}.png`;
  const blob = await uploadBlob(pathname, png, "image/png", {
    allowOverwrite: true,
  });

  const record = await insertUserCertificate({
    userId,
    certificateType: CERTIFICATE_TYPES.STAR_WEEK,
    target,
    imageUrl: blob.url,
    recipientName: user.name,
    division: parseDivision(user.division),
    steps: starWeek.steps,
  });

  if (!record) {
    await deleteBlobUrl(blob.url);
    throw new ActivityError("Could not save Star of the Week certificate.", 500);
  }

  return toRecord(mapStarWeekRow(record));
}
