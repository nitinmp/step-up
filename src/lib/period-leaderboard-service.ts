import type { Division } from "@/lib/divisions";
import type { UserStanding, DivisionRoyals } from "./standings";
import {
  computeDivisionRoyals,
  computeStandingsFromData,
  filterStandingsByDivision,
} from "./standings";
import { ALL_DIVISIONS } from "./divisions";
import { divisionsActiveOnDate } from "./group-rules";
import { loadScoringDataset } from "./scoring-dataset";
import {
  buildChallengePeriodContext,
  computeDailyLeaderboard,
  computeWeeklyLeaderboard,
  getWeekSummary,
  type ChallengePeriodContext,
  type PeriodLeaderboardEntry,
} from "./period-leaderboard";

function emptyDivisionRecord<T>(): Record<Division, T> {
  return {
    strider: [] as unknown as T,
    elite: [] as unknown as T,
    riser: [] as unknown as T,
  };
}

function computeDailyForDivisions(
  dataset: Awaited<ReturnType<typeof loadScoringDataset>>,
  date: string,
): Record<Division, PeriodLeaderboardEntry[]> {
  const entries = emptyDivisionRecord<PeriodLeaderboardEntry[]>();
  for (const division of divisionsActiveOnDate(date)) {
    entries[division] = computeDailyLeaderboard({
      date,
      division,
      users: dataset.users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    });
  }
  return entries;
}

function computeWeeklyForDivisions(
  dataset: Awaited<ReturnType<typeof loadScoringDataset>>,
  weekNo: number,
): Record<Division, PeriodLeaderboardEntry[]> {
  const week = getWeekSummary(dataset.challengeDays, weekNo);
  const entries = emptyDivisionRecord<PeriodLeaderboardEntry[]>();
  if (!week) {
    return entries;
  }

  for (const division of divisionsActiveOnDate(week.endDate)) {
    entries[division] = computeWeeklyLeaderboard({
      weekNo,
      division,
      users: dataset.users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    });
  }
  return entries;
}

function buildRoyalsByDivision(
  standings: UserStanding[],
  challengeEnded: boolean,
): Record<Division, DivisionRoyals> {
  const royals = emptyDivisionRecord<DivisionRoyals>();
  for (const division of ALL_DIVISIONS) {
    royals[division] = computeDivisionRoyals(standings, division, challengeEnded);
  }
  return royals;
}

function buildStandingsByDivision(
  overallStandings: UserStanding[],
): Record<Division, UserStanding[]> {
  const standings = emptyDivisionRecord<UserStanding[]>();
  for (const division of ALL_DIVISIONS) {
    standings[division] = filterStandingsByDivision(overallStandings, division);
  }
  return standings;
}

export async function getLeaderboardHubData(currentUserId: string) {
  const dataset = await loadScoringDataset();
  const periods = buildChallengePeriodContext(
    dataset.challengeDays,
    dataset.calendarToday,
  );
  const overallStandings = computeStandingsFromData(dataset);
  const challengeEnded = dataset.calendarToday > dataset.challengeEndDate;
  const royalsByDivision = buildRoyalsByDivision(overallStandings, challengeEnded);

  const currentDaily = periods.currentDay
    ? computeDailyForDivisions(dataset, periods.currentDay.date)
    : emptyDivisionRecord<PeriodLeaderboardEntry[]>();

  const currentWeekly = periods.currentWeek
    ? computeWeeklyForDivisions(dataset, periods.currentWeek.weekNo)
    : emptyDivisionRecord<PeriodLeaderboardEntry[]>();

  const lastEndedWeek = periods.pastWeeks[0] ?? null;
  const lastWeeklyByDivision = lastEndedWeek
    ? computeWeeklyForDivisions(dataset, lastEndedWeek.weekNo)
    : emptyDivisionRecord<PeriodLeaderboardEntry[]>();

  const viewer = overallStandings.find((row) => row.userId === currentUserId);

  return {
    currentUserId,
    periods,
    challengeEndDate: dataset.challengeEndDate,
    overallStandings,
    standingsByDivision: buildStandingsByDivision(overallStandings),
    royalsByDivision,
    currentDaily,
    currentWeekly,
    lastEndedWeek,
    lastWeeklyByDivision,
    starOfDayPoints: dataset.config.starOfDayPoints,
    starOfWeekPoints: dataset.config.starOfWeekPoints,
    viewerDivision: viewer?.division ?? "strider",
  };
}

export async function getDailyLeaderboardPage(date: string) {
  const dataset = await loadScoringDataset();
  const day = dataset.challengeDays.find((entry) => entry.date === date);
  if (!day) {
    return null;
  }

  const overallStandings = computeStandingsFromData(dataset);
  const challengeEnded = dataset.calendarToday > dataset.challengeEndDate;

  return {
    calendarToday: dataset.calendarToday,
    challengeEndDate: dataset.challengeEndDate,
    day,
    entriesByDivision: computeDailyForDivisions(dataset, date),
    royalsByDivision: buildRoyalsByDivision(overallStandings, challengeEnded),
    starOfDayPoints: dataset.config.starOfDayPoints,
  };
}

export async function getWeeklyLeaderboardPage(weekNo: number) {
  const dataset = await loadScoringDataset();
  const week = getWeekSummary(dataset.challengeDays, weekNo);
  if (!week) {
    return null;
  }

  const overallStandings = computeStandingsFromData(dataset);
  const challengeEnded = dataset.calendarToday > dataset.challengeEndDate;

  return {
    calendarToday: dataset.calendarToday,
    challengeEndDate: dataset.challengeEndDate,
    week,
    entriesByDivision: computeWeeklyForDivisions(dataset, weekNo),
    royalsByDivision: buildRoyalsByDivision(overallStandings, challengeEnded),
    starOfWeekPoints: dataset.config.starOfWeekPoints,
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
