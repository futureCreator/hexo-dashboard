# Perplexity Research Replace xurl — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local `xurl` X search with Perplexity direct API (`sonar`) for both source-based and opinion-based AI writing research.

**Architecture:** Add `lib/perplexity.ts` (same fetch style as `lib/openrouter.ts`). Both `ai-write` and `ai-write-opinion` call `researchWithPerplexity` instead of `searchXResearch`. Delete `lib/x-search.ts`. Update prompts and WriteForm step copy away from X. Firecrawl scrape and OpenRouter Luna stay unchanged.

**Tech Stack:** Next.js 15 App Router, TypeScript, Perplexity REST (`sonar`), existing OpenRouter + Firecrawl clients.

**Spec:** `docs/superpowers/specs/2026-08-01-perplexity-research-replace-xurl-design.md`

## Global Constraints

- Research provider: Perplexity direct API only (`PERPLEXITY_API_KEY`) — not OpenRouter Sonar
- Model: `sonar`
- Writing model: keep existing OpenRouter Luna (`lib/openrouter.ts`)
- Firecrawl: source URL scrape only — no Firecrawl search
- No xurl fallback
- No new npm dependencies
- No test framework in repo — use one assert-based self-check script for non-trivial helpers; otherwise manual verification
- Match `lib/openrouter.ts` / `lib/firecrawl.ts` style (plain fetch, env getters, Korean/English error messages as existing routes use)

## File map

| File | Role |
|------|------|
| `lib/perplexity.ts` | Create — key getter + `researchWithPerplexity` |
| `scripts/check-perplexity.ts` | Create — assert-based self-check (no network) |
| `lib/x-search.ts` | Delete |
| `app/api/ai-write-opinion/route.ts` | Swap research call + rewrite prompt X → objective sources |
| `app/api/ai-write/route.ts` | Same for source mode |
| `components/posts/WriteForm.tsx` | `GEN_STEPS` / `OPINION_GEN_STEPS` copy |
| `README.md` | Document `PERPLEXITY_API_KEY` |

---

### Task 1: Perplexity client + remove xurl

**Files:**
- Create: `lib/perplexity.ts`
- Create: `scripts/check-perplexity.ts`
- Delete: `lib/x-search.ts`

**Interfaces:**
- Produces:
  - `getPerplexityKey(): string | undefined`
  - `researchWithPerplexity(opts: { query: string; category: string }): Promise<string>`

- [ ] **Step 1: Write the self-check (fails until client exists)**

Create `scripts/check-perplexity.ts`:

```ts
import assert from "node:assert/strict";
import { getPerplexityKey, buildResearchMessages } from "../lib/perplexity";

// Key getter reads env
process.env.PERPLEXITY_API_KEY = "pplx-test";
assert.equal(getPerplexityKey(), "pplx-test");
delete process.env.PERPLEXITY_API_KEY;
assert.equal(getPerplexityKey(), undefined);

const msgs = buildResearchMessages({
  query: "쿠버네티스 운영이 어렵다",
  category: "Cloud",
});
assert.equal(msgs.length, 2);
assert.equal(msgs[0].role, "system");
assert.match(msgs[0].content, /Cloud/);
assert.match(msgs[0].content, /Korean|한국어/);
assert.equal(msgs[1].role, "user");
assert.equal(msgs[1].content, "쿠버네티스 운영이 어렵다");

console.log("check-perplexity: ok");
```

- [ ] **Step 2: Run self-check — expect fail**

Run: `npx --yes tsx scripts/check-perplexity.ts`

Expected: FAIL (module or export missing)

- [ ] **Step 3: Implement `lib/perplexity.ts`**

```ts
/** Perplexity sonar client for web research (replaces local xurl). */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";

export type ResearchMessage = {
  role: "system" | "user";
  content: string;
};

export function getPerplexityKey(): string | undefined {
  return process.env.PERPLEXITY_API_KEY;
}

/** Build chat messages for research — exported for self-check. */
export function buildResearchMessages(opts: {
  query: string;
  category: string;
}): ResearchMessage[] {
  const { query, category } = opts;
  return [
    {
      role: "system",
      content: `You are a research assistant. Given a user's topic or opinion in the ${category} domain, find relevant objective data, statistics, research results, expert opinions, and real-world examples that can support or provide context. Focus on authoritative and recent sources. Respond in Korean.`,
    },
    { role: "user", content: query },
  ];
}

/** Call Perplexity sonar and return LLM-ready research text. */
export async function researchWithPerplexity(opts: {
  query: string;
  category: string;
}): Promise<string> {
  const apiKey = getPerplexityKey();
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY가 설정되지 않았습니다");

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: buildResearchMessages(opts),
      return_related_questions: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Perplexity 검색 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("관련 자료를 찾지 못했습니다");

  console.log(`[perplexity] ok category=${JSON.stringify(opts.category)} chars=${text.length}`);
  return text;
}
```

- [ ] **Step 4: Run self-check — expect pass**

Run: `npx --yes tsx scripts/check-perplexity.ts`

Expected: `check-perplexity: ok`

- [ ] **Step 5: Delete `lib/x-search.ts`**

```bash
rm lib/x-search.ts
```

Confirm no remaining imports of `@/lib/x-search` except the routes you will fix in Tasks 2–3 (those still reference it until next tasks — if TypeScript/lint complains mid-plan, that is expected until Task 3 finishes).

- [ ] **Step 6: Commit**

```bash
git add lib/perplexity.ts scripts/check-perplexity.ts
git rm -f lib/x-search.ts 2>/dev/null || true
# if x-search was never committed, just ensure it is deleted and not staged as add
git add -u lib/x-search.ts 2>/dev/null || true
git status
git commit -m "$(cat <<'EOF'
feat: add Perplexity research client and remove xurl helper

EOF
)"
```

If `lib/x-search.ts` is untracked, do not `git add` it — only ensure the file is deleted from disk. Commit only `lib/perplexity.ts` and `scripts/check-perplexity.ts` in that case.

---

### Task 2: Wire opinion route + prompt rewrite

**Files:**
- Modify: `app/api/ai-write-opinion/route.ts`

**Interfaces:**
- Consumes: `getPerplexityKey`, `researchWithPerplexity` from `@/lib/perplexity`
- Produces: opinion job uses Perplexity research text under `[객관적 자료]`

- [ ] **Step 1: Replace imports and key guard**

Remove:

```ts
import { searchXResearch } from "@/lib/x-search";
```

Add:

```ts
import { getPerplexityKey, researchWithPerplexity } from "@/lib/perplexity";
```

After the OpenRouter key check in `POST`, add:

```ts
  if (!getPerplexityKey()) {
    return NextResponse.json(
      { error: "PERPLEXITY_API_KEY가 설정되지 않았습니다" },
      { status: 500 }
    );
  }
```

- [ ] **Step 2: Swap research call**

In `runOpinionJob`, replace:

```ts
    const researchData = await searchXResearch(trimmedOpinion, effectiveCategory);
```

with:

```ts
    const researchData = await researchWithPerplexity({
      query: trimmedOpinion,
      category: effectiveCategory,
    });
```

- [ ] **Step 3: Replace the write prompt**

Replace the entire `prompt` template string with:

```ts
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
```

- [ ] **Step 4: Sanity grep**

Run: `rg -n "x-search|searchXResearch|X \\(Twitter\\)|\\[X 관련" app/api/ai-write-opinion/route.ts`

Expected: no matches

- [ ] **Step 5: Commit**

```bash
git add app/api/ai-write-opinion/route.ts
git commit -m "$(cat <<'EOF'
feat: use Perplexity research in opinion-based AI writing

EOF
)"
```

---

### Task 3: Wire source route + prompt rewrite

**Files:**
- Modify: `app/api/ai-write/route.ts`

**Interfaces:**
- Consumes: `getPerplexityKey`, `researchWithPerplexity` from `@/lib/perplexity`
- Produces: source job seeds Perplexity with perspective + truncated source text

- [ ] **Step 1: Replace imports and key guard**

Remove:

```ts
import { searchXResearch } from "@/lib/x-search";
```

Add:

```ts
import { getPerplexityKey, researchWithPerplexity } from "@/lib/perplexity";
```

After the OpenRouter key check in `POST`, add:

```ts
  if (!getPerplexityKey()) {
    return NextResponse.json(
      { error: "PERPLEXITY_API_KEY가 설정되지 않았습니다" },
      { status: 500 }
    );
  }
```

Update the comment above `void runSourceJob` from mentioning X to Perplexity if present:

```ts
  // ponytail: return immediately so reverse proxies don't 502 on long Firecrawl/Perplexity/OpenRouter waits
```

- [ ] **Step 2: Swap research call**

Replace:

```ts
    updateOpinionJob(jobId, { step: "search" });
    // Seed X search from perspective + scraped source text (keywords, not full dump)
    const querySeed = [trimmedPerspective, sourceText.slice(0, 3000)].filter(Boolean).join("\n");
    const researchData = await searchXResearch(querySeed, effectiveCategory);
```

with:

```ts
    updateOpinionJob(jobId, { step: "search" });
    // Seed research from perspective + scraped source text (not full dump)
    const querySeed = [trimmedPerspective, sourceText.slice(0, 3000)].filter(Boolean).join("\n");
    const researchData = await researchWithPerplexity({
      query: querySeed,
      category: effectiveCategory,
    });
```

- [ ] **Step 3: Replace the write prompt**

Replace the entire `prompt` template string with:

```ts
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
```

- [ ] **Step 4: Repo-wide xurl cleanup grep**

Run: `rg -n "x-search|searchXResearch|xurl|XURL" --glob '!docs/**' --glob '!node_modules/**'`

Expected: no matches outside docs/history (docs under `docs/superpowers/` may still mention xurl in the new design/plan — that is fine). App code and `lib/` must be clean.

- [ ] **Step 5: Commit**

```bash
git add app/api/ai-write/route.ts
git commit -m "$(cat <<'EOF'
feat: use Perplexity research in source-based AI writing

EOF
)"
```

---

### Task 4: UI copy + README env

**Files:**
- Modify: `components/posts/WriteForm.tsx` (GEN_STEPS / OPINION_GEN_STEPS only)
- Modify: `README.md` (Environment Variables table)

- [ ] **Step 1: Update generating step copy**

Replace:

```ts
const GEN_STEPS = [
  { label: "소스 가져오는 중", detail: "URL과 텍스트를 읽고 있습니다…" },
  { label: "관련 자료 검색 중", detail: "X에서 추가 자료를 찾고 있습니다…" },
  { label: "글 작성 중", detail: "소스와 X 자료를 합쳐 글을 작성하고 있습니다…" },
  { label: "저장 중", detail: "거의 다 됐습니다…" },
];

const OPINION_GEN_STEPS = [
  { label: "관련 자료 검색 중", detail: "X에서 관련 포스트와 후기를 찾고 있습니다…" },
  { label: "자료 분석 중", detail: "수집한 X 포스트를 분석하고 있습니다…" },
  { label: "글 작성 중", detail: "의견과 X 자료를 합쳐 글을 작성하고 있습니다…" },
  { label: "저장 중", detail: "거의 다 됐습니다…" },
];
```

with:

```ts
const GEN_STEPS = [
  { label: "소스 가져오는 중", detail: "URL과 텍스트를 읽고 있습니다…" },
  { label: "관련 자료 검색 중", detail: "웹에서 객관적 자료를 찾고 있습니다…" },
  { label: "글 작성 중", detail: "소스와 자료를 합쳐 글을 작성하고 있습니다…" },
  { label: "저장 중", detail: "거의 다 됐습니다…" },
];

const OPINION_GEN_STEPS = [
  { label: "관련 자료 검색 중", detail: "웹에서 관련 자료를 찾고 있습니다…" },
  { label: "자료 분석 중", detail: "수집한 자료를 분석하고 있습니다…" },
  { label: "글 작성 중", detail: "의견과 자료를 합쳐 글을 작성하고 있습니다…" },
  { label: "저장 중", detail: "거의 다 됐습니다…" },
];
```

- [ ] **Step 2: Document env var in README**

In the Environment Variables table, after the `FIRECRAWL_API_KEY` row, add:

```markdown
| `.env.local` | `PERPLEXITY_API_KEY` | Perplexity API key for AI writing research (`sonar`) |
```

- [ ] **Step 3: Grep UI for leftover X copy in write flow**

Run: `rg -n "X에서|X 자료|X 포스트" components/posts/WriteForm.tsx`

Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add components/posts/WriteForm.tsx README.md
git commit -m "$(cat <<'EOF'
docs: update write UI copy and document PERPLEXITY_API_KEY

EOF
)"
```

---

### Task 5: Manual verification

**Files:** none (runtime check)

- [ ] **Step 1: Ensure `.env.local` has the key**

Add (do not commit `.env.local`):

```bash
PERPLEXITY_API_KEY=pplx-...
```

- [ ] **Step 2: Restart / run the app**

Run: `npm run dev` (or `npm run pm2:restart` if using PM2)

Expected: server starts without import errors for deleted `x-search`

- [ ] **Step 3: Opinion mode smoke test**

1. Open write page → 의견 기반
2. Paste ≥50자 opinion, pick category, generate
3. Confirm step labels say 웹/자료 (not X)
4. Confirm job completes and draft saves
5. Skim draft: attribution style (`~에 따르면` etc.), no X-cast tone (`@handle가 올렸다`)

- [ ] **Step 4: Source mode smoke test**

1. 소스 기반 — paste one URL or text source, optional perspective
2. Confirm fetch → search → write → save
3. Draft saves with source + research woven in

- [ ] **Step 5: Missing-key check (optional, ~2 min)**

Temporarily unset `PERPLEXITY_API_KEY`, trigger generate once.

Expected: API returns 500 with `PERPLEXITY_API_KEY가 설정되지 않았습니다`. Restore the key after.

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Delete `lib/x-search.ts` | Task 1 |
| Add `lib/perplexity.ts` (`sonar`, 30s, Korean research) | Task 1 |
| Wire both write routes | Tasks 2–3 |
| Prompt: `[객관적 자료]`, attribution phrases | Tasks 2–3 |
| UI step copy | Task 4 |
| README / env docs | Task 4 |
| Error: missing key / empty / HTTP | Tasks 1–3 |
| Out of scope: Firecrawl/OpenRouter/UI layout | not in plan |
| Verification smoke tests | Task 5 |
