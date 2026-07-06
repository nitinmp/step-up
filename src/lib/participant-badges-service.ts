import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { computeAllUserAchievements } from "@/lib/achievement-badges";
import { parseDivision } from "@/lib/divisions";
import { loadScoringDataset } from "@/lib/scoring-dataset";
import {
  computeStandingsFromData,
  filterStandingsByDivision,
  getStandingForUser,
  type UserStanding,
} from "@/lib/standings";

export type ParticipantBadgesPageData = {
  user: {
    id: string;
    name: string;
    profileImageUrl: string | null;
    division: ReturnType<typeof parseDivision>;
  };
  standing: UserStanding | null;
  participantCountInDivision: number;
  achievements: ReturnType<typeof computeAllUserAchievements>["achievements"];
  badgeEarnedCount: number;
  badgeTotalCount: number;
};

export async function getParticipantBadgesPage(
  userId: string,
): Promise<ParticipantBadgesPageData | null> {
  const db = getDb();
  const [userRow] = await db
    .select({
      id: users.id,
      name: users.name,
      profileImageUrl: users.profileImageUrl,
      division: users.division,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    return null;
  }

  const dataset = await loadScoringDataset();
  const standings = computeStandingsFromData(dataset);
  const standing = getStandingForUser(standings, userId) ?? null;
  const division = parseDivision(userRow.division);
  const participantCountInDivision = standing
    ? filterStandingsByDivision(standings, standing.division).length
    : filterStandingsByDivision(standings, division).length;

  const userActivities = dataset.activities.filter(
    (activity) => activity.userId === userId && activity.status === "approved",
  );
  const cumulativeKm = userActivities.reduce(
    (sum, activity) => sum + Math.round(activity.steps * 0.000762 * 1000) / 1000,
    0,
  );

  const distanceByActivity = new Map<string, number>();
  for (const activity of dataset.activities) {
    if (activity.status === "approved") {
      distanceByActivity.set(
        `${activity.userId}:${activity.activityDate}`,
        Math.round(activity.steps * 0.000762 * 1000) / 1000,
      );
    }
  }

  const achievementBundle = computeAllUserAchievements(
    userId,
    dataset,
    standing,
    cumulativeKm,
    distanceByActivity,
  );

  return {
    user: {
      id: userRow.id,
      name: userRow.name,
      profileImageUrl: userRow.profileImageUrl,
      division: parseDivision(userRow.division),
    },
    standing,
    participantCountInDivision,
    achievements: achievementBundle.achievements,
    badgeEarnedCount: achievementBundle.earnedCount,
    badgeTotalCount: achievementBundle.totalCount,
  };
}
