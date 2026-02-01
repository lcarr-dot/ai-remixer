import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  exchangeCodeForTokens,
  saveTokens,
  fetchChannelInfo,
  syncYouTubeUploads,
} from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_params", request.url)
      );
    }

    // Decode state to get userId
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      userId = decoded.userId;
    } catch {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_state", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/settings?error=no_tokens", request.url)
      );
    }

    // Save tokens
    await saveTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      new Date(tokens.expiry_date || Date.now() + 3600000),
      tokens.scope || ""
    );

    // Fetch and save channel info
    const channelInfo = await fetchChannelInfo(userId);

    await prisma.youTubeChannel.upsert({
      where: { userId },
      create: {
        userId,
        channelId: channelInfo.channelId,
        title: channelInfo.title,
        description: channelInfo.description,
        thumbnailUrl: channelInfo.thumbnailUrl,
        subscriberCount: channelInfo.subscriberCount,
        videoCount: channelInfo.videoCount,
        viewCount: channelInfo.viewCount,
      },
      update: {
        channelId: channelInfo.channelId,
        title: channelInfo.title,
        description: channelInfo.description,
        thumbnailUrl: channelInfo.thumbnailUrl,
        subscriberCount: channelInfo.subscriberCount,
        videoCount: channelInfo.videoCount,
        viewCount: channelInfo.viewCount,
      },
    });

    // Sync uploads in background (don't wait)
    syncYouTubeUploads(userId).catch(console.error);

    return NextResponse.redirect(
      new URL("/settings?success=youtube_connected", request.url)
    );
  } catch (error) {
    console.error("YouTube callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=callback_failed", request.url)
    );
  }
}
