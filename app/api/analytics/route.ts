import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { getAnalyticsSummary, getDailyTrend, getTopPages } from "@/lib/analytics";
import { readPosts } from "@/lib/hexo";

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
  if (!settings.gaPropertyId || !settings.gaServiceAccountPath) {
    return NextResponse.json({ configured: false });
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const days = periodParam === "30" ? 30 : 7;

  try {
    const [summary, trend, rawTopPages] = await Promise.all([
      getAnalyticsSummary(days),
      getDailyTrend(days),
      getTopPages(days),
    ]);

    const abbrLinkMap = buildAbbrLinkMap(settings.hexoPath);

    const topPages = rawTopPages.map((p) => {
      const match = p.page.match(/(?:^|\/posts\/)(\d+)\/?$/);
      const title = match ? abbrLinkMap.get(match[1]) : undefined;
      return { ...p, title };
    });

    return NextResponse.json({ configured: true, summary, trend, topPages });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
