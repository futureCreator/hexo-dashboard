# Opinion-Based AI Writing Feature Design

## Overview

기존 소스 기반 AI Writing과 별개로, 사용자의 의견/관점을 입력하면 Perplexity API로 객관적 자료를 검색하고 Gemini가 의견+자료를 합쳐서 글을 작성하는 새로운 기능.

## Prerequisites

- `.env.local`에 `PERPLEXITY_API_KEY` 추가 필요 (Perplexity API 대시보드에서 발급)
- 기존 `GEMINI_API_KEY`는 이미 설정되어 있어야 함

## Workflow

1. 사용자가 의견/관점 텍스트 작성 + 카테고리 선택
2. Perplexity `sonar` 모델로 관련 객관적 자료 검색
3. Gemini가 사용자 의견 + 객관적 자료 + 참고 포스트를 합쳐서 최종 글 작성
4. 드래프트로 저장

## API Route

### `POST /api/ai-write-opinion`

**입력:**

- `opinion: string` — 사용자의 의견/관점 (필수, 50자 이상 5,000자 이하)
- `category: string` — 카테고리 (AI, Blog, Engineering, Cloud, Insight)
- `referencePosts: string[]` — 참고할 기존 포스트 파일경로 (선택, 최대 3개)

**처리 흐름:**

1. 입력 검증 (opinion 50자 미만 또는 5,000자 초과 → 400)
2. Perplexity API 호출 — 의견 관련 객관적 자료 수집 (타임아웃 15초)
3. Perplexity 응답 파싱 — `choices[0].message.content` 텍스트 추출
4. 참고 포스트 로드 (선택된 경우, 각 6KB 제한)
5. Gemini API 호출 — 의견 + 자료 + 참고 포스트로 최종 글 생성 (타임아웃 300초)
6. 기존 `findRelatedPosts`, `buildRelatedSection` 함수 재사용하여 관련 포스트 섹션 추가
7. 드래프트로 저장

**출력:** `{ success: true, post: HexoPost }`

**대상 글자수:** 의견 길이 + Perplexity 자료 길이 기반 산출. 최소 800자, 최대 2,000자.

## Perplexity API Integration

**환경변수:** `PERPLEXITY_API_KEY` in `.env.local`

**API 호출:**

- 엔드포인트: `https://api.perplexity.ai/chat/completions`
- 모델: `sonar`
- SDK 없이 `fetch` 직접 호출
- 타임아웃: 15초

**프롬프트:**

- System: "You are a research assistant. Given a user's opinion on a topic in the {category} domain, find relevant objective data, statistics, research results, expert opinions, and real-world examples that can support or provide context for this opinion. Focus on authoritative and recent sources. Respond in Korean."
- User: 사용자 의견 원문
- 옵션: `return_related_questions: false`

**응답 파싱:**

- `choices[0].message.content`에서 텍스트 추출
- 응답이 비어있거나 의미 없는 경우 → 에러 반환 ("관련 자료를 찾지 못했습니다")
- Perplexity가 영어/혼합 언어로 응답해도 그대로 Gemini에 전달 (Gemini가 한국어로 최종 작성)

## Gemini Prompt Design

기존 `ai-write` 라우트(route.ts lines 134-169)의 프롬프트 규칙을 기반으로 하되, 의견 기반에 맞게 수정:

**적용하는 기존 규칙:**

- 평어체(~했다, ~이다) 사용
- 마크다운 헤더(##, ###) 사용 금지
- Straight quotes만 사용 (스마트 따옴표 금지)
- 첫 문단 뒤에 `<!-- more -->` HTML 코멘트 삽입
- 1인칭은 "동호"
- 영문 태그 3-5개 (소문자)

**제외하는 기존 규칙:**

- 소스 저자 관련 규칙 (의견 기반에서는 사용자 본인이 저자)

**추가 지시:**

- 사용자의 의견/주장을 글의 중심 축으로 유지할 것
- 객관적 자료를 "~에 따르면", "~연구에서는", "~조사에 의하면" 등으로 자연스럽게 녹여서 의견을 뒷받침할 것
- 구체적 통계나 주장은 출처를 암시하는 표현을 사용하되, 확인되지 않은 데이터를 확정적 사실로 단정하지 말 것
- Perplexity 자료가 영어/혼합 언어인 경우에도 최종 글은 한국어로 작성할 것

**컨텍스트 구조:**

```
[사용자 의견]
{opinion 원문}

[객관적 자료]
{Perplexity 응답 텍스트}

[참고 포스트 스타일]
{선택된 기존 포스트 내용}
```

**글 구조:**

1. 도입 — 의견의 배경/문제 제기
2. 본론 — 의견 전개 + 객관적 자료로 뒷받침
3. 마무리 — 결론/전망

**대상 글자수:** 최소 800자 ~ 최대 2,000자 (의견 + 자료 분량에 따라 조절)

## UI Changes

### Write Page Tab Structure

**변경 전:** "수동 작성" / "AI 작성" 2개 탭
**변경 후:** "소스 기반" / "의견 기반" 2개 탭

수동 작성 모드는 의도적으로 제거한다. 수동 포스트 생성이 필요한 경우 소스 기반 탭에서 소스 없이 작성하거나, 직접 마크다운 파일을 생성하는 방식으로 대체 가능.

### "의견 기반" 탭 폼 구성

1. **내 의견** — textarea (필수, 50자 이상, placeholder: "내 생각이나 의견을 자유롭게 작성하세요...")
2. **카테고리** — 버튼 선택 (AI, Blog, Engineering, Cloud, Insight) — 기본값 "AI", 항상 하나 선택 상태
3. **참고 포스트** — 멀티셀렉트 피커 (선택, 최대 3개) — 기존 컴포넌트 재사용
4. **하단 메타 안내** — "태그 자동 생성 · 드래프트로 저장됩니다"

### Progress Animation

기존 AI Write 프로그레스 컴포넌트 재사용, 단계와 타이밍 조정:

1. 관련 자료 검색 중... (0ms~)
2. 자료 분석 중... (5000ms~)
3. 글 작성 중... (10000ms~)
4. 저장 중... (완료 직전)

## Error Handling

- **Perplexity API 실패/타임아웃(15초):** 에러 반환, 글 생성 중단
- **Perplexity 응답 비어있음:** "관련 자료를 찾지 못했습니다" 에러
- **PERPLEXITY_API_KEY 미설정:** "PERPLEXITY_API_KEY가 설정되지 않았습니다" 에러
- **Gemini API 실패/타임아웃(300초):** 기존 `ai-write`와 동일한 에러 처리
- **입력 검증:** opinion 50자 미만 → 400 ("의견을 50자 이상 작성해주세요"), 5,000자 초과 → 400

## Known Limitations

- 생성 중 취소 메커니즘 없음 (기존 AI Write와 동일한 제한)
- 한국어 의견에 최적화됨. 영어 의견도 동작하지만 Perplexity 검색 품질이 다를 수 있음

## Technical Notes

- 새 패키지 설치 불필요 (Perplexity REST API를 fetch로 직접 호출)
- 기존 `lib/hexo.ts`의 `createPost`, `readPosts` 함수 재사용
- 기존 `ai-write/route.ts`의 `findRelatedPosts`, `buildRelatedSection` 함수 재사용
- 기존 WriteForm 컴포넌트를 수정하여 탭 구조 변경 + 의견 기반 폼 추가
- 기존 수동 작성 모드 관련 코드 (`handleManualSubmit`, `title`/`tags`/`categories`/`draft` state) 제거
