import { NextRequest } from "next/server";
import {
  getOpenRouterKey,
  openRouterChatStream,
  openRouterSseToTextStream,
} from "@/lib/openrouter";

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

  if (!getOpenRouterKey()) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
      status: 500,
    });
  }

  const upstream = await openRouterChatStream({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    timeoutMs: 60000,
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(JSON.stringify({ error: `OpenRouter API error: ${errText}` }), {
      status: 500,
    });
  }

  return new Response(openRouterSseToTextStream(upstream), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
