import { and, eq } from "drizzle-orm";
import { cache } from "react";

import { appConfig } from "@/config";
import { uploadBlob, deleteBlobUrl } from "@/lib/blob-storage";
import { getDb } from "@/db";
import {
  activities,
  challengeConfig,
  challengeDay,
  users,
} from "@/db/schema";
import {
  compareDateStrings,
  getTodayDateString,
  isDateWithinRange,
  isFutureDate,
  isLoggableChallengeDate,
} from "@/lib/dates";
import { computeBasePoints, isBeastMode } from "@/lib/scoring";
import { computeStandings, getStandingForUser } from "@/lib/standings-service";
import {
  filterStandingsByDivision,
} from "@/lib/standings";
import { parseDivision, type Division } from "@/lib/divisions";
import { getDivisionForDate } from "@/lib/division-as-of-cutover";
import { distanceKmToStorage, parseDistanceKm } from "@/lib/distance";
import {
  computeAllUserAchievements,
  selectBadgePreview,
} from "@/lib/achievement-badges";
import {
  computeDashboardStats,
  computeRankChase,
  pushBonusCallout,
  type ClimbWeek,
  type PointsBreakdown,
  type RankChase,
  type StreakCalendarDay,
} from "@/lib/dashboard-stats";
import { loadScoringDataset } from "@/lib/scoring-dataset";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ChallengeDayRow = {
  date: string;
  weekNo: number;
  targetSteps: number;
  dayRate: number;
};

export type ActivityRecord = {
  id: string;
  activityDate: string;
  steps: number;
  distanceKm: string;
  basePoints: number;
  status: string;
  adminNote: string | null;
  photoUrl: string;
  targetPoints?: number;
  pushPoints?: number;
  targetPct?: number;
};

export type DashboardDay = ChallengeDayRow & {
  activity?: ActivityRecord & {
    isBeast: boolean;
    isStarOfDay: boolean;
  };
  state: "future" | "not_logged" | "logged" | "pending" | "disapproved";
  canLog: boolean;
};

export type WeekStat = {
  weekNo: number;
  daysWalked: number;
  totalSteps: number;
  totalDistanceKm: number;
};

function buildWeekStats(
  loggedActivities: Array<
    DashboardDay & { activity: NonNullable<DashboardDay["activity"]> }
  >,
): WeekStat[] {
  const totals = new Map<
    number,
    { daysWalked: number; totalSteps: number; totalDistanceKm: number }
  >();

  for (const weekNo of [1, 2, 3, 4]) {
    totals.set(weekNo, { daysWalked: 0, totalSteps: 0, totalDistanceKm: 0 });
  }

  for (const day of loggedActivities) {
    if (day.activity.status !== "approved") {
      continue;
    }

    const entry = totals.get(day.weekNo)!;
    entry.daysWalked += 1;
    entry.totalSteps += day.activity.steps;
    entry.totalDistanceKm += Number(day.activity.distanceKm);
  }

  return [1, 2, 3, 4].map((weekNo) => ({
    weekNo,
    ...totals.get(weekNo)!,
  }));
}

export class ActivityError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function validateActivityPhoto(file: File) {
  if (file.size === 0) {
    throw new ActivityError("Photo is required.", 400);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ActivityError("Photo must be 5 MB or smaller.", 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ActivityError("Photo must be JPG, PNG, or WebP.", 400);
  }
}

export function validateActivityMetrics(
  steps: number,
  distanceKmInput: string | number,
) {
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new ActivityError("Steps must be a whole number greater than 0.", 400);
  }

  let distanceKm: number;
  try {
    distanceKm = parseDistanceKm(distanceKmInput);
  } catch (error) {
    throw new ActivityError(
      error instanceof Error ? error.message : "Invalid distance.",
      400,
    );
  }

  if (distanceKm <= 0) {
    throw new ActivityError("Distance must be greater than 0 km.", 400);
  }

  return distanceKm;
}

export async function getChallengeWindow() {
  const db = getDb();
  const [configRow] = await db.select().from(challengeConfig).limit(1);

  if (!configRow) {
    throw new Error("Challenge config is not seeded.");
  }

  const days = await db
    .select({
      date: challengeDay.date,
      weekNo: challengeDay.weekNo,
      targetSteps: challengeDay.targetSteps,
      dayRate: challengeDay.dayRate,
    })
    .from(challengeDay)
    .orderBy(challengeDay.date);

  return {
    config: configRow,
    days,
    today: getTodayDateString(appConfig.timezone),
  };
}

function buildStarOfDayKeys(
  approvedActivities: {
    userId: string;
    activityDate: string;
    steps: number;
  }[],
  userDivisions: Map<string, Division>,
  today: string,
): Set<string> {
  const stepsByDateDivision = new Map<string, Map<string, number>>();

  for (const activity of approvedActivities) {
    if (activity.steps <= 0) {
      continue;
    }

    const division = getDivisionForDate(
      activity.userId,
      userDivisions.get(activity.userId) ?? "strider",
      activity.activityDate,
    );
    const bucketKey = `${activity.activityDate}:${division}`;
    const dateMap = stepsByDateDivision.get(bucketKey) ?? new Map();
    dateMap.set(activity.userId, activity.steps);
    stepsByDateDivision.set(bucketKey, dateMap);
  }

  const winners = new Set<string>();

  for (const [bucketKey, userSteps] of stepsByDateDivision) {
    const date = bucketKey.slice(0, 10);
    if (compareDateStrings(date, today) >= 0) {
      continue;
    }

    const maxSteps = Math.max(...userSteps.values(), 0);
    if (maxSteps <= 0) {
      continue;
    }

    for (const [userId, steps] of userSteps) {
      if (steps === maxSteps) {
        winners.add(`${date}:${userId}`);
      }
    }
  }

  return winners;
}

async function loadUserDivisionMap(db: ReturnType<typeof getDb>) {
  const rows = await db.select({ id: users.id, division: users.division }).from(users);
  return new Map(rows.map((row) => [row.id, parseDivision(row.division)]));
}

export const getActivitiesDashboard = cache(async function getActivitiesDashboard(
  userId: string,
) {
  const db = getDb();
  const { config, days, today } = await getChallengeWindow();

  const [userActivities, approvedForStars, standings, userDivisions, dataset] =
    await Promise.all([
    db
      .select({
        id: activities.id,
        activityDate: activities.activityDate,
        steps: activities.steps,
        distanceKm: activities.distanceKm,
        basePoints: activities.basePoints,
        status: activities.status,
        adminNote: activities.adminNote,
        photoUrl: activities.photoUrl,
      })
      .from(activities)
      .where(eq(activities.userId, userId)),
    db
      .select({
        userId: activities.userId,
        activityDate: activities.activityDate,
        steps: activities.steps,
        status: activities.status,
      })
      .from(activities),
    computeStandings(),
    loadUserDivisionMap(db),
    loadScoringDataset(),
  ]);

  const activityByDate = new Map(
    userActivities.map((activity) => [activity.activityDate, activity]),
  );
  const starOfDayKeys = buildStarOfDayKeys(
    approvedForStars.filter((activity) => activity.status === "approved"),
    userDivisions,
    today,
  );
  const standing = getStandingForUser(standings, userId);
  const divisionStandings = standing
    ? filterStandingsByDivision(standings, standing.division)
    : [];
  const challengeEnded = today > config.endDate;

  const dayRows: DashboardDay[] = days
    .slice()
    .sort((a, b) => compareDateStrings(b.date, a.date))
    .map((day) => {
      const activity = activityByDate.get(day.date);
      const isFuture = isFutureDate(day.date, appConfig.timezone);
      const inWindow = isDateWithinRange(
        day.date,
        config.startDate,
        config.endDate,
      );
      const canLog =
        inWindow &&
        !activity &&
        isLoggableChallengeDate(day.date, config.startDate, config.endDate, {
          timezone: appConfig.timezone,
          allowOpenChallengeLogging: appConfig.allowOpenChallengeLogging,
        });

      let state: DashboardDay["state"] = "not_logged";
      if (isFuture) {
        state = "future";
      } else if (activity?.status === "disapproved") {
        state = "disapproved";
      } else if (activity?.status === "pending") {
        state = "pending";
      } else if (activity) {
        state = "logged";
      }

      return {
        ...day,
        activity: activity
          ? (() => {
              const met = activity.steps >= day.targetSteps;
              const targetPart = met ? day.dayRate : 0;
              const targetPct =
                day.targetSteps > 0
                  ? Math.round((activity.steps / day.targetSteps) * 100)
                  : 0;
              return {
                ...activity,
                targetPoints: targetPart,
                pushPoints: activity.basePoints - targetPart,
                targetPct,
                isBeast:
                  activity.status === "approved" &&
                  isBeastMode(
                    activity.steps,
                    day.targetSteps,
                    config.beastMultiplier,
                  ),
                isStarOfDay:
                  activity.status === "approved" &&
                  starOfDayKeys.has(`${day.date}:${userId}`),
              };
            })()
          : undefined,
        state,
        canLog,
      };
    });

  const loggedActivities = dayRows
    .filter((day): day is DashboardDay & { activity: NonNullable<DashboardDay["activity"]> } =>
      Boolean(day.activity),
    )
    .sort((a, b) => compareDateStrings(b.date, a.date));

  const weekStats = buildWeekStats(loggedActivities);

  const cumulativeKm = loggedActivities
    .filter((day) => day.activity.status === "approved")
    .reduce((sum, day) => sum + Number(day.activity.distanceKm), 0);

  const dashboardStats = computeDashboardStats({
    userId,
    division: standing?.division ?? "strider",
    standing: standing ?? null,
    activities: dataset.activities,
    challengeDays: dataset.challengeDays,
    users: dataset.users,
    config: dataset.config,
    today,
    cumulativeKmOverride: cumulativeKm,
  });

  const rankChase = computeRankChase(
    standing ?? null,
    divisionStandings,
  );

  const distanceByActivity = new Map<string, number>();
  for (const activity of userActivities) {
    if (activity.status === "approved") {
      distanceByActivity.set(
        `${userId}:${activity.activityDate}`,
        Number(activity.distanceKm),
      );
    }
  }
  for (const activity of dataset.activities) {
    if (activity.status === "approved" && activity.userId !== userId) {
      distanceByActivity.set(
        `${activity.userId}:${activity.activityDate}`,
        Math.round(activity.steps * 0.000762 * 1000) / 1000,
      );
    }
  }

  const achievementBundle = computeAllUserAchievements(
    userId,
    dataset,
    standing ?? null,
    cumulativeKm,
    distanceByActivity,
  );

  const badgePreview = selectBadgePreview(achievementBundle.achievements);

  const currentWeek =
    days.find((day) => day.date === today)?.weekNo ??
    days.filter((day) => day.date <= today).at(-1)?.weekNo ??
    1;

  return {
    today,
    challengeEnded,
    currentWeek,
    challengeDayIndex: dashboardStats.aggregates.challengeDayIndex,
    challengeTotalDays: dashboardStats.aggregates.challengeTotalDays,
    standing,
    participantCount: divisionStandings.length,
    division: standing?.division ?? "strider",
    points: dashboardStats.points,
    rankChase,
    aggregates: dashboardStats.aggregates,
    climbWeeks: dashboardStats.climbWeeks,
    streakCalendar: dashboardStats.streakCalendar,
    pushCallout: pushBonusCallout(
      standing?.division ?? "strider",
      dashboardStats.points.pushPoints,
      today,
    ),
    achievements: achievementBundle.achievements,
    badgePreview,
    badgeEarnedCount: achievementBundle.earnedCount,
    badgeTotalCount: achievementBundle.totalCount,
    dayRows,
    loggedActivities,
    weekStats,
  };
});

export async function getLogContext(userId: string) {
  const db = getDb();
  const { config, days, today } = await getChallengeWindow();

  const logged = await db
    .select({ activityDate: activities.activityDate })
    .from(activities)
    .where(eq(activities.userId, userId));

  const loggedDates = new Set(logged.map((row) => row.activityDate));

  const selectableDays = days.filter((day) => {
    if (loggedDates.has(day.date)) {
      return false;
    }

    return isLoggableChallengeDate(day.date, config.startDate, config.endDate, {
      timezone: appConfig.timezone,
      allowOpenChallengeLogging: appConfig.allowOpenChallengeLogging,
    });
  });

  const defaultDate =
    selectableDays.find((day) => day.date === today)?.date ??
    selectableDays[0]?.date ??
    today;

  return {
    today,
    defaultDate,
    selectableDays,
    loggedDates: [...loggedDates],
    challengeStartDate: config.startDate,
    allowOpenChallengeLogging: appConfig.allowOpenChallengeLogging,
  };
}

export type EditActivityContext = {
  activityId: string;
  activityDate: string;
  steps: number;
  distanceKm: string;
  photoUrl: string;
  day: ChallengeDayRow;
  challengeStartDate: string;
  allowOpenChallengeLogging: boolean;
};

export async function getEditActivityContext(
  userId: string,
  activityId: string,
): Promise<EditActivityContext | null> {
  const db = getDb();
  const { config, days } = await getChallengeWindow();

  const [activity] = await db
    .select({
      id: activities.id,
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
      photoUrl: activities.photoUrl,
      status: activities.status,
    })
    .from(activities)
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
    .limit(1);

  if (!activity) {
    return null;
  }

  if (activity.status !== "pending") {
    throw new ActivityError(
      "Only activities awaiting approval can be edited.",
      403,
    );
  }

  const day = days.find((entry) => entry.date === activity.activityDate);
  if (!day) {
    throw new ActivityError("Invalid challenge date.", 400);
  }

  return {
    activityId: activity.id,
    activityDate: activity.activityDate,
    steps: activity.steps,
    distanceKm: activity.distanceKm,
    photoUrl: activity.photoUrl,
    day,
    challengeStartDate: config.startDate,
    allowOpenChallengeLogging: appConfig.allowOpenChallengeLogging,
  };
}

export async function createActivity(input: {
  userId: string;
  activityDate: string;
  steps: number;
  distanceKm: string | number;
  photo: File;
}) {
  const db = getDb();
  const { config, days } = await getChallengeWindow();
  const day = days.find((entry) => entry.date === input.activityDate);

  if (!day) {
    throw new ActivityError("Invalid challenge date.", 400);
  }

  if (
    !isDateWithinRange(input.activityDate, config.startDate, config.endDate)
  ) {
    throw new ActivityError("Date is outside the challenge window.", 400);
  }

  if (
    !appConfig.allowOpenChallengeLogging &&
    input.activityDate !== getTodayDateString(appConfig.timezone)
  ) {
    throw new ActivityError("You can only log activity for today.", 400);
  }

  const stepsValue = input.steps;
  const distanceKm = validateActivityMetrics(stepsValue, input.distanceKm);

  validateActivityPhoto(input.photo);

  if (!appConfig.blobReadWriteToken) {
    throw new ActivityError(
      "Photo storage is not configured. Add blobReadWriteToken to src/config.ts.",
      500,
    );
  }

  const [existing] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.userId, input.userId),
        eq(activities.activityDate, input.activityDate),
      ),
    )
    .limit(1);

  if (existing) {
    throw new ActivityError(
      "You already logged activity for this day. Each participant can log once per day.",
      409,
    );
  }

  const extension =
    input.photo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const pathname = `activities/${input.userId}/${input.activityDate}-${Date.now()}.${extension}`;

  const uploaded = await uploadBlob(pathname, input.photo, input.photo.type);

  const [participant] = await db
    .select({
      division: users.division,
      divisionBeforeStage4: users.divisionBeforeStage4,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const division = getDivisionForDate(
    input.userId,
    parseDivision(participant?.division),
    input.activityDate,
    participant?.divisionBeforeStage4
      ? parseDivision(participant.divisionBeforeStage4)
      : null,
  );

  const basePoints = computeBasePoints(
    stepsValue,
    day.targetSteps,
    day.dayRate,
    input.activityDate,
    division,
  );

  const [created] = await db
    .insert(activities)
    .values({
      userId: input.userId,
      activityDate: input.activityDate,
      steps: stepsValue,
      distanceKm: distanceKmToStorage(distanceKm),
      photoUrl: uploaded.url,
      status: "pending",
      basePoints,
    })
    .returning({
      id: activities.id,
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
      basePoints: activities.basePoints,
      status: activities.status,
      photoUrl: activities.photoUrl,
    });

  const approvedActivities = await db
    .select({
      userId: activities.userId,
      activityDate: activities.activityDate,
      steps: activities.steps,
      status: activities.status,
    })
    .from(activities);

  const today = getTodayDateString(appConfig.timezone);
  const userDivisions = await loadUserDivisionMap(db);
  const starOfDayKeys = buildStarOfDayKeys(
    approvedActivities.filter((activity) => activity.status === "approved"),
    userDivisions,
    today,
  );
  const standings = await computeStandings();
  const standing = getStandingForUser(standings, input.userId) ?? null;

  return {
    activity: created,
    day,
    isStarOfDay: starOfDayKeys.has(`${input.activityDate}:${input.userId}`),
    isBeast: isBeastMode(
      stepsValue,
      day.targetSteps,
      config.beastMultiplier,
    ),
    standing,
  };
}

export async function updatePendingActivity(input: {
  activityId: string;
  userId: string;
  steps: number;
  distanceKm: string | number;
  photo?: File | null;
}) {
  const db = getDb();
  const { config } = await getChallengeWindow();

  const [existing] = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
      photoUrl: activities.photoUrl,
      status: activities.status,
    })
    .from(activities)
    .where(and(eq(activities.id, input.activityId), eq(activities.userId, input.userId)))
    .limit(1);

  if (!existing) {
    throw new ActivityError("Activity not found.", 404);
  }

  if (existing.status !== "pending") {
    throw new ActivityError(
      "Only activities awaiting approval can be edited.",
      403,
    );
  }

  const [day] = await db
    .select({
      date: challengeDay.date,
      weekNo: challengeDay.weekNo,
      targetSteps: challengeDay.targetSteps,
      dayRate: challengeDay.dayRate,
    })
    .from(challengeDay)
    .where(eq(challengeDay.date, existing.activityDate))
    .limit(1);

  if (!day) {
    throw new ActivityError("Invalid challenge date.", 400);
  }

  const [participant] = await db
    .select({
      division: users.division,
      divisionBeforeStage4: users.divisionBeforeStage4,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  const division = getDivisionForDate(
    input.userId,
    parseDivision(participant?.division),
    existing.activityDate,
    participant?.divisionBeforeStage4
      ? parseDivision(participant.divisionBeforeStage4)
      : null,
  );

  const stepsValue = input.steps;
  const distanceKm = validateActivityMetrics(stepsValue, input.distanceKm);

  if (input.photo) {
    validateActivityPhoto(input.photo);
  }

  if (!appConfig.blobReadWriteToken) {
    throw new ActivityError(
      "Photo storage is not configured. Add blobReadWriteToken to src/config.ts.",
      500,
    );
  }

  let nextPhotoUrl = existing.photoUrl;

  if (input.photo) {
    const extension =
      input.photo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const pathname = `activities/${input.userId}/${existing.activityDate}-${Date.now()}.${extension}`;
    const uploaded = await uploadBlob(pathname, input.photo, input.photo.type);
    nextPhotoUrl = uploaded.url;
    await deleteBlobUrl(existing.photoUrl);
  }

  const basePoints = computeBasePoints(
    stepsValue,
    day.targetSteps,
    day.dayRate,
    existing.activityDate,
    division,
  );

  const [updated] = await db
    .update(activities)
    .set({
      steps: stepsValue,
      distanceKm: distanceKmToStorage(distanceKm),
      photoUrl: nextPhotoUrl,
      basePoints,
      status: "pending",
      adminNote: null,
      editedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, existing.id))
    .returning({
      id: activities.id,
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
      basePoints: activities.basePoints,
      status: activities.status,
      photoUrl: activities.photoUrl,
    });

  return {
    activity: updated!,
    day,
    isBeast: isBeastMode(stepsValue, day.targetSteps, config.beastMultiplier),
  };
}
