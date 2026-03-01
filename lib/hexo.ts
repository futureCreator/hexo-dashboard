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
      ? data.tags
      : data.tags
      ? [String(data.tags)]
      : [];

    const categories = Array.isArray(data.categories)
      ? data.categories
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
