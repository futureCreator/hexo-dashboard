import { NextResponse } from "next/server";
import { readPosts, hexoPathValid, getSiteConfig } from "@/lib/hexo";
import { loadSettings } from "@/lib/settings";
import { buildLinkGraph } from "@/lib/link-graph";

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
  const { url: siteUrl } = getSiteConfig(hexoPath);
  const graph = buildLinkGraph(posts, siteUrl);

  return NextResponse.json(graph);
}
