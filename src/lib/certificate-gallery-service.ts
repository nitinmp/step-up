import { getChallengeWindow } from "@/lib/activities-service";
import { listStarDayCertificates } from "@/lib/certificate-service";
import { CERTIFICATE_TYPES, parseWeekTarget } from "@/lib/certificate-types";
import { formatDisplayDate } from "@/lib/dates";
import { computeParticipantBadges } from "@/lib/participant-badges";
import { listGeneratedWeekTargets } from "@/lib/user-certificate-store";
import { getEligibleWeekNumbers } from "@/lib/week-progress-certificate-service";
import { loadScoringDataset } from "@/lib/scoring-dataset";

export type CertificateGalleryItemKind =
  | "week-progress"
  | "star-day"
  | "star-week";

export type CertificateGalleryItem = {
  id: string;
  kind: CertificateGalleryItemKind;
  emoji: string;
  name: string;
  subtitle: string;
  detail?: string;
  weekNo?: number;
  activityDate?: string;
  accent: "gold" | "brand" | "amber";
  sortKey: string;
};

export type CertificateGalleryPayload = {
  items: CertificateGalleryItem[];
};

export async function getCertificateGallery(
  userId: string,
): Promise<CertificateGalleryPayload> {
  const { days, today } = await getChallengeWindow();
  const eligibleWeeks = getEligibleWeekNumbers(days, today);

  const [starDay, dataset, existingWeekReportTargets] = await Promise.all([
    listStarDayCertificates(userId),
    loadScoringDataset(),
    listGeneratedWeekTargets(userId, CERTIFICATE_TYPES.WEEK_PROGRESS),
  ]);

  const badges = computeParticipantBadges(userId, dataset);
  const starWeeks = badges.filter((badge) => badge.kind === "star_week");
  const generatedWeekSet = new Set(
    existingWeekReportTargets.map((target) => parseWeekTarget(target)),
  );

  const items: CertificateGalleryItem[] = [];

  for (const certificate of starDay) {
    items.push({
      id: certificate.id,
      kind: "star-day",
      emoji: "⭐",
      name: "Star of the Day",
      subtitle: formatDisplayDate(certificate.activityDate),
      detail: `${certificate.steps.toLocaleString("en-IN")} steps`,
      activityDate: certificate.activityDate,
      accent: "gold",
      sortKey: certificate.activityDate,
    });
  }

  for (const badge of starWeeks) {
    items.push({
      id: `star-week-${badge.weekNo}`,
      kind: "star-week",
      emoji: "🏆",
      name: "Star of the Week",
      subtitle: `Week ${badge.weekNo}`,
      detail: `${badge.steps.toLocaleString("en-IN")} steps`,
      weekNo: badge.weekNo,
      accent: "gold",
      sortKey: badge.endDate,
    });
  }

  for (const weekNo of eligibleWeeks) {
    items.push({
      id: `week-progress-${weekNo}`,
      kind: "week-progress",
      emoji: "📊",
      name: "Progress report",
      subtitle: `Week ${weekNo}`,
      detail: generatedWeekSet.has(weekNo) ? "Ready to view" : "Tap to generate",
      weekNo,
      accent: "amber",
      sortKey: `week-${String(weekNo).padStart(2, "0")}`,
    });
  }

  items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return { items };
}
