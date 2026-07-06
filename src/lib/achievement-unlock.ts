import {
  computeAllUserAchievements,
  computePreviousBestSteps,
  detectNewlyUnlockedAchievements,
  detectPersonalBestUnlock,
  type UserAchievementState,
} from "@/lib/achievement-badges";
import type { ScoringDataset } from "@/lib/scoring-dataset";
import type { ActivityInput, UserStanding } from "@/lib/standings";

export function computeAchievementUnlocks(input: {
  userId: string;
  dataset: ScoringDataset;
  standing: UserStanding | null;
  cumulativeKm: number;
  beforeActivities: ActivityInput[];
  afterActivities: ActivityInput[];
  newSteps?: number;
  newActivityDate?: string;
  distanceByActivity?: Map<string, number>;
}): UserAchievementState[] {
  const beforeDataset = {
    ...input.dataset,
    activities: input.beforeActivities,
  };
  const afterDataset = {
    ...input.dataset,
    activities: input.afterActivities,
  };

  const before = computeAllUserAchievements(
    input.userId,
    beforeDataset,
    input.standing,
    input.cumulativeKm,
    input.distanceByActivity,
  ).achievements;

  const after = computeAllUserAchievements(
    input.userId,
    afterDataset,
    input.standing,
    input.cumulativeKm,
    input.distanceByActivity,
  ).achievements;

  const unlocked = detectNewlyUnlockedAchievements(before, after);

  if (
    input.newSteps !== undefined &&
    detectPersonalBestUnlock(
      computePreviousBestSteps(
        input.userId,
        input.beforeActivities,
        input.newActivityDate,
      ),
      input.newSteps,
    )
  ) {
    const pb = after.find((entry) => entry.seriesId === "personal_best");
    if (pb && !unlocked.some((entry) => entry.seriesId === "personal_best")) {
      unlocked.push(pb);
    }
  }

  return unlocked;
}
