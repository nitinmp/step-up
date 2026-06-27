import { BlobError } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ActivityError } from "@/lib/activities-service";
import { computeStandings, getStandingForUser } from "@/lib/standings-service";
import { getUserProfile, updateUserProfile } from "@/lib/user-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, standings] = await Promise.all([
    getUserProfile(session.user.id),
    computeStandings(),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const standing = getStandingForUser(standings, session.user.id);

  return NextResponse.json({
    user: profile,
    standing,
    participantCount: standings.length,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const nameValue = formData.get("name");
    const photo = formData.get("photo");
    const removePhoto = formData.get("removePhoto") === "true";

    const updated = await updateUserProfile(session.user.id, {
      name: nameValue !== null ? String(nameValue) : undefined,
      photo: photo instanceof File && photo.size > 0 ? photo : undefined,
      removePhoto,
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof BlobError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(error);
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
