import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { appConfig } from "@/config";
import { getDb } from "@/db";
import { activities, users } from "@/db/schema";
import { ActivityError } from "@/lib/activities-service";
import { uploadBlob } from "@/lib/blob-storage";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UserProfile = {
  id: string;
  name: string;
  mobile: string;
  role: string;
  profileImageUrl: string | null;
  createdAt: Date;
};

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    throw new ActivityError("Name must be 2–60 characters.", 400);
  }
  return trimmed;
}

function validatePhoto(file: File) {
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

async function deleteBlobUrl(url: string | null | undefined) {
  if (!url || !appConfig.blobReadWriteToken) {
    return;
  }

  try {
    await del(url, { token: appConfig.blobReadWriteToken });
  } catch (error) {
    console.error("Failed to delete blob", url, error);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    photo?: File | null;
    removePhoto?: boolean;
  },
) {
  if (!input.name && input.photo === undefined && !input.removePhoto) {
    throw new ActivityError("Nothing to update.", 400);
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: users.id,
      name: users.name,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    throw new ActivityError("User not found.", 404);
  }

  let nextName = existing.name;
  if (input.name !== undefined) {
    nextName = validateName(input.name);
  }

  let nextProfileImageUrl = existing.profileImageUrl;
  const blobsToDelete: string[] = [];

  if (input.removePhoto) {
    if (existing.profileImageUrl) {
      blobsToDelete.push(existing.profileImageUrl);
    }
    nextProfileImageUrl = null;
  } else if (input.photo instanceof File) {
    validatePhoto(input.photo);

    if (!appConfig.blobReadWriteToken) {
      throw new ActivityError(
        "Photo storage is not configured. Add blobReadWriteToken to src/config.ts.",
        500,
      );
    }

    const extension =
      input.photo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const pathname = `profiles/${userId}/avatar-${Date.now()}.${extension}`;
    const uploaded = await uploadBlob(pathname, input.photo, input.photo.type);

    if (existing.profileImageUrl) {
      blobsToDelete.push(existing.profileImageUrl);
    }
    nextProfileImageUrl = uploaded.url;
  }

  const [updated] = await db
    .update(users)
    .set({
      name: nextName,
      profileImageUrl: nextProfileImageUrl,
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
      createdAt: users.createdAt,
    });

  for (const url of blobsToDelete) {
    await deleteBlobUrl(url);
  }

  return updated;
}

export async function deleteUserAndData(
  userId: string,
  actingAdminId: string,
) {
  if (userId === actingAdminId) {
    throw new ActivityError("You cannot delete your own account.", 400);
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new ActivityError("User not found.", 404);
  }

  const userActivities = await db
    .select({ photoUrl: activities.photoUrl })
    .from(activities)
    .where(eq(activities.userId, userId));

  // neon-http has no transactions; FK cascade/set-null on the schema handles cleanup.
  await db.delete(users).where(eq(users.id, userId));

  await deleteBlobUrl(user.profileImageUrl);
  for (const activity of userActivities) {
    await deleteBlobUrl(activity.photoUrl);
  }

  return { deletedUserId: userId, deletedUserName: user.name };
}
