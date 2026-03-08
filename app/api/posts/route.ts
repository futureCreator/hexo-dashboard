import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { readPosts, deletePost, togglePostDraft, createPost, hexoPathValid, invalidatePostsCache } from "@/lib/hexo";

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
    invalidatePostsCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, tags, categories, draft } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  try {
    const post = createPost(hexoPath, {
      title: title.trim(),
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      categories: Array.isArray(categories) ? categories.filter(Boolean) : [],
      draft: draft === true,
    });
    invalidatePostsCache();
    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { filepath } = await request.json();

  if (!filepath || typeof filepath !== "string") {
    return NextResponse.json({ error: "filepath is required" }, { status: 400 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath || !filepath.startsWith(hexoPath)) {
    return NextResponse.json(
      { error: "Forbidden: filepath is outside configured hexo directory" },
      { status: 403 }
    );
  }

  try {
    const updated = togglePostDraft(filepath, hexoPath);
    invalidatePostsCache();
    return NextResponse.json({ success: true, post: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
