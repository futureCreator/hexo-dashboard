# Replace xurl with Perplexity Research — Design

## Goal

소스 기반·의견 기반 AI 작성에서 로컬 `xurl` X 검색을 제거하고, Perplexity 직접 API(`sonar`)로 웹 리서치를 한다. X 포스트 품질·한국어 약점과 “X 자체가 불필요”한 문제를 해소한다.

## Decisions

| 항목 | 선택 |
|------|------|
| 리서치 제공자 | Perplexity 직접 API (`PERPLEXITY_API_KEY`) |
| 모델 | `sonar` |
| 글 작성 | 기존 OpenRouter Luna 유지 |
| Firecrawl | 소스 URL scrape만 유지 (변경 없음) |
| OpenRouter로 Sonar | 선택하지 않음 |

## Architecture

```
의견 기반:  opinion → Perplexity sonar → OpenRouter Luna → draft
소스 기반:  URLs → Firecrawl scrape → Perplexity sonar (시드) → OpenRouter Luna → draft
```

1. Delete `lib/x-search.ts`
2. Add `lib/perplexity.ts` — research helper
3. Wire `app/api/ai-write/route.ts` and `app/api/ai-write-opinion/route.ts` to call Perplexity instead of `searchXResearch`
4. Update prompts: X framing → objective web research framing
5. Update UI step copy (“X 검색” → “자료 검색” 등); form/tab structure unchanged
6. Document `PERPLEXITY_API_KEY` in README / `.env` docs

## `lib/perplexity.ts`

- Endpoint: `POST https://api.perplexity.ai/chat/completions`
- Model: `sonar`
- Auth: `Bearer ${PERPLEXITY_API_KEY}`
- Timeout: ~30s
- System prompt: research assistant for the given category; collect objective data, statistics, expert opinions, real-world examples; respond in Korean
- User content:
  - Opinion mode: raw opinion text
  - Source mode: perspective + truncated scraped source text (seed, not full dump)
- Empty content → throw `"관련 자료를 찾지 못했습니다"`
- Missing key → callers return 500 `"PERPLEXITY_API_KEY가 설정되지 않았습니다"`
- HTTP failure / timeout → Korean error message on the job (same pattern as current xurl errors)

Export something like `researchWithPerplexity({ query, category }) → string` (LLM-ready research text).

## Prompt changes (both write routes)

- Section label: `[X 관련 자료]` → `[객관적 자료]`
- Weave phrases: “X에서는 / 어떤 사용자는 / 최근 반응을 보면” → “~에 따르면 / 연구에서는 / 조사에 의하면”
- Remove X-specific rules (cast list / handle-centric sentences)
- Restore attribution rules from the original opinion design: do not present unverified stats as hard fact
- Final post still Korean informal (평어체), same structural rules otherwise

## Error handling

| Case | Behavior |
|------|----------|
| No `PERPLEXITY_API_KEY` | 500 before job work (or fail job with clear message) |
| Perplexity HTTP / timeout / empty | job `error` with Korean message |
| Firecrawl scrape fail (source URLs) | unchanged; independent of Perplexity |

## Out of scope

- Firecrawl API changes
- OpenRouter model change
- UI layout redesign / new tabs
- Perplexity Pro, citations UI, or citation chips in the editor
- Keeping any xurl / X search fallback

## Verification

1. Set `PERPLEXITY_API_KEY` in `.env.local`
2. Opinion mode once: research step succeeds; draft has no X-cast tone
3. Source mode once: URL scrape + Perplexity enrichment; draft saves
