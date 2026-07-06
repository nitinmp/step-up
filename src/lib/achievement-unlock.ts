import {
  computeAchievementStatesForUser,
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

  const beforeKm = sumApprovedKm(
    input.userId,
    input.beforeActivities,
    input.distanceByActivity,
  );
  const afterKm = sumApprovedKm(
    input.userId,
    input.afterActivities,
    input.distanceByActivity,
  );

  const before = computeAchievementStatesForUser(
    input.userId,
    beforeDataset,
    input.standing,
    beforeKm,
  );

  const after = computeAchievementStatesForUser(
    input.userId,
    afterDataset,
    input.standing,
    afterKm,
  );

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

function sumApprovedKm(
  userId: string,
  activities: ActivityInput[],
  distanceByActivity?: Map<string, number>,
): number {
  let total = 0;
  for (const activity of activities) {
    if (activity.userId !== userId || activity.status !== "approved") {
      continue;
    }
    const key = `${activity.userId}:${activity.activityDate}`;
    total +=
      distanceByActivity?.get(key) ??
      Math.round(activity.steps * 0.000762 * 1000) / 1000;
  }
  return total;
}
