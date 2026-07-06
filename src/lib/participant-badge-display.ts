import type { ParticipantBadge } from "@/lib/participant-badges";
import { formatDisplayDate } from "@/lib/dates";

export type BadgeAchievementDisplay = {
  id: string;
  name: string;
  subtitle: string;
  detail?: string;
  points?: number;
  emoji: string;
  achievedAt: string | null;
  accent: "gold" | "brand" | "muted";
  progress?: number;
  isRare?: boolean;
};

export function participantBadgeToDisplay(
  badge: ParticipantBadge,
): BadgeAchievementDisplay {
  if (badge.kind === "star_day") {
    return {
      id: `day:${badge.date}`,
      name: "Star of the Day",
      subtitle: formatDisplayDate(badge.date),
      detail: `${badge.steps.toLocaleString("en-IN")} steps`,
      points: badge.points,
      emoji: "⭐",
      achievedAt: `${badge.date}T12:00:00+05:30`,
      accent: "gold",
    };
  }

  if (badge.kind === "star_week") {
    return {
      id: `week-star:${badge.weekNo}`,
      name: "Star of the Week",
      subtitle: `Week ${badge.weekNo}`,
      detail: `${formatDisplayDate(badge.startDate)} – ${formatDisplayDate(badge.endDate)}`,
      points: badge.points,
      emoji: "🌟",
      achievedAt: `${badge.endDate}T12:00:00+05:30`,
      accent: "gold",
    };
  }

  const tierLabel =
    badge.tier === 7
      ? "Perfect week"
      : badge.tier === 6
        ? "6-day streak"
        : "5-day streak";

  return {
    id: `consistency:${badge.weekNo}`,
    name: "Consistency",
    subtitle: tierLabel,
    detail: `Week ${badge.weekNo} · ${badge.daysMet} days met`,
    points: badge.points,
    emoji: "🔥",
    achievedAt: `${badge.endDate}T12:00:00+05:30`,
    accent: "brand",
  };
}

export function participantBadgesToDisplay(
  badges: ParticipantBadge[],
): BadgeAchievementDisplay[] {
  return badges.map(participantBadgeToDisplay);
}

export const BADGE_CATALOG_LOCKED: BadgeAchievementDisplay[] = [
  {
    id: "catalog-star-day",
    name: "Star of the Day",
    subtitle: "Top steps in your group",
    detail: "+50 pts after day ends",
    emoji: "⭐",
    achievedAt: null,
    accent: "gold",
  },
  {
    id: "catalog-star-week",
    name: "Star of the Week",
    subtitle: "Top weekly steps in group",
    detail: "+100 pts after week ends",
    emoji: "🌟",
    achievedAt: null,
    accent: "gold",
  },
  {
    id: "catalog-consistency",
    name: "Consistency",
    subtitle: "5, 6, or 7 target days",
    detail: "+10 / +20 / +35 pts",
    emoji: "🔥",
    achievedAt: null,
    accent: "brand",
  },
];
