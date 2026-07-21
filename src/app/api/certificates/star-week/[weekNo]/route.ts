import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ActivityError } from "@/lib/activities-service";
import { loadStarWeekCertificate } from "@/lib/certificate-service";

type RouteContext = {
  params: Promise<{ weekNo: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weekNo: weekNoRaw } = await context.params;
  const weekNo = Number.parseInt(weekNoRaw, 10);

  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 4) {
    return NextResponse.json({ error: "Invalid week number." }, { status: 400 });
  }

  try {
    const certificate = await loadStarWeekCertificate(session.user.id, weekNo);
    return NextResponse.json({ certificate });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not generate Star of the Week certificate." },
      { status: 500 },
    );
  }
}
