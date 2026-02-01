import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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

export async function POST(request: NextRequest) {
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

    const fileName = file.name.toLowerCase();
    let text = "";

    if (fileName.endsWith(".txt")) {
      // Plain text file
      text = await file.text();
    } else if (fileName.endsWith(".pdf")) {
      // For PDF, we'll use a simple extraction approach
      // Using pdf-parse would require Node.js specific modules
      // Instead, let's extract readable text from the PDF binary
      const buffer = await file.arrayBuffer();
      text = extractTextFromPDF(new Uint8Array(buffer));
    } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      // For Word docs, try to extract text
      const buffer = await file.arrayBuffer();
      text = extractTextFromDoc(new Uint8Array(buffer));
    } else {
      return NextResponse.json({ 
        error: "Unsupported file type. Please upload PDF, TXT, DOC, or DOCX." 
      }, { status: 400 });
    }

    // Clean up the text
    text = text
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\n]/g, " ")
      .trim();

    if (!text || text.length < 10) {
      return NextResponse.json({ 
        error: "Could not extract text from file. Try copying the text manually." 
      }, { status: 400 });
    }

    // Limit text length to prevent huge inputs
    if (text.length > 5000) {
      text = text.substring(0, 5000) + "...";
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Parse file error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse file" },
      { status: 500 }
    );
  }
}

// Simple PDF text extraction (basic approach for readable PDFs)
function extractTextFromPDF(data: Uint8Array): string {
  const text: string[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const content = decoder.decode(data);
  
  // Extract text between BT and ET markers (PDF text objects)
  const textMatches = content.match(/BT[\s\S]*?ET/g) || [];
  
  for (const match of textMatches) {
    // Look for text inside parentheses (literal strings)
    const literals = match.match(/\(([^)]*)\)/g) || [];
    for (const lit of literals) {
      const cleaned = lit.slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
      if (cleaned.trim()) {
        text.push(cleaned);
      }
    }
    
    // Look for hex strings
    const hexStrings = match.match(/<([0-9A-Fa-f]+)>/g) || [];
    for (const hex of hexStrings) {
      const hexContent = hex.slice(1, -1);
      let decoded = "";
      for (let i = 0; i < hexContent.length; i += 2) {
        const byte = parseInt(hexContent.substr(i, 2), 16);
        if (byte >= 32 && byte <= 126) {
          decoded += String.fromCharCode(byte);
        }
      }
      if (decoded.trim()) {
        text.push(decoded);
      }
    }
  }
  
  // Also try to find stream content
  const streamMatches = content.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g) || [];
  for (const stream of streamMatches) {
    // Extract any readable ASCII text
    const readable = stream.match(/[A-Za-z0-9\s.,!?'"()-]{10,}/g) || [];
    for (const r of readable) {
      if (!r.match(/^[A-Za-z]{20,}$/)) { // Avoid encoded gibberish
        text.push(r);
      }
    }
  }
  
  return text.join(" ").replace(/\s+/g, " ").trim();
}

// Simple DOC/DOCX text extraction
function extractTextFromDoc(data: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const content = decoder.decode(data);
  
  // For DOCX (which is XML-based), try to extract text from <w:t> tags
  const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  if (textMatches.length > 0) {
    return textMatches
      .map(m => m.replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
  }
  
  // For older DOC format, try to extract readable text
  const readable = content.match(/[A-Za-z0-9\s.,!?'"()-]{5,}/g) || [];
  return readable
    .filter(r => !r.match(/^[A-Za-z]{20,}$/))
    .join(" ")
    .trim();
}
