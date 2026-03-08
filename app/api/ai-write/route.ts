import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { loadSettings } from "@/lib/settings";
import { createPost, hexoPathValid, readPosts, type HexoPost } from "@/lib/hexo";

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

function findRelatedPosts(posts: HexoPost[], newTags: string[], newTitle: string, count: number): HexoPost[] {
  const lowerNewTags = newTags.map((t) => t.toLowerCase());
  const titleWords = newTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const scored = posts.map((post) => {
    let score = 0;
    for (const tag of post.tags) {
      if (lowerNewTags.includes(tag.toLowerCase())) score += 3;
    }
    const candidateTitle = post.title.toLowerCase();
    for (const word of titleWords) {
      if (candidateTitle.includes(word)) score += 1;
    }
    if (post.abbrlink) score += 0.1;
    return { post, score };
  });

  return scored
    .filter(({ score, post }) => score > 0 && post.abbrlink)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ post }) => post);
}

function buildRelatedSection(posts: HexoPost[]): string {
  if (posts.length === 0) return "";
  const links = posts.map((p) => `- {% post_link ${p.abbrlink} "${p.title}" %}`);
  return `---\n\n관련 글\n\n${links.join("\n")}`;
}

function targetWordCount(sourceLength: number): number {
  if (sourceLength < 500) return 400;
  if (sourceLength < 2000) return 600;
  if (sourceLength < 5000) return 900;
  if (sourceLength < 10000) return 1200;
  return 1600;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Support both legacy `source` (string) and new `sources` (string[])
  const rawSources: string[] = body.sources
    ? body.sources.filter((s: string) => s?.trim())
    : body.source?.trim()
    ? [body.source.trim()]
    : [];

  const { perspective, category } = body;
  const referenceFilepaths: string[] = Array.isArray(body.referencePosts)
    ? body.referencePosts.filter((f: unknown) => typeof f === "string" && f.trim())
    : [];

  if (rawSources.length === 0) {
    return NextResponse.json({ error: "At least one source is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  // Read reference posts (guard: must be within hexoPath)
  const referenceTexts: string[] = referenceFilepaths
    .filter((fp) => fp.startsWith(hexoPath))
    .map((fp) => {
      try {
        const raw = fs.readFileSync(fp, "utf-8");
        // Strip YAML frontmatter (--- ... ---)
        const stripped = raw.replace(/^---[\s\S]*?---\n?/, "").trim();
        return stripped.slice(0, 6000);
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  // Fetch all sources in parallel
  let fetchedTexts: string[];
  try {
    fetchedTexts = await Promise.all(
      rawSources.map(async (s, idx) => {
        const trimmed = s.trim();
        if (isUrl(trimmed)) {
          const res = await fetch(trimmed, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(10000),
          });
          const html = await res.text();
          return `[Source ${idx + 1}: ${trimmed}]\n${stripHtml(html)}`;
        }
        return `[Source ${idx + 1}]\n${trimmed.slice(0, 20000)}`;
      })
    );
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch source: ${String(err)}` }, { status: 400 });
  }

  const sourceText = fetchedTexts.join("\n\n---\n\n");
  const minWords = targetWordCount(sourceText.length);
  const prompt = `You are writing a blog post for futureCreator blog. Follow these STRICT rules:

1. Write in Korean informal style (평어체): use "~했다", "~이다" endings. NEVER use "입니다", "습니다".
2. NO markdown headers (## or ###). NO bold text (**bold**).
3. Use ONLY straight quotes (' ") — NEVER smart/curly quotes.
4. Include the HTML comment <!-- more --> after the first introductory paragraph.
5. Write in first person as 동호, the author themselves.
6. Do NOT use self-introduction phrases like "14년차", "클라우드 엔지니어로서".
7. Title must have no colons (:). Keep it concise but descriptive.
8. Generate 3-5 relevant tags in English (e.g. "cloud", "aws", "kubernetes"). Tags must be lowercase English words or phrases, never Korean.
9. Write a thorough, detailed post of at least ${minWords} words. Cover the topic in depth with multiple paragraphs — do NOT write a brief summary.

SOURCE CONTENT (the topic — may include multiple sources separated by ---):
${sourceText}

MY PERSPECTIVE (incorporate this viewpoint):
${perspective?.trim() || "(none provided)"}
${referenceTexts.length > 0 ? `\nMY PREVIOUS POSTS (use as reference for writing style, tone, AND perspective/viewpoint — build on these ideas and opinions where relevant, but do NOT copy sentences verbatim):
${referenceTexts.map((t, i) => `[Ref ${i + 1}]\n${t}`).join("\n\n---\n\n")}` : ""}

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
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
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
    const { title, tags } = generated;
    let { content } = generated;

    // Append related posts section
    const existingPosts = readPosts(hexoPath);
    const relatedPosts = findRelatedPosts(existingPosts, Array.isArray(tags) ? tags : [], title, 3);
    const relatedSection = buildRelatedSection(relatedPosts);
    if (relatedSection) content = `${content}\n\n${relatedSection}`;

    const post = createPost(hexoPath, {
      title,
      tags: Array.isArray(tags) ? tags : [],
      categories: [category || "AI"],
      draft: true,
      content,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
