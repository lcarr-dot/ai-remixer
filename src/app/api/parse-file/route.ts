import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let text = "";

    if (fileName.endsWith(".pdf")) {
      // PDF support temporarily disabled due to serverless compatibility
      return NextResponse.json(
        { error: "PDF support coming soon. Please use Excel, CSV, or TXT files for now." },
        { status: 400 }
      );
    } else if (
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv")
    ) {
      // Parse Excel/CSV
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetNames = workbook.SheetNames;
      
      // Convert all sheets to text
      const allText: string[] = [];
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        allText.push(`--- ${sheetName} ---\n${csv}`);
      }
      text = allText.join("\n\n");
    } else if (fileName.endsWith(".txt")) {
      // Plain text
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload Excel, CSV, or TXT files." },
        { status: 400 }
      );
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error parsing file:", error);
    return NextResponse.json(
      { error: "Failed to parse file. Please try a different file." },
      { status: 500 }
    );
  }
}
