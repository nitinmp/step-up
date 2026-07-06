import type { Division, Gender } from "./divisions";
import { ALL_DIVISIONS, DEFAULT_DIVISION, parseDivision } from "./divisions";
import { isBeastMode } from "./scoring";

export type ChallengeConfigInput = {
  starOfDayPoints: number;
  starOfWeekPoints: number;
  beastMultiplier: number;
  consistency5: number;
  consistency6: number;
  consistency7: number;
};

export type ChallengeDayInput = {
  date: string;
  weekNo: number;
  dayRate: number;
  targetSteps: number;
};

export type UserInput = {
  id: string;
  name: string;
  createdAt: Date;
  profileImageUrl?: string | null;
  division?: Division;
  gender?: Gender | null;
};

export type ActivityInput = {
  userId: string;
  activityDate: string;
  steps: number;
  basePoints: number;
  status: string;
};

export type StandingsBreakdown = {
  base: number;
  starDay: number;
  weekStar: number;
  consistency: number;
};

export type UserStanding = {
  userId: string;
  name: string;
  profileImageUrl: string | null;
  division: Division;
  gender: Gender | null;
  rank: number;
  total: number;
  breakdown: StandingsBreakdown;
  daysMet: number;
  starDayCount: number;
  weekStarCount: number;
  beastCount: number;
  totalSteps: number;
};

export type RoyalHolder = {
  userId: string;
  name: string;
  profileImageUrl: string | null;
  total: number;
};

export type DivisionRoyals = {
  kings: RoyalHolder[];
  queens: RoyalHolder[];
  isFinal: boolean;
};

export type StandingsInput = {
  users: UserInput[];
  activities: ActivityInput[];
  challengeDays: ChallengeDayInput[];
  config: ChallengeConfigInput;
  /** IST calendar date; star/week/consistency bonuses apply only after the period ends. */
  today?: string;
};

const DEFAULT_CONFIG: ChallengeConfigInput = {
  starOfDayPoints: 50,
  starOfWeekPoints: 100,
  beastMultiplier: 2,
  consistency5: 10,
  consistency6: 20,
  consistency7: 35,
};

const DIVISIONS = ALL_DIVISIONS;

function consistencyBonusForWeek(
  daysMetInWeek: number,
  config: ChallengeConfigInput,
): number {
  if (daysMetInWeek >= 7) {
    return config.consistency7;
  }
  if (daysMetInWeek >= 6) {
    return config.consistency6;
  }
  if (daysMetInWeek >= 5) {
    return config.consistency5;
  }
  return 0;
}

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

function hasDayEnded(date: string, today?: string): boolean {
  if (!today) {
    return true;
  }
  return date < today;
}

function hasWeekEnded(
  weekNo: number,
  weekEndDates: Map<number, string>,
  today?: string,
): boolean {
  if (!today) {
    return true;
  }
  const weekEnd = weekEndDates.get(weekNo);
  if (!weekEnd) {
    return false;
  }
  return weekEnd < today;
}

function userDivisionMap(users: UserInput[]): Map<string, Division> {
  return new Map(
    users.map((user) => [user.id, parseDivision(user.division ?? DEFAULT_DIVISION)]),
  );
}

function compareStandings(
  a: { total: number; totalSteps: number; createdAt: Date },
  b: { total: number; totalSteps: number; createdAt: Date },
): number {
  if (b.total !== a.total) {
    return b.total - a.total;
  }
  if (b.totalSteps !== a.totalSteps) {
    return b.totalSteps - a.totalSteps;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function filterStandingsByDivision(
  standings: UserStanding[],
  division: Division,
): UserStanding[] {
  return standings.filter((standing) => standing.division === division);
}

export function computeDivisionRoyals(
  standings: UserStanding[],
  division: Division,
  challengeEnded: boolean,
): DivisionRoyals {
  const inDivision = standings.filter((standing) => standing.division === division);

  return {
    kings: pickRoyalHolders(inDivision, "male"),
    queens: pickRoyalHolders(inDivision, "female"),
    isFinal: challengeEnded,
  };
}

function pickRoyalHolders(
  standings: UserStanding[],
  gender: Gender,
): RoyalHolder[] {
  const candidates = standings.filter((standing) => standing.gender === gender);
  if (candidates.length === 0) {
    return [];
  }

  const maxTotal = Math.max(...candidates.map((standing) => standing.total));
  return candidates
    .filter((standing) => standing.total === maxTotal)
    .map((standing) => ({
      userId: standing.userId,
      name: standing.name,
      profileImageUrl: standing.profileImageUrl,
      total: standing.total,
    }));
}

export function isRoyalHolder(
  royals: DivisionRoyals,
  userId: string,
): { isKing: boolean; isQueen: boolean } {
  return {
    isKing: royals.kings.some((holder) => holder.userId === userId),
    isQueen: royals.queens.some((holder) => holder.userId === userId),
  };
}

export function computeStandingsFromData(
  input: StandingsInput,
): UserStanding[] {
  const config = input.config ?? DEFAULT_CONFIG;
  const today = input.today;
  const challengeDayMap = buildChallengeDayMap(input.challengeDays);
  const weekDates = buildWeekDates(input.challengeDays);
  const weekEndDates = buildWeekEndDates(input.challengeDays);
  const divisionsByUser = userDivisionMap(input.users);
  const approved = input.activities.filter(
    (activity) => activity.status === "approved",
  );

  const baseByUser = new Map<string, number>();
  const stepsByUser = new Map<string, number>();
  const beastByUser = new Map<string, number>();
  const daysMetByUser = new Map<string, number>();
  const stepsByDate = new Map<string, Map<string, number>>();
  const stepsByUserWeek = new Map<string, Map<number, number>>();
  const daysMetByUserWeek = new Map<string, Map<number, number>>();

  for (const user of input.users) {
    baseByUser.set(user.id, 0);
    stepsByUser.set(user.id, 0);
    beastByUser.set(user.id, 0);
    daysMetByUser.set(user.id, 0);
    stepsByUserWeek.set(user.id, new Map());
    daysMetByUserWeek.set(user.id, new Map());
  }

  for (const activity of approved) {
    const day = challengeDayMap.get(activity.activityDate);
    if (!day) {
      continue;
    }

    baseByUser.set(
      activity.userId,
      (baseByUser.get(activity.userId) ?? 0) + activity.basePoints,
    );
    stepsByUser.set(
      activity.userId,
      (stepsByUser.get(activity.userId) ?? 0) + activity.steps,
    );

    if (isBeastMode(activity.steps, day.targetSteps, config.beastMultiplier)) {
      beastByUser.set(
        activity.userId,
        (beastByUser.get(activity.userId) ?? 0) + 1,
      );
    }

    if (activity.steps >= day.targetSteps) {
      daysMetByUser.set(
        activity.userId,
        (daysMetByUser.get(activity.userId) ?? 0) + 1,
      );

      const userWeekDays = daysMetByUserWeek.get(activity.userId)!;
      userWeekDays.set(day.weekNo, (userWeekDays.get(day.weekNo) ?? 0) + 1);
    }

    const dateSteps = stepsByDate.get(activity.activityDate) ?? new Map();
    dateSteps.set(activity.userId, activity.steps);
    stepsByDate.set(activity.activityDate, dateSteps);

    const userWeekSteps = stepsByUserWeek.get(activity.userId)!;
    userWeekSteps.set(
      day.weekNo,
      (userWeekSteps.get(day.weekNo) ?? 0) + activity.steps,
    );
  }

  const starDayBonusByUser = new Map<string, number>();
  const starDayCountByUser = new Map<string, number>();

  for (const [date, userSteps] of stepsByDate) {
    if (!hasDayEnded(date, today)) {
      continue;
    }

    for (const division of DIVISIONS) {
      const divisionSteps = [...userSteps.entries()].filter(
        ([userId]) => divisionsByUser.get(userId) === division,
      );
      const maxSteps = Math.max(...divisionSteps.map(([, steps]) => steps), 0);
      if (maxSteps <= 0) {
        continue;
      }

      for (const [userId, steps] of divisionSteps) {
        if (steps === maxSteps) {
          starDayBonusByUser.set(
            userId,
            (starDayBonusByUser.get(userId) ?? 0) + config.starOfDayPoints,
          );
          starDayCountByUser.set(
            userId,
            (starDayCountByUser.get(userId) ?? 0) + 1,
          );
        }
      }
    }
  }

  const weekStarBonusByUser = new Map<string, number>();
  const weekStarCountByUser = new Map<string, number>();

  for (const [weekNo] of weekDates) {
    if (!hasWeekEnded(weekNo, weekEndDates, today)) {
      continue;
    }

    for (const division of DIVISIONS) {
      const weeklyTotals = new Map<string, number>();

      for (const user of input.users) {
        if (divisionsByUser.get(user.id) !== division) {
          continue;
        }
        weeklyTotals.set(
          user.id,
          stepsByUserWeek.get(user.id)?.get(weekNo) ?? 0,
        );
      }

      const maxWeeklySteps = Math.max(...weeklyTotals.values(), 0);
      if (maxWeeklySteps <= 0) {
        continue;
      }

      for (const [userId, weeklySteps] of weeklyTotals) {
        if (weeklySteps === maxWeeklySteps) {
          weekStarBonusByUser.set(
            userId,
            (weekStarBonusByUser.get(userId) ?? 0) + config.starOfWeekPoints,
          );
          weekStarCountByUser.set(
            userId,
            (weekStarCountByUser.get(userId) ?? 0) + 1,
          );
        }
      }
    }
  }

  const consistencyBonusByUser = new Map<string, number>();

  for (const user of input.users) {
    const userWeekDays = daysMetByUserWeek.get(user.id)!;
    let consistencyTotal = 0;

    for (const weekNo of weekDates.keys()) {
      if (!hasWeekEnded(weekNo, weekEndDates, today)) {
        continue;
      }

      consistencyTotal += consistencyBonusForWeek(
        userWeekDays.get(weekNo) ?? 0,
        config,
      );
    }

    consistencyBonusByUser.set(user.id, consistencyTotal);
  }

  const standings = input.users.map((user) => {
    const breakdown: StandingsBreakdown = {
      base: baseByUser.get(user.id) ?? 0,
      starDay: starDayBonusByUser.get(user.id) ?? 0,
      weekStar: weekStarBonusByUser.get(user.id) ?? 0,
      consistency: consistencyBonusByUser.get(user.id) ?? 0,
    };

    const total =
      breakdown.base +
      breakdown.starDay +
      breakdown.weekStar +
      breakdown.consistency;

    return {
      userId: user.id,
      name: user.name,
      profileImageUrl: user.profileImageUrl ?? null,
      division: parseDivision(user.division ?? DEFAULT_DIVISION),
      gender: user.gender ?? null,
      rank: 0,
      total,
      breakdown,
      daysMet: daysMetByUser.get(user.id) ?? 0,
      starDayCount: starDayCountByUser.get(user.id) ?? 0,
      weekStarCount: weekStarCountByUser.get(user.id) ?? 0,
      beastCount: beastByUser.get(user.id) ?? 0,
      totalSteps: stepsByUser.get(user.id) ?? 0,
      createdAt: user.createdAt,
    };
  });

  const ranked: UserStanding[] = [];

  for (const division of DIVISIONS) {
    const divisionStandings = standings
      .filter((standing) => standing.division === division)
      .sort(compareStandings);

    divisionStandings.forEach((standing, index) => {
      const { createdAt: _createdAt, ...rest } = standing;
      ranked.push({
        ...rest,
        rank: index + 1,
      });
    });
  }

  return ranked;
}

export function getStandingForUser(
  standings: UserStanding[],
  userId: string,
): UserStanding | undefined {
  return standings.find((standing) => standing.userId === userId);
}
