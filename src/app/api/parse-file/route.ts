import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    let text = "";

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      // Parse Excel/CSV
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const allText: string[] = [];

      for (const sheetName of workbook.SheetNames) {
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

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Parse file error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}
