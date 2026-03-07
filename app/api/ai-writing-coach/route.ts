import { NextResponse } from "next/server";
import fs from "fs";
import { readPosts } from "@/lib/hexo";
import { loadSettings } from "@/lib/settings";
import { analyzeContent } from "@/lib/content-stats";

export interface Insight {
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
  metric?: string;
}

export interface WritingCoachData {
  insights: Insight[];
  generatedAt: string;
}

export async function GET() {
  const settings = loadSettings();
  const hexoPath = settings.hexoPath;

  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const posts = readPosts(hexoPath).filter((p) => !p.draft && p.date);

  if (posts.length < 3) {
    return NextResponse.json({ error: "분석에 충분한 포스트가 없습니다 (최소 3개)" }, { status: 400 });
  }

  // Build per-post stats
  const postStats = posts.map((post) => {
    let wordCount = 0;
    try {
      const content = fs.readFileSync(post.filepath, "utf-8");
      const { readability } = analyzeContent(content);
      wordCount = readability.wordCount;
    } catch {
      // ignore
    }
    return {
      date: post.date!,
      month: post.date!.slice(0, 7),
      wordCount,
      tags: post.tags,
      categories: post.categories,
    };
  });

  // Monthly stats
  const monthMap: Record<string, { totalWords: number; count: number }> = {};
  for (const p of postStats) {
    if (!monthMap[p.month]) monthMap[p.month] = { totalWords: 0, count: 0 };
    monthMap[p.month].totalWords += p.wordCount;
    monthMap[p.month].count++;
  }
  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, { totalWords, count }]) => ({
      month,
      avgWords: count > 0 ? Math.round(totalWords / count) : 0,
      postCount: count,
    }));

  // Tag frequency
  const tagCount: Record<string, number> = {};
  for (const p of postStats) {
    for (const tag of p.tags) {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  // Category frequency
  const catCount: Record<string, number> = {};
  for (const p of postStats) {
    for (const cat of p.categories) {
      catCount[cat] = (catCount[cat] || 0) + 1;
    }
  }
  const topCategories = Object.entries(catCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([cat, count]) => ({ cat, count }));

  // Recent vs older comparison (last 3 months vs previous 3 months)
  const sortedMonths = monthlyTrend.map((m) => m.month).sort();
  const recent3 = monthlyTrend.filter((m) => sortedMonths.slice(-3).includes(m.month));
  const prev3 = monthlyTrend.filter((m) =>
    sortedMonths.slice(-6, -3).includes(m.month)
  );

  const recentAvgWords =
    recent3.length > 0
      ? Math.round(recent3.reduce((s, m) => s + m.avgWords, 0) / recent3.length)
      : 0;
  const prevAvgWords =
    prev3.length > 0
      ? Math.round(prev3.reduce((s, m) => s + m.avgWords, 0) / prev3.length)
      : 0;
  const recentPostsPerMonth =
    recent3.length > 0
      ? (recent3.reduce((s, m) => s + m.postCount, 0) / recent3.length).toFixed(1)
      : "0";
  const prevPostsPerMonth =
    prev3.length > 0
      ? (prev3.reduce((s, m) => s + m.postCount, 0) / prev3.length).toFixed(1)
      : "0";

  const blogData = {
    totalPosts: posts.length,
    monthlyTrend,
    topTags,
    topCategories,
    recentVsPrev: {
      recent3MonthsAvgWords: recentAvgWords,
      prev3MonthsAvgWords: prevAvgWords,
      recent3MonthsPostsPerMonth: recentPostsPerMonth,
      prev3MonthsPostsPerMonth: prevPostsPerMonth,
    },
  };

  const prompt = `You are an AI writing coach analyzing a Korean tech blogger's writing patterns.

Analyze the following blog statistics and generate 4-6 actionable insights in Korean.

BLOG DATA:
${JSON.stringify(blogData, null, 2)}

Return a JSON object with an "insights" array. Each insight must have:
- "type": one of "positive", "warning", or "info"
  - "positive": improving trends or good habits
  - "warning": declining trends or areas needing attention
  - "info": neutral observations or suggestions
- "title": short insight title (10-20 Korean characters, e.g. "평균 글 길이가 줄고 있습니다")
- "description": 1-2 sentence explanation with specific numbers from the data (Korean)
- "metric": optional short metric string like "↓ 23%" or "월 2.3편"

Focus on:
1. Word count trend (increasing/decreasing/stable)
2. Posting frequency trend
3. Topic diversity (tag/category variety)
4. Most and least frequent topics
5. Writing consistency
6. Any notable patterns or suggestions

Be specific with numbers. Use actual data values.

Return ONLY valid JSON like: {"insights": [...]}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
    }

    const parsed = JSON.parse(text) as { insights: Insight[] };
    return NextResponse.json({
      insights: parsed.insights,
      generatedAt: new Date().toISOString(),
    } satisfies WritingCoachData);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
