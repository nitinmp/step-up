import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { appConfig } from "@/config";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobUrl = new URL(request.url).searchParams.get("url");
  if (!blobUrl || !blobUrl.includes(".blob.vercel-storage.com/")) {
    return NextResponse.json({ error: "Invalid photo URL." }, { status: 400 });
  }

  if (!appConfig.blobReadWriteToken) {
    return NextResponse.json(
      { error: "Photo storage is not configured." },
      { status: 500 },
    );
  }

  try {
    const result = await get(blobUrl, {
      access: "private",
      token: appConfig.blobReadWriteToken,
    });

    if (!result) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load photo." }, { status: 500 });
  }
}
