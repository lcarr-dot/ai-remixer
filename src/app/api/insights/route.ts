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

// Get user's actual spreadsheet data
async function getSpreadsheetData(userId: string): Promise<{ columns: string[]; rows: Record<string, string>[] } | null> {
  try {
    const { blobs } = await list({ prefix: `spreadsheet/${userId}/` });
    
    if (blobs.length === 0) return null;

    const latestBlob = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const response = await fetch(latestBlob.url);
    const data = await response.json();
    
    return {
      columns: data.columns || [],
      rows: data.rows || []
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, videoScope } = await request.json();

    // Get the actual spreadsheet data
    const spreadsheet = await getSpreadsheetData(userId);
    
    if (!spreadsheet || spreadsheet.rows.length === 0) {
      return NextResponse.json({ 
        insight: {
          answer: "No data found. Please upload your spreadsheet in the Storage section first.",
          patterns: [],
          topPerformers: [],
          recommendations: ["Upload your Excel/CSV data in Storage"]
        }
      });
    }

    // Limit rows based on scope
    const limit = videoScope === "newest" ? 5 : videoScope === "last10" ? 10 : spreadsheet.rows.length;
    const relevantRows = spreadsheet.rows.slice(0, limit);

    // Build context from actual data
    const dataContext = JSON.stringify({
      columns: spreadsheet.columns,
      totalVideos: spreadsheet.rows.length,
      analyzingVideos: relevantRows.length,
      data: relevantRows
    }, null, 2);

    const prompt = `You are analyzing a content creator's video performance data. Look for PATTERNS and INSIGHTS.

SPREADSHEET DATA:
${dataContext}

USER QUESTION: "${question || "What patterns do you see in my content performance?"}"

Analyze this data and find:
1. What hooks/topics get the MOST views?
2. What patterns exist in top-performing content?
3. What day/time patterns exist (if date data available)?
4. What content styles work best?

Return JSON with this structure:
{
  "answer": "Direct answer analyzing the actual data patterns (3-5 sentences with specific numbers/examples from the data)",
  "patterns": ["pattern 1 found in data", "pattern 2", "pattern 3"],
  "topPerformers": ["video/hook that performed best with stats", "second best"],
  "recommendations": ["specific recommendation based on patterns", "another recommendation"]
}

BE SPECIFIC - reference actual data points, view counts, hooks from the spreadsheet.
Do NOT mention missing data or confidence scores - just analyze what IS there.
Return valid JSON only.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsedResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback - try again
      const retryResult = await model.generateContent(prompt + "\n\nReturn ONLY valid JSON.");
      const retryText = retryResult.response.text();
      const jsonMatch = retryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = {
          answer: "I found your data but had trouble analyzing it. Try asking a more specific question.",
          patterns: [],
          topPerformers: [],
          recommendations: ["Try asking about specific metrics like views or hooks"]
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
