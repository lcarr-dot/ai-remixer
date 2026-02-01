import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validation";

// POST - Complete onboarding
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = onboardingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { platforms, timezone, contentNiche, primaryGoal } = validation.data;

    // Update user with onboarding data
    await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        timezone,
        contentNiche,
        primaryGoal,
        onboardingComplete: true,
      },
    });

    // Create platform entries
    await prisma.userPlatform.deleteMany({
      where: { userId: authUser.userId },
    });

    await prisma.userPlatform.createMany({
      data: platforms.map((platformName) => ({
        userId: authUser.userId,
        platformName,
        enabled: true,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
