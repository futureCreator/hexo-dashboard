interface FrontMatter {
  title?: string;
  description?: string;
  tags?: string | string[];
  categories?: string | string[];
  [key: string]: unknown;
}

export interface ReadabilityStats {
  wordCount: number;
  charCount: number;
  readingTime: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  level: "very-easy" | "easy" | "medium" | "hard" | "very-hard";
  levelLabel: string;
}

export interface SEOStats {
  score: number;
  titleLength: number;
  titleOk: boolean;
  hasDescription: boolean;
  descriptionLength: number;
  descriptionOk: boolean;
  hasImages: boolean;
  hasTags: boolean;
  issues: string[];
}

export interface ContentStats {
  readability: ReadabilityStats;
  seo: SEOStats;
}

function parseFrontMatter(content: string): {
  frontMatter: FrontMatter;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: content };

  const fm: FrontMatter = {};
  let currentKey: string | null = null;
  for (const line of match[1].split("\n")) {
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(fm[currentKey])) {
        fm[currentKey] = fm[currentKey] ? [fm[currentKey] as string] : [];
      }
      (fm[currentKey] as string[]).push(listMatch[1].trim());
      continue;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    currentKey = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    fm[currentKey] = value;
  }

  return { frontMatter: fm, body: match[2] };
}

function analyzeReadability(body: string): ReadabilityStats {
  const text = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_~>]/g, "")
    .replace(/^\s*[-+*]\s/gm, "")
    .trim();

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const charCount = text.replace(/\s/g, "").length;

  const sentences = text
    .split(/[.!?。！？]+/)
    .filter((s) => s.trim().length > 2);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgWordsPerSentence = wordCount / sentenceCount;
  const readingTime = Math.max(1, Math.ceil(wordCount / 230));

  let level: ReadabilityStats["level"];
  let levelLabel: string;
  if (avgWordsPerSentence < 8) {
    level = "very-easy";
    levelLabel = "매우 쉬움";
  } else if (avgWordsPerSentence < 13) {
    level = "easy";
    levelLabel = "쉬움";
  } else if (avgWordsPerSentence < 18) {
    level = "medium";
    levelLabel = "보통";
  } else if (avgWordsPerSentence < 24) {
    level = "hard";
    levelLabel = "어려움";
  } else {
    level = "very-hard";
    levelLabel = "매우 어려움";
  }

  return {
    wordCount,
    charCount,
    readingTime,
    sentenceCount,
    avgWordsPerSentence,
    level,
    levelLabel,
  };
}

function analyzeSEO(frontMatter: FrontMatter, body: string): SEOStats {
  const title = String(frontMatter.title || "");
  const description = String(frontMatter.description || "");

  const titleLength = title.length;
  const titleOk = titleLength >= 10 && titleLength <= 60;
  const hasDescription = description.length > 0;
  const descriptionLength = description.length;
  const descriptionOk = hasDescription && descriptionLength <= 160;
  const hasImages = /!\[/.test(body);
  const hasTags = !!(frontMatter.tags || frontMatter.categories);

  const issues: string[] = [];
  if (titleLength === 0) issues.push("제목 없음");
  else if (titleLength < 10) issues.push("제목이 너무 짧음 (10자 미만)");
  else if (titleLength > 60) issues.push("제목이 너무 김 (60자 초과)");
  if (!hasDescription) issues.push("메타 설명 없음");
  else if (descriptionLength > 160) issues.push("메타 설명이 너무 김 (160자 초과)");
  if (!hasImages) issues.push("이미지 없음");
  if (!hasTags) issues.push("태그/카테고리 없음");

  const passed = [titleOk, descriptionOk, hasImages, hasTags].filter(
    Boolean
  ).length;
  const score = Math.round((passed / 4) * 100);

  return {
    score,
    titleLength,
    titleOk,
    hasDescription,
    descriptionLength,
    descriptionOk,
    hasImages,
    hasTags,
    issues,
  };
}

export function analyzeContent(content: string): ContentStats {
  const { frontMatter, body } = parseFrontMatter(content);
  return {
    readability: analyzeReadability(body),
    seo: analyzeSEO(frontMatter, body),
  };
}
