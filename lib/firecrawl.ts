/** Firecrawl scrape client — URL → main-content markdown. */

const FIRECRAWL_API_URL =
  process.env.FIRECRAWL_API_URL?.replace(/\/$/, "") || "https://api.firecrawl.dev";

export function getFirecrawlKey(): string | undefined {
  return process.env.FIRECRAWL_API_KEY;
}

/** Scrape a URL to markdown (main content only). Caps at 20k chars. */
export async function scrapeToMarkdown(url: string): Promise<string> {
  const apiKey = getFirecrawlKey();
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const res = await fetch(`${FIRECRAWL_API_URL}/v2/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firecrawl scrape failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    data?: { markdown?: string };
    markdown?: string;
    error?: string;
  };

  const markdown = data.data?.markdown ?? data.markdown;
  if (!markdown?.trim()) {
    throw new Error(data.error || `Firecrawl returned empty markdown for ${url}`);
  }

  return markdown.trim().slice(0, 20000);
}
