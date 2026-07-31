/** OpenRouter client for Grok 4.5 (reasoning effort: high). */

export const OPENROUTER_MODEL = "x-ai/grok-4.5";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

type ChatOptions = {
  messages: ChatMessage[];
  json?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
};

export async function openRouterChat(opts: ChatOptions): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: opts.messages,
      // exclude keeps response clean (reasoning tokens omitted from content)
      reasoning: { effort: "high", exclude: true },
      // ponytail: high reasoning eats most of max_tokens — leave headroom for output
      max_tokens: opts.maxTokens ?? 65536,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from OpenRouter");
  return text as string;
}

export async function openRouterChatStream(opts: {
  messages: ChatMessage[];
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<Response> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: opts.messages,
      reasoning: { effort: "high", exclude: true },
      max_tokens: opts.maxTokens ?? 8192,
      stream: true,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  });
}

/** Convert OpenAI-compatible SSE into a plain text ReadableStream. */
export function openRouterSseToTextStream(upstream: Response): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonStr);
              const chunk = data.choices?.[0]?.delta?.content;
              if (chunk) {
                controller.enqueue(new TextEncoder().encode(chunk));
              }
            } catch {
              // ignore malformed SSE chunk
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
