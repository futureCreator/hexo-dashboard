# Opinion-Based AI Writing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opinion-based AI writing mode that uses Perplexity API for research and Gemini for final post generation.

**Architecture:** Extract shared post utilities from the existing ai-write route into `lib/ai-utils.ts`. Create a new `/api/ai-write-opinion` route that chains Perplexity → Gemini. Modify `WriteForm.tsx` to replace "Manual"/"AI Write" tabs with "소스 기반"/"의견 기반" tabs.

**Tech Stack:** Next.js 15 App Router, TypeScript, Perplexity REST API (`sonar` model), Google Gemini API (`gemini-3-flash-preview`)

**Spec:** `docs/superpowers/specs/2026-03-21-opinion-based-ai-writing-design.md`

---

### Task 1: Extract shared utilities to `lib/ai-utils.ts`

**Files:**
- Create: `lib/ai-utils.ts`
- Modify: `app/api/ai-write/route.ts`

`findRelatedPosts` and `buildRelatedSection` are currently private to `ai-write/route.ts`. Both the existing route and the new opinion route need them.

- [ ] **Step 1: Create `lib/ai-utils.ts` with extracted functions**

```typescript
// lib/ai-utils.ts
import fs from "fs";
import type { HexoPost } from "@/lib/hexo";

export function findRelatedPosts(posts: HexoPost[], newTags: string[], newTitle: string, count: number): HexoPost[] {
  const lowerNewTags = newTags.map((t) => t.toLowerCase());
  const titleWords = newTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const scored = posts.map((post) => {
    let score = 0;
    let tagMatchCount = 0;
    for (const tag of post.tags) {
      if (lowerNewTags.includes(tag.toLowerCase())) {
        score += 3;
        tagMatchCount++;
      }
    }
    const candidateTitle = post.title.toLowerCase();
    for (const word of titleWords) {
      if (candidateTitle.includes(word)) score += 1;
    }
    return { post, score, tagMatchCount };
  });

  return scored
    .filter(({ score }) => score >= 3)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.tagMatchCount !== a.tagMatchCount) return b.tagMatchCount - a.tagMatchCount;
      const dateA = a.post.date ? new Date(a.post.date).getTime() : 0;
      const dateB = b.post.date ? new Date(b.post.date).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, count)
    .map(({ post }) => post);
}

export function buildRelatedSection(posts: HexoPost[]): string {
  if (posts.length === 0) return "";
  const links = posts.map((p) => `- {% post_link ${p.filename.replace(/\.md$/, "")} "${p.title}" %}`);
  return `---\n\n관련 글\n\n${links.join("\n")}`;
}

export function loadReferenceTexts(referenceFilepaths: string[], hexoPath: string): string[] {
  return referenceFilepaths
    .filter((fp: string) => fp.startsWith(hexoPath))
    .map((fp: string) => {
      try {
        const raw = fs.readFileSync(fp, "utf-8");
        const stripped = raw.replace(/^---[\s\S]*?---\n?/, "").trim();
        return stripped.slice(0, 6000);
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}
```

- [ ] **Step 2: Update `app/api/ai-write/route.ts` to import from shared module**

Replace the local `findRelatedPosts`, `buildRelatedSection` function definitions and the reference-loading code with imports:

```typescript
// At the top of the file, add:
import { findRelatedPosts, buildRelatedSection, loadReferenceTexts } from "@/lib/ai-utils";

// Remove local definitions of findRelatedPosts (lines 20-52) and buildRelatedSection (lines 54-58)
// Replace the referenceTexts block (lines 97-109) with:
const referenceTexts = loadReferenceTexts(referenceFilepaths, hexoPath);
```

Keep `stripHtml`, `isUrl`, `targetWordCount` in the route file (they're specific to source-based writing).

- [ ] **Step 3: Verify the existing AI Write feature still works**

Run: `npm run build` to check for TypeScript errors.
Manually test by navigating to `/write` and using the AI Write tab (optional).

- [ ] **Step 4: Commit**

```bash
git add lib/ai-utils.ts app/api/ai-write/route.ts
git commit -m "refactor: extract shared AI post utilities to lib/ai-utils.ts"
```

---

### Task 2: Create `/api/ai-write-opinion` API route

**Files:**
- Create: `app/api/ai-write-opinion/route.ts`

- [ ] **Step 1: Create the route file with full implementation**

```typescript
// app/api/ai-write-opinion/route.ts
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai-write-opinion/route.ts
git commit -m "feat: add opinion-based AI writing API route with Perplexity research"
```

---

### Task 3: Update WriteForm UI — tabs and opinion form

**Files:**
- Modify: `components/posts/WriteForm.tsx`

This task replaces the "Manual"/"AI Write" tabs with "소스 기반"/"의견 기반" tabs, removes manual mode code, and adds the opinion-based form.

- [ ] **Step 1: Update mode type and remove manual mode state**

Change `type Mode` from `"manual" | "ai"` to `"source" | "opinion"`. Remove manual-only state variables (`title`, `tags`, `categories`, `draft`, `isSubmitting`, `titleRef`, `slug`, `canManualSubmit`, `handleManualSubmit`).

- [ ] **Step 2: Add opinion mode state**

Add new state variables for the opinion form:

```typescript
// Opinion mode state
const [opinion, setOpinion] = useState("");
const [opinionCategory, setOpinionCategory] = useState("AI");
const [opinionSelectedRefs, setOpinionSelectedRefs] = useState<string[]>([]);
const [isOpinionGenerating, setIsOpinionGenerating] = useState(false);
const [opinionGenStep, setOpinionGenStep] = useState(0);
```

- [ ] **Step 3: Add opinion generation steps constant**

```typescript
const OPINION_GEN_STEPS = [
  { label: "관련 자료 검색 중", detail: "Perplexity로 객관적 자료를 찾고 있습니다…" },
  { label: "자료 분석 중", detail: "수집한 자료를 분석하고 있습니다…" },
  { label: "글 작성 중", detail: "의견과 자료를 합쳐 글을 작성하고 있습니다…" },
  { label: "저장 중", detail: "거의 다 됐습니다…" },
];
```

- [ ] **Step 4: Add opinion submit handler**

```typescript
const handleOpinionSubmit = useCallback(async () => {
  if (opinion.trim().length < 50) return;
  setIsOpinionGenerating(true);
  setOpinionGenStep(0);

  const stepTimers = [
    setTimeout(() => setOpinionGenStep(1), 5000),
    setTimeout(() => setOpinionGenStep(2), 10000),
  ];

  try {
    const res = await fetch(apiUrl("/api/ai-write-opinion"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opinion: opinion.trim(),
        category: opinionCategory,
        referencePosts: opinionSelectedRefs,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast({ type: "error", message: data.error || "Failed to generate post" });
      return;
    }
    setOpinionGenStep(3); // "저장 중" — triggered on API response, not timer
    showToast({ type: "success", message: `"${data.post.title}" 생성 완료, 드래프트로 저장됨` });
    onCreated(data.post);
  } catch (err) {
    showToast({ type: "error", message: String(err) });
  } finally {
    stepTimers.forEach(clearTimeout);
    setIsOpinionGenerating(false);
    setOpinionGenStep(0);
  }
}, [opinion, opinionCategory, opinionSelectedRefs, onCreated, showToast]);
```

- [ ] **Step 5: Update computed values and parent state notification**

```typescript
const canSourceSubmit = sources.some((s) => s.trim().length > 0) && !isGenerating;
const canOpinionSubmit = opinion.trim().length >= 50 && !isOpinionGenerating;

const isAnyGenerating = isGenerating || isOpinionGenerating;

useEffect(() => {
  onStateChange?.({
    canSubmit: mode === "source" ? canSourceSubmit : canOpinionSubmit,
    isGenerating: isAnyGenerating,
  });
}, [canSourceSubmit, canOpinionSubmit, isAnyGenerating, mode, onStateChange]);
```

- [ ] **Step 6: Update useImperativeHandle**

```typescript
useImperativeHandle(
  ref,
  () => ({
    submit: mode === "source" ? handleAiSubmit : handleOpinionSubmit,
  }),
  [mode, handleAiSubmit, handleOpinionSubmit]
);
```

- [ ] **Step 7: Update tab UI**

Replace the mode tabs section:

```tsx
<div className="flex border-b border-[var(--border)]">
  {([
    { key: "source" as Mode, label: "소스 기반" },
    { key: "opinion" as Mode, label: "의견 기반" },
  ]).map((tab) => (
    <button
      key={tab.key}
      onClick={() => setMode(tab.key)}
      className={`flex-1 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
        mode === tab.key
          ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

- [ ] **Step 8: Update form body rendering**

Replace the form body. The `mode === "manual"` branch becomes the opinion generating view check. Structure:

```tsx
<div className="px-5 py-5 flex flex-col gap-4">
  {mode === "source" ? (
    isGenerating ? (
      <AiGeneratingView step={genStep} steps={GEN_STEPS} />
    ) : (
      <>{/* existing source-based form fields (sources, perspective, refs, category, metadata) */}</>
    )
  ) : isOpinionGenerating ? (
    <AiGeneratingView step={opinionGenStep} steps={OPINION_GEN_STEPS} />
  ) : (
    <>
      {/* Opinion textarea */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
          내 의견 <span className="text-red-400">*</span>
        </label>
        <textarea
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
          placeholder="내 생각이나 의견을 자유롭게 작성하세요..."
          rows={6}
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 resize-none"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          {opinion.trim().length}/5,000자 (최소 50자)
        </p>
      </div>

      {/* Category selector — same pattern as source-based */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {["AI", "Blog", "Engineering", "Cloud", "Insight"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setOpinionCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                opinionCategory === cat
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reference Posts — reuse same picker pattern, using opinionSelectedRefs state */}
      {/* Copy the existing Reference Posts JSX block, replacing selectedRefs with opinionSelectedRefs, setSelectedRefs with setOpinionSelectedRefs */}

      {/* Metadata notice */}
      <div className="flex gap-3 text-xs text-[var(--muted-foreground)] bg-[var(--accent-subtle)] rounded-lg px-3 py-2.5">
        <span>Tags: <span className="text-[var(--foreground)]">auto</span></span>
        <span>·</span>
        <span>Saved as: <span className="text-[var(--foreground)]">draft</span></span>
      </div>
    </>
  )}
</div>
```

- [ ] **Step 9: Update AiGeneratingView to accept steps as prop**

Make the component flexible to accept different step arrays:

```tsx
function AiGeneratingView({ step, steps }: { step: number; steps: typeof GEN_STEPS }) {
  // Same implementation but use `steps` parameter instead of hardcoded GEN_STEPS
  // Replace GEN_STEPS.map with steps.map in the JSX
}
```

- [ ] **Step 10: Update focus management**

Replace the focus useEffect — both modes can focus the first textarea:

```typescript
useEffect(() => {
  setTimeout(() => sourceRef.current?.focus(), 50);
}, [mode]);
```

Or add an `opinionRef` for the opinion textarea and focus it when mode is "opinion".

- [ ] **Step 11: Verify build and test**

Run: `npm run build`
Expected: No TypeScript errors.
Manually test both tabs in the browser (optional).

- [ ] **Step 12: Commit**

```bash
git add components/posts/WriteForm.tsx
git commit -m "feat: replace manual/AI tabs with source-based/opinion-based AI writing"
```

---

### Task 4: Final verification and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Verify both write modes work end-to-end**

1. Navigate to `/write` — should show "소스 기반" / "의견 기반" tabs
2. "소스 기반" tab — existing AI Write flow should work unchanged
3. "의견 기반" tab — opinion textarea, category buttons, reference posts picker, metadata notice should render
4. Submit with opinion text (50+ chars) — should call `/api/ai-write-opinion` and show progress animation

- [ ] **Step 3: Commit all remaining changes (if any)**

```bash
git add -A
git commit -m "feat: complete opinion-based AI writing feature"
```
