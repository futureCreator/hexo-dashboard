import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadSettings } from "@/lib/settings";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

function safeRelPath(folder: string | null): string[] {
  if (!folder) return [];
  return folder
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== ".." && s !== ".");
}

export async function POST(request: NextRequest) {
  const { hexoPath } = loadSettings();
  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }

    const segments = safeRelPath(folder);
    const targetDir = path.join(hexoPath, "source", "images", ...segments);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    let targetPath = path.join(targetDir, safeName);
    if (fs.existsSync(targetPath)) {
      const base = path.basename(safeName, ext);
      targetPath = path.join(targetDir, `${base}_${Date.now()}${ext}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    // Return relative path from source/images/
    const relpath = [...segments, path.basename(targetPath)].join("/");

    return NextResponse.json(
      { success: true, filename: path.basename(targetPath), relpath },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
