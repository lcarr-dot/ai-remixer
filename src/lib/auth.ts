import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

export interface AuthUser {
  userId: string;
  email: string;
  businessName: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      businessName: string;
    };

    return {
      userId: decoded.userId,
      email: decoded.email,
      businessName: decoded.businessName,
    };
  } catch {
    return null;
  }
}

export async function getFullUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      platforms: true,
      youtubeChannel: true,
      googleOAuthToken: {
        select: {
          id: true,
          expiresAt: true,
          scope: true,
        },
      },
    },
  });
}

export function createAuthToken(user: { id: string; email: string; businessName: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      businessName: user.businessName,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
