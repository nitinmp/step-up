import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { computeStandings, getStandingForUser } from "@/lib/standings-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const standings = await computeStandings();
  const standing = getStandingForUser(standings, session.user.id);

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      mobile: session.user.mobile,
      role: session.user.role,
    },
    standing,
    participantCount: standings.length,
  });
}
