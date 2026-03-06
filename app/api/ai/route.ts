import { NextRequest } from "next/server";

type Action = "rewrite" | "expand" | "shorten" | "fix-grammar";

const PROMPTS: Record<Action, string> = {
  rewrite:
    "Rewrite the following text to be clearer and more engaging while preserving the meaning and language (Korean or English). Return ONLY the rewritten text with no explanation or preamble.",
  expand:
    "Expand the following text with more detail and examples, preserving the language. Return ONLY the expanded text with no explanation or preamble.",
  shorten:
    "Shorten the following text while keeping the key points, preserving the language. Return ONLY the shortened text with no explanation or preamble.",
  "fix-grammar":
    "Fix any grammar, spelling, and punctuation errors in the following text, preserving the language and style. Return ONLY the corrected text with no explanation or preamble.",
};

export async function POST(request: NextRequest) {
  const { action, text } = await request.json();

  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: "text is required" }), { status: 400 });
  }

  const systemPrompt = PROMPTS[action as Action];
  if (!systemPrompt) {
    return new Response(JSON.stringify({ error: "invalid action" }), { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
      status: 500,
    });
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nTEXT:\n${text}` }] }],
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
      status: 500,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
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
              const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
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

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
