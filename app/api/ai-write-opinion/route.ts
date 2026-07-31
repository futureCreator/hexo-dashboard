import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { createPost, hexoPathValid, readPosts } from "@/lib/hexo";
import { findRelatedPosts, buildRelatedSection, loadReferenceTexts } from "@/lib/ai-utils";
import { getOpenRouterKey, openRouterChat } from "@/lib/openrouter";
import { getPerplexityKey, researchWithPerplexity } from "@/lib/perplexity";
import {
  createOpinionJob,
  getOpinionJob,
  updateOpinionJob,
} from "@/lib/opinion-jobs";

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
  const { opinion, category } = body;
  const referenceFilepaths: string[] = Array.isArray(body.referencePosts)
    ? body.referencePosts.filter((f: unknown) => typeof f === "string" && f.trim())
    : [];

  if (!opinion || typeof opinion !== "string" || opinion.trim().length < 50) {
    return NextResponse.json({ error: "의견을 50자 이상 작성해주세요" }, { status: 400 });
  }
  if (opinion.trim().length > 5000) {
    return NextResponse.json({ error: "의견은 5,000자 이하로 작성해주세요" }, { status: 400 });
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

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  const jobId = createOpinionJob();
  const trimmedOpinion = opinion.trim();
  const effectiveCategory = category || "AI";

  // ponytail: return immediately so reverse proxies don't 502 on 90–150s OpenRouter waits
  void runOpinionJob(jobId, {
    trimmedOpinion,
    effectiveCategory,
    referenceFilepaths,
    hexoPath,
  });

  return NextResponse.json({ jobId }, { status: 202 });
}

async function runOpinionJob(
  jobId: string,
  opts: {
    trimmedOpinion: string;
    effectiveCategory: string;
    referenceFilepaths: string[];
    hexoPath: string;
  }
) {
  const { trimmedOpinion, effectiveCategory, referenceFilepaths, hexoPath } = opts;

  try {
    updateOpinionJob(jobId, { step: "search" });
    const researchData = await researchWithPerplexity({
      query: trimmedOpinion,
      category: effectiveCategory,
    });

    updateOpinionJob(jobId, { step: "analyze" });
    const referenceTexts = loadReferenceTexts(referenceFilepaths, hexoPath);
    const totalInputLength = trimmedOpinion.length + researchData.length;
    const targetChars = Math.min(2000, Math.max(800, Math.round(totalInputLength * 0.4)));

    updateOpinionJob(jobId, { step: "write" });
    const prompt = `You are writing a blog post for futureCreator blog. The author (동호) has written their opinion below. Your job is to create a well-structured blog post that uses 동호's opinion as the central argument, supported by the objective research data provided.

Follow these STRICT rules:

1. Write in Korean informal style (평어체): use "~했다", "~이다" endings. NEVER use "입니다", "습니다".
2. NO markdown headers (## or ###). NO bold text (**bold**).
3. Use ONLY straight quotes (' ") — NEVER smart/curly quotes.
4. Include the HTML comment <!-- more --> after the first introductory paragraph.
5. Write in first person as 동호, the author themselves.
6. Do NOT use self-introduction phrases like "14년차", "클라우드 엔지니어로서".
7. Title must have no colons (:). Keep it concise but descriptive.
8. Generate 3-5 relevant tags in English (e.g. "cloud", "aws", "kubernetes"). Tags must be lowercase English words or phrases, never Korean.
9. Write approximately ${targetChars} Korean characters (글자). Cover the topic thoroughly with multiple paragraphs.
10. Keep 동호's opinion and argument as the central axis of the post.
11. Structure: (1) intro — background / problem from the opinion, (2) body — develop the argument using objective research as supporting material, (3) close — conclusion or outlook. No markdown headers for these sections.
12. Weave objective research naturally using attribution phrases like "~에 따르면", "연구에서는", "조사에 의하면". Prefer concrete claims and examples over vague summaries.
13. Use ONLY claims that appear in [객관적 자료]. Do NOT invent numbers, studies, or quotes. For specific statistics or claims, use attribution rather than stating them as established fact.
14. CRITICAL — OPINION AUTHORSHIP: Only claim personal experiences, workplace stories, or "내가 ~했을 때" anecdotes that appear in [사용자 의견]. Never invent new personal history for 동호.
15. Avoid AI filler phrases: "결론적으로", "이러한", "다양한", "중요하다" 남발, "살펴보겠다", "알아보자". Prefer concrete claims and examples.
16. The final post MUST be in Korean regardless of the language of the research data.

[사용자 의견]
${trimmedOpinion}

[객관적 자료]
${researchData}
${referenceTexts.length > 0 ? `\n[참고 포스트 스타일 — use as reference for writing style and tone, do NOT copy verbatim]\n${referenceTexts.map((t, i) => `[Ref ${i + 1}]\n${t}`).join("\n\n---\n\n")}` : ""}

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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ai-write-opinion] job=${jobId} error=${message}`);
    updateOpinionJob(jobId, {
      status: "error",
      error: message,
    });
  }
}
