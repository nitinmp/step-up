import { BlobError } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { deleteAdminActivity, updateAdminActivity } from "@/lib/admin-service";
import { ActivityError } from "@/lib/activities-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateBody = {
  status?: "approved" | "disapproved";
  adminNote?: string | null;
  steps?: number;
  distanceKm?: string | number;
  activityDate?: string;
  photo?: File;
};

async function parseUpdateBody(request: Request): Promise<UpdateBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const photoEntry = formData.get("photo");
    const stepsRaw = formData.get("steps");
    const distanceKmRaw = formData.get("distanceKm");
    const activityDateRaw = formData.get("activityDate");
    const statusRaw = formData.get("status");
    const adminNoteRaw = formData.get("adminNote");

    const body: UpdateBody = {};

    if (typeof stepsRaw === "string" && stepsRaw !== "") {
      body.steps = Number(stepsRaw);
    }

    if (typeof distanceKmRaw === "string" && distanceKmRaw !== "") {
      body.distanceKm = distanceKmRaw;
    }

    if (typeof activityDateRaw === "string" && activityDateRaw !== "") {
      body.activityDate = activityDateRaw;
    }

    if (statusRaw === "approved" || statusRaw === "disapproved") {
      body.status = statusRaw;
    }

    if (typeof adminNoteRaw === "string") {
      body.adminNote = adminNoteRaw === "" ? null : adminNoteRaw;
    }

    if (photoEntry instanceof File && photoEntry.size > 0) {
      body.photo = photoEntry;
    }

    return body;
  }

  try {
    return (await request.json()) as UpdateBody;
  } catch {
    throw new ActivityError("Invalid request body.", 400);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;

  try {
    const result = await deleteAdminActivity(id);

    return NextResponse.json({
      ok: true,
      deletedActivityId: result.deletedActivityId,
      userName: result.userName,
      activityDate: result.activityDate,
    });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not delete activity." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;

  try {
    const body = await parseUpdateBody(request);
    const result = await updateAdminActivity(
      id,
      authResult.session.user.id,
      body,
    );

    return NextResponse.json({
      ok: true,
      activity: result.activity,
      pointsDelta: result.pointsDelta,
      previousBasePoints: result.previousBasePoints,
      nextBasePoints: result.nextBasePoints,
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
