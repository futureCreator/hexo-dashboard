import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { createPost, hexoPathValid } from "@/lib/hexo";

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 20000);
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export async function POST(request: NextRequest) {
  const { source, perspective } = await request.json();

  if (!source?.trim()) {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  // Fetch URL content if source is a URL
  let sourceText = source.trim();
  if (isUrl(sourceText)) {
    try {
      const res = await fetch(sourceText, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      sourceText = stripHtml(html);
    } catch (err) {
      return NextResponse.json({ error: `Failed to fetch URL: ${String(err)}` }, { status: 400 });
    }
  }

  const prompt = `You are writing a blog post for futureCreator blog. Follow these STRICT rules:

1. Write in Korean informal style (평어체): use "~했다", "~이다" endings. NEVER use "입니다", "습니다".
2. NO markdown headers (## or ###). NO bold text (**bold**).
3. Use ONLY straight quotes (' ") — NEVER smart/curly quotes.
4. Include the HTML comment <!-- more --> after the first introductory paragraph.
5. Write in first person as 동호, the author themselves.
6. Do NOT use self-introduction phrases like "14년차", "클라우드 엔지니어로서".
7. Title must have no colons (:). Keep it concise but descriptive.
8. Generate 3-5 relevant tags in English (e.g. "cloud", "aws", "kubernetes"). Tags must be lowercase English words or phrases, never Korean.

SOURCE CONTENT (the topic):
${sourceText}

MY PERSPECTIVE (incorporate this viewpoint):
${perspective?.trim() || "(none provided)"}

Return ONLY a valid JSON object with these exact keys:
{
  "title": "string",
  "content": "string (full markdown body with <!-- more --> after intro paragraph)",
  "tags": ["tag1", "tag2", "tag3"]
}

CRITICAL: In the "content" field, use actual \\n escape sequences for ALL line breaks between paragraphs (e.g., "paragraph one.\\n\\nparagraph two."). Never write the entire content as a single line. Each paragraph must be separated by \\n\\n.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(300000),
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

    const generated = JSON.parse(text) as { title: string; content: string; tags: string[] };
    const { title, content, tags } = generated;

    const post = createPost(hexoPath, {
      title,
      tags: Array.isArray(tags) ? tags : [],
      categories: ["Reviews"],
      draft: true,
      content,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
