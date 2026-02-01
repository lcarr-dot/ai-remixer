import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseMetricNumber, normalizePlatform } from "@/lib/validation";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// POST - Create a new log entry
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rawText, audioUrl } = await request.json();

    if (!rawText && !audioUrl) {
      return NextResponse.json(
        { error: "Please provide text or audio" },
        { status: 400 }
      );
    }

    // Create log entry
    const logEntry = await prisma.logEntry.create({
      data: {
        userId: authUser.userId,
        rawText,
        audioUrl,
        status: "processing",
      },
    });

    // Process the log entry asynchronously
    processLogEntry(logEntry.id, authUser.userId, rawText).catch(console.error);

    return NextResponse.json({
      success: true,
      logEntryId: logEntry.id,
      status: "processing",
    });
  } catch (error) {
    console.error("Log entry error:", error);
    return NextResponse.json(
      { error: "Failed to create log entry" },
      { status: 500 }
    );
  }
}

// GET - List log entries
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const entries = await prisma.logEntry.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        transcript: true,
        video: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Get log entries error:", error);
    return NextResponse.json(
      { error: "Failed to get log entries" },
      { status: 500 }
    );
  }
}

// Process log entry with Gemini
async function processLogEntry(
  logEntryId: string,
  userId: string,
  text: string
) {
  try {
    // Get user's videos for context
    const videos = await prisma.video.findMany({
      where: { userId },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        youtubeVideoId: true,
      },
    });

    const videoContext = videos
      .map(
        (v: { id: string; title: string; publishedAt: Date | null; youtubeVideoId: string | null }, i: number) =>
          `${i + 1}. "${v.title}" (ID: ${v.id}, published: ${v.publishedAt?.toISOString().split("T")[0] || "unknown"})`
      )
      .join("\n");

    const prompt = `You are a data extraction assistant. Parse the following user input about their video content and extract structured data.

User's recent videos for reference:
${videoContext || "No videos yet"}

User input:
"${text}"

Extract the following as JSON:
{
  "videoIdentifier": "best guess at which video this is about - use ID if clear, or null if ambiguous",
  "videoIdentifierConfidence": 0.0-1.0,
  "needsVideoSelection": true/false (if ambiguous which video),
  "extractedData": {
    "hook": "extracted hook/concept if mentioned",
    "caption": "extracted caption/description if mentioned",
    "hashtags": ["array", "of", "hashtags"],
    "format": "video format if mentioned (talking head, green screen, etc.)",
    "topic": "topic/theme if mentioned",
    "notes": "any other relevant info",
    "platformMetrics": [
      {
        "platform": "tiktok/youtube/instagram/etc",
        "views": number or null,
        "likes": number or null,
        "comments": number or null,
        "shares": number or null,
        "saves": number or null,
        "watchTimeSeconds": number or null,
        "followersGained": number or null
      }
    ]
  },
  "confidence": {
    "hook": 0.0-1.0,
    "caption": 0.0-1.0,
    "hashtags": 0.0-1.0,
    "format": 0.0-1.0,
    "platformMetrics": 0.0-1.0
  }
}

Parse numbers like "1.2k", "12k", "1,200" correctly. Only include fields that were actually mentioned. Return valid JSON only.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Parse the JSON response
    let extractedData;
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      throw parseError;
    }

    // Create transcript record
    await prisma.transcript.create({
      data: {
        logEntryId,
        rawTranscript: text,
        extractedJSON: extractedData,
        confidenceJSON: extractedData.confidence || {},
      },
    });

    // If we can identify the video, update the database
    if (extractedData.videoIdentifier && !extractedData.needsVideoSelection) {
      const videoId = extractedData.videoIdentifier;

      // Update manual fields if provided
      const manualData = extractedData.extractedData;
      if (manualData) {
        await prisma.videoManualFields.upsert({
          where: { videoId },
          create: {
            videoId,
            hook: manualData.hook || null,
            caption: manualData.caption || null,
            hashtags: manualData.hashtags || null,
            format: manualData.format || null,
            topic: manualData.topic || null,
            notes: manualData.notes || null,
          },
          update: {
            ...(manualData.hook && { hook: manualData.hook }),
            ...(manualData.caption && { caption: manualData.caption }),
            ...(manualData.hashtags && { hashtags: manualData.hashtags }),
            ...(manualData.format && { format: manualData.format }),
            ...(manualData.topic && { topic: manualData.topic }),
            ...(manualData.notes && { notes: manualData.notes }),
          },
        });

        // Update platform metrics
        if (manualData.platformMetrics) {
          for (const metrics of manualData.platformMetrics) {
            const platform = normalizePlatform(metrics.platform);

            // Create audit log for changes
            const existing = await prisma.videoPlatformMetrics.findUnique({
              where: {
                videoId_platform: { videoId, platform },
              },
            });

            const newMetrics = {
              views: parseMetricNumber(metrics.views),
              likes: parseMetricNumber(metrics.likes),
              comments: parseMetricNumber(metrics.comments),
              shares: parseMetricNumber(metrics.shares),
              saves: parseMetricNumber(metrics.saves),
              watchTimeSeconds: metrics.watchTimeSeconds
                ? parseFloat(String(metrics.watchTimeSeconds))
                : null,
              followersGained: parseMetricNumber(metrics.followersGained),
            };

            // Record audit logs for changed values
            if (existing) {
              const fields = ["views", "likes", "comments", "shares", "saves", "watchTimeSeconds", "followersGained"] as const;
              for (const field of fields) {
                const oldVal = existing[field];
                const newVal = newMetrics[field];
                if (newVal !== null && oldVal !== newVal) {
                  await prisma.auditLog.create({
                    data: {
                      entityType: "VideoPlatformMetrics",
                      entityId: videoId,
                      field: `${platform}.${field}`,
                      oldValue: oldVal?.toString() || null,
                      newValue: newVal?.toString() || null,
                      source: "transcript",
                      changedBy: userId,
                    },
                  });
                }
              }
            }

            await prisma.videoPlatformMetrics.upsert({
              where: {
                videoId_platform: { videoId, platform },
              },
              create: {
                videoId,
                platform,
                ...newMetrics,
                source: "transcript",
                transcriptId: logEntryId,
              },
              update: {
                ...(newMetrics.views !== null && { views: newMetrics.views }),
                ...(newMetrics.likes !== null && { likes: newMetrics.likes }),
                ...(newMetrics.comments !== null && { comments: newMetrics.comments }),
                ...(newMetrics.shares !== null && { shares: newMetrics.shares }),
                ...(newMetrics.saves !== null && { saves: newMetrics.saves }),
                ...(newMetrics.watchTimeSeconds !== null && { watchTimeSeconds: Math.round(newMetrics.watchTimeSeconds) }),
                ...(newMetrics.followersGained !== null && { followersGained: newMetrics.followersGained }),
                source: "transcript",
                transcriptId: logEntryId,
              },
            });
          }
        }
      }

      // Link log entry to video
      await prisma.logEntry.update({
        where: { id: logEntryId },
        data: {
          linkedVideoId: videoId,
          status: "completed",
        },
      });
    } else if (extractedData.needsVideoSelection) {
      // Mark as needing association
      await prisma.logEntry.update({
        where: { id: logEntryId },
        data: { status: "needs_association" },
      });
    } else {
      // Completed but not linked to a specific video
      await prisma.logEntry.update({
        where: { id: logEntryId },
        data: { status: "completed" },
      });
    }
  } catch (error) {
    console.error("Process log entry error:", error);
    await prisma.logEntry.update({
      where: { id: logEntryId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      },
    });
  }
}
