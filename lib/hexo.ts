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

export function readPosts(hexoPath: string): HexoPost[] {
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
  return posts.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

function parsePost(filepath: string, filename: string, isDraftsFolder: boolean): HexoPost {
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const { data, excerpt } = matter(raw, { excerpt: true });

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
    };
  }
}

export function deletePost(filepath: string): void {
  if (!fs.existsSync(filepath)) {
    return; // Already gone — treat as success
  }
  fs.unlinkSync(filepath);
}

function slugify(title: string): string {
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CreatePostOptions {
  title: string;
  tags: string[];
  categories: string[];
  draft: boolean;
}

export function createPost(hexoPath: string, options: CreatePostOptions): HexoPost {
  const { title, tags, categories, draft } = options;
  const targetDir = draft ? getDraftsDir(hexoPath) : getPostsDir(hexoPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const baseSlug = slugify(title) || "untitled";
  let filename = `${baseSlug}.md`;
  let counter = 1;
  while (fs.existsSync(path.join(targetDir, filename))) {
    filename = `${baseSlug}-${counter++}.md`;
  }

  const frontMatter: Record<string, unknown> = { title, date: new Date().toISOString(), tags, categories };
  if (draft) frontMatter.draft = true;
  const fileContent = matter.stringify("", frontMatter);

  const filepath = path.join(targetDir, filename);
  fs.writeFileSync(filepath, fileContent, "utf-8");
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
  return parsePost(newFilepath, filename, !isDraft);
}
