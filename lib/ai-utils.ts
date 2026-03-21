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
