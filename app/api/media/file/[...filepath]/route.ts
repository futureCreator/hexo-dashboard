import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadSettings } from "@/lib/settings";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  const { filepath } = await params;

  // Reject path traversal attempts
  if (filepath.some((seg) => seg === ".." || seg === ".")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) {
    return new NextResponse("Not configured", { status: 400 });
  }

  const absPath = path.join(hexoPath, "source", "images", ...filepath);
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(absPath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  const buffer = fs.readFileSync(absPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
