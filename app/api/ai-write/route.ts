import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { createPost, hexoPathValid, readPosts } from "@/lib/hexo";
import { findRelatedPosts, buildRelatedSection, loadReferenceTexts } from "@/lib/ai-utils";
import { getFirecrawlKey, scrapeToMarkdown } from "@/lib/firecrawl";
import { getOpenRouterKey, openRouterChat } from "@/lib/openrouter";
import { getPerplexityKey, researchWithPerplexity } from "@/lib/perplexity";
import {
  createOpinionJob,
  getOpinionJob,
  updateOpinionJob,
} from "@/lib/opinion-jobs";

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function targetCharCount(sourceLength: number): number {
  if (sourceLength < 500) return 400;
  if (sourceLength < 2000) return 600;
  if (sourceLength < 5000) return 900;
  if (sourceLength < 10000) return 1200;
  return 1600;
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = getOpinionJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
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

  if (!getOpenRouterKey()) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }
  if (!getPerplexityKey()) {
    return NextResponse.json(
      { error: "PERPLEXITY_API_KEY가 설정되지 않았습니다" },
      { status: 500 }
    );
  }

  const hasUrlSource = rawSources.some((s) => isUrl(s.trim()));
  if (hasUrlSource && !getFirecrawlKey()) {
    return NextResponse.json({ error: "FIRECRAWL_API_KEY not configured" }, { status: 500 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  const jobId = createOpinionJob("fetch");
  const effectiveCategory = category || "AI";
  const trimmedPerspective =
    typeof perspective === "string" && perspective.trim() ? perspective.trim() : "";

  // ponytail: return immediately so reverse proxies don't 502 on long Firecrawl/Perplexity/OpenRouter waits
  void runSourceJob(jobId, {
    rawSources,
    trimmedPerspective,
    effectiveCategory,
    referenceFilepaths,
    hexoPath,
  });

  return NextResponse.json({ jobId }, { status: 202 });
}

async function runSourceJob(
  jobId: string,
  opts: {
    rawSources: string[];
    trimmedPerspective: string;
    effectiveCategory: string;
    referenceFilepaths: string[];
    hexoPath: string;
  }
) {
  const { rawSources, trimmedPerspective, effectiveCategory, referenceFilepaths, hexoPath } = opts;

  try {
    updateOpinionJob(jobId, { step: "fetch" });
    const fetchedTexts = await Promise.all(
      rawSources.map(async (s, idx) => {
        const trimmed = s.trim();
        if (isUrl(trimmed)) {
          const markdown = await scrapeToMarkdown(trimmed);
          return `[Source ${idx + 1}: ${trimmed}]\n${markdown}`;
        }
        return `[Source ${idx + 1}]\n${trimmed.slice(0, 20000)}`;
      })
    );

    const sourceText = fetchedTexts.join("\n\n---\n\n");

    updateOpinionJob(jobId, { step: "search" });
    // Seed research from perspective + scraped source text (not full dump)
    const querySeed = [trimmedPerspective, sourceText.slice(0, 3000)].filter(Boolean).join("\n");
    const researchData = await researchWithPerplexity({
      query: querySeed,
      category: effectiveCategory,
    });

    updateOpinionJob(jobId, { step: "write" });
    const referenceTexts = loadReferenceTexts(referenceFilepaths, hexoPath);
    const minChars = targetCharCount(sourceText.length + researchData.length);
    const hasPerspective = Boolean(trimmedPerspective);

    const prompt = `You are writing a blog post for futureCreator blog. Follow these STRICT rules:

1. Write in Korean informal style (평어체): use "~했다", "~이다" endings. NEVER use "입니다", "습니다".
2. NO markdown headers (## or ###). NO bold text (**bold**).
3. Use ONLY straight quotes (' ") — NEVER smart/curly quotes.
4. Include the HTML comment <!-- more --> after the first introductory paragraph.
5. Write in first person as 동호, the author themselves.
6. Do NOT use self-introduction phrases like "14년차", "클라우드 엔지니어로서".
7. Title must have no colons (:). Keep it concise but descriptive.
8. Generate 3-5 relevant tags in English (e.g. "cloud", "aws", "kubernetes"). Tags must be lowercase English words or phrases, never Korean.
9. Write approximately ${minChars} Korean characters (글자). Cover the topic in depth with multiple paragraphs — do NOT write a brief summary.
10. Avoid AI filler phrases: "결론적으로", "이러한", "다양한", "중요하다" 남발, "살펴보겠다", "알아보자". Prefer concrete claims and examples.
11. Structure the post as: (a) source core idea, (b) 동호's interpretation with objective research woven in, (c) practical implication. Do not stop at summarizing the sources.
12. When citing facts/claims from sources or research, use attribution (~에 따르면, 한 글에서는, 이 자료에서는, 연구에서는) — never present them as 동호's firsthand knowledge.
13. If multiple sources conflict, acknowledge the tension briefly and pick one clear takeaway; do not force a false consensus.
14. Weave objective research naturally. Prefer concrete claims and expert takes over vague summaries.
15. Use ONLY claims that appear in SOURCE CONTENT or [객관적 자료]. Do NOT invent numbers, studies, or quotes.
16. The final post MUST be in Korean regardless of the language of the sources or research data.

SOURCE CONTENT (primary reference material — may include multiple sources separated by ---):
${sourceText}

[객관적 자료] (additional research — use to support, contrast, or extend the source material):
${researchData}

CRITICAL — SOURCE AUTHORSHIP RULE:
The source content above was written by OTHER authors, NOT by 동호 (the blog author).
Any first-person statements in the sources (e.g., "내가 CTO로 일했을 때...", "I spent 5 years building...") are the SOURCE AUTHOR's experiences, not 동호's.
When referencing such content, frame it as external perspective or reference:
  WRONG: "내가 CTO로 일했을 때..."
  RIGHT: "한 글에서 CTO 경험을 소개하며..." or "이 주제에 대해 흥미로운 시각이 있다..."
Never claim source authors' experiences as 동호's own personal experiences.
Never invent personal anecdotes, career history, or hands-on experiences that are not explicitly provided in MY PERSPECTIVE below.

MY PERSPECTIVE:
${hasPerspective ? trimmedPerspective : `(none provided — derive a clear analytical takeaway from the sources and research only. Do NOT invent personal experiences, workplace stories, or "내가 ~했을 때" anecdotes.)`}
${referenceTexts.length > 0 ? `\nMY PREVIOUS POSTS (use as reference for writing style, tone, AND perspective/viewpoint — build on these ideas and opinions where relevant, but do NOT copy sentences verbatim):
${referenceTexts.map((t, i) => `[Ref ${i + 1}]\n${t}`).join("\n\n---\n\n")}` : ""}

Return ONLY a valid JSON object with these exact keys:
{
  "title": "string",
  "content": "string (full markdown body with <!-- more --> after intro paragraph)",
  "tags": ["tag1", "tag2", "tag3"]
}

CRITICAL: In the "content" field, use actual \\n escape sequences for ALL line breaks between paragraphs (e.g., "paragraph one.\\n\\nparagraph two."). Never write the entire content as a single line. Each paragraph must be separated by \\n\\n.`;

    const text = await openRouterChat({
      messages: [{ role: "user", content: prompt }],
      json: true,
      maxTokens: 65536,
      timeoutMs: 300000,
    });

    const generated = JSON.parse(text) as { title: string; content: string; tags: string[] };
    const { title, tags } = generated;
    let { content } = generated;

    updateOpinionJob(jobId, { step: "save" });
    const existingPosts = readPosts(hexoPath);
    const relatedPosts = findRelatedPosts(existingPosts, Array.isArray(tags) ? tags : [], title, 3);
    const relatedSection = buildRelatedSection(relatedPosts);
    if (relatedSection) content = `${content}\n\n${relatedSection}`;

    const post = createPost(hexoPath, {
      title,
      tags: Array.isArray(tags) ? tags : [],
      categories: [effectiveCategory],
      draft: true,
      content,
    });

    updateOpinionJob(jobId, { status: "done", step: "save", post });
  } catch (err) {
    updateOpinionJob(jobId, {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
