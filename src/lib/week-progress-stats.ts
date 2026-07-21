import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activities, users } from "@/db/schema";
import { ActivityError, getChallengeWindow } from "@/lib/activities-service";
import {
  computeLoggingStreaks,
  computePointsBreakdown,
  pushBonusCallout,
} from "@/lib/dashboard-stats";
import { compareDateStrings, formatDisplayDate } from "@/lib/dates";
import type { Division } from "@/lib/divisions";
import { divisionLabel, parseDivision } from "@/lib/divisions";
import { computeDayScoringSnapshot, computeWeekScoringSnapshot } from "@/lib/period-scoring";
import { isBeastMode } from "@/lib/scoring";
import { loadScoringDataset } from "@/lib/scoring-dataset";
import {
  computeStandingsFromData,
  filterStandingsByDivision,
  getStandingForUser,
} from "@/lib/standings";
import type { WeekProgressCertificateInput } from "@/lib/week-progress-template";

function formatTargetBand(minTarget: number, maxTarget: number): string {
  if (minTarget === maxTarget) {
    return `${(minTarget / 1000).toFixed(0)}k`;
  }

  return `${(minTarget / 1000).toFixed(0)}k–${(maxTarget / 1000).toFixed(0)}k`;
}

function formatWeekDateRange(startDate: string, endDate: string): string {
  const start = formatDisplayDate(startDate).replace(/, \d{4}$/, "");
  const end = formatDisplayDate(endDate).replace(/, \d{4}$/, "");
  return `${start} – ${end}`;
}

function titleCaseName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function weekdayLetter(date: string): string {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return days[parsed.getUTCDay()] ?? "D";
}

function streakAsOf(
  loggedDates: Set<string>,
  challengeDayDates: string[],
  asOfDate: string,
): number {
  const eligible = challengeDayDates.filter((date) => date <= asOfDate);
  return computeLoggingStreaks(loggedDates, eligible, asOfDate).current;
}

function rankAsOf(
  userId: string,
  division: Division,
  asOfDate: string,
  dataset: Awaited<ReturnType<typeof loadScoringDataset>>,
): number {
  const filtered = dataset.activities.filter(
    (activity) =>
      activity.status === "approved" && activity.activityDate <= asOfDate,
  );

  const standings = computeStandingsFromData({
    ...dataset,
    activities: filtered,
  });

  const divisionStandings = filterStandingsByDivision(standings, division);
  const standing = getStandingForUser(divisionStandings, userId);
  return standing?.rank ?? divisionStandings.length;
}

function weekPushNote(
  division: Division,
  pushPoints: number,
  asOfDate: string,
): string {
  const credit = pushPoints.toLocaleString("en-IN");
  const full = pushBonusCallout(division, pushPoints, asOfDate);

  if (full.includes("2×") || full.includes("2x")) {
    return `Riser bonus: every step past 10,000 counted 2× this week — that's your +${credit} push points.`;
  }

  if (division === "strider") {
    return `Strider bonus: steps past 10,000 keep earning this week — that's your +${credit} push points.`;
  }

  if (division === "elite") {
    return `Elite bonus: full rate to 15,000 steps this week — that's your +${credit} push points.`;
  }

  return full.length > 120 ? `${full.slice(0, 117)}…` : full;
}

function buildHeadline(input: {
  daysMet: number;
  totalDays: number;
  peakSteps: number;
  bestDayBeforeWeek: number;
  streakDelta: number;
  streakAtWeekEnd: number;
  rankDelta: number;
  rank: number;
  division: Division;
  weekPoints: number;
  totalSteps: number;
}): { headline: string; headlineSubline: string } {
  if (input.daysMet === input.totalDays && input.totalDays > 0) {
    const pbPart =
      input.peakSteps > input.bestDayBeforeWeek
        ? ` and a new personal best of ${input.peakSteps.toLocaleString("en-IN")} steps.`
        : ".";
    return {
      headline: `Perfect week — ${input.daysMet} for ${input.totalDays}.`,
      headlineSubline: `Every target hit${pbPart}`,
    };
  }

  if (input.peakSteps > input.bestDayBeforeWeek && input.peakSteps > 0) {
    return {
      headline: "New personal best this week.",
      headlineSubline: `Your best day hit ${input.peakSteps.toLocaleString("en-IN")} steps.`,
    };
  }

  if (input.streakDelta > 0 && [3, 7, 14, 21, 29].includes(input.streakAtWeekEnd)) {
    return {
      headline: `${input.streakAtWeekEnd}-day streak milestone.`,
      headlineSubline: "Consistency is compounding — keep the chain alive.",
    };
  }

  if (input.rankDelta >= 2) {
    return {
      headline: `Up ${input.rankDelta} places in ${divisionLabel(input.division)}.`,
      headlineSubline: `Now ranked #${input.rank} with +${input.weekPoints} points this week.`,
    };
  }

  return {
    headline: "Solid week — keep climbing.",
    headlineSubline: `${input.daysMet}/${input.totalDays} target days · ${input.totalSteps.toLocaleString("en-IN")} steps logged.`,
  };
}

function buildWeekBadges(input: {
  daysMet: number;
  totalDays: number;
  beastDays: number;
  starDays: number;
  isWeekStar: boolean;
  streakAtWeekStart: number;
  streakAtWeekEnd: number;
  peakSteps: number;
  bestDayBeforeWeek: number;
}): WeekProgressCertificateInput["badgesUnlocked"] {
  const badges: WeekProgressCertificateInput["badgesUnlocked"] = [];

  if (input.daysMet === input.totalDays && input.totalDays > 0) {
    badges.push({ name: "Perfect Week", type: "perfect" });
  }

  for (const tier of [29, 21, 14, 7, 3]) {
    if (input.streakAtWeekStart < tier && input.streakAtWeekEnd >= tier) {
      badges.push({ name: `${tier}-Day Streak`, type: "streak" });
      break;
    }
  }

  if (input.beastDays > 0) {
    badges.push({
      name: input.beastDays === 1 ? "Beast ×1" : `Beast ×${input.beastDays}`,
      type: "beast",
    });
  }

  if (input.isWeekStar) {
    badges.push({ name: "Star of the Week", type: "star" });
  } else if (input.starDays > 0) {
    badges.push({ name: "Star of the Day", type: "star" });
  }

  if (input.peakSteps > input.bestDayBeforeWeek && input.peakSteps > 0) {
    badges.push({ name: "Personal Best", type: "pb" });
  }

  return badges.slice(0, 4);
}

export async function computeWeekProgressReportData(
  userId: string,
  weekNo: number,
): Promise<WeekProgressCertificateInput> {
  const db = getDb();
  const [{ days, today, config }, dataset] = await Promise.all([
    getChallengeWindow(),
    loadScoringDataset(),
  ]);

  const weekDays = days.filter((day) => day.weekNo === weekNo);
  if (weekDays.length === 0) {
    throw new ActivityError("Challenge week not found.", 404);
  }

  const sortedWeekDays = [...weekDays].sort((a, b) =>
    compareDateStrings(a.date, b.date),
  );
  const weekStart = sortedWeekDays[0]!.date;
  const weekEnd = sortedWeekDays.at(-1)!.date;

  const weekStarted = weekStart <= today;
  if (!weekStarted) {
    throw new ActivityError(
      "Progress reports are available once the week has started.",
      400,
    );
  }

  const [user] = await db
    .select({ name: users.name, division: users.division })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new ActivityError("User not found.", 404);
  }

  const division = parseDivision(user.division);
  const weekDateSet = new Set(sortedWeekDays.map((day) => day.date));

  const approvedActivities = await db
    .select({
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
      basePoints: activities.basePoints,
    })
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.status, "approved")));

  const stepsByDate = new Map<string, number>();
  let totalSteps = 0;
  let totalDistanceKm = 0;
  let beastDays = 0;
  let peakSteps = 0;
  let peakDayLabel = weekdayLetter(sortedWeekDays[0]!.date);
  let bestDayBeforeWeek = 0;

  const dayTargetMap = new Map(sortedWeekDays.map((day) => [day.date, day]));

  for (const activity of approvedActivities) {
    if (activity.activityDate < weekStart) {
      bestDayBeforeWeek = Math.max(bestDayBeforeWeek, activity.steps);
    }

    if (!weekDateSet.has(activity.activityDate)) {
      continue;
    }

    totalSteps += activity.steps;
    totalDistanceKm += Number(activity.distanceKm);
    stepsByDate.set(
      activity.activityDate,
      (stepsByDate.get(activity.activityDate) ?? 0) + activity.steps,
    );

    const day = dayTargetMap.get(activity.activityDate);
    if (day && isBeastMode(activity.steps, day.targetSteps, config.beastMultiplier)) {
      beastDays += 1;
    }
  }

  const dailySteps = sortedWeekDays.map((day) => {
    const steps = stepsByDate.get(day.date) ?? 0;
    if (steps > peakSteps) {
      peakSteps = steps;
      peakDayLabel = weekdayLetter(day.date);
    }

    return {
      label: weekdayLetter(day.date),
      steps,
      targetSteps: day.targetSteps,
      metTarget: steps >= day.targetSteps,
    };
  });

  const daysMet = dailySteps.filter((day) => day.metTarget).length;
  const targets = sortedWeekDays.map((day) => day.targetSteps);
  const targetLow = Math.min(...targets);
  const targetHigh = Math.max(...targets);

  const weekActivities = dataset.activities.filter(
    (activity) =>
      activity.userId === userId &&
      activity.status === "approved" &&
      weekDateSet.has(activity.activityDate),
  );

  const { targetPoints, pushPoints } = computePointsBreakdown(
    userId,
    weekActivities,
    days,
  );

  const weekSnapshot = computeWeekScoringSnapshot({
    weekNo,
    users: dataset.users,
    activities: dataset.activities,
    challengeDays: days,
    config,
  });

  const weekEntry = weekSnapshot?.entries.find((entry) => entry.userId === userId);
  const consistencyPoints = weekEntry?.consistencyPoints ?? 0;
  const isWeekStar = weekEntry?.isWeekStar ?? false;

  let starPoints = 0;
  let starDays = 0;
  for (const day of sortedWeekDays) {
    const daySnapshot = computeDayScoringSnapshot({
      activityDate: day.date,
      users: dataset.users,
      activities: dataset.activities,
      challengeDays: days,
      config,
    });
    const winner = daySnapshot?.entries.find(
      (entry) => entry.userId === userId && entry.isStarWinner,
    );
    if (winner) {
      starDays += 1;
      starPoints += config.starOfDayPoints;
    }
  }

  if (isWeekStar) {
    starPoints += config.starOfWeekPoints;
  }

  const weekPoints = targetPoints + pushPoints + consistencyPoints + starPoints;

  const loggedDates = new Set(
    approvedActivities.map((activity) => activity.activityDate),
  );
  const challengeDayDates = days.map((day) => day.date).sort();

  const dayBeforeWeek =
    challengeDayDates.filter((date) => date < weekStart).at(-1) ?? weekStart;
  const streakAtWeekStart = streakAsOf(
    loggedDates,
    challengeDayDates,
    dayBeforeWeek,
  );
  const streakAtWeekEnd = streakAsOf(loggedDates, challengeDayDates, weekEnd);
  const currentStreak = streakAtWeekEnd;

  const rank = rankAsOf(userId, division, weekEnd, dataset);
  const prevWeekEnd =
    days
      .filter((day) => day.weekNo === weekNo - 1)
      .map((day) => day.date)
      .sort()
      .at(-1) ?? dayBeforeWeek;
  const prevRank =
    weekNo > 1 ? rankAsOf(userId, division, prevWeekEnd, dataset) : rank;
  const rankDelta = Math.max(0, prevRank - rank);

  const { headline, headlineSubline } = buildHeadline({
    daysMet,
    totalDays: sortedWeekDays.length,
    peakSteps,
    bestDayBeforeWeek,
    streakDelta: streakAtWeekEnd - streakAtWeekStart,
    streakAtWeekEnd,
    rankDelta,
    rank,
    division,
    weekPoints,
    totalSteps,
  });

  const badgesUnlocked = buildWeekBadges({
    daysMet,
    totalDays: sortedWeekDays.length,
    beastDays,
    starDays,
    isWeekStar,
    streakAtWeekStart,
    streakAtWeekEnd,
    peakSteps,
    bestDayBeforeWeek,
  });

  return {
    recipientName: titleCaseName(user.name),
    division,
    weekNo,
    weekLabel: `Week ${weekNo} of 4`,
    dateRange: formatWeekDateRange(weekStart, weekEnd),
    targetLabel: formatTargetBand(targetLow, targetHigh),
    targetLow,
    targetHigh,
    daysMet,
    totalDays: sortedWeekDays.length,
    totalSteps,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    dailySteps,
    peakSteps,
    peakDayLabel,
    weekPoints,
    basePoints: targetPoints,
    pushPoints,
    consistencyPoints,
    starPoints,
    badgesUnlocked,
    rank,
    rankDelta,
    currentStreak,
    headline,
    headlineSubline,
    pushNote: weekPushNote(division, pushPoints, weekEnd),
  };
}
