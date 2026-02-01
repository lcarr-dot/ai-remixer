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
  description: z.string().optional(),
  views: z.number().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
  saves: z.number().optional(),
  duration: z.number().optional(),
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
  "description": "video description/caption if mentioned",
  "views": number (parse 1.2k as 1200, 12k as 12000, etc),
  "likes": number,
  "comments": number,
  "shares": number,
  "saves": number,
  "duration": number in seconds,
  "avgWatchTime": number in seconds,
  "postedAt": "ISO date string if date mentioned (YYYY-MM-DD format)",
  "confidence": 0-100 (how confident you are in the parsing)
}

Be lenient - extract partial info. Handle shorthand like "1.2k" or "12k". Return valid JSON only.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

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

// PUT - Upload and import file with AI-powered parsing
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
    
    // Store original file
    await put(
      `uploads/${userId}/${Date.now()}_${file.name}`,
      buffer,
      { access: "public" }
    );

    // Extract raw data from file
    let rawData: Record<string, unknown>[] = [];

    if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const row: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim() || "";
        });
        rawData.push(row);
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: "yyyy-mm-dd" }) as Record<string, unknown>[];
    } else if (fileName.endsWith(".json")) {
      const jsonData = JSON.parse(buffer.toString("utf-8"));
      rawData = Array.isArray(jsonData) ? jsonData : [jsonData];
    } else if (fileName.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      const lines = text.split("\n").filter((l) => l.trim());
      rawData = lines.map((line) => ({ raw_content: line.trim() }));
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (rawData.length === 0) {
      return NextResponse.json({ error: "No data found in file" }, { status: 400 });
    }

    // Use Gemini to intelligently map columns
    const sampleRows = rawData.slice(0, 3);
    const columns = Object.keys(rawData[0]);
    
    const mappingPrompt = `You are parsing a spreadsheet with video/content performance data.

Columns in the spreadsheet: ${JSON.stringify(columns)}

Sample rows:
${JSON.stringify(sampleRows, null, 2)}

Create a mapping from the spreadsheet columns to these standard fields:
- title: video title/name
- platform: social media platform (youtube, tiktok, instagram, etc)
- hook: the hook/opening line
- description: video description/caption
- views: view count
- likes: like count  
- comments: comment count
- shares: share count
- saves: save count
- duration: video length in seconds (convert from MM:SS or HH:MM:SS format if needed)
- postedAt: post date (convert to YYYY-MM-DD format)

Return a JSON object mapping spreadsheet column names to standard field names.
Only include mappings you're confident about. Example:
{
  "Video Title": "title",
  "Platform": "platform",
  "Views": "views",
  "Post Date": "postedAt"
}

Return valid JSON only.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const mappingResult = await model.generateContent(mappingPrompt);
    const mappingText = mappingResult.response.text();
    
    let columnMapping: Record<string, string> = {};
    try {
      const jsonMatch = mappingText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        columnMapping = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to basic mapping
      columnMapping = {};
    }

    // Transform data using the mapping
    const entries = rawData.map((row) => {
      const entry: Record<string, unknown> = { type: "video_log" };
      
      Object.entries(row).forEach(([colName, value]) => {
        const mappedField = columnMapping[colName];
        if (mappedField && value !== undefined && value !== null && value !== "") {
          const strValue = String(value);
          
          // Parse based on field type
          if (["views", "likes", "comments", "shares", "saves"].includes(mappedField)) {
            entry[mappedField] = parseNumber(strValue);
          } else if (mappedField === "duration") {
            entry[mappedField] = parseDuration(strValue);
          } else if (mappedField === "postedAt") {
            entry[mappedField] = parseDate(strValue);
          } else if (mappedField === "platform") {
            entry[mappedField] = strValue.toLowerCase();
          } else {
            entry[mappedField] = strValue;
          }
        }
      });
      
      // Store original row data for reference
      entry.rawData = row;
      entry.importedFrom = file.name;
      entry.importedAt = new Date().toISOString();
      
      return entry;
    });

    // Save parsed entries
    let imported = 0;
    for (const entry of entries) {
      if (Object.keys(entry).length > 3) { // Has more than just type, rawData, importedFrom
        const entryId = `import_${Date.now()}_${imported}`;
        
        await put(
          `storage/${userId}/${entryId}.json`,
          JSON.stringify(entry),
          { access: "public", contentType: "application/json" }
        );
        
        imported++;
        
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    // Save audit log
    await put(
      `audit/${userId}/import_${Date.now()}_audit.json`,
      JSON.stringify({
        action: "import",
        fileName: file.name,
        totalRows: rawData.length,
        entriesImported: imported,
        columnMapping,
        timestamp: new Date().toISOString(),
      }),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ 
      success: true, 
      imported,
      totalRows: rawData.length,
      mappedColumns: Object.keys(columnMapping).length
    });
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
    return isNaN(num) ? undefined : Math.round(num * 1000);
  }
  if (cleaned.endsWith("m")) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? undefined : Math.round(num * 1000000);
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : Math.round(num);
}

// Helper to parse duration from various formats (MM:SS, HH:MM:SS, or seconds)
function parseDuration(value: string): number | undefined {
  if (!value) return undefined;
  
  const cleaned = value.trim();
  
  // Already a number (seconds)
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned);
  }
  
  // MM:SS format
  const mmss = cleaned.match(/^(\d+):(\d+)$/);
  if (mmss) {
    return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  }
  
  // HH:MM:SS format
  const hhmmss = cleaned.match(/^(\d+):(\d+):(\d+)$/);
  if (hhmmss) {
    return parseInt(hhmmss[1]) * 3600 + parseInt(hhmmss[2]) * 60 + parseInt(hhmmss[3]);
  }
  
  return undefined;
}

// Helper to parse dates to YYYY-MM-DD format
function parseDate(value: string): string | undefined {
  if (!value) return undefined;
  
  const cleaned = value.trim();
  
  // Try to parse as date
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }
  
  // Handle MM/DD/YYYY or DD/MM/YYYY formats
  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => parseInt(p));
    
    // Assume MM/DD/YYYY if first number <= 12
    if (a <= 12 && c > 100) {
      return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    // DD/MM/YYYY
    if (b <= 12 && c > 100) {
      return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    // YYYY/MM/DD
    if (a > 100) {
      return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
    }
  }
  
  return cleaned;
}
