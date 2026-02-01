import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { syncYouTubeUploads } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncYouTubeUploads(authUser.userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
