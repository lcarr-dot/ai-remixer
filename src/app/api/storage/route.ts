import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { put, list, del } from "@vercel/blob";
import * as XLSX from "xlsx";

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

// GET - Get spreadsheet data
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the main spreadsheet data
    const { blobs } = await list({ prefix: `spreadsheet/${userId}/` });
    
    if (blobs.length === 0) {
      return NextResponse.json({ columns: [], rows: [], hasData: false });
    }

    // Get the latest spreadsheet
    const latestBlob = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const response = await fetch(latestBlob.url);
    const data = await response.json();

    return NextResponse.json({
      columns: data.columns || [],
      rows: data.rows || [],
      hasData: true,
      lastUpdated: latestBlob.uploadedAt,
    });
  } catch (error) {
    console.error("Storage GET error:", error);
    return NextResponse.json({ error: "Failed to get data" }, { status: 500 });
  }
}

// POST - AI update based on text/voice input
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, text, data } = body;

    if (type === "ai_update" && text) {
      // Get current spreadsheet
      const { blobs } = await list({ prefix: `spreadsheet/${userId}/` });
      
      if (blobs.length === 0) {
        return NextResponse.json({ 
          error: "No spreadsheet data. Please upload your Excel file first." 
        }, { status: 400 });
      }

      const latestBlob = blobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0];

      const response = await fetch(latestBlob.url);
      const spreadsheetData = await response.json();
      const { columns, rows } = spreadsheetData;

      // Use Gemini to understand what to update
      const prompt = `You are helping update a content creator's spreadsheet.

Current columns: ${JSON.stringify(columns)}

Current data (first 5 rows for context):
${JSON.stringify(rows.slice(0, 5), null, 2)}

User said: "${text}"

Determine what row(s) to update and what values to set.
Return JSON with:
{
  "updates": [
    {
      "rowIndex": number (0-based, or -1 to add new row),
      "changes": { "columnName": "new value", ... }
    }
  ],
  "explanation": "what you understood and changed"
}

Match video titles/hooks approximately. If adding likes/comments/views, parse numbers like "1.2k" = 1200.
Return valid JSON only.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      let updatePlan;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          updatePlan = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch {
        return NextResponse.json({ 
          error: "Could not understand the update. Try being more specific.",
          aiResponse: responseText 
        }, { status: 400 });
      }

      // Apply updates
      const updatedRows = [...rows];
      for (const update of updatePlan.updates || []) {
        if (update.rowIndex === -1) {
          // Add new row
          const newRow: Record<string, string> = {};
          columns.forEach((col: string) => newRow[col] = "");
          Object.assign(newRow, update.changes);
          updatedRows.push(newRow);
        } else if (update.rowIndex >= 0 && update.rowIndex < updatedRows.length) {
          // Update existing row
          Object.assign(updatedRows[update.rowIndex], update.changes);
        }
      }

      // Save updated spreadsheet - delete old first, then save new
      try {
        const { blobs } = await list({ prefix: `spreadsheet/${userId}/` });
        for (const blob of blobs) {
          await del(blob.url);
        }
      } catch {
        // Ignore delete errors
      }
      
      await put(
        `spreadsheet/${userId}/data_${Date.now()}.json`,
        JSON.stringify({ columns, rows: updatedRows }),
        { access: "public", contentType: "application/json" }
      );

      return NextResponse.json({ 
        success: true, 
        explanation: updatePlan.explanation,
        updatesApplied: updatePlan.updates?.length || 0
      });
    }

    if (type === "draft" && data) {
      const entryId = data.id || `draft_${Date.now()}`;
      await put(
        `drafts/${userId}/${entryId}.json`,
        JSON.stringify({ type, ...data }),
        { access: "public", contentType: "application/json" }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Storage POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process" },
      { status: 500 }
    );
  }
}

// PUT - Upload spreadsheet file (preserves your exact structure)
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
    
    // Store original file as backup
    await put(
      `uploads/${userId}/${Date.now()}_${file.name}`,
      buffer,
      { access: "public" }
    );

    // Parse file - preserve exact structure
    let columns: string[] = [];
    let rows: Record<string, string>[] = [];

    if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const lines = text.split("\n").filter((l) => l.trim());
      columns = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      
      for (let i = 1; i < lines.length; i++) {
        // Handle CSV with quoted values
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx] || "";
        });
        rows.push(row);
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Get raw data preserving all columns
      const jsonData = XLSX.utils.sheet_to_json(sheet, { 
        raw: false, 
        defval: "",
        dateNF: "m/d/yy"
      }) as Record<string, string>[];
      
      if (jsonData.length > 0) {
        columns = Object.keys(jsonData[0]);
        rows = jsonData.map(row => {
          const cleanRow: Record<string, string> = {};
          columns.forEach(col => {
            cleanRow[col] = String(row[col] ?? "");
          });
          return cleanRow;
        });
      }
    } else {
      return NextResponse.json({ error: "Please upload CSV or Excel file" }, { status: 400 });
    }

    if (columns.length === 0) {
      return NextResponse.json({ error: "No columns found in file" }, { status: 400 });
    }

    // Delete old spreadsheet data
    const { blobs } = await list({ prefix: `spreadsheet/${userId}/` });
    for (const blob of blobs) {
      await del(blob.url);
    }

    // Save new spreadsheet data with unique timestamp
    await put(
      `spreadsheet/${userId}/data_${Date.now()}.json`,
      JSON.stringify({ columns, rows }),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ 
      success: true, 
      columns: columns.length,
      rows: rows.length
    });
  } catch (error) {
    console.error("Storage PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

// Helper to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}
