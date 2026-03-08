import { HexoPost } from "./hexo";

export interface LinkEdge {
  fromFilename: string;
  fromTitle: string;
  toFilename: string | null;   // null = broken
  toTitle: string | null;
  href: string;                // original slug / href in source
  type: "post_link" | "markdown";
  broken: boolean;
}

export interface PostNode {
  filename: string;
  title: string;
  draft: boolean;
  outgoing: LinkEdge[];
  incoming: LinkEdge[];
}

export interface LinkGraph {
  nodes: PostNode[];
  edges: LinkEdge[];
  brokenLinks: LinkEdge[];
}

// {% post_link slug %} or {% post_link slug "Custom Title" %}
function extractPostLinkTags(content: string): string[] {
  const re = /\{%-?\s*post_link\s+(\S+)(?:\s+"[^"]*")?\s*-?%\}/g;
  const slugs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) slugs.push(m[1]);
  return slugs;
}

/**
 * Extract markdown links [text](href).
 * - Excludes images: !(![...])(...) via negative lookbehind (?<!!)
 * - Excludes external links (http/https/mailto) UNLESS they match ownOrigin,
 *   in which case the origin is stripped and the path is returned.
 */
function extractMarkdownLinks(content: string, ownOrigin: string): string[] {
  // (?<!!) ensures we don't match ![alt](src) image syntax
  const re = /(?<!!)\[(?:[^\]]*)\]\(([^)]+)\)/g;
  const hrefs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const raw = m[1].split(" ")[0].trim(); // strip optional "title" part

    if (raw.startsWith("mailto:") || raw.startsWith("#")) continue;

    // Own-domain full URL → strip origin, keep path
    if (ownOrigin && (raw.startsWith("http://") || raw.startsWith("https://"))) {
      if (raw.startsWith(ownOrigin)) {
        hrefs.push(raw.slice(ownOrigin.length) || "/");
      }
      // All other external links are skipped
      continue;
    }

    hrefs.push(raw);
  }
  return hrefs;
}

function resolveBySlug(
  slug: string,
  byAbbrlink: Map<number, HexoPost>,
  bySlug: Map<string, HexoPost>
): HexoPost | null {
  const n = parseInt(slug, 10);
  if (!isNaN(n) && byAbbrlink.has(n)) return byAbbrlink.get(n)!;
  const bare = slug.replace(/\.md$/, "");
  return bySlug.get(bare) ?? bySlug.get(slug) ?? null;
}

function resolveByHref(
  href: string,
  byAbbrlink: Map<number, HexoPost>,
  bySlug: Map<string, HexoPost>
): HexoPost | null {
  // Abbrlink as a complete path segment: /posts/12345678/ or /12345678/
  // Requires the number to be bounded by / on both sides (or end of string).
  // This prevents matching numbers inside filenames like /images/207147_img.jpg
  const abbrlinkInPath = href.match(/\/(\d{5,10})(\/|$)/);
  if (abbrlinkInPath) {
    const n = parseInt(abbrlinkInPath[1], 10);
    if (byAbbrlink.has(n)) return byAbbrlink.get(n)!;
  }

  // Pure number (e.g. href="12345678" or "12345678/")
  const pure = href.match(/^(\d+)\/?(?:#.*)?$/);
  if (pure) {
    const n = parseInt(pure[1], 10);
    if (byAbbrlink.has(n)) return byAbbrlink.get(n)!;
  }

  // Relative .md reference
  const mdRef = href.match(/([^/]+)\.md(?:#.*)?$/);
  if (mdRef) {
    const found = bySlug.get(mdRef[1]);
    if (found) return found;
  }

  return null;
}

/**
 * Returns true only if the href strongly indicates it targets a post:
 * - a complete numeric path segment matching abbrlink length (5–10 digits)
 * - a .md file reference
 * Intentionally rejects paths like /images/207147_foo.jpg where
 * the number is part of a filename, not a standalone segment.
 */
function isLikelyPostHref(href: string): boolean {
  // Number must occupy a full path segment: /12345678/ or ends the path
  if (/\/\d{5,10}(\/|$)/.test(href)) return true;
  // Pure number href
  if (/^\d{5,10}\/?$/.test(href)) return true;
  // Explicit .md file reference
  if (/\.md(#.*)?$/.test(href)) return true;
  return false;
}

export function buildLinkGraph(posts: HexoPost[], siteUrl = ""): LinkGraph {
  // Normalize own origin (scheme + host, no trailing slash)
  let ownOrigin = "";
  try {
    if (siteUrl) ownOrigin = new URL(siteUrl).origin;
  } catch {
    // ignore malformed URL
  }

  const byAbbrlink = new Map<number, HexoPost>();
  const bySlug = new Map<string, HexoPost>();

  for (const post of posts) {
    if (post.abbrlink != null) byAbbrlink.set(post.abbrlink, post);
    const bare = post.filename.replace(/\.md$/, "");
    bySlug.set(bare, post);
    bySlug.set(post.filename, post);
    if (post.slug) bySlug.set(post.slug, post);
    // Hexo strips date prefixes (YYYYMMDD- or YYYY-MM-DD-) when resolving {% post_link %}
    const withoutDate = bare
      .replace(/^\d{8}-/, "")       // 20190225-slug → slug
      .replace(/^\d{4}-\d{2}-\d{2}-/, ""); // 2019-02-25-slug → slug
    if (withoutDate !== bare) bySlug.set(withoutDate, post);
  }

  const allEdges: LinkEdge[] = [];

  for (const post of posts) {
    // 1. {% post_link %} tags — always expected to resolve to a post
    for (const slug of extractPostLinkTags(post.content)) {
      const target = resolveBySlug(slug, byAbbrlink, bySlug);
      if (target?.filename === post.filename) continue;
      allEdges.push({
        fromFilename: post.filename,
        fromTitle: post.title,
        toFilename: target?.filename ?? null,
        toTitle: target?.title ?? null,
        href: slug,
        type: "post_link",
        broken: target === null,
      });
    }

    // 2. Markdown links that clearly target posts (not images, not generic paths)
    for (const href of extractMarkdownLinks(post.content, ownOrigin)) {
      if (!isLikelyPostHref(href)) continue;
      const target = resolveByHref(href, byAbbrlink, bySlug);
      if (target?.filename === post.filename) continue;
      allEdges.push({
        fromFilename: post.filename,
        fromTitle: post.title,
        toFilename: target?.filename ?? null,
        toTitle: target?.title ?? null,
        href,
        type: "markdown",
        broken: target === null,
      });
    }
  }

  // Remove duplicate edges (same from→to combination)
  const seen = new Set<string>();
  const deduped = allEdges.filter((e) => {
    const key = `${e.fromFilename}→${e.toFilename ?? e.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Build nodes
  const nodeMap = new Map<string, PostNode>();
  for (const post of posts) {
    nodeMap.set(post.filename, {
      filename: post.filename,
      title: post.title,
      draft: post.draft,
      outgoing: [],
      incoming: [],
    });
  }
  for (const edge of deduped) {
    nodeMap.get(edge.fromFilename)?.outgoing.push(edge);
    if (edge.toFilename) nodeMap.get(edge.toFilename)?.incoming.push(edge);
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: deduped,
    brokenLinks: deduped.filter((e) => e.broken),
  };
}
