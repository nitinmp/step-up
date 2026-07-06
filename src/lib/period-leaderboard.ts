import type { Division } from "./divisions";
import { parseDivision } from "./divisions";
import { getDivisionForDate } from "./division-as-of-cutover";
import { isBeastMode } from "./scoring";
import type {
  ActivityInput,
  ChallengeConfigInput,
  ChallengeDayInput,
  UserInput,
} from "./standings";

export type PeriodLeaderboardEntry = {
  userId: string;
  name: string;
  profileImageUrl: string | null;
  rank: number;
  steps: number;
  basePoints: number;
  targetSteps: number;
  targetMet: boolean;
  isBeast: boolean;
  isStarWinner: boolean;
  createdAt: Date;
};

export type ChallengeWeekSummary = {
  weekNo: number;
  startDate: string;
  endDate: string;
  dates: string[];
};

export type ChallengePeriodContext = {
  calendarToday: string;
  currentDay: ChallengeDayInput | null;
  currentWeek: ChallengeWeekSummary | null;
  pastDays: ChallengeDayInput[];
  pastWeeks: ChallengeWeekSummary[];
};

function buildWeekSummaries(
  challengeDays: ChallengeDayInput[],
): ChallengeWeekSummary[] {
  const weeks = new Map<number, string[]>();

  for (const day of challengeDays) {
    const dates = weeks.get(day.weekNo) ?? [];
    dates.push(day.date);
    weeks.set(day.weekNo, dates);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekNo, dates]) => {
      const sorted = [...dates].sort();
      return {
        weekNo,
        startDate: sorted[0]!,
        endDate: sorted[sorted.length - 1]!,
        dates: sorted,
      };
    });
}

export function buildChallengePeriodContext(
  challengeDays: ChallengeDayInput[],
  calendarToday: string,
): ChallengePeriodContext {
  const sortedDays = [...challengeDays].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = buildWeekSummaries(sortedDays);
  const endedDays = sortedDays.filter((day) => day.date < calendarToday);
  const currentDay =
    sortedDays.filter((day) => day.date <= calendarToday).at(-1) ?? null;
  const currentWeek =
    currentDay === null
      ? null
      : (weeks.find((week) => week.weekNo === currentDay.weekNo) ?? null);
  const pastDays = currentDay
    ? sortedDays.filter((day) => day.date < currentDay.date)
    : endedDays;
  const pastWeeks = currentWeek
    ? weeks.filter((week) => week.weekNo < currentWeek.weekNo)
    : weeks.filter((week) => week.endDate < calendarToday);

  return {
    calendarToday,
    currentDay,
    currentWeek,
    pastDays: [...pastDays].reverse(),
    pastWeeks: [...pastWeeks].reverse(),
  };
}

function rankEntries(
  entries: Array<Omit<PeriodLeaderboardEntry, "rank">>,
): PeriodLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.steps !== a.steps) {
      return b.steps - a.steps;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function usersInDivision(
  users: UserInput[],
  division: Division,
  asOfDate: string,
): UserInput[] {
  return users.filter(
    (user) =>
      getDivisionForDate(user.id, parseDivision(user.division), asOfDate) === division,
  );
}

export function computeDailyLeaderboard(input: {
  date: string;
  division: Division;
  users: UserInput[];
  activities: ActivityInput[];
  challengeDays: ChallengeDayInput[];
  config: ChallengeConfigInput;
  calendarToday: string;
}): PeriodLeaderboardEntry[] {
  const day = input.challengeDays.find((entry) => entry.date === input.date);
  if (!day) {
    return [];
  }

  const divisionUsers = usersInDivision(input.users, input.division, input.date);

  const approvedByUser = new Map<string, ActivityInput>();
  for (const activity of input.activities) {
    if (activity.activityDate !== input.date || activity.status !== "approved") {
      continue;
    }
    approvedByUser.set(activity.userId, activity);
  }

  const dayEnded = input.date < input.calendarToday;
  const maxSteps = dayEnded
    ? Math.max(
        0,
        ...divisionUsers.map((user) => approvedByUser.get(user.id)?.steps ?? 0),
      )
    : 0;

  const entries = divisionUsers.map((user) => {
    const activity = approvedByUser.get(user.id);
    const steps = activity?.steps ?? 0;
    const basePoints = activity?.basePoints ?? 0;

    return {
      userId: user.id,
      name: user.name,
      profileImageUrl: user.profileImageUrl ?? null,
      steps,
      basePoints,
      targetSteps: day.targetSteps,
      targetMet: steps >= day.targetSteps,
      isBeast: isBeastMode(steps, day.targetSteps, input.config.beastMultiplier),
      isStarWinner: dayEnded && maxSteps > 0 && steps === maxSteps,
      createdAt: user.createdAt,
    };
  });

  return rankEntries(entries);
}

export function computeWeeklyLeaderboard(input: {
  weekNo: number;
  division: Division;
  users: UserInput[];
  activities: ActivityInput[];
  challengeDays: ChallengeDayInput[];
  config: ChallengeConfigInput;
  calendarToday: string;
}): PeriodLeaderboardEntry[] {
  const weekDates = input.challengeDays
    .filter((day) => day.weekNo === input.weekNo)
    .map((day) => day.date);
  if (weekDates.length === 0) {
    return [];
  }

  const weekEnd = weekDates.reduce((latest, date) => (date > latest ? date : latest));
  const divisionUsers = usersInDivision(input.users, input.division, weekEnd);
  const weekEnded = weekEnd < input.calendarToday;
  const weekDayMap = new Map(
    input.challengeDays
      .filter((day) => day.weekNo === input.weekNo)
      .map((day) => [day.date, day]),
  );

  const stepsByUser = new Map<string, number>();
  const baseByUser = new Map<string, number>();
  const beastByUser = new Map<string, boolean>();
  const targetMetDays = new Map<string, number>();

  for (const user of divisionUsers) {
    stepsByUser.set(user.id, 0);
    baseByUser.set(user.id, 0);
    beastByUser.set(user.id, false);
    targetMetDays.set(user.id, 0);
  }

  for (const activity of input.activities) {
    if (activity.status !== "approved") {
      continue;
    }

    const day = weekDayMap.get(activity.activityDate);
    if (!day) {
      continue;
    }

    stepsByUser.set(
      activity.userId,
      (stepsByUser.get(activity.userId) ?? 0) + activity.steps,
    );
    baseByUser.set(
      activity.userId,
      (baseByUser.get(activity.userId) ?? 0) + activity.basePoints,
    );

    if (isBeastMode(activity.steps, day.targetSteps, input.config.beastMultiplier)) {
      beastByUser.set(activity.userId, true);
    }

    if (activity.steps >= day.targetSteps) {
      targetMetDays.set(
        activity.userId,
        (targetMetDays.get(activity.userId) ?? 0) + 1,
      );
    }
  }

  const maxWeeklySteps = weekEnded
    ? Math.max(0, ...divisionUsers.map((user) => stepsByUser.get(user.id) ?? 0))
    : 0;
  const representativeTarget =
    weekDayMap.values().next().value?.targetSteps ?? 0;

  const entries = divisionUsers.map((user) => {
    const steps = stepsByUser.get(user.id) ?? 0;
    const daysMet = targetMetDays.get(user.id) ?? 0;

    return {
      userId: user.id,
      name: user.name,
      profileImageUrl: user.profileImageUrl ?? null,
      steps,
      basePoints: baseByUser.get(user.id) ?? 0,
      targetSteps: representativeTarget,
      targetMet: daysMet > 0,
      isBeast: beastByUser.get(user.id) ?? false,
      isStarWinner: weekEnded && maxWeeklySteps > 0 && steps === maxWeeklySteps,
      createdAt: user.createdAt,
    };
  });

  return rankEntries(entries);
}

export function getWeekSummary(
  challengeDays: ChallengeDayInput[],
  weekNo: number,
): ChallengeWeekSummary | null {
  return buildWeekSummaries(challengeDays).find((week) => week.weekNo === weekNo) ?? null;
}
