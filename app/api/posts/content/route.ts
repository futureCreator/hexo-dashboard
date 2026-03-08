import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { loadSettings } from "@/lib/settings";
import { invalidatePostsCache } from "@/lib/hexo";

function guardPath(filepath: string): NextResponse | null {
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
  return null;
}

export async function GET(request: NextRequest) {
  const filepath = request.nextUrl.searchParams.get("filepath") ?? "";
  const guard = guardPath(filepath);
  if (guard) return guard;

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { filepath, content } = await request.json();
  const guard = guardPath(filepath);
  if (guard) return guard;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    fs.writeFileSync(filepath, content, "utf-8");
    invalidatePostsCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
