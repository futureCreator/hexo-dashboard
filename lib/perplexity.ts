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
