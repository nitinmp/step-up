import type { Division } from "@/lib/divisions";
import { DEFAULT_DIVISION, parseDivision } from "@/lib/divisions";
import {
  computeDashboardStats,
  type DashboardAggregates,
} from "@/lib/dashboard-stats";
import type {
  ActivityInput,
  StandingsInput,
  UserStanding,
} from "@/lib/standings";
import { computeStandingsFromData } from "@/lib/standings";

export type BadgeTier = {
  threshold: number;
  name: string;
};

export type BadgeSeriesId =
  | "streak"
  | "steps_milestone"
  | "distance"
  | "beast_mode"
  | "target_hits"
  | "overachiever"
  | "perfect_week"
  | "personal_best"
  | "star_day"
  | "star_week";

export type BadgeSeriesDefinition = {
  id: BadgeSeriesId;
  category: "streak" | "metric" | "event" | "rare";
  name: string;
  emoji: string;
  tiers: BadgeTier[];
  isRare?: boolean;
};

export const BADGE_SERIES: BadgeSeriesDefinition[] = [
  {
    id: "streak",
    category: "streak",
    name: "Streak",
    emoji: "🔥",
    tiers: [
      { threshold: 3, name: "Spark" },
      { threshold: 7, name: "On a Roll" },
      { threshold: 14, name: "Blazing" },
      { threshold: 21, name: "Relentless" },
      { threshold: 29, name: "Perfect Attendance" },
    ],
  },
  {
    id: "steps_milestone",
    category: "metric",
    name: "Steps",
    emoji: "👟",
    tiers: [
      { threshold: 50_000, name: "50K Steps" },
      { threshold: 100_000, name: "100K Club" },
      { threshold: 250_000, name: "Quarter Million" },
      { threshold: 500_000, name: "Half Million" },
    ],
  },
  {
    id: "distance",
    category: "metric",
    name: "Distance",
    emoji: "🗺️",
    tiers: [
      { threshold: 25, name: "25 km" },
      { threshold: 50, name: "50 km" },
      { threshold: 100, name: "Century" },
      { threshold: 150, name: "150 km" },
    ],
  },
  {
    id: "beast_mode",
    category: "metric",
    name: "Beast Mode",
    emoji: "🐉",
    tiers: [
      { threshold: 1, name: "Beast" },
      { threshold: 5, name: "Beast ×5" },
      { threshold: 10, name: "Beast ×10" },
    ],
  },
  {
    id: "target_hits",
    category: "metric",
    name: "Reliable",
    emoji: "🎯",
    tiers: [
      { threshold: 5, name: "Getting Started" },
      { threshold: 10, name: "Reliable" },
      { threshold: 20, name: "Dependable" },
      { threshold: 29, name: "Never Missed" },
    ],
  },
  {
    id: "overachiever",
    category: "metric",
    name: "Overachiever",
    emoji: "📈",
    tiers: [
      { threshold: 150, name: "Overachiever" },
      { threshold: 200, name: "Double Trouble" },
      { threshold: 300, name: "Triple Threat" },
    ],
  },
  {
    id: "perfect_week",
    category: "metric",
    name: "Perfect Week",
    emoji: "✅",
    tiers: [
      { threshold: 1, name: "Perfect Week" },
      { threshold: 2, name: "Perfect Week ×2" },
      { threshold: 3, name: "Perfect Week ×3" },
      { threshold: 4, name: "Flawless Month" },
    ],
  },
  {
    id: "personal_best",
    category: "event",
    name: "Personal Best",
    emoji: "🏆",
    tiers: [{ threshold: 1, name: "Personal Best" }],
  },
  {
    id: "star_day",
    category: "rare",
    name: "Star of the Day",
    emoji: "⭐",
    isRare: true,
    tiers: [{ threshold: 1, name: "Star of the Day" }],
  },
  {
    id: "star_week",
    category: "rare",
    name: "Star of the Week",
    emoji: "🌟",
    isRare: true,
    tiers: [{ threshold: 1, name: "Star of the Week" }],
  },
];

export type UserAchievementState = {
  seriesId: BadgeSeriesId;
  seriesName: string;
  emoji: string;
  category: BadgeSeriesDefinition["category"];
  isRare: boolean;
  earnedTierIndex: number | null;
  earnedTierName: string | null;
  earnedAt: string | null;
  nextTierIndex: number | null;
  nextTierName: string | null;
  nextThreshold: number | null;
  progress: number;
  currentValue: number;
  progressLabel: string | null;
  rarityPercent: number | null;
};

function resolveEarnedTier(
  value: number,
  tiers: BadgeTier[],
): number | null {
  let earnedIndex: number | null = null;
  for (let i = 0; i < tiers.length; i += 1) {
    if (value >= tiers[i]!.threshold) {
      earnedIndex = i;
    }
  }
  return earnedIndex;
}

function metricForSeries(
  seriesId: BadgeSeriesId,
  aggregates: DashboardAggregates,
): number {
  switch (seriesId) {
    case "streak":
      return aggregates.currentLoggingStreak;
    case "steps_milestone":
      return aggregates.cumulativeSteps;
    case "distance":
      return Math.floor(aggregates.cumulativeKm);
    case "beast_mode":
      return aggregates.beastDays;
    case "target_hits":
      return aggregates.targetMetDays;
    case "overachiever":
      return aggregates.bestDayPct;
    case "perfect_week":
      return aggregates.perfectWeeks;
    case "personal_best":
      return aggregates.bestDaySteps > 0 ? 1 : 0;
    case "star_day":
      return aggregates.starDayCount;
    case "star_week":
      return aggregates.starWeekCount;
    default:
      return 0;
  }
}

function computeProgress(value: number, nextThreshold: number): number {
  if (nextThreshold <= 0) {
    return 100;
  }
  return Math.min(100, Math.round((value / nextThreshold) * 100));
}

function formatProgressLabel(
  seriesId: BadgeSeriesId,
  value: number,
  nextThreshold: number | null,
): string | null {
  if (nextThreshold === null) {
    if (seriesId === "personal_best" && value > 0) {
      return `${value.toLocaleString("en-IN")} steps`;
    }
    if (seriesId === "star_day" || seriesId === "star_week") {
      return value > 0 ? `×${value}` : "RARE";
    }
    if (seriesId === "perfect_week" && value > 0) {
      return `×${value}`;
    }
    return null;
  }

  if (seriesId === "steps_milestone") {
    const fmt = (n: number) =>
      n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
    return `${fmt(value)} / ${fmt(nextThreshold)}`;
  }

  if (seriesId === "distance") {
    return `${value} / ${nextThreshold} km`;
  }

  if (seriesId === "overachiever") {
    return `best ${value}% / need ${nextThreshold}%`;
  }

  if (
    seriesId === "target_hits" ||
    seriesId === "beast_mode" ||
    seriesId === "streak"
  ) {
    return `${value} / ${nextThreshold}`;
  }

  if (seriesId === "perfect_week") {
    return value > 0 ? `×${value} / ×${nextThreshold}` : `0 / ×${nextThreshold}`;
  }

  return null;
}

function buildAggregates(
  userId: string,
  input: StandingsInput & { today?: string },
  standing: UserStanding | null,
  cumulativeKm: number,
): DashboardAggregates {
  const stats = computeDashboardStats({
    userId,
    division: standing?.division ?? DEFAULT_DIVISION,
    standing,
    activities: input.activities,
    challengeDays: input.challengeDays,
    users: input.users,
    config: input.config,
    today: input.today ?? "",
    cumulativeKmOverride: cumulativeKm,
  });
  return stats.aggregates;
}

export function computeAchievementStatesForUser(
  userId: string,
  input: StandingsInput & { today?: string },
  standing: UserStanding | null,
  cumulativeKm = 0,
): UserAchievementState[] {
  const aggregates = buildAggregates(userId, input, standing, cumulativeKm);

  return BADGE_SERIES.map((series) => {
    const streakEarnValue = Math.max(
      aggregates.currentLoggingStreak,
      aggregates.longestLoggingStreak,
    );
    const value = metricForSeries(series.id, aggregates);
    const earnedValue = series.id === "streak" ? streakEarnValue : value;
    const earnedTierIndex = resolveEarnedTier(earnedValue, series.tiers);

    const nextTierIndex =
      earnedTierIndex === null
        ? 0
        : earnedTierIndex + 1 < series.tiers.length
          ? earnedTierIndex + 1
          : null;

    const nextThreshold =
      nextTierIndex !== null ? series.tiers[nextTierIndex]!.threshold : null;
    const progressValue =
      series.id === "streak" ? aggregates.currentLoggingStreak : value;

    const progress =
      nextThreshold !== null ? computeProgress(progressValue, nextThreshold) : 100;

    return {
      seriesId: series.id,
      seriesName: series.name,
      emoji: series.emoji,
      category: series.category,
      isRare: Boolean(series.isRare),
      earnedTierIndex,
      earnedTierName:
        earnedTierIndex !== null ? series.tiers[earnedTierIndex]!.name : null,
      earnedAt: earnedTierIndex !== null ? input.today ?? null : null,
      nextTierIndex,
      nextTierName:
        nextTierIndex !== null ? series.tiers[nextTierIndex]!.name : null,
      nextThreshold,
      progress,
      currentValue: progressValue,
      progressLabel: formatProgressLabel(series.id, progressValue, nextThreshold),
      rarityPercent: null,
    };
  });
}

function hasEarnedTier(
  userId: string,
  input: StandingsInput & { today?: string },
  seriesId: BadgeSeriesId,
  tierIndex: number,
  standingByUser: Map<string, UserStanding>,
  kmByUser: Map<string, number>,
): boolean {
  const states = computeAchievementStatesForUser(
    userId,
    input,
    standingByUser.get(userId) ?? null,
    kmByUser.get(userId) ?? 0,
  );
  const state = states.find((entry) => entry.seriesId === seriesId);
  return (
    state !== undefined &&
    state.earnedTierIndex !== null &&
    state.earnedTierIndex >= tierIndex
  );
}

function buildKmByUser(
  activities: ActivityInput[],
  distanceByActivity?: Map<string, number>,
): Map<string, number> {
  const kmByUser = new Map<string, number>();
  for (const activity of activities) {
    if (activity.status !== "approved") {
      continue;
    }
    const key = `${activity.userId}:${activity.activityDate}`;
    const distance =
      distanceByActivity?.get(key) ??
      Math.round(activity.steps * 0.000762 * 1000) / 1000;
    kmByUser.set(activity.userId, (kmByUser.get(activity.userId) ?? 0) + distance);
  }
  return kmByUser;
}

export function computeAllUserAchievements(
  userId: string,
  input: StandingsInput & { today?: string },
  standing: UserStanding | null,
  cumulativeKm: number,
  distanceByActivity?: Map<string, number>,
): {
  achievements: UserAchievementState[];
  earnedCount: number;
  totalCount: number;
} {
  const participantIds = input.users.map((user) => user.id);
  const achievements = computeAchievementStatesForUser(
    userId,
    input,
    standing,
    cumulativeKm,
  );

  const standings = computeStandingsFromData(input);
  const standingByUser = new Map(standings.map((entry) => [entry.userId, entry]));
  const kmByUser = buildKmByUser(input.activities, distanceByActivity);

  const withRarity = achievements.map((achievement) => {
    if (achievement.earnedTierIndex === null) {
      return achievement;
    }

    const earners = participantIds.filter((participantId) =>
      hasEarnedTier(
        participantId,
        input,
        achievement.seriesId,
        achievement.earnedTierIndex!,
        standingByUser,
        kmByUser,
      ),
    ).length;

    const rarityPercent =
      participantIds.length > 0
        ? Math.round((earners / participantIds.length) * 100)
        : null;

    return { ...achievement, rarityPercent };
  });

  const earnedCount = withRarity.filter(
    (entry) => entry.earnedTierIndex !== null,
  ).length;
  const totalCount = BADGE_SERIES.length;

  return {
    achievements: withRarity,
    earnedCount,
    totalCount,
  };
}

export function detectNewlyUnlockedAchievements(
  before: UserAchievementState[],
  after: UserAchievementState[],
): UserAchievementState[] {
  const newlyUnlocked: UserAchievementState[] = [];

  for (const next of after) {
    const prev = before.find((entry) => entry.seriesId === next.seriesId);
    const prevIndex = prev?.earnedTierIndex ?? null;
    const nextIndex = next.earnedTierIndex;

    if (nextIndex !== null && (prevIndex === null || nextIndex > prevIndex)) {
      newlyUnlocked.push(next);
    }
  }

  return newlyUnlocked;
}

export function detectPersonalBestUnlock(
  previousBestSteps: number,
  newSteps: number,
): boolean {
  return newSteps > previousBestSteps && newSteps > 0;
}

export function computePreviousBestSteps(
  userId: string,
  activities: ActivityInput[],
  excludeDate?: string,
): number {
  let best = 0;
  for (const activity of activities) {
    if (activity.userId !== userId || activity.status !== "approved") {
      continue;
    }
    if (excludeDate && activity.activityDate === excludeDate) {
      continue;
    }
    if (activity.steps > best) {
      best = activity.steps;
    }
  }
  return best;
}

export function selectBadgePreview(
  achievements: UserAchievementState[],
  limit = 8,
): UserAchievementState[] {
  const earned = achievements.filter((entry) => entry.earnedTierIndex !== null);
  const inProgress = achievements.filter(
    (entry) => entry.earnedTierIndex === null && entry.nextTierIndex !== null,
  );
  const rareLocked = achievements.filter(
    (entry) => entry.isRare && entry.earnedTierIndex === null,
  );

  const selected: UserAchievementState[] = [];
  const seen = new Set<BadgeSeriesId>();

  for (const entry of [...earned, ...inProgress, ...rareLocked]) {
    if (seen.has(entry.seriesId)) {
      continue;
    }
    seen.add(entry.seriesId);
    selected.push(entry);
    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}
