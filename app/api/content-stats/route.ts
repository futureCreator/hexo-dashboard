import { NextResponse } from "next/server";
import fs from "fs";
import { readPosts } from "@/lib/hexo";
import { loadSettings } from "@/lib/settings";
import { analyzeContent } from "@/lib/content-stats";

export async function GET() {
  const settings = loadSettings();
  const hexoPath = settings.hexoPath;

  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  const posts = readPosts(hexoPath).filter((p) => !p.draft);

  const postStats = posts.map((post) => {
    try {
      const content = fs.readFileSync(post.filepath, "utf-8");
      const { readability } = analyzeContent(content);
      return {
        date: post.date,
        wordCount: readability.wordCount,
        charCount: readability.charCount,
        readingTime: readability.readingTime,
      };
    } catch {
      return { date: post.date, wordCount: 0, charCount: 0, readingTime: 0 };
    }
  });

  const totalWords = postStats.reduce((sum, p) => sum + p.wordCount, 0);
  const totalChars = postStats.reduce((sum, p) => sum + p.charCount, 0);
  const totalReadingTime = postStats.reduce((sum, p) => sum + p.readingTime, 0);
  const avgWordCount =
    postStats.length > 0 ? Math.round(totalWords / postStats.length) : 0;

  // Monthly trend — last 12 months with data
  const monthMap: Record<string, { totalWords: number; count: number }> = {};
  for (const p of postStats) {
    if (!p.date) continue;
    const month = p.date.slice(0, 7); // "YYYY-MM"
    if (!monthMap[month]) monthMap[month] = { totalWords: 0, count: 0 };
    monthMap[month].totalWords += p.wordCount;
    monthMap[month].count++;
  }

  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, { totalWords: tw, count }]) => ({
      month: month.slice(2), // "YY-MM" for compact display
      avgWords: Math.round(tw / count),
      postCount: count,
    }));

  return NextResponse.json({
    postCount: posts.length,
    totalWords,
    totalChars,
    totalReadingTime,
    avgWordCount,
    monthlyTrend,
  });
}
