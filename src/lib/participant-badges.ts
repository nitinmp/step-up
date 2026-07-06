import type { Division } from "./divisions";
import { DEFAULT_DIVISION, parseDivision } from "./divisions";
import { getDivisionForDate } from "./division-as-of-cutover";
import type {
  ActivityInput,
  ChallengeConfigInput,
  ChallengeDayInput,
  StandingsInput,
  UserInput,
} from "./standings";

export type StarDayBadge = {
  kind: "star_day";
  date: string;
  points: number;
  steps: number;
};

export type StarWeekBadge = {
  kind: "star_week";
  weekNo: number;
  startDate: string;
  endDate: string;
  points: number;
  steps: number;
};

export type ConsistencyBadge = {
  kind: "consistency";
  weekNo: number;
  startDate: string;
  endDate: string;
  daysMet: number;
  points: number;
  tier: 5 | 6 | 7;
};

export type ParticipantBadge = StarDayBadge | StarWeekBadge | ConsistencyBadge;

function buildChallengeDayMap(challengeDays: ChallengeDayInput[]) {
  return new Map(challengeDays.map((day) => [day.date, day]));
}

function buildWeekDates(challengeDays: ChallengeDayInput[]) {
  const weeks = new Map<number, string[]>();
  for (const day of challengeDays) {
    const dates = weeks.get(day.weekNo) ?? [];
    dates.push(day.date);
    weeks.set(day.weekNo, dates);
  }
  return weeks;
}

function buildWeekEndDates(challengeDays: ChallengeDayInput[]) {
  const weekEnds = new Map<number, string>();
  for (const day of challengeDays) {
    const current = weekEnds.get(day.weekNo);
    if (!current || day.date > current) {
      weekEnds.set(day.weekNo, day.date);
    }
  }
  return weekEnds;
}

function buildWeekRange(
  weekDates: Map<number, string[]>,
  weekNo: number,
): { startDate: string; endDate: string } | null {
  const dates = weekDates.get(weekNo);
  if (!dates || dates.length === 0) {
    return null;
  }
  const sorted = [...dates].sort();
  return {
    startDate: sorted[0]!,
    endDate: sorted[sorted.length - 1]!,
  };
}

function hasDayEnded(date: string, today: string): boolean {
  return date < today;
}

function hasWeekEnded(
  weekNo: number,
  weekEndDates: Map<number, string>,
  today: string,
): boolean {
  const weekEnd = weekEndDates.get(weekNo);
  if (!weekEnd) {
    return false;
  }
  return weekEnd < today;
}

function consistencyTier(
  daysMetInWeek: number,
  config: ChallengeConfigInput,
): { tier: 5 | 6 | 7; points: number } | null {
  if (daysMetInWeek >= 7) {
    return { tier: 7, points: config.consistency7 };
  }
  if (daysMetInWeek >= 6) {
    return { tier: 6, points: config.consistency6 };
  }
  if (daysMetInWeek >= 5) {
    return { tier: 5, points: config.consistency5 };
  }
  return null;
}

function userDivisionMap(users: UserInput[]): Map<string, Division> {
  return new Map(
    users.map((user) => [user.id, parseDivision(user.division ?? DEFAULT_DIVISION)]),
  );
}

export function computeParticipantBadges(
  userId: string,
  input: StandingsInput & { today?: string },
): ParticipantBadge[] {
  const today = input.today ?? "";
  const config = input.config;
  const challengeDayMap = buildChallengeDayMap(input.challengeDays);
  const weekDates = buildWeekDates(input.challengeDays);
  const weekEndDates = buildWeekEndDates(input.challengeDays);
  const divisionsByUser = userDivisionMap(input.users);
  const userDivision = divisionsByUser.get(userId) ?? DEFAULT_DIVISION;

  const approved = input.activities.filter(
    (activity) => activity.status === "approved",
  );

  const stepsByDate = new Map<string, Map<string, number>>();
  const stepsByUserWeek = new Map<string, Map<number, number>>();
  const daysMetByUserWeek = new Map<string, Map<number, number>>();

  for (const user of input.users) {
    stepsByUserWeek.set(user.id, new Map());
    daysMetByUserWeek.set(user.id, new Map());
  }

  for (const activity of approved) {
    const day = challengeDayMap.get(activity.activityDate);
    if (!day) {
      continue;
    }

    const dateSteps = stepsByDate.get(activity.activityDate) ?? new Map();
    dateSteps.set(activity.userId, activity.steps);
    stepsByDate.set(activity.activityDate, dateSteps);

    const userWeekSteps = stepsByUserWeek.get(activity.userId)!;
    userWeekSteps.set(
      day.weekNo,
      (userWeekSteps.get(day.weekNo) ?? 0) + activity.steps,
    );

    if (activity.steps >= day.targetSteps) {
      const weekDays = daysMetByUserWeek.get(activity.userId)!;
      weekDays.set(day.weekNo, (weekDays.get(day.weekNo) ?? 0) + 1);
    }
  }

  const badges: ParticipantBadge[] = [];

  for (const [date, userSteps] of stepsByDate) {
    if (!hasDayEnded(date, today)) {
      continue;
    }

    const userStepsInDivision = [...userSteps.entries()].filter(
      ([id]) =>
        getDivisionForDate(id, divisionsByUser.get(id) ?? DEFAULT_DIVISION, date) ===
        getDivisionForDate(userId, userDivision, date),
    );
    const maxSteps = Math.max(...userStepsInDivision.map(([, steps]) => steps), 0);
    const mySteps = userSteps.get(userId) ?? 0;

    if (maxSteps > 0 && mySteps === maxSteps) {
      badges.push({
        kind: "star_day",
        date,
        points: config.starOfDayPoints,
        steps: mySteps,
      });
    }
  }

  for (const [weekNo] of weekDates) {
    if (!hasWeekEnded(weekNo, weekEndDates, today)) {
      continue;
    }

    const weekRange = buildWeekRange(weekDates, weekNo);
    if (!weekRange) {
      continue;
    }

    const weeklyTotals = new Map<string, number>();
    const weekDivision = getDivisionForDate(userId, userDivision, weekRange.endDate);
    for (const user of input.users) {
      if (
        getDivisionForDate(user.id, divisionsByUser.get(user.id) ?? DEFAULT_DIVISION, weekRange.endDate) !==
        weekDivision
      ) {
        continue;
      }
      weeklyTotals.set(
        user.id,
        stepsByUserWeek.get(user.id)?.get(weekNo) ?? 0,
      );
    }

    const maxWeeklySteps = Math.max(...weeklyTotals.values(), 0);
    const myWeeklySteps = stepsByUserWeek.get(userId)?.get(weekNo) ?? 0;

    if (maxWeeklySteps > 0 && myWeeklySteps === maxWeeklySteps) {
      badges.push({
        kind: "star_week",
        weekNo,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
        points: config.starOfWeekPoints,
        steps: myWeeklySteps,
      });
    }

    const daysMet = daysMetByUserWeek.get(userId)?.get(weekNo) ?? 0;
    const consistency = consistencyTier(daysMet, config);
    if (consistency) {
      badges.push({
        kind: "consistency",
        weekNo,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
        daysMet,
        points: consistency.points,
        tier: consistency.tier,
      });
    }
  }

  badges.sort((a, b) => {
    const keyA =
      a.kind === "star_day"
        ? a.date
        : a.endDate;
    const keyB =
      b.kind === "star_day"
        ? b.date
        : b.endDate;
    return keyB.localeCompare(keyA);
  });

  return badges;
}

export function countBadgesByKind(badges: ParticipantBadge[]) {
  return {
    starDay: badges.filter((badge) => badge.kind === "star_day").length,
    starWeek: badges.filter((badge) => badge.kind === "star_week").length,
    consistency: badges.filter((badge) => badge.kind === "consistency").length,
  };
}
