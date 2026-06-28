import { appConfig } from "@/config";
import { getDb } from "@/db";
import {
  activities,
  challengeConfig,
  challengeDay,
  users,
} from "@/db/schema";
import { getTodayDateString } from "@/lib/dates";

import type { StandingsInput } from "./standings";

export type ScoringDataset = StandingsInput & {
  calendarToday: string;
};

function isTransientDbError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  if (message.includes("fetch failed") || message.includes("connect")) {
    return true;
  }

  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error && cause.message.toLowerCase().includes("fetch failed");
}

async function withDbRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function loadScoringDataset(): Promise<ScoringDataset> {
  return withDbRetry(async () => {
    const db = getDb();
    const [configRows, allUsers, allActivities, allChallengeDays] = await db.batch([
      db.select().from(challengeConfig).limit(1),
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
        .from(challengeDay)
        .orderBy(challengeDay.date),
    ]);

    const configRow = configRows[0];
    if (!configRow) {
      throw new Error("Challenge config is not seeded.");
    }

    const calendarToday = getTodayDateString(appConfig.timezone);

    return {
      calendarToday,
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
      today: calendarToday,
    };
  });
}
