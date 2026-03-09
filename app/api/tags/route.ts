import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { readPosts, updateTagInPosts, hexoPathValid } from "@/lib/hexo";

export async function GET() {
  const { hexoPath } = loadSettings();
  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured", configured: false }, { status: 400 });
  }
  if (!hexoPathValid(hexoPath)) {
    return NextResponse.json({ error: "Hexo path is invalid", configured: true }, { status: 400 });
  }

  const posts = readPosts(hexoPath);
  const tagMap = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const tags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ tags, configured: true });
}

export async function PATCH(request: NextRequest) {
  const { hexoPath } = loadSettings();
  if (!hexoPath || !hexoPathValid(hexoPath)) {
    return NextResponse.json({ error: "Hexo path not configured or invalid" }, { status: 400 });
  }

  const body = await request.json();
  const { oldTag, newTag } = body as { oldTag?: string; newTag?: string };

  if (!oldTag?.trim() || !newTag?.trim()) {
    return NextResponse.json({ error: "oldTag and newTag are required" }, { status: 400 });
  }

  try {
    const updated = updateTagInPosts(hexoPath, oldTag.trim(), newTag.trim());
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { hexoPath } = loadSettings();
  if (!hexoPath || !hexoPathValid(hexoPath)) {
    return NextResponse.json({ error: "Hexo path not configured or invalid" }, { status: 400 });
  }

  const body = await request.json();
  const { tag } = body as { tag?: string };

  if (!tag?.trim()) {
    return NextResponse.json({ error: "tag is required" }, { status: 400 });
  }

  try {
    const updated = updateTagInPosts(hexoPath, tag.trim(), null);
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
