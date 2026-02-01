import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET - List all videos with their data
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // missing_tiktok, missing_youtube, etc.

    // Get user's platforms
    const userPlatforms = await prisma.userPlatform.findMany({
      where: { userId: authUser.userId, enabled: true },
      select: { platformName: true },
    });
    const platforms = userPlatforms.map((p) => p.platformName);

    // Get videos with all related data
    const videos = await prisma.video.findMany({
      where: { userId: authUser.userId },
      orderBy: { publishedAt: "desc" },
      include: {
        manualFields: true,
        platformPosts: true,
        platformMetrics: true,
        aiDerived: true,
      },
    });

    // Transform videos into spreadsheet format with missing data indicators
    const spreadsheetData = videos.map((video) => {
      const row: Record<string, unknown> = {
        id: video.id,
        youtubeVideoId: video.youtubeVideoId,
        title: video.title,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl,
        durationSeconds: video.durationSeconds,
        
        // Manual fields
        hook: video.manualFields?.hook ?? null,
        caption: video.manualFields?.caption ?? null,
        hashtags: video.manualFields?.hashtags ?? null,
        topic: video.manualFields?.topic ?? null,
        format: video.manualFields?.format ?? null,
        cta: video.manualFields?.cta ?? null,
        targetAudience: video.manualFields?.targetAudience ?? null,
        whyPosted: video.manualFields?.whyPosted ?? null,
        wearingOutfit: video.manualFields?.wearingOutfit ?? null,
        contentSummary: video.manualFields?.contentSummary ?? null,
        notes: video.manualFields?.notes ?? null,

        // AI derived
        bestHookPatterns: video.aiDerived?.bestHookPatterns ?? null,
        formatTags: video.aiDerived?.formatTags ?? null,
        performanceNotes: video.aiDerived?.performanceNotes ?? null,
        whatChanged: video.aiDerived?.whatChanged ?? null,
      };

      // Add platform-specific data
      for (const platform of platforms) {
        const post = video.platformPosts.find((p) => p.platform === platform);
        const metrics = video.platformMetrics.find((m) => m.platform === platform);

        row[`${platform}_posted`] = post?.posted ?? null;
        row[`${platform}_postedAt`] = post?.postedAt ?? null;
        row[`${platform}_views`] = metrics?.views ?? null;
        row[`${platform}_likes`] = metrics?.likes ?? null;
        row[`${platform}_comments`] = metrics?.comments ?? null;
        row[`${platform}_shares`] = metrics?.shares ?? null;
        row[`${platform}_saves`] = metrics?.saves ?? null;
        row[`${platform}_watchTime`] = metrics?.watchTimeSeconds ?? null;
        row[`${platform}_followersGained`] = metrics?.followersGained ?? null;
      }

      // Calculate missing fields count
      let missingCount = 0;
      const missingFields: string[] = [];

      if (!row.hook) { missingCount++; missingFields.push("hook"); }
      if (!row.hashtags) { missingCount++; missingFields.push("hashtags"); }
      if (!row.format) { missingCount++; missingFields.push("format"); }

      // Priority platforms (YouTube + TikTok)
      if (platforms.includes("youtube") && row.youtube_views === null) {
        missingCount += 2; missingFields.push("youtube_views");
      }
      if (platforms.includes("tiktok") && row.tiktok_views === null) {
        missingCount += 2; missingFields.push("tiktok_views");
      }

      row.missingCount = missingCount;
      row.missingFields = missingFields;

      return row;
    });

    // Apply filters
    let filteredData = spreadsheetData;
    if (filter) {
      if (filter === "missing_tiktok") {
        filteredData = spreadsheetData.filter((r) => r.tiktok_views === null);
      } else if (filter === "missing_youtube") {
        filteredData = spreadsheetData.filter((r) => r.youtube_views === null);
      } else if (filter === "missing_hook") {
        filteredData = spreadsheetData.filter((r) => !r.hook);
      } else if (filter === "has_missing") {
        filteredData = spreadsheetData.filter((r) => (r.missingCount as number) > 0);
      }
    }

    // Calculate missing data summary
    const missingDataSummary = {
      totalVideos: videos.length,
      tiktokViewsMissing: spreadsheetData.filter((r) => platforms.includes("tiktok") && r.tiktok_views === null).length,
      youtubeViewsMissing: spreadsheetData.filter((r) => platforms.includes("youtube") && r.youtube_views === null).length,
      hookMissing: spreadsheetData.filter((r) => !r.hook).length,
      hashtagsMissing: spreadsheetData.filter((r) => !r.hashtags).length,
      formatMissing: spreadsheetData.filter((r) => !r.format).length,
    };

    return NextResponse.json({
      videos: filteredData,
      platforms,
      missingDataSummary,
    });
  } catch (error) {
    console.error("Get videos error:", error);
    return NextResponse.json(
      { error: "Failed to get videos" },
      { status: 500 }
    );
  }
}

// POST - Create a new video (manual entry)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, publishedAt } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        userId: authUser.userId,
        title,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error("Create video error:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}
