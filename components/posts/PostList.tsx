"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import PostCard from "./PostCard";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import EditModal from "./EditModal";
import NewPostModal from "./NewPostModal";
import type { HexoPost, SiteConfig } from "@/lib/hexo";

type FilterType = "all" | "published" | "draft";
type DateRange = "all" | "this-month" | "this-year";

interface PostListProps {
  initialPosts: HexoPost[];
  siteConfig: SiteConfig;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function PostList({ initialPosts, siteConfig }: PostListProps) {
  const [posts, setPosts] = useState<HexoPost[]>(initialPosts);
  const [filter, setFilter] = useState<FilterType>("all");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);
  const [pendingEditPost, setPendingEditPost] = useState<HexoPost | null>(null);
  const [watching, setWatching] = useState(false);
  const isRefreshing = useRef(false);
  const { showToast } = useToast();

  const refreshPosts = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts);
      showToast({ type: "success", message: "Posts synced from disk" });
    } catch {
      // Ignore network errors during background refresh
    } finally {
      isRefreshing.current = false;
    }
  }, [showToast]);

  // SSE file watch — auto-refresh when files change externally
  useEffect(() => {
    const es = new EventSource("/api/watch");
    es.addEventListener("connected", () => setWatching(true));
    es.addEventListener("change", refreshPosts);
    es.addEventListener("error", () => setWatching(false));
    return () => {
      es.close();
      setWatching(false);
    };
  }, [refreshPosts]);

  // "/" key focuses search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const now = new Date();
  const filtered = posts.filter((p) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "published" && !p.draft) ||
      (filter === "draft" && p.draft);

    if (!matchesFilter) return false;

    if (dateRange !== "all" && p.date) {
      const d = new Date(p.date);
      if (dateRange === "this-month") {
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      } else if (dateRange === "this-year") {
        if (d.getFullYear() !== now.getFullYear()) return false;
      }
    } else if (dateRange !== "all" && !p.date) {
      return false;
    }

    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.filename.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.categories.some((c) => c.toLowerCase().includes(q))
    );
  });

  const published = posts.filter((p) => !p.draft).length;
  const drafts = posts.filter((p) => p.draft).length;

  function handleDeleted(filepath: string) {
    setPosts((prev) => prev.filter((p) => p.filepath !== filepath));
  }

  const handleUpdated = useCallback((updated: HexoPost, oldFilepath?: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.filepath === (oldFilepath ?? updated.filepath) ? updated : p))
    );
  }, []);

  const handleCreated = useCallback((newPost: HexoPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setPendingEditPost(newPost);
  }, []);

  const filterBtns: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: posts.length },
    { key: "published", label: "Published", count: published },
    { key: "draft", label: "Drafts", count: drafts },
  ];

  return (
    <div>
      {/* Search + Date filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-4 flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search posts… (press "/" to focus)'
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="h-10 px-3 pr-8 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 cursor-pointer appearance-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        >
          <option value="all">All time</option>
          <option value="this-month">This month</option>
          <option value="this-year">This year</option>
        </select>
      </motion.div>

      {/* Filter tabs + post count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        {filterBtns.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${
                filter === key
                  ? "bg-[rgba(0,82,255,0.08)] text-[var(--accent)] border border-[rgba(0,82,255,0.2)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] border border-transparent"
              }
            `}
          >
            {label}
            <span
              className={`
                text-xs px-1.5 py-0.5 rounded-full font-mono
                ${
                  filter === key
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }
              `}
            >
              {count}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {watching && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400/80 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          )}
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            {filtered.length} post{filtered.length !== 1 ? "s" : ""}
          </span>
          <Button variant="primary" size="sm" onClick={() => setNewPostModalOpen(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Button>
        </div>
      </motion.div>

      {/* Post list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 flex flex-col items-center gap-3 text-[var(--muted-foreground)]"
        >
          <div className="w-12 h-12 rounded-2xl border border-[var(--border)] flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-sm">
            {query ? `No posts matching "${query}"` : "No posts found."}
          </p>
          {(query || dateRange !== "all") && (
            <button
              onClick={() => { setQuery(""); setDateRange("all"); }}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {filtered.map((post, i) => (
            <PostCard
              key={post.filepath}
              post={post}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
              index={i}
              siteConfig={siteConfig}
            />
          ))}
        </div>
      )}

      <NewPostModal
        isOpen={newPostModalOpen}
        onClose={() => setNewPostModalOpen(false)}
        onCreated={handleCreated}
      />

      {pendingEditPost && (
        <EditModal
          isOpen={true}
          filepath={pendingEditPost.filepath}
          filename={pendingEditPost.filename}
          onClose={() => setPendingEditPost(null)}
          onSaved={() => {
            showToast({ type: "success", message: `"${pendingEditPost.title}" saved` });
            setPendingEditPost(null);
          }}
        />
      )}
    </div>
  );
}
