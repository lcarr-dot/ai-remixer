import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { put, list } from "@vercel/blob";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

// Zod schema for validation
const generateResultSchema = z.object({
  hooks: z.array(z.string()),
  script: z.string(),
  descriptions: z.array(z.string()),
  hashtags: z.array(z.string()),
  shotList: z.array(z.string()).optional(),
  whyThisShouldWork: z.string(),
  whatToTest: z.string(),
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

// Helper to get user's stored history for context
async function getUserHistoryContext(userId: string): Promise<string> {
  try {
    // Get user's past drafts for context
    const { blobs } = await list({ prefix: `drafts/${userId}/` });
    
    if (blobs.length === 0) {
      return "";
    }

    const recentDrafts: string[] = [];
    const sortedBlobs = blobs
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 5); // Last 5 drafts

    for (const blob of sortedBlobs) {
      try {
        const response = await fetch(blob.url);
        const draft = await response.json();
        if (draft.topic) {
          recentDrafts.push(`- Topic: ${draft.topic}`);
        }
      } catch {
        // Skip
      }
    }

    // Get market research for context
    const { blobs: researchBlobs } = await list({ prefix: `market-research/${userId}/` });
    let latestResearch = "";
    
    if (researchBlobs.length > 0) {
      const sorted = researchBlobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      try {
        const response = await fetch(sorted[0].url);
        const research = await response.json();
        if (research.hookPatterns) {
          latestResearch = `\nRecent trending hooks: ${research.hookPatterns.slice(0, 3).join(", ")}`;
        }
      } catch {
        // Skip
      }
    }

    if (recentDrafts.length === 0 && !latestResearch) {
      return "";
    }

    return `
--- USER HISTORY CONTEXT ---
${recentDrafts.length > 0 ? `Recent video topics:\n${recentDrafts.join("\n")}` : ""}
${latestResearch}
Use this context to maintain consistency with their content style.
--- END CONTEXT ---
`;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, platform, tone, duration, ctaGoal, mustInclude } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const historyContext = await getUserHistoryContext(userId);
    const mustIncludeStr = mustInclude?.length > 0 
      ? `\nMust include these points: ${mustInclude.join(", ")}`
      : "";

    const prompt = `You are a viral video content creator. Generate content for a ${platform || "TikTok"} video.

${historyContext}

Video Details:
- Topic: ${topic}
- Platform: ${platform || "TikTok"}
- Tone: ${tone || "engaging"}
- Target Duration: ${duration || 60} seconds
- CTA Goal: ${ctaGoal || "engagement"}${mustIncludeStr}

Return your content as valid JSON with this exact structure:
{
  "hooks": ["hook1", "hook2", "hook3"] (exactly 3 different hooks, each punchy and scroll-stopping),
  "script": "Full video script written to be spoken naturally, fits the duration target, includes [visual cues] in brackets",
  "descriptions": ["caption1", "caption2"] (exactly 2 different captions/descriptions),
  "hashtags": ["tag1", "tag2", ...] (10-20 relevant hashtags WITHOUT the # symbol),
  "shotList": ["shot1", "shot2", ...] (5-8 visual beats/shots),
  "whyThisShouldWork": "2-3 sentences explaining why this content should perform well",
  "whatToTest": "2-3 sentences suggesting A/B tests or variations to try"
}

Make hooks attention-grabbing in the first 3 seconds. Script should be conversational and natural. Return valid JSON only.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    let result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Extract and parse JSON
    let parsedResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
      
      // Validate with zod
      generateResultSchema.parse(parsedResult);
    } catch (parseError) {
      // Retry with repair prompt
      const repairPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;
      result = await model.generateContent(repairPrompt);
      responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
        generateResultSchema.parse(parsedResult);
      } else {
        throw new Error("Failed to parse generated content");
      }
    }

    // Create draft
    const draft = {
      id: `draft_${Date.now()}`,
      topic,
      platform: platform || "tiktok",
      tone: tone || "engaging",
      duration: duration || 60,
      ctaGoal: ctaGoal || "",
      mustInclude: mustInclude || [],
      ...parsedResult,
      createdAt: new Date().toISOString(),
    };

    // Save draft to blob storage
    await put(
      `drafts/${userId}/${draft.id}.json`,
      JSON.stringify(draft),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Generate videos error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
