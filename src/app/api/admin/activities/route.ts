import { BlobError } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createAdminActivity, listAdminActivities } from "@/lib/admin-service";
import { ActivityError } from "@/lib/activities-service";

export async function GET(request: Request) {
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const activities = await listAdminActivities({
    userId: searchParams.get("userId") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  try {
    const formData = await request.formData();
    const userId = String(formData.get("userId") ?? "");
    const activityDate = String(formData.get("activityDate") ?? "");
    const steps = Number(formData.get("steps"));
    const distanceKm = String(formData.get("distanceKm") ?? "");
    const photo = formData.get("photo");

    if (!userId) {
      return NextResponse.json({ error: "Participant is required." }, { status: 400 });
    }

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "Photo is required." }, { status: 400 });
    }

    const result = await createAdminActivity(authResult.session.user.id, {
      userId,
      activityDate,
      steps,
      distanceKm,
      photo,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof BlobError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not create activity." },
      { status: 500 },
    );
  }
}
