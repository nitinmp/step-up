import { BlobError } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  ActivityError,
  createActivity,
  getActivitiesDashboard,
} from "@/lib/activities-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getActivitiesDashboard(session.user.id);
  return NextResponse.json(dashboard);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const activityDate = String(formData.get("date") ?? "");
    const steps = Number(formData.get("steps"));
    const distanceKm = String(formData.get("distanceKm") ?? "");
    const photo = formData.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "Photo is required." }, { status: 400 });
    }

    const result = await createActivity({
      userId: session.user.id,
      activityDate,
      steps,
      distanceKm,
      photo,
    });

    return NextResponse.json(
      {
        ok: true,
        basePoints: result.activity.basePoints,
        isStarOfDay: result.isStarOfDay,
        isBeast: result.isBeast,
        rank: result.standing?.rank ?? null,
        total: result.standing?.total ?? null,
        breakdown: result.standing?.breakdown ?? null,
        newlyUnlockedBadges: result.newlyUnlockedBadges,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof BlobError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not log activity." },
      { status: 500 },
    );
  }
}
