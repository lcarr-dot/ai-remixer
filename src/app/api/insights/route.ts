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

// Format spreadsheet data for AI context
function formatDataForAI(columns: string[], rows: Record<string, string>[]): string {
  if (rows.length === 0) return "No data available.";

  // Create a readable summary
  let summary = `You have ${rows.length} videos tracked.\n\nColumns: ${columns.join(", ")}\n\n`;
  
  // Add all video data
  summary += "VIDEO DATA:\n";
  rows.forEach((row, i) => {
    const parts: string[] = [];
    columns.forEach(col => {
      if (row[col] && row[col].trim()) {
        parts.push(`${col}: ${row[col]}`);
      }
    });
    if (parts.length > 0) {
      summary += `${i + 1}. ${parts.join(" | ")}\n`;
    }
  });

  return summary;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationHistory, videoScope } = await request.json();

    // Get the actual spreadsheet data
    const spreadsheet = await getSpreadsheetData(userId);
    
    if (!spreadsheet || spreadsheet.rows.length === 0) {
      return NextResponse.json({ 
        response: "I don't see any data yet! Please upload your content spreadsheet in the Storage section first. Once you do, I can analyze your video performance and help you find patterns.",
      });
    }

    // Limit rows based on scope
    const limit = videoScope === "newest" ? 5 : videoScope === "last10" ? 10 : spreadsheet.rows.length;
    const relevantRows = spreadsheet.rows.slice(0, limit);
    
    const dataContext = formatDataForAI(spreadsheet.columns, relevantRows);

    // Build conversation context
    const history = (conversationHistory || []) as ChatMessage[];
    const conversationContext = history.length > 0 
      ? "\n\nPREVIOUS CONVERSATION:\n" + history.map(m => `${m.role === "user" ? "User" : "You"}: ${m.content}`).join("\n")
      : "";

    const systemPrompt = `You are a friendly content performance analyst helping a creator understand their data.

YOUR DATA:
${dataContext}
${conversationContext}

FORMATTING RULES:
- Be concise - 2-4 short paragraphs max
- Use **bold** sparingly for key stats or points
- For lists, use simple format: "1. First thing"
- Reference SPECIFIC videos and numbers from the data
- Talk naturally like a helpful friend
- No excessive headers or formatting

User: "${message}"

Give a helpful, concise response:`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get insights" },
      { status: 500 }
    );
  }
}
