import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { readPosts } from "@/lib/hexo";
import {
  getGscSummary,
  getGscDailyTrend,
  getGscTopQueries,
  getGscTopPages,
} from "@/lib/search-console";

function buildAbbrLinkMap(hexoPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!hexoPath) return map;
  try {
    const posts = readPosts(hexoPath);
    for (const post of posts) {
      if (post.abbrlink != null) {
        map.set(String(post.abbrlink), post.title);
      }
    }
  } catch {
    // ignore
  }
  return map;
}

export async function GET(request: NextRequest) {
  const settings = loadSettings();
  if (!settings.gaServiceAccountPath || !settings.gscSiteUrl) {
    return NextResponse.json({ configured: false });
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const parsed = Number(periodParam);
  const days = [7, 14, 30, 90].includes(parsed) ? parsed : 7;

  try {
    const [summary, trend, topQueries, rawTopPages] = await Promise.all([
      getGscSummary(days),
      getGscDailyTrend(days),
      getGscTopQueries(days),
      getGscTopPages(days),
    ]);

    const abbrLinkMap = buildAbbrLinkMap(settings.hexoPath ?? "");

    const topPages = rawTopPages.map((p) => {
      const match = p.page.match(/(?:^|\/posts\/)(\d+)\/?$/);
      const title = match ? abbrLinkMap.get(match[1]) : undefined;
      return { ...p, title };
    });

    return NextResponse.json({ configured: true, summary, trend, topQueries, topPages });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
