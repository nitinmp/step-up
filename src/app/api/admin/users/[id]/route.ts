import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { deleteAdminUser, updateAdminUserRole } from "@/lib/admin-service";
import { ActivityError } from "@/lib/activities-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;

  let body: { role?: "user" | "admin" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.role !== "user" && body.role !== "admin") {
    return NextResponse.json({ error: "Role must be user or admin." }, { status: 400 });
  }

  try {
    const user = await updateAdminUserRole(
      id,
      body.role,
      authResult.session.user.id,
    );
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "Could not update user." }, { status: 500 });
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
    const result = await deleteAdminUser(id, authResult.session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "Could not delete user." }, { status: 500 });
  }
}
