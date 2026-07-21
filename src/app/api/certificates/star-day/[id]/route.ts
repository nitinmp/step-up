import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getStarDayCertificate } from "@/lib/certificate-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const certificate = await getStarDayCertificate(session.user.id, id);
    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    }

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load certificate." },
      { status: 500 },
    );
  }
}
