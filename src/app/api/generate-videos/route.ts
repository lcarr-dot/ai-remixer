import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { list } from "@vercel/blob";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

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

// Get user's spreadsheet data for context
async function getUserDataContext(userId: string): Promise<string> {
  try {
    const { blobs } = await list({ prefix: `spreadsheet/${userId}/` });
    
    if (blobs.length === 0) return "";

    const latestBlob = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const response = await fetch(latestBlob.url);
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) return "";

    // Get top performing content (by views if available)
    const topContent = data.rows
      .filter((r: Record<string, string>) => r.Views || r.views)
      .sort((a: Record<string, string>, b: Record<string, string>) => {
        const aViews = parseInt(String(a.Views || a.views || 0).replace(/,/g, ""));
        const bViews = parseInt(String(b.Views || b.views || 0).replace(/,/g, ""));
        return bViews - aViews;
      })
      .slice(0, 5);

    if (topContent.length === 0) return "";

    const hookCol = data.columns.find((c: string) => c.toLowerCase().includes("hook"));
    const topHooks = topContent
      .map((r: Record<string, string>) => hookCol ? r[hookCol] : null)
      .filter(Boolean)
      .slice(0, 3);

    return `
--- YOUR TOP PERFORMING CONTENT ---
${topHooks.length > 0 ? `Your best hooks:\n${topHooks.map((h: string) => `- "${h}"`).join("\n")}` : ""}
Use this style as inspiration.
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

    const { topic, platform, duration, fileContent, generateType } = await request.json();

    if (!topic && !fileContent) {
      return NextResponse.json({ error: "Topic or file required" }, { status: 400 });
    }

    const userContext = await getUserDataContext(userId);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const baseContext = `You are a viral ${platform || "TikTok"} content creator.
${userContext}

Video Details:
- Topic: ${topic || "Based on the uploaded file content"}
- Platform: ${platform || "TikTok"}
- Target Duration: ${duration || 60} seconds
${fileContent ? `\nReference Material:\n${fileContent.substring(0, 3000)}` : ""}
`;

    // Generate based on type
    if (generateType === "hook" || generateType === "all") {
      const hookPrompt = `${baseContext}

Generate 3 scroll-stopping hooks for this video. Each hook should:
- Grab attention in the first 3 seconds
- Create curiosity or urgency
- Be natural to say out loud

Return ONLY valid JSON:
{
  "hooks": ["hook1", "hook2", "hook3"]
}`;

      const hookResult = await model.generateContent(hookPrompt);
      const hookText = hookResult.response.text();
      const hookJson = hookText.match(/\{[\s\S]*\}/);
      
      if (generateType === "hook") {
        if (hookJson) {
          return NextResponse.json(JSON.parse(hookJson[0]));
        }
        return NextResponse.json({ hooks: [] });
      }
      
      // Continue for "all"
      var hooks: string[] = [];
      if (hookJson) {
        try {
          hooks = JSON.parse(hookJson[0]).hooks || [];
        } catch {
          hooks = [];
        }
      }
    }

    if (generateType === "script" || generateType === "all") {
      const scriptPrompt = `${baseContext}

Write a complete video script for a ${duration || 60} second video.
- Write naturally, as if speaking to a friend
- Include [visual cues] in brackets
- Start with a hook, build tension, deliver value, end with engagement
- Make it conversational and authentic

Return ONLY valid JSON:
{
  "script": "Your full script here..."
}`;

      const scriptResult = await model.generateContent(scriptPrompt);
      const scriptText = scriptResult.response.text();
      const scriptJson = scriptText.match(/\{[\s\S]*\}/);
      
      if (generateType === "script") {
        if (scriptJson) {
          return NextResponse.json(JSON.parse(scriptJson[0]));
        }
        return NextResponse.json({ script: "" });
      }
      
      // Continue for "all"
      var script = "";
      if (scriptJson) {
        try {
          script = JSON.parse(scriptJson[0]).script || "";
        } catch {
          script = "";
        }
      }
    }

    if (generateType === "caption" || generateType === "all") {
      const captionPrompt = `${baseContext}

Create a caption and hashtags for this video.
- Caption should drive engagement (comments, saves, shares)
- Add a call-to-action
- Hashtags should mix trending and niche-specific

Return ONLY valid JSON:
{
  "caption": "Your caption here...",
  "hashtags": ["tag1", "tag2", "tag3"] (10-15 tags WITHOUT the # symbol)
}`;

      const captionResult = await model.generateContent(captionPrompt);
      const captionText = captionResult.response.text();
      const captionJson = captionText.match(/\{[\s\S]*\}/);
      
      if (generateType === "caption") {
        if (captionJson) {
          return NextResponse.json(JSON.parse(captionJson[0]));
        }
        return NextResponse.json({ caption: "", hashtags: [] });
      }
      
      // Continue for "all"
      var caption = "";
      var hashtags: string[] = [];
      if (captionJson) {
        try {
          const parsed = JSON.parse(captionJson[0]);
          caption = parsed.caption || "";
          hashtags = parsed.hashtags || [];
        } catch {
          caption = "";
          hashtags = [];
        }
      }
    }

    // Return all generated content
    if (generateType === "all") {
      return NextResponse.json({
        hooks: hooks!,
        script: script!,
        caption: caption!,
        hashtags: hashtags!,
      });
    }

    return NextResponse.json({ error: "Invalid generate type" }, { status: 400 });
  } catch (error) {
    console.error("Generate videos error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
