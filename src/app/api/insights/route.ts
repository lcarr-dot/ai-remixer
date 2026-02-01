import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { list } from "@vercel/blob";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

// Zod schema for validation
const insightResultSchema = z.object({
  answer: z.string(),
  confidenceScore: z.number().min(0).max(100),
  recommendedActions: z.array(z.string()),
  missingDataRequests: z.array(z.string()),
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

// Helper to get user's video data for context
async function getUserVideoContext(userId: string, scope: string): Promise<{ context: string; missingFields: string[] }> {
  const missingFields: string[] = [];
  
  try {
    // Get user's storage/spreadsheet data
    const { blobs } = await list({ prefix: `storage/${userId}/` });
    
    const videoData: string[] = [];
    const sortedBlobs = blobs
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    const limit = scope === "newest" ? 1 : scope === "last10" ? 10 : 50;
    const relevantBlobs = sortedBlobs.slice(0, limit);

    for (const blob of relevantBlobs) {
      try {
        const response = await fetch(blob.url);
        const data = await response.json();
        
        // Track what data we have and what's missing
        if (data.type === "video_log" || data.type === "video") {
          const entry = data.data || data;
          const fields: string[] = [];
          
          if (entry.title) fields.push(`Title: ${entry.title}`);
          if (entry.platform) fields.push(`Platform: ${entry.platform}`);
          if (entry.views) fields.push(`Views: ${entry.views}`);
          if (entry.likes) fields.push(`Likes: ${entry.likes}`);
          if (entry.comments) fields.push(`Comments: ${entry.comments}`);
          if (entry.hook) fields.push(`Hook: ${entry.hook}`);
          if (entry.postedAt) fields.push(`Posted: ${entry.postedAt}`);
          
          // Track missing fields
          if (!entry.views) missingFields.push("views");
          if (!entry.likes) missingFields.push("likes");
          if (!entry.hook) missingFields.push("hook text");
          if (!entry.avgWatchTime) missingFields.push("avg watch time");
          
          if (fields.length > 0) {
            videoData.push(fields.join(", "));
          }
        }
      } catch {
        // Skip failed fetches
      }
    }

    // Get past drafts for context
    const { blobs: draftBlobs } = await list({ prefix: `drafts/${userId}/` });
    const recentDrafts = draftBlobs
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 5);

    const draftData: string[] = [];
    for (const blob of recentDrafts) {
      try {
        const response = await fetch(blob.url);
        const draft = await response.json();
        if (draft.topic) {
          draftData.push(`Draft: ${draft.topic} (${draft.platform || "unknown"})`);
        }
      } catch {
        // Skip
      }
    }

    // Get market research for context
    const { blobs: researchBlobs } = await list({ prefix: `market-research/${userId}/` });
    let researchContext = "";
    
    if (researchBlobs.length > 0) {
      const sorted = researchBlobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      try {
        const response = await fetch(sorted[0].url);
        const research = await response.json();
        if (research.trendingThemes) {
          researchContext = `\nRecent market research themes: ${research.trendingThemes.slice(0, 5).join(", ")}`;
        }
      } catch {
        // Skip
      }
    }

    const context = `
--- USER CONTENT DATA ---
${videoData.length > 0 ? `Videos:\n${videoData.map(v => `- ${v}`).join("\n")}` : "No video data logged yet."}
${draftData.length > 0 ? `\nRecent drafts:\n${draftData.map(d => `- ${d}`).join("\n")}` : ""}
${researchContext}
--- END DATA ---
`;

    return { context, missingFields: [...new Set(missingFields)] };
  } catch {
    return { 
      context: "No user data available yet.",
      missingFields: ["YouTube views", "TikTok views", "hooks", "avg watch time"]
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, videoScope } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const { context, missingFields } = await getUserVideoContext(userId, videoScope || "last10");

    const prompt = `You are a content performance analyst. Answer the user's question based on their video data.

${context}

User's Question: "${question}"

IMPORTANT: YouTube + TikTok data are the highest priority for insights.

Return your response as valid JSON with this exact structure:
{
  "answer": "Your detailed, helpful answer to the question (2-4 sentences)",
  "confidenceScore": [0-100 based on how much relevant data you have],
  "recommendedActions": ["action1", "action2", "action3"] (2-4 specific actionable recommendations),
  "missingDataRequests": ["data1", "data2"] (what data would help improve insights)
}

If data is limited, be honest about confidence. Suggest what data they should log next.
${missingFields.length > 0 ? `\nKnown missing fields: ${missingFields.join(", ")}` : ""}

Return valid JSON only.`;

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
      insightResultSchema.parse(parsedResult);
    } catch {
      // Retry with repair prompt
      const repairPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;
      result = await model.generateContent(repairPrompt);
      responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
        insightResultSchema.parse(parsedResult);
      } else {
        // Fallback response
        parsedResult = {
          answer: "I need more data to provide detailed insights. Please log your video performance in the Storage section.",
          confidenceScore: 20,
          recommendedActions: ["Log your YouTube video views", "Log your TikTok video views", "Add hook text for each video"],
          missingDataRequests: missingFields.length > 0 ? missingFields : ["video views", "engagement metrics"],
        };
      }
    }

    return NextResponse.json({ insight: parsedResult });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get insights" },
      { status: 500 }
    );
  }
}
