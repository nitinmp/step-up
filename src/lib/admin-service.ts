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
  validateActivityMetrics,
  validateActivityPhoto,
} from "@/lib/activities-service";
import { deleteBlobUrl, uploadBlob } from "@/lib/blob-storage";
import { appConfig } from "@/config";
import type { Division, Gender } from "@/lib/divisions";
import { isValidGender, parseDivision, parseGender } from "@/lib/divisions";
import { isAdminLoggableDate } from "@/lib/dates";
import { distanceKmToStorage, parseDistanceKm } from "@/lib/distance";
import { DEFAULT_PARTICIPANT_PASSWORD } from "@/lib/default-password";
import { computeBasePoints } from "@/lib/scoring";
import { deleteUserAndData } from "@/lib/user-service";
import { normalizeMobile, validateIndianMobile } from "@/lib/mobile";
import { hashPassword } from "@/lib/password";

export type AdminActivityRow = {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  userDivision: Division;
  activityDate: string;
  steps: number;
  distanceKm: string;
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
  division: Division;
  gender: Gender | null;
  mustChangePassword: boolean;
  createdAt: Date;
};

export async function listAdminActivities(filters?: {
  userId?: string;
  date?: string;
  status?: string;
  division?: Division;
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
      userDivision: users.division,
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
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

  const filtered = filters?.division
    ? rows.filter((row) => parseDivision(row.userDivision) === filters.division)
    : rows;

  return filtered.map((row) => ({
    ...row,
    userDivision: parseDivision(row.userDivision),
  }));
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const db = getDb();

  return db
    .select({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      division: users.division,
      gender: users.gender,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        division: parseDivision(row.division),
        gender: parseGender(row.gender),
      })),
    );
}

export async function updateAdminActivity(
  activityId: string,
  adminUserId: string,
  input: {
    status?: "approved" | "disapproved";
    adminNote?: string | null;
    steps?: number;
    distanceKm?: string | number;
    activityDate?: string;
    photo?: File | null;
  },
) {
  const db = getDb();

  const [existing] = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      activityDate: activities.activityDate,
      steps: activities.steps,
      distanceKm: activities.distanceKm,
      basePoints: activities.basePoints,
      status: activities.status,
      photoUrl: activities.photoUrl,
    })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);

  if (!existing) {
    throw new ActivityError("Activity not found.", 404);
  }

  const nextDate = input.activityDate ?? existing.activityDate;
  const nextSteps = input.steps ?? existing.steps;
  let nextDistanceKm = existing.distanceKm;

  if (input.distanceKm !== undefined) {
    try {
      nextDistanceKm = distanceKmToStorage(parseDistanceKm(input.distanceKm));
    } catch (error) {
      throw new ActivityError(
        error instanceof Error ? error.message : "Invalid distance.",
        400,
      );
    }
  }

  if (!Number.isInteger(nextSteps) || nextSteps < 0) {
    throw new ActivityError("Steps must be a whole number ≥ 0.", 400);
  }

  if (Number(nextDistanceKm) < 0) {
    throw new ActivityError("Distance cannot be negative.", 400);
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

  let nextPhotoUrl = existing.photoUrl;

  if (input.photo) {
    validateActivityPhoto(input.photo);

    if (!appConfig.blobReadWriteToken) {
      throw new ActivityError(
        "Photo storage is not configured. Add blobReadWriteToken to src/config.ts.",
        500,
      );
    }

    const extension =
      input.photo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const pathname = `activities/${existing.userId}/${nextDate}-${Date.now()}.${extension}`;
    const uploaded = await uploadBlob(pathname, input.photo, input.photo.type);
    nextPhotoUrl = uploaded.url;
    await deleteBlobUrl(existing.photoUrl);
  }

  const updates: {
    activityDate: string;
    steps: number;
    distanceKm: string;
    basePoints: number;
    status: string;
    photoUrl: string;
    editedBy: string;
    updatedAt: Date;
    adminNote?: string | null;
  } = {
    activityDate: nextDate,
    steps: nextSteps,
    distanceKm: nextDistanceKm,
    basePoints: nextBasePoints,
    status: nextStatus,
    photoUrl: nextPhotoUrl,
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

export async function createAdminActivity(
  adminUserId: string,
  input: {
    userId: string;
    activityDate: string;
    steps: number;
    distanceKm: string | number;
    photo: File;
  },
) {
  const db = getDb();
  const { config, days, today } = await getChallengeWindow();

  if (
    !isAdminLoggableDate(
      input.activityDate,
      today,
      config.startDate,
      config.endDate,
    )
  ) {
    throw new ActivityError(
      "Admin can only log activity for today and the previous two days.",
      400,
    );
  }

  const day = days.find((entry) => entry.date === input.activityDate);
  if (!day) {
    throw new ActivityError("Invalid challenge date.", 400);
  }

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new ActivityError("Participant not found.", 404);
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
      "This participant already has an activity for that date.",
      409,
    );
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

  const extension =
    input.photo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const pathname = `activities/${input.userId}/${input.activityDate}-${Date.now()}.${extension}`;
  const uploaded = await uploadBlob(pathname, input.photo, input.photo.type);

  const basePoints = computeBasePoints(
    stepsValue,
    day.targetSteps,
    day.dayRate,
  );

  await db.insert(activities).values({
    userId: input.userId,
    activityDate: input.activityDate,
    steps: stepsValue,
    distanceKm: distanceKmToStorage(distanceKm),
    photoUrl: uploaded.url,
    status: "approved",
    basePoints,
    editedBy: adminUserId,
  });

  return {
    userName: user.name,
    activityDate: input.activityDate,
    basePoints,
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
      division: users.division,
      gender: users.gender,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    });

  if (!updated) {
    throw new ActivityError("User not found.", 404);
  }

  return mapAdminUserRow(updated);
}

export async function updateAdminUserProfile(
  userId: string,
  input: {
    name?: string;
    mobile?: string;
    division?: Division;
    gender?: Gender | null;
  },
) {
  const updates: {
    name?: string;
    mobile?: string;
    division?: Division;
    gender?: Gender | null;
  } = {};

  if (input.name !== undefined) {
    updates.name = validateParticipantName(input.name);
  }

  if (input.mobile !== undefined) {
    const mobile = normalizeMobile(input.mobile);
    if (!validateIndianMobile(mobile)) {
      throw new ActivityError("Enter a valid 10-digit Indian mobile number.", 400);
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.mobile, mobile), ne(users.id, userId)))
      .limit(1);

    if (existing) {
      throw new ActivityError("This mobile number is already registered.", 409);
    }

    updates.mobile = mobile;
  }

  if (input.division !== undefined) {
    if (input.division !== "elite" && input.division !== "strider") {
      throw new ActivityError("Division must be elite or strider.", 400);
    }
    updates.division = input.division;
  }

  if (input.gender !== undefined) {
    if (input.gender !== null && !isValidGender(input.gender)) {
      throw new ActivityError("Gender must be male, female, other, or null.", 400);
    }
    updates.gender = input.gender;
  }

  if (Object.keys(updates).length === 0) {
    throw new ActivityError("No profile fields to update.", 400);
  }

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      division: users.division,
      gender: users.gender,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    });

  if (!updated) {
    throw new ActivityError("User not found.", 404);
  }

  return mapAdminUserRow(updated);
}

function mapAdminUserRow(row: {
  id: string;
  name: string;
  mobile: string;
  role: string;
  division: string | null;
  gender: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
}): AdminUserRow {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    role: row.role,
    division: parseDivision(row.division),
    gender: parseGender(row.gender),
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt,
  };
}

function validateParticipantName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    throw new ActivityError("Name must be 2–60 characters.", 400);
  }
  return trimmed;
}

export async function createAdminParticipant(input: {
  name: string;
  mobile: string;
}) {
  const name = validateParticipantName(input.name);
  const mobile = normalizeMobile(input.mobile);

  if (!validateIndianMobile(mobile)) {
    throw new ActivityError("Enter a valid 10-digit Indian mobile number.", 400);
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.mobile, mobile))
    .limit(1);

  if (existing) {
    throw new ActivityError("This mobile number is already registered.", 409);
  }

  const passwordHash = await hashPassword(DEFAULT_PARTICIPANT_PASSWORD);

  const [created] = await db
    .insert(users)
    .values({
      name,
      mobile,
      passwordHash,
      role: "user",
      division: "strider",
      mustChangePassword: true,
    })
    .returning({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      division: users.division,
      gender: users.gender,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    });

  return {
    ...created!,
    division: parseDivision(created!.division),
    gender: parseGender(created!.gender),
  };
}

export async function resetAdminUserPassword(
  userId: string,
  actingAdminId: string,
) {
  if (userId === actingAdminId) {
    throw new ActivityError("You cannot reset your own password here.", 400);
  }

  const db = getDb();
  const passwordHash = await hashPassword(DEFAULT_PARTICIPANT_PASSWORD);

  const [updated] = await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
    });

  if (!updated) {
    throw new ActivityError("User not found.", 404);
  }

  return updated;
}

export async function deleteAdminUser(userId: string, actingAdminId: string) {
  return deleteUserAndData(userId, actingAdminId);
}
