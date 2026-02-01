import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { put, list } from "@vercel/blob";

const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

interface User {
  id: string;
  email: string;
  password: string;
  businessName: string;
  niche?: string;
  tiktokHandle?: string;
  instagramHandle?: string;
  youtubeHandle?: string;
  facebookHandle?: string;
  createdAt: string;
}

// Helper to get all users
async function getUsers(): Promise<User[]> {
  try {
    const { blobs } = await list({ prefix: "users/" });
    const users: User[] = [];
    
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        const user = await response.json();
        users.push(user);
      } catch {
        // Skip invalid entries
      }
    }
    
    return users;
  } catch {
    return [];
  }
}

// Helper to find user by email
async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

// Helper to find user by ID
async function findUserById(userId: string): Promise<User | null> {
  try {
    const { blobs } = await list({ prefix: `users/${userId}` });
    if (blobs.length === 0) return null;
    
    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch {
    return null;
  }
}

// Helper to create user
async function createUser(
  email: string,
  password: string,
  businessName: string,
  niche?: string,
  tiktokHandle?: string,
  instagramHandle?: string,
  youtubeHandle?: string,
  facebookHandle?: string
): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: email.toLowerCase(),
    password: hashedPassword,
    businessName,
    niche,
    tiktokHandle,
    instagramHandle,
    youtubeHandle,
    facebookHandle,
    createdAt: new Date().toISOString(),
  };

  await put(`users/${user.id}.json`, JSON.stringify(user), {
    access: "public",
    contentType: "application/json",
  });

  return user;
}

// POST - Login or Signup
export async function POST(request: NextRequest) {
  try {
    const { 
      action, 
      email, 
      password, 
      businessName,
      niche,
      tiktokHandle,
      instagramHandle,
      youtubeHandle,
      facebookHandle 
    } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (action === "signup") {
      if (!businessName) {
        return NextResponse.json(
          { error: "Business name is required" },
          { status: 400 }
        );
      }

      if (!niche) {
        return NextResponse.json(
          { error: "Content niche is required" },
          { status: 400 }
        );
      }

      if (!tiktokHandle && !instagramHandle && !youtubeHandle && !facebookHandle) {
        return NextResponse.json(
          { error: "At least one social media handle is required" },
          { status: 400 }
        );
      }

      // Check if user exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }

      // Create new user
      const user = await createUser(
        email, 
        password, 
        businessName,
        niche,
        tiktokHandle,
        instagramHandle,
        youtubeHandle,
        facebookHandle
      );

      // Create JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          businessName: user.businessName,
          niche: user.niche 
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json({
        success: true,
        user: { 
          id: user.id, 
          email: user.email, 
          businessName: user.businessName,
          niche: user.niche,
          tiktokHandle: user.tiktokHandle,
          instagramHandle: user.instagramHandle,
          youtubeHandle: user.youtubeHandle,
          facebookHandle: user.facebookHandle,
        },
      });

      // Set cookie
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return response;
    } else if (action === "login") {
      // Find user
      const user = await findUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Create JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          businessName: user.businessName,
          niche: user.niche 
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json({
        success: true,
        user: { 
          id: user.id, 
          email: user.email, 
          businessName: user.businessName,
          niche: user.niche,
          tiktokHandle: user.tiktokHandle,
          instagramHandle: user.instagramHandle,
          youtubeHandle: user.youtubeHandle,
          facebookHandle: user.facebookHandle,
        },
      });

      // Set cookie
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return response;
    } else if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.delete("auth_token");
      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}

// GET - Check auth status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      businessName: string;
      niche?: string;
    };

    // Fetch full user data
    const user = await findUserById(decoded.userId);

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        niche: user.niche,
        tiktokHandle: user.tiktokHandle,
        instagramHandle: user.instagramHandle,
        youtubeHandle: user.youtubeHandle,
        facebookHandle: user.facebookHandle,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
