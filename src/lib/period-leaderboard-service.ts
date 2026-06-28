import { appConfig } from "@/config";
import { getDb } from "@/db";
import {
  activities,
  challengeConfig,
  challengeDay,
  users,
} from "@/db/schema";
import { getTodayDateString } from "@/lib/dates";

import type { UserStanding } from "./standings";
import { computeStandingsFromData } from "./standings";
import {
  buildChallengePeriodContext,
  computeDailyLeaderboard,
  computeWeeklyLeaderboard,
  getWeekSummary,
  type ChallengePeriodContext,
  type PeriodLeaderboardEntry,
} from "./period-leaderboard";

type LeaderboardDataset = {
  calendarToday: string;
  config: {
    starOfDayPoints: number;
    starOfWeekPoints: number;
    beastMultiplier: number;
    consistency5: number;
    consistency6: number;
    consistency7: number;
  };
  users: Array<{
    id: string;
    name: string;
    createdAt: Date;
    profileImageUrl: string | null;
  }>;
  activities: Array<{
    userId: string;
    activityDate: string;
    steps: number;
    basePoints: number;
    status: string;
  }>;
  challengeDays: Array<{
    date: string;
    weekNo: number;
    dayRate: number;
    targetSteps: number;
  }>;
};

async function loadLeaderboardDataset(): Promise<LeaderboardDataset> {
  const db = getDb();
  const [configRow, allUsers, allActivities, allChallengeDays] =
    await Promise.all([
      db.select().from(challengeConfig).limit(1).then((rows) => rows[0]),
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

  if (!configRow) {
    throw new Error("Challenge config is not seeded.");
  }

  return {
    calendarToday: getTodayDateString(appConfig.timezone),
    config: {
      starOfDayPoints: configRow.starOfDayPoints,
      starOfWeekPoints: configRow.starOfWeekPoints,
      beastMultiplier: configRow.beastMultiplier,
      consistency5: configRow.consistency5,
      consistency6: configRow.consistency6,
      consistency7: configRow.consistency7,
    },
    users: allUsers,
    activities: allActivities,
    challengeDays: allChallengeDays,
  };
}

function mapUsers(dataset: LeaderboardDataset) {
  return dataset.users.map((user) => ({
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    profileImageUrl: user.profileImageUrl,
  }));
}

export async function getLeaderboardHubData(currentUserId: string) {
  const dataset = await loadLeaderboardDataset();
  const users = mapUsers(dataset);
  const periods = buildChallengePeriodContext(
    dataset.challengeDays,
    dataset.calendarToday,
  );
  const overallStandings: UserStanding[] = computeStandingsFromData({
    users,
    activities: dataset.activities,
    challengeDays: dataset.challengeDays,
    config: dataset.config,
    today: dataset.calendarToday,
  });

  const currentDaily = periods.currentDay
    ? computeDailyLeaderboard({
        date: periods.currentDay.date,
        users,
        activities: dataset.activities,
        challengeDays: dataset.challengeDays,
        config: dataset.config,
        calendarToday: dataset.calendarToday,
      })
    : [];

  const currentWeekly = periods.currentWeek
    ? computeWeeklyLeaderboard({
        weekNo: periods.currentWeek.weekNo,
        users,
        activities: dataset.activities,
        challengeDays: dataset.challengeDays,
        config: dataset.config,
        calendarToday: dataset.calendarToday,
      })
    : [];

  return {
    currentUserId,
    periods,
    overallStandings,
    currentDaily,
    currentWeekly,
  };
}

export async function getDailyLeaderboardPage(date: string) {
  const dataset = await loadLeaderboardDataset();
  const users = mapUsers(dataset);
  const day = dataset.challengeDays.find((entry) => entry.date === date);
  if (!day) {
    return null;
  }

  return {
    calendarToday: dataset.calendarToday,
    day,
    entries: computeDailyLeaderboard({
      date,
      users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    }),
  };
}

export async function getWeeklyLeaderboardPage(weekNo: number) {
  const dataset = await loadLeaderboardDataset();
  const users = mapUsers(dataset);
  const week = getWeekSummary(dataset.challengeDays, weekNo);
  if (!week) {
    return null;
  }

  return {
    calendarToday: dataset.calendarToday,
    week,
    entries: computeWeeklyLeaderboard({
      weekNo,
      users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    }),
  };
}

export async function getLeaderboardPeriodIndexes() {
  const dataset = await loadLeaderboardDataset();
  const periods = buildChallengePeriodContext(
    dataset.challengeDays,
    dataset.calendarToday,
  );

  return {
    calendarToday: dataset.calendarToday,
    currentDay: periods.currentDay,
    currentWeek: periods.currentWeek,
    pastDays: periods.pastDays,
    pastWeeks: periods.pastWeeks,
  };
}

export type { ChallengePeriodContext, PeriodLeaderboardEntry };
