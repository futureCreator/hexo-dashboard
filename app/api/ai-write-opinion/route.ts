import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { createPost, hexoPathValid, readPosts } from "@/lib/hexo";
import { findRelatedPosts, buildRelatedSection, loadReferenceTexts } from "@/lib/ai-utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { opinion, category } = body;
  const referenceFilepaths: string[] = Array.isArray(body.referencePosts)
    ? body.referencePosts.filter((f: unknown) => typeof f === "string" && f.trim())
    : [];

  // Input validation
  if (!opinion || typeof opinion !== "string" || opinion.trim().length < 50) {
    return NextResponse.json({ error: "의견을 50자 이상 작성해주세요" }, { status: 400 });
  }
  if (opinion.trim().length > 5000) {
    return NextResponse.json({ error: "의견은 5,000자 이하로 작성해주세요" }, { status: 400 });
  }

  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) {
    return NextResponse.json({ error: "PERPLEXITY_API_KEY가 설정되지 않았습니다" }, { status: 500 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { hexoPath } = loadSettings();
  if (!hexoPath) return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  if (!hexoPathValid(hexoPath)) return NextResponse.json({ error: "Hexo path invalid" }, { status: 400 });

  const trimmedOpinion = opinion.trim();
  const effectiveCategory = category || "AI";

  // Step 1: Call Perplexity API for research
  let researchData: string;
  try {
    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are a research assistant. Given a user's opinion on a topic in the ${effectiveCategory} domain, find relevant objective data, statistics, research results, expert opinions, and real-world examples that can support or provide context for this opinion. Focus on authoritative and recent sources. Respond in Korean.`,
          },
          { role: "user", content: trimmedOpinion },
        ],
        return_related_questions: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!perplexityRes.ok) {
      const errText = await perplexityRes.text();
      return NextResponse.json({ error: `Perplexity API error: ${errText}` }, { status: 500 });
    }

    const perplexityData = await perplexityRes.json();
    researchData = perplexityData.choices?.[0]?.message?.content || "";

    if (!researchData.trim()) {
      return NextResponse.json({ error: "관련 자료를 찾지 못했습니다" }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json({ error: "Perplexity API 요청 시간이 초과되었습니다" }, { status: 504 });
    }
    return NextResponse.json({ error: `Perplexity API error: ${String(err)}` }, { status: 500 });
  }

  // Step 2: Load reference posts
  const referenceTexts = loadReferenceTexts(referenceFilepaths, hexoPath);

  // Step 3: Calculate target length
  const totalInputLength = trimmedOpinion.length + researchData.length;
  const targetChars = Math.min(2000, Math.max(800, Math.round(totalInputLength * 0.4)));

  // Step 4: Call Gemini to write the final post
  const prompt = `You are writing a blog post for futureCreator blog. The author (동호) has written their opinion below. Your job is to create a well-structured blog post that uses 동호's opinion as the central argument, supported by the objective research data provided.

Follow these STRICT rules:

1. Write in Korean informal style (평어체): use "~했다", "~이다" endings. NEVER use "입니다", "습니다".
2. NO markdown headers (## or ###). NO bold text (**bold**).
3. Use ONLY straight quotes (' ") — NEVER smart/curly quotes.
4. Include the HTML comment <!-- more --> after the first introductory paragraph.
5. Write in first person as 동호, the author themselves.
6. Title must have no colons (:). Keep it concise but descriptive.
7. Generate 3-5 relevant tags in English (e.g. "cloud", "aws", "kubernetes"). Tags must be lowercase English words or phrases, never Korean.
8. Write approximately ${targetChars} characters. Cover the topic thoroughly with multiple paragraphs.
9. Keep 동호's opinion and argument as the central axis of the post.
10. Weave in the objective data naturally using phrases like "~에 따르면", "~연구에서는", "~조사에 의하면" to support the opinion.
11. For specific statistics or claims from research, use attribution phrases rather than stating them as established fact.
12. The final post MUST be in Korean regardless of the language of the research data.

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

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
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
      categories: [effectiveCategory],
      draft: true,
      content,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
