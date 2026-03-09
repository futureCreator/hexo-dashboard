import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface HexoPost {
  filename: string;
  filepath: string;
  title: string;
  date: string | null;
  tags: string[];
  categories: string[];
  draft: boolean;
  excerpt: string;
  content: string;
  abbrlink?: number;
  slug?: string;
}

export interface SiteConfig {
  url: string;
  permalink: string;
}

export function getSiteConfig(hexoPath: string): SiteConfig {
  const configPath = path.join(hexoPath, "_config.yml");
  const defaults: SiteConfig = { url: "", permalink: ":year/:month/:day/:title/" };
  if (!fs.existsSync(configPath)) return defaults;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const urlMatch = content.match(/^url:\s*(.+)$/m);
    const permalinkMatch = content.match(/^permalink:\s*(.+)$/m);
    return {
      url: urlMatch ? urlMatch[1].trim().replace(/\/+$/, "") : "",
      permalink: permalinkMatch ? permalinkMatch[1].trim() : defaults.permalink,
    };
  } catch {
    return defaults;
  }
}

export function getPostsDir(hexoPath: string): string {
  return path.join(hexoPath, "source", "_posts");
}

export function getDraftsDir(hexoPath: string): string {
  return path.join(hexoPath, "source", "_drafts");
}

export function hexoPathValid(hexoPath: string): boolean {
  const postsDir = getPostsDir(hexoPath);
  return fs.existsSync(postsDir);
}

interface PostsCache {
  hexoPath: string;
  posts: HexoPost[];
}

let postsCache: PostsCache | null = null;

export function invalidatePostsCache(): void {
  postsCache = null;
}

export function readPosts(hexoPath: string): HexoPost[] {
  if (postsCache && postsCache.hexoPath === hexoPath) {
    return postsCache.posts;
  }

  const posts: HexoPost[] = [];

  // Read published posts
  const postsDir = getPostsDir(hexoPath);
  if (fs.existsSync(postsDir)) {
    const files = fs
      .readdirSync(postsDir)
      .filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const filepath = path.join(postsDir, file);
      posts.push(parsePost(filepath, file, false));
    }
  }

  // Read drafts
  const draftsDir = getDraftsDir(hexoPath);
  if (fs.existsSync(draftsDir)) {
    const files = fs
      .readdirSync(draftsDir)
      .filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const filepath = path.join(draftsDir, file);
      posts.push(parsePost(filepath, file, true));
    }
  }

  // Also check front matter draft field in _posts
  const sorted = posts.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  postsCache = { hexoPath, posts: sorted };
  return sorted;
}

function parsePost(filepath: string, filename: string, isDraftsFolder: boolean): HexoPost {
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const { data, excerpt, content } = matter(raw, { excerpt: true });

    const draft =
      isDraftsFolder ||
      data.draft === true ||
      data.published === false;

    const tags = Array.isArray(data.tags)
      ? (data.tags as unknown[]).flat().map(String)
      : data.tags
      ? [String(data.tags)]
      : [];

    const categories = Array.isArray(data.categories)
      ? (data.categories as unknown[]).flat().map(String)
      : data.categories
      ? [String(data.categories)]
      : [];

    const date = data.date
      ? new Date(data.date).toISOString()
      : null;

    return {
      filename,
      filepath,
      title: data.title || filename.replace(/\.md$/, ""),
      date,
      tags,
      categories,
      draft,
      excerpt: excerpt || "",
      content: content || "",
      abbrlink: typeof data.abbrlink === "number" ? data.abbrlink : undefined,
      slug: typeof data.slug === "string" && data.slug ? data.slug : undefined,
    };
  } catch {
    return {
      filename,
      filepath,
      title: filename.replace(/\.md$/, ""),
      date: null,
      tags: [],
      categories: [],
      draft: isDraftsFolder,
      excerpt: "",
      content: "",
    };
  }
}

export function deletePost(filepath: string): void {
  if (!fs.existsSync(filepath)) {
    return; // Already gone — treat as success
  }
  fs.unlinkSync(filepath);
  invalidatePostsCache();
}

export interface PostLinkReference {
  filepath: string;
  filename: string;
  title: string;
}

export function findPostLinkReferences(hexoPath: string, postSlug: string): PostLinkReference[] {
  const posts = readPosts(hexoPath);
  const pattern = new RegExp(`\\{%-?\\s*post_link\\s+${postSlug}[\\s%]`);
  const refs: PostLinkReference[] = [];
  for (const post of posts) {
    try {
      const raw = fs.readFileSync(post.filepath, "utf-8");
      if (pattern.test(raw)) {
        refs.push({ filepath: post.filepath, filename: post.filename, title: post.title });
      }
    } catch {
      // skip unreadable files
    }
  }
  return refs;
}

export function cleanPostLinkReferences(hexoPath: string, postSlug: string): number {
  const posts = readPosts(hexoPath);
  const pattern = new RegExp(`\\{%-?\\s*post_link\\s+${postSlug}[\\s%]`);
  let count = 0;
  for (const post of posts) {
    try {
      const raw = fs.readFileSync(post.filepath, "utf-8");
      if (!pattern.test(raw)) continue;
      const lines = raw.split("\n");
      const filtered = lines.filter((line) => !pattern.test(line));
      if (filtered.length < lines.length) {
        fs.writeFileSync(post.filepath, filtered.join("\n"), "utf-8");
        count++;
      }
    } catch {
      // skip
    }
  }
  return count;
}

// CRC32 table (matches hexo-abbrlink default: crc32 decimal)
const CRC32_TABLE = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(str: string): number {
  const buf = Buffer.from(str, "utf8");
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface CreatePostOptions {
  title: string;
  tags: string[];
  categories: string[];
  draft: boolean;
  content?: string;
}

export function createPost(hexoPath: string, options: CreatePostOptions): HexoPost {
  const { title, tags, categories, draft, content = "" } = options;
  const targetDir = draft ? getDraftsDir(hexoPath) : getPostsDir(hexoPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  // Generate abbrlink (CRC32 of title) — same algorithm as hexo-abbrlink plugin
  let abbrlink = crc32(title);
  let filename = `${abbrlink}.md`;
  while (fs.existsSync(path.join(targetDir, filename))) {
    abbrlink = (abbrlink + 1) >>> 0;
    filename = `${abbrlink}.md`;
  }

  const frontMatter: Record<string, unknown> = { title, date: new Date().toISOString(), abbrlink, tags, categories };
  if (draft) frontMatter.draft = true;
  const fileContent = matter.stringify(content, frontMatter);

  const filepath = path.join(targetDir, filename);
  fs.writeFileSync(filepath, fileContent, "utf-8");
  invalidatePostsCache();
  return parsePost(filepath, filename, draft);
}

export interface HexoPage {
  filename: string;   // "index.md"
  filepath: string;   // absolute path
  title: string;      // front matter title or slug
  slug: string;       // directory name (e.g. "about")
  date: string | null;
  excerpt: string;
}

export function getPagesSourceDir(hexoPath: string): string {
  return path.join(hexoPath, "source");
}

export function readPages(hexoPath: string): HexoPage[] {
  const sourceDir = getPagesSourceDir(hexoPath);
  if (!fs.existsSync(sourceDir)) return [];

  const pages: HexoPage[] = [];

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue;

    if (entry.isDirectory()) {
      const indexPath = path.join(sourceDir, entry.name, "index.md");
      if (fs.existsSync(indexPath)) {
        pages.push(parsePage(indexPath, "index.md", entry.name));
      }
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name !== "index.md"
    ) {
      const slug = entry.name.replace(/\.md$/, "");
      pages.push(parsePage(path.join(sourceDir, entry.name), entry.name, slug));
    }
  }

  return pages.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

function parsePage(filepath: string, filename: string, slug: string): HexoPage {
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const { data, excerpt } = matter(raw, { excerpt: true });
    const date = data.date ? new Date(data.date).toISOString() : null;
    return {
      filename,
      filepath,
      title: data.title || slug,
      slug,
      date,
      excerpt: excerpt || "",
    };
  } catch {
    return { filename, filepath, title: slug, slug, date: null, excerpt: "" };
  }
}

export function deletePage(filepath: string): void {
  if (!fs.existsSync(filepath)) return;
  fs.unlinkSync(filepath);

  // Remove parent directory if it only contained index.md
  const dir = path.dirname(filepath);
  if (path.basename(filepath) === "index.md") {
    const remaining = fs.readdirSync(dir);
    if (remaining.length === 0) {
      fs.rmdirSync(dir);
    }
  }
}

export interface CreatePageOptions {
  title: string;
  slug: string;
}

export function createPage(hexoPath: string, options: CreatePageOptions): HexoPage {
  const { title, slug } = options;
  const sourceDir = getPagesSourceDir(hexoPath);
  const pageDir = path.join(sourceDir, slug);
  if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

  const filepath = path.join(pageDir, "index.md");
  const frontMatter: Record<string, unknown> = { title, date: new Date().toISOString() };
  fs.writeFileSync(filepath, matter.stringify("", frontMatter), "utf-8");
  return parsePage(filepath, "index.md", slug);
}

export function updateTagInPosts(hexoPath: string, oldTag: string, newTag: string | null): number {
  const posts = readPosts(hexoPath);
  let count = 0;
  for (const post of posts) {
    try {
      const raw = fs.readFileSync(post.filepath, "utf-8");
      const parsed = matter(raw);
      const tags: string[] = Array.isArray(parsed.data.tags)
        ? (parsed.data.tags as unknown[]).flat().map(String)
        : parsed.data.tags
        ? [String(parsed.data.tags)]
        : [];

      if (!tags.includes(oldTag)) continue;

      const newTags = newTag === null
        ? tags.filter((t) => t !== oldTag)
        : tags.map((t) => (t === oldTag ? newTag : t));

      parsed.data.tags = newTags;
      fs.writeFileSync(post.filepath, matter.stringify(parsed.content, parsed.data), "utf-8");
      count++;
    } catch {
      // skip unreadable files
    }
  }
  invalidatePostsCache();
  return count;
}

export function togglePostDraft(filepath: string, hexoPath: string): HexoPost {
  const postsDir = getPostsDir(hexoPath);
  const draftsDir = getDraftsDir(hexoPath);
  const filename = path.basename(filepath);

  const isDraft = filepath.startsWith(draftsDir);
  let newFilepath: string;

  if (isDraft) {
    // Draft → Published
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }
    newFilepath = path.join(postsDir, filename);
  } else {
    // Published → Draft
    if (!fs.existsSync(draftsDir)) {
      fs.mkdirSync(draftsDir, { recursive: true });
    }
    newFilepath = path.join(draftsDir, filename);
  }

  // Strip or add draft frontmatter field to match the new location
  const raw = fs.readFileSync(filepath, "utf-8");
  const parsed = matter(raw);
  if (isDraft) {
    delete parsed.data.draft;
    delete parsed.data.published;
  }
  fs.writeFileSync(filepath, matter.stringify(parsed.content, parsed.data), "utf-8");

  fs.renameSync(filepath, newFilepath);
  invalidatePostsCache();
  return parsePost(newFilepath, filename, !isDraft);
}
