import { BlobError } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  ActivityError,
  updatePendingActivity,
} from "@/lib/activities-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const formData = await request.formData();
    const steps = Number(formData.get("steps"));
    const distanceKm = String(formData.get("distanceKm") ?? "");
    const photoEntry = formData.get("photo");
    const photo = photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

    const result = await updatePendingActivity({
      activityId: id,
      userId: session.user.id,
      steps,
      distanceKm,
      photo,
    });

    return NextResponse.json({
      ok: true,
      basePoints: result.activity.basePoints,
      isBeast: result.isBeast,
    });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof BlobError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not update activity." },
      { status: 500 },
    );
  }
}
