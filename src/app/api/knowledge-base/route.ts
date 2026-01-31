import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import * as XLSX from "xlsx";

// Helper to extract text from files
async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.endsWith(".pdf")) {
    // Dynamic import for pdf-parse to avoid build issues
    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  } else if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv")
  ) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const allText: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      allText.push(`--- ${sheetName} ---\n${csv}`);
    }
    return allText.join("\n\n");
  } else if (lowerName.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  
  return "";
}

// GET - List all knowledge base items
export async function GET() {
  try {
    const { blobs } = await list({ prefix: "knowledge-base/" });
    
    const items = blobs
      .filter(blob => blob.pathname.endsWith(".json"))
      .map(blob => {
        const name = blob.pathname.replace("knowledge-base/", "").replace(".json", "");
        return {
          id: blob.pathname,
          name: decodeURIComponent(name.split("_").slice(1).join("_")),
          type: blob.pathname.includes("_pdf_") ? "pdf" : 
                blob.pathname.includes("_excel_") ? "excel" : "text",
          uploadedAt: blob.uploadedAt,
          size: blob.size,
        };
      });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error listing knowledge base:", error);
    // Return empty if blob storage not configured
    return NextResponse.json({ items: [] });
  }
}

// POST - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Determine file type
    const lowerName = file.name.toLowerCase();
    const fileType = lowerName.endsWith(".pdf") ? "pdf" : 
                     (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv")) ? "excel" : 
                     "text";

    // Create a unique filename
    const timestamp = Date.now();
    const safeName = encodeURIComponent(file.name.replace(/\.[^/.]+$/, ""));
    const blobPath = `knowledge-base/${timestamp}_${fileType}_${safeName}.json`;

    // Store the extracted text as JSON
    const data = {
      originalName: file.name,
      type: fileType,
      text: text.substring(0, 50000), // Limit to 50k chars per document
      uploadedAt: new Date().toISOString(),
    };

    await put(blobPath, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error uploading to knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to upload document. Make sure BLOB_READ_WRITE_TOKEN is configured." },
      { status: 500 }
    );
  }
}

// DELETE - Remove a document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }

    await del(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting from knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
