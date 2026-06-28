import { getDb } from "@/db";
import {
  activities,
  challengeConfig,
  challengeDay,
  users,
} from "@/db/schema";
import { getEffectiveScoringDate } from "@/lib/scoring-date";

import {
  computeStandingsFromData,
  type UserStanding,
} from "./standings";

export async function computeStandings(): Promise<UserStanding[]> {
  const db = getDb();

  const [configRow] = await db.select().from(challengeConfig).limit(1);
  if (!configRow) {
    throw new Error("Challenge config is not seeded.");
  }

  const [allUsers, allActivities, allChallengeDays] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        createdAt: users.createdAt,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users),
    db
      .select({
        userId: activities.userId,
        activityDate: activities.activityDate,
        steps: activities.steps,
        basePoints: activities.basePoints,
        status: activities.status,
      })
      .from(activities),
    db
      .select({
        date: challengeDay.date,
        weekNo: challengeDay.weekNo,
        dayRate: challengeDay.dayRate,
        targetSteps: challengeDay.targetSteps,
      })
      .from(challengeDay),
  ]);

  return computeStandingsFromData({
    users: allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      profileImageUrl: user.profileImageUrl,
    })),
    activities: allActivities.map((activity) => ({
      userId: activity.userId,
      activityDate: activity.activityDate,
      steps: activity.steps,
      basePoints: activity.basePoints,
      status: activity.status,
    })),
    challengeDays: allChallengeDays.map((day) => ({
      date: day.date,
      weekNo: day.weekNo,
      dayRate: day.dayRate,
      targetSteps: day.targetSteps,
    })),
    config: {
      starOfDayPoints: configRow.starOfDayPoints,
      starOfWeekPoints: configRow.starOfWeekPoints,
      beastMultiplier: configRow.beastMultiplier,
      consistency5: configRow.consistency5,
      consistency6: configRow.consistency6,
      consistency7: configRow.consistency7,
    },
    today: await getEffectiveScoringDate(),
  });
}

export { getStandingForUser } from "./standings";
export type { StandingsBreakdown, UserStanding } from "./standings";
