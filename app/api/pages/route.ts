import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { readPages, deletePage, createPage, hexoPathValid } from "@/lib/hexo";

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

  const pages = readPages(hexoPath);
  return NextResponse.json({ pages, hexoPath });
}

export async function DELETE(request: NextRequest) {
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
    deletePage(filepath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, slug } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!slug?.trim()) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  try {
    const page = createPage(hexoPath, { title: title.trim(), slug: slug.trim() });
    return NextResponse.json({ success: true, page }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
