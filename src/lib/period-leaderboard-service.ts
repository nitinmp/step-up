import type { UserStanding } from "./standings";
import { computeStandingsFromData } from "./standings";
import { loadScoringDataset } from "./scoring-dataset";
import {
  buildChallengePeriodContext,
  computeDailyLeaderboard,
  computeWeeklyLeaderboard,
  getWeekSummary,
  type ChallengePeriodContext,
  type PeriodLeaderboardEntry,
} from "./period-leaderboard";

export async function getLeaderboardHubData(currentUserId: string) {
  const dataset = await loadScoringDataset();
  const periods = buildChallengePeriodContext(
    dataset.challengeDays,
    dataset.calendarToday,
  );
  const overallStandings: UserStanding[] = computeStandingsFromData(dataset);

  const currentDaily = periods.currentDay
    ? computeDailyLeaderboard({
        date: periods.currentDay.date,
        users: dataset.users,
        activities: dataset.activities,
        challengeDays: dataset.challengeDays,
        config: dataset.config,
        calendarToday: dataset.calendarToday,
      })
    : [];

  const currentWeekly = periods.currentWeek
    ? computeWeeklyLeaderboard({
        weekNo: periods.currentWeek.weekNo,
        users: dataset.users,
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
  const dataset = await loadScoringDataset();
  const day = dataset.challengeDays.find((entry) => entry.date === date);
  if (!day) {
    return null;
  }

  return {
    calendarToday: dataset.calendarToday,
    day,
    entries: computeDailyLeaderboard({
      date,
      users: dataset.users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    }),
  };
}

export async function getWeeklyLeaderboardPage(weekNo: number) {
  const dataset = await loadScoringDataset();
  const week = getWeekSummary(dataset.challengeDays, weekNo);
  if (!week) {
    return null;
  }

  return {
    calendarToday: dataset.calendarToday,
    week,
    entries: computeWeeklyLeaderboard({
      weekNo,
      users: dataset.users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    }),
  };
}

export async function getLeaderboardPeriodIndexes() {
  const dataset = await loadScoringDataset();
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
