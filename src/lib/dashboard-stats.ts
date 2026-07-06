import type { Division } from "@/lib/divisions";
import { compareDateStrings } from "@/lib/dates";
import { isBeastMode } from "@/lib/scoring";
import type {
  ActivityInput,
  ChallengeConfigInput,
  ChallengeDayInput,
  UserInput,
  UserStanding,
} from "@/lib/standings";
import { filterStandingsByDivision } from "@/lib/standings";

export type PointsBreakdown = {
  targetPoints: number;
  pushPoints: number;
  consistencyPoints: number;
  starPoints: number;
  base: number;
  bonus: number;
  total: number;
};

export type DashboardAggregates = {
  cumulativeSteps: number;
  cumulativeKm: number;
  targetMetDays: number;
  beastDays: number;
  currentLoggingStreak: number;
  longestLoggingStreak: number;
  bestDaySteps: number;
  bestDayPct: number;
  perfectWeeks: number;
  starDayCount: number;
  starWeekCount: number;
  challengeDayIndex: number;
  challengeTotalDays: number;
};

export type RankChase = {
  rank: number;
  participantCount: number;
  pointsToRankAbove: number | null;
};

export type ClimbWeek = {
  weekNo: number;
  startDate: string;
  targetLabel: string;
  daysMet: number;
  totalDays: number;
  status: "completed" | "current" | "upcoming";
};

export type StreakCalendarDay = {
  date: string;
  weekday: string;
  logged: boolean;
  isToday: boolean;
};

export type DashboardStatsInput = {
  userId: string;
  division: Division;
  standing: UserStanding | null;
  activities: ActivityInput[];
  challengeDays: ChallengeDayInput[];
  users: UserInput[];
  config: ChallengeConfigInput;
  today: string;
  cumulativeKmOverride?: number;
};

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

function formatTargetBand(min: number, max: number): string {
  const fmt = (n: number) => {
    if (n >= 1000) {
      return `${Math.round(n / 1000)}k`;
    }
    return String(n);
  };
  return `${fmt(min)}–${fmt(max)}`;
}

function weekdayLabel(date: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const parsed = new Date(`${date}T12:00:00Z`);
  return days[parsed.getUTCDay()]!.slice(0, 1);
}

export function computePointsBreakdown(
  userId: string,
  activities: ActivityInput[],
  challengeDays: ChallengeDayInput[],
): Pick<PointsBreakdown, "targetPoints" | "pushPoints"> {
  const dayMap = buildChallengeDayMap(challengeDays);
  let targetPoints = 0;
  let pushPoints = 0;

  for (const activity of activities) {
    if (activity.userId !== userId || activity.status !== "approved") {
      continue;
    }

    const day = dayMap.get(activity.activityDate);
    if (!day) {
      continue;
    }

    const met = activity.steps >= day.targetSteps;
    const targetPart = met ? day.dayRate : 0;
    targetPoints += targetPart;
    pushPoints += activity.basePoints - targetPart;
  }

  return { targetPoints, pushPoints };
}

export function computeLoggingStreaks(
  loggedDates: Set<string>,
  challengeDayDates: string[],
  today: string,
): { current: number; longest: number } {
  const sorted = [...challengeDayDates].sort();
  let longest = 0;
  let run = 0;

  for (const date of sorted) {
    if (date > today) {
      break;
    }

    if (loggedDates.has(date)) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (date < today) {
      run = 0;
    }
  }

  let current = 0;
  const pastAndToday = sorted.filter((date) => date <= today);

  for (let i = pastAndToday.length - 1; i >= 0; i -= 1) {
    const date = pastAndToday[i]!;

    if (date === today && !loggedDates.has(date)) {
      continue;
    }

    if (loggedDates.has(date)) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

export function computeDashboardStats(input: DashboardStatsInput): {
  points: PointsBreakdown;
  aggregates: DashboardAggregates;
  climbWeeks: ClimbWeek[];
  streakCalendar: StreakCalendarDay[];
} {
  const {
    userId,
    standing,
    activities,
    challengeDays,
    config,
    today,
  } = input;

  const dayMap = buildChallengeDayMap(challengeDays);
  const weekDates = buildWeekDates(challengeDays);
  const approved = activities.filter(
    (activity) => activity.userId === userId && activity.status === "approved",
  );

  const { targetPoints, pushPoints } = computePointsBreakdown(
    userId,
    activities,
    challengeDays,
  );

  const consistencyPoints = standing?.breakdown.consistency ?? 0;
  const starPoints =
    (standing?.breakdown.starDay ?? 0) + (standing?.breakdown.weekStar ?? 0);
  const base = targetPoints;
  const bonus = pushPoints + consistencyPoints + starPoints;
  const total = standing?.total ?? base + bonus;

  const points: PointsBreakdown = {
    targetPoints,
    pushPoints,
    consistencyPoints,
    starPoints,
    base,
    bonus,
    total,
  };

  let cumulativeSteps = 0;
  let cumulativeKm = 0;
  let targetMetDays = 0;
  let beastDays = 0;
  let bestDaySteps = 0;
  let bestDayPct = 0;

  const loggedDates = new Set<string>();
  const daysMetByWeek = new Map<number, number>();

  for (const activity of approved) {
    const day = dayMap.get(activity.activityDate);
    if (!day) {
      continue;
    }

    loggedDates.add(activity.activityDate);
    cumulativeSteps += activity.steps;

    if (activity.steps >= day.targetSteps) {
      targetMetDays += 1;
      daysMetByWeek.set(
        day.weekNo,
        (daysMetByWeek.get(day.weekNo) ?? 0) + 1,
      );
    }

    if (isBeastMode(activity.steps, day.targetSteps, config.beastMultiplier)) {
      beastDays += 1;
    }

    if (activity.steps > bestDaySteps) {
      bestDaySteps = activity.steps;
    }

    const pct = day.targetSteps > 0 ? (activity.steps / day.targetSteps) * 100 : 0;
    if (pct > bestDayPct) {
      bestDayPct = pct;
    }
  }

  cumulativeKm =
    input.cumulativeKmOverride ??
    Math.round(cumulativeSteps * 0.000762 * 1000) / 1000;

  let perfectWeeks = 0;
  for (const [weekNo, dates] of weekDates) {
    const weekEnd = [...dates].sort().at(-1)!;
    if (weekEnd >= today) {
      continue;
    }
    const daysInWeek = dates.length;
    const met = daysMetByWeek.get(weekNo) ?? 0;
    if (met >= daysInWeek) {
      perfectWeeks += 1;
    }
  }

  const challengeDayDates = challengeDays.map((day) => day.date).sort();
  const challengeTotalDays = challengeDayDates.length;
  const pastDays = challengeDayDates.filter((date) => date <= today);
  const challengeDayIndex = pastDays.length;

  const streaks = computeLoggingStreaks(loggedDates, challengeDayDates, today);

  const climbWeeks: ClimbWeek[] = [];
  const currentWeekNo =
    challengeDays.find((day) => day.date === today)?.weekNo ??
    challengeDays.filter((day) => day.date <= today).at(-1)?.weekNo ??
    1;

  for (const weekNo of [1, 2, 3, 4]) {
    const dates = weekDates.get(weekNo) ?? [];
    if (dates.length === 0) {
      continue;
    }

    const sorted = [...dates].sort();
    const targets = sorted.map((date) => dayMap.get(date)!.targetSteps);
    const minTarget = Math.min(...targets);
    const maxTarget = Math.max(...targets);
    const totalDays = dates.length;
    const daysMet = daysMetByWeek.get(weekNo) ?? 0;
    const weekStart = sorted[0]!;

    let status: ClimbWeek["status"] = "upcoming";
    if (weekNo < currentWeekNo) {
      status = "completed";
    } else if (weekNo === currentWeekNo) {
      status = "current";
    } else if (weekStart <= today) {
      status = "current";
    }

    climbWeeks.push({
      weekNo,
      startDate: weekStart,
      targetLabel: formatTargetBand(minTarget, maxTarget),
      daysMet,
      totalDays,
      status,
    });
  }

  const recentDates = challengeDayDates
    .filter((date) => date <= today)
    .slice(-7);

  while (recentDates.length < 7 && recentDates.length > 0) {
    const first = recentDates[0]!;
    const prev = new Date(`${first}T12:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevStr = prev.toISOString().slice(0, 10);
    recentDates.unshift(prevStr);
  }

  const streakCalendar: StreakCalendarDay[] = recentDates.slice(-7).map((date) => ({
    date,
    weekday: weekdayLabel(date),
    logged: loggedDates.has(date),
    isToday: date === today,
  }));

  const aggregates: DashboardAggregates = {
    cumulativeSteps,
    cumulativeKm,
    targetMetDays,
    beastDays,
    currentLoggingStreak: streaks.current,
    longestLoggingStreak: streaks.longest,
    bestDaySteps,
    bestDayPct: Math.round(bestDayPct),
    perfectWeeks,
    starDayCount: standing?.starDayCount ?? 0,
    starWeekCount: standing?.weekStarCount ?? 0,
    challengeDayIndex,
    challengeTotalDays,
  };

  return {
    points,
    aggregates,
    climbWeeks,
    streakCalendar,
  };
}

export function computeRankChase(
  standing: UserStanding | null,
  divisionStandings: UserStanding[],
): RankChase {
  if (!standing) {
    return { rank: 0, participantCount: 0, pointsToRankAbove: null };
  }

  const sorted = [...divisionStandings].sort((a, b) => a.rank - b.rank);
  const above = sorted.find((entry) => entry.rank === standing.rank - 1);

  return {
    rank: standing.rank,
    participantCount: divisionStandings.length,
    pointsToRankAbove:
      above && above.total > standing.total ? above.total - standing.total : null,
  };
}

export function pushBonusCallout(
  division: Division,
  pushPoints: number,
): string {
  const credit = pushPoints.toLocaleString("en-IN");

  if (division === "riser") {
    return `Riser bonus: every step past 10,000 earns 2× the week's points. That's where your +${credit} push came from — your fastest-growing points source.`;
  }

  if (division === "strider") {
    return `Strider bonus: every step past 10,000 keeps earning (per 2,000). That's where your +${credit} push came from — your fastest-growing points source.`;
  }

  return `Elite bonus: you earn the full rate all the way to 15,000 — the widest fast band. That's where your +${credit} push came from — your fastest-growing points source.`;
}
