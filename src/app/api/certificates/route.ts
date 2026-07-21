import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { loadParticipantCertificates } from "@/lib/certificate-service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ensureWeeks =
    new URL(request.url).searchParams.get("ensureWeeks") === "1";

  try {
    const payload = await loadParticipantCertificates({
      userId: session.user.id,
      ensureWeeks,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load certificates." },
      { status: 500 },
    );
  }
}
