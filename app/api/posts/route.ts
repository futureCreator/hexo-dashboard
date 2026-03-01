import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { readPosts, deletePost, hexoPathValid } from "@/lib/hexo";

export async function GET() {
  const { hexoPath } = loadSettings();

  if (!hexoPath) {
    return NextResponse.json(
      { error: "Hexo path not configured", configured: false },
      { status: 400 }
    );
  }

  if (!hexoPathValid(hexoPath)) {
    return NextResponse.json(
      { error: "Hexo path is invalid or inaccessible", configured: true },
      { status: 400 }
    );
  }

  const posts = readPosts(hexoPath);
  return NextResponse.json({ posts, hexoPath });
}

export async function DELETE(request: NextRequest) {
  const { filepath } = await request.json();

  if (!filepath || typeof filepath !== "string") {
    return NextResponse.json(
      { error: "filepath is required" },
      { status: 400 }
    );
  }

  // Security: ensure the filepath is within the configured hexo path
  const { hexoPath } = loadSettings();
  if (!hexoPath || !filepath.startsWith(hexoPath)) {
    return NextResponse.json(
      { error: "Forbidden: filepath is outside configured hexo directory" },
      { status: 403 }
    );
  }

  try {
    deletePost(filepath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
