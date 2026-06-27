import { and, asc, desc, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  activities,
  challengeDay,
  users,
} from "@/db/schema";
import {
  ActivityError,
  getChallengeWindow,
} from "@/lib/activities-service";
import {
  isDateWithinRange,
  isFutureDate,
} from "@/lib/dates";
import { computeBasePoints } from "@/lib/scoring";
import { deleteUserAndData } from "@/lib/user-service";
import { appConfig } from "@/config";

export type AdminActivityRow = {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  activityDate: string;
  steps: number;
  basePoints: number;
  status: string;
  adminNote: string | null;
  photoUrl: string;
  targetSteps: number;
  weekNo: number;
  dayRate: number;
  updatedAt: Date;
};

export type AdminUserRow = {
  id: string;
  name: string;
  mobile: string;
  role: string;
  createdAt: Date;
};

export async function listAdminActivities(filters?: {
  userId?: string;
  date?: string;
  status?: string;
}): Promise<AdminActivityRow[]> {
  const db = getDb();
  const conditions = [];

  if (filters?.userId) {
    conditions.push(eq(activities.userId, filters.userId));
  }
  if (filters?.date) {
    conditions.push(eq(activities.activityDate, filters.date));
  }
  if (filters?.status) {
    conditions.push(eq(activities.status, filters.status));
  }

  const rows = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      userName: users.name,
      userMobile: users.mobile,
      activityDate: activities.activityDate,
      steps: activities.steps,
      basePoints: activities.basePoints,
      status: activities.status,
      adminNote: activities.adminNote,
      photoUrl: activities.photoUrl,
      targetSteps: challengeDay.targetSteps,
      weekNo: challengeDay.weekNo,
      dayRate: challengeDay.dayRate,
      updatedAt: activities.updatedAt,
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .innerJoin(challengeDay, eq(activities.activityDate, challengeDay.date))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activities.activityDate), asc(users.name));

  return rows;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const db = getDb();

  return db
    .select({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));
}

export async function updateAdminActivity(
  activityId: string,
  adminUserId: string,
  input: {
    status?: "approved" | "disapproved";
    adminNote?: string | null;
    steps?: number;
    activityDate?: string;
  },
) {
  const db = getDb();
  const { config } = await getChallengeWindow();

  const [existing] = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      activityDate: activities.activityDate,
      steps: activities.steps,
      basePoints: activities.basePoints,
      status: activities.status,
    })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);

  if (!existing) {
    throw new ActivityError("Activity not found.", 404);
  }

  const nextDate = input.activityDate ?? existing.activityDate;
  const nextSteps = input.steps ?? existing.steps;

  if (!Number.isInteger(nextSteps) || nextSteps < 0) {
    throw new ActivityError("Steps must be a whole number ≥ 0.", 400);
  }

  const [day] = await db
    .select({
      date: challengeDay.date,
      targetSteps: challengeDay.targetSteps,
      dayRate: challengeDay.dayRate,
    })
    .from(challengeDay)
    .where(eq(challengeDay.date, nextDate))
    .limit(1);

  if (!day) {
    throw new ActivityError("Invalid challenge date.", 400);
  }

  if (!isDateWithinRange(nextDate, config.startDate, config.endDate)) {
    throw new ActivityError("Date is outside the challenge window.", 400);
  }

  if (isFutureDate(nextDate, appConfig.timezone)) {
    throw new ActivityError("Future dates are not allowed.", 400);
  }

  if (nextDate !== existing.activityDate) {
    const [conflict] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          eq(activities.userId, existing.userId),
          eq(activities.activityDate, nextDate),
          ne(activities.id, activityId),
        ),
      )
      .limit(1);

    if (conflict) {
      throw new ActivityError("This user already has an activity on that date.", 409);
    }
  }

  const nextStatus = input.status ?? existing.status;
  if (nextStatus === "disapproved" && input.adminNote === undefined) {
    // Allow disapprove without note, but empty string is fine
  }

  const previousBasePoints = existing.basePoints;
  const nextBasePoints = computeBasePoints(
    nextSteps,
    day.targetSteps,
    day.dayRate,
  );

  const updates: {
    activityDate: string;
    steps: number;
    basePoints: number;
    status: string;
    editedBy: string;
    updatedAt: Date;
    adminNote?: string | null;
  } = {
    activityDate: nextDate,
    steps: nextSteps,
    basePoints: nextBasePoints,
    status: nextStatus,
    editedBy: adminUserId,
    updatedAt: new Date(),
  };

  if (input.adminNote !== undefined) {
    updates.adminNote = input.adminNote;
  } else if (nextStatus === "approved") {
    updates.adminNote = null;
  }

  const [updated] = await db
    .update(activities)
    .set(updates)
    .where(eq(activities.id, activityId))
    .returning({
      id: activities.id,
      basePoints: activities.basePoints,
      status: activities.status,
      steps: activities.steps,
      activityDate: activities.activityDate,
    });

  return {
    activity: updated,
    pointsDelta: nextBasePoints - previousBasePoints,
    previousBasePoints,
    nextBasePoints,
  };
}

export async function updateAdminUserRole(
  userId: string,
  role: "user" | "admin",
  actingAdminId: string,
) {
  if (userId === actingAdminId && role !== "admin") {
    throw new ActivityError("You cannot remove your own admin access.", 400);
  }

  const db = getDb();

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
    });

  if (!updated) {
    throw new ActivityError("User not found.", 404);
  }

  return updated;
}

export async function deleteAdminUser(userId: string, actingAdminId: string) {
  return deleteUserAndData(userId, actingAdminId);
}
