import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { put, list } from "@vercel/blob";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

// Zod schema for validation
const researchResultSchema = z.object({
  trendingThemes: z.array(z.string()),
  hookPatterns: z.array(z.string()),
  editingPatterns: z.array(z.string()),
  postingPatterns: z.array(z.string()),
  whyWorking: z.string(),
  actionableIdeas: z.array(z.string()),
});

function getUserIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET - Get latest market research snapshot
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { blobs } = await list({ prefix: `market-research/${userId}/` });
    
    if (blobs.length === 0) {
      return NextResponse.json({ snapshot: null });
    }

    // Get the most recent snapshot
    const sortedBlobs = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    const response = await fetch(sortedBlobs[0].url);
    const snapshot = await response.json();

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Get market research error:", error);
    return NextResponse.json({ error: "Failed to get research" }, { status: 500 });
  }
}

// POST - Run new market research
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { niche, keywords, platforms } = await request.json();

    if (!niche) {
      return NextResponse.json({ error: "Niche is required" }, { status: 400 });
    }

    const platformStr = platforms?.join(" and ") || "YouTube and TikTok";
    const keywordsStr = keywords ? `Focus keywords: ${keywords}` : "";

    const prompt = `You are a social media trend analyst. Analyze current trends for content creators in the "${niche}" niche on ${platformStr}. ${keywordsStr}

Return your analysis as valid JSON with this exact structure:
{
  "trendingThemes": ["theme1", "theme2", ...] (5-7 trending themes/topics),
  "hookPatterns": ["pattern1", "pattern2", ...] (5-7 hook patterns that are working),
  "editingPatterns": ["pattern1", "pattern2", ...] (4-5 editing styles that perform well),
  "postingPatterns": ["pattern1", "pattern2", ...] (3-4 posting time/frequency patterns),
  "whyWorking": "A 2-3 sentence explanation of why these trends are working right now",
  "actionableIdeas": ["idea1", "idea2", ...] (exactly 10 specific, actionable video ideas - structural concepts, not copies)
}

Be specific and actionable. Focus on what's working RIGHT NOW. Return valid JSON only.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    let result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Extract JSON from response
    let parsedResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
      
      // Validate with zod
      researchResultSchema.parse(parsedResult);
    } catch (parseError) {
      // Retry with repair prompt
      const repairPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;
      result = await model.generateContent(repairPrompt);
      responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
        researchResultSchema.parse(parsedResult);
      } else {
        throw new Error("Failed to parse research results");
      }
    }

    // Create snapshot
    const snapshot = {
      id: `research_${Date.now()}`,
      niche,
      keywords: keywords || "",
      platforms: platforms || ["youtube", "tiktok"],
      ...parsedResult,
      createdAt: new Date().toISOString(),
    };

    // Save to blob storage
    await put(
      `market-research/${userId}/${snapshot.id}.json`,
      JSON.stringify(snapshot),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Market research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
