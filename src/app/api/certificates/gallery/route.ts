import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCertificateGallery } from "@/lib/certificate-gallery-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getCertificateGallery(session.user.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load certificate gallery." },
      { status: 500 },
    );
  }
}
