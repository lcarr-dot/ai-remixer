import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { put, list } from "@vercel/blob";
import { z } from "zod";
import * as XLSX from "xlsx";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

// Zod schema for parsed log entry
const parsedLogSchema = z.object({
  title: z.string().optional(),
  platform: z.string().optional(),
  hook: z.string().optional(),
  views: z.number().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
  avgWatchTime: z.number().optional(),
  postedAt: z.string().optional(),
  confidence: z.number(),
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

// GET - Get all entries
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { blobs } = await list({ prefix: `storage/${userId}/` });
    
    const entries = [];
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        const data = await response.json();
        entries.push({
          id: blob.pathname.split("/").pop()?.replace(".json", "") || "",
          ...data,
          createdAt: blob.uploadedAt,
        });
      } catch {
        // Skip invalid entries
      }
    }

    // Sort by creation date, newest first
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Storage GET error:", error);
    return NextResponse.json({ error: "Failed to get entries" }, { status: 500 });
  }
}

// POST - Log text entry or save data
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, text, data } = body;

    if (type === "text_log" && text) {
      // Parse the text using Gemini
      const prompt = `Parse this content creator's log entry and extract structured data.

Log entry: "${text}"

Return JSON with these fields (only include fields you can extract with confidence):
{
  "title": "video title if mentioned",
  "platform": "youtube/tiktok/instagram/shorts (lowercase)",
  "hook": "the hook text if mentioned",
  "views": number (parse 1.2k as 1200, 12k as 12000, etc),
  "likes": number,
  "comments": number,
  "shares": number,
  "avgWatchTime": number in seconds,
  "postedAt": "ISO date string if date mentioned",
  "confidence": 0-100 (how confident you are in the parsing)
}

Be lenient - extract partial info. Handle shorthand like "1.2k" or "12k". Return valid JSON only.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      
      let result = await model.generateContent(prompt);
      let responseText = result.response.text();

      let parsedData;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
          parsedLogSchema.parse(parsedData);
        } else {
          throw new Error("No JSON found");
        }
      } catch {
        // Fallback - store as raw entry
        parsedData = {
          title: text.substring(0, 50),
          rawText: text,
          confidence: 10,
        };
      }

      // Create entry with audit
      const entryId = `entry_${Date.now()}`;
      const entry = {
        type: "video_log",
        ...parsedData,
        rawInput: text,
        parsedAt: new Date().toISOString(),
      };

      // Save entry
      await put(
        `storage/${userId}/${entryId}.json`,
        JSON.stringify(entry),
        { access: "public", contentType: "application/json" }
      );

      // Save audit log
      await put(
        `audit/${userId}/${entryId}_audit.json`,
        JSON.stringify({
          entryId,
          action: "create",
          rawInput: text,
          parsedData,
          timestamp: new Date().toISOString(),
        }),
        { access: "public", contentType: "application/json" }
      );

      return NextResponse.json({ success: true, entry });
    }

    if (type === "market_research" || type === "draft") {
      // Save research or draft data
      const entryId = data.id || `${type}_${Date.now()}`;
      
      await put(
        `storage/${userId}/${entryId}.json`,
        JSON.stringify({ type, ...data }),
        { access: "public", contentType: "application/json" }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Storage POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save entry" },
      { status: 500 }
    );
  }
}

// PUT - Upload and import file
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let entries: Record<string, unknown>[] = [];

    // Parse file based on type
    if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const entry: Record<string, unknown> = {};
        
        headers.forEach((header, idx) => {
          const value = values[idx]?.trim();
          if (value) {
            // Map common column names
            if (header.includes("title") || header.includes("name")) {
              entry.title = value;
            } else if (header.includes("platform")) {
              entry.platform = value.toLowerCase();
            } else if (header.includes("view")) {
              entry.views = parseNumber(value);
            } else if (header.includes("like")) {
              entry.likes = parseNumber(value);
            } else if (header.includes("comment")) {
              entry.comments = parseNumber(value);
            } else if (header.includes("hook")) {
              entry.hook = value;
            } else if (header.includes("date") || header.includes("posted")) {
              entry.postedAt = value;
            }
          }
        });
        
        if (Object.keys(entry).length > 0) {
          entries.push(entry);
        }
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      
      entries = data.map((row) => {
        const entry: Record<string, unknown> = {};
        
        Object.entries(row).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes("title") || lowerKey.includes("name")) {
            entry.title = String(value);
          } else if (lowerKey.includes("platform")) {
            entry.platform = String(value).toLowerCase();
          } else if (lowerKey.includes("view")) {
            entry.views = parseNumber(String(value));
          } else if (lowerKey.includes("like")) {
            entry.likes = parseNumber(String(value));
          } else if (lowerKey.includes("comment")) {
            entry.comments = parseNumber(String(value));
          } else if (lowerKey.includes("hook")) {
            entry.hook = String(value);
          } else if (lowerKey.includes("date") || lowerKey.includes("posted")) {
            entry.postedAt = String(value);
          }
        });
        
        return entry;
      }).filter((e) => Object.keys(e).length > 0);
    } else if (fileName.endsWith(".json")) {
      const jsonData = JSON.parse(buffer.toString("utf-8"));
      entries = Array.isArray(jsonData) ? jsonData : [jsonData];
    } else if (fileName.endsWith(".txt")) {
      // Parse as line-by-line entries
      const text = buffer.toString("utf-8");
      const lines = text.split("\n").filter((l) => l.trim());
      
      entries = lines.map((line) => ({
        title: line.trim().substring(0, 100),
        rawText: line.trim(),
      }));
    }

    // Store original file
    await put(
      `uploads/${userId}/${Date.now()}_${file.name}`,
      buffer,
      { access: "public" }
    );

    // Save parsed entries
    let imported = 0;
    for (const entry of entries) {
      const entryId = `import_${Date.now()}_${imported}`;
      
      await put(
        `storage/${userId}/${entryId}.json`,
        JSON.stringify({
          type: "video_log",
          ...entry,
          importedFrom: file.name,
          importedAt: new Date().toISOString(),
        }),
        { access: "public", contentType: "application/json" }
      );
      
      imported++;
    }

    // Save audit log
    await put(
      `audit/${userId}/import_${Date.now()}_audit.json`,
      JSON.stringify({
        action: "import",
        fileName: file.name,
        entriesImported: imported,
        timestamp: new Date().toISOString(),
      }),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error("Storage PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

// Helper to parse numbers like "1.2k", "12k", "1,200"
function parseNumber(value: string): number | undefined {
  if (!value) return undefined;
  
  const cleaned = value.toLowerCase().replace(/,/g, "").trim();
  
  if (cleaned.endsWith("k")) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? undefined : num * 1000;
  }
  if (cleaned.endsWith("m")) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? undefined : num * 1000000;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}
