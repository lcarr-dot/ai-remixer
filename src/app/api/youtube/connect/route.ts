import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthUrl } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create state with userId for callback
    const state = Buffer.from(JSON.stringify({ userId: authUser.userId })).toString("base64");
    const authUrl = getAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("YouTube connect error:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
