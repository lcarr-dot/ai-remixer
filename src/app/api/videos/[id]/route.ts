import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET - Get video details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const video = await prisma.video.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
      include: {
        manualFields: true,
        platformPosts: true,
        platformMetrics: true,
        aiDerived: true,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Get audit logs for this video
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { changedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      video: {
        ...video,
        auditLogs,
      },
    });
  } catch (error) {
    console.error("Get video error:", error);
    return NextResponse.json(
      { error: "Failed to get video" },
      { status: 500 }
    );
  }
}

// PATCH - Update video manual fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify video belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
      include: { manualFields: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Update manual fields
    if (body.manualFields) {
      const oldValues = video.manualFields || {};
      const newValues = body.manualFields;

      // Create audit logs for changes
      const fields = [
        "hook",
        "caption",
        "hashtags",
        "topic",
        "format",
        "cta",
        "targetAudience",
        "whyPosted",
        "wearingOutfit",
        "contentSummary",
        "notes",
      ] as const;

      for (const field of fields) {
        const oldVal = (oldValues as Record<string, unknown>)[field];
        const newVal = newValues[field];

        if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          await prisma.auditLog.create({
            data: {
              entityType: "VideoManualFields",
              entityId: id,
              field,
              oldValue: oldVal ? JSON.stringify(oldVal) : null,
              newValue: newVal ? JSON.stringify(newVal) : null,
              source: "manual",
              changedBy: authUser.userId,
            },
          });
        }
      }

      // Upsert manual fields
      await prisma.videoManualFields.upsert({
        where: { videoId: id },
        create: {
          videoId: id,
          ...newValues,
        },
        update: newValues,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update video error:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

// DELETE - Delete video
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify video belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete video error:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
