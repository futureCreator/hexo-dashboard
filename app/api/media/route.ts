import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadSettings } from "@/lib/settings";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

function safeRelPath(folder: string | null): string[] {
  if (!folder) return [];
  // Split and strip any traversal segments
  return folder
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== ".." && s !== ".");
}

export async function GET(request: NextRequest) {
  const { hexoPath } = loadSettings();
  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  const folder = request.nextUrl.searchParams.get("folder");
  const segments = safeRelPath(folder);
  const imagesDir = path.join(hexoPath, "source", "images", ...segments);

  if (!fs.existsSync(imagesDir)) {
    return NextResponse.json({ folders: [], images: [] });
  }

  const entries = fs.readdirSync(imagesDir, { withFileTypes: true });

  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const images = entries
    .filter(
      (e) => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase())
    )
    .map((e) => {
      const stat = fs.statSync(path.join(imagesDir, e.name));
      return { filename: e.name, size: stat.size, mtime: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

  return NextResponse.json({ folders, images });
}

export async function DELETE(request: NextRequest) {
  const { relpath } = await request.json();

  if (
    !relpath ||
    typeof relpath !== "string" ||
    relpath.includes("..") ||
    relpath.startsWith("/")
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  const filepath = path.join(hexoPath, "source", "images", relpath);
  if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    fs.unlinkSync(filepath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
