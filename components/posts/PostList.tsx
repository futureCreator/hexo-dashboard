"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PostCard from "./PostCard";
import CleanButton from "./CleanButton";
import CommitButton from "./CommitButton";
import DeployButton from "./DeployButton";
import { useToast } from "@/components/ui/Toast";
import { useIsMobile } from "@/hooks/useMediaQuery";
import EditModal from "./EditModal";
import NewPostModal from "./NewPostModal";
import { apiUrl } from "@/lib/api";
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);
  const [pendingEditPost, setPendingEditPost] = useState<HexoPost | null>(null);
  const [watching, setWatching] = useState(false);
  const isRefreshing = useRef(false);
  const { showToast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();

  const handleNewPost = useCallback(() => {
    if (isMobile) {
      router.push("/write");
    } else {
      setNewPostModalOpen(true);
    }
  }, [isMobile, router]);

  const refreshPosts = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      const res = await fetch(apiUrl("/api/posts"));
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts);
      showToast({ type: "success", message: "Posts synced from disk" });
    } catch {
      // ignore
    } finally {
      isRefreshing.current = false;
    }
  }, [showToast]);

  useEffect(() => {
    const es = new EventSource(apiUrl("/api/watch"));
    es.addEventListener("connected", () => setWatching(true));
    es.addEventListener("change", refreshPosts);
    es.addEventListener("error", () => setWatching(false));
    return () => { es.close(); setWatching(false); };
  }, [refreshPosts]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNewPost();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewPost]);

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

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: posts.length },
    { key: "published", label: "Published", count: published },
    { key: "draft", label: "Drafts", count: drafts },
  ];

  return (
    <div>
      {/* Action buttons row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
        className="grid grid-cols-[1fr_auto_auto_auto] md:flex md:items-center gap-2 mb-4"
      >
        <button
          onClick={handleNewPost}
          title="New Post (n)"
          className="inline-flex items-center justify-center gap-2 px-4 h-[44px] w-full md:w-auto rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[13px] md:text-sm">New Post</span>
        </button>
        <CleanButton />
        <CommitButton />
        <DeployButton />
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut, delay: 0.04 }}
        className="flex items-center gap-2 mb-3"
      >
        {/* Search bar */}
        <div
          className={`flex items-center gap-2 flex-1 h-[36px] px-3 rounded-[10px] bg-[var(--muted)] transition-all duration-200 ${
            isSearchFocused ? "ring-1 ring-[var(--accent)]" : ""
          }`}
        >
          <svg className="w-[15px] h-[15px] text-[var(--muted-foreground)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search posts…"
            className="flex-1 bg-transparent text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 w-4 h-4 rounded-full bg-[var(--muted-foreground)]/40 flex items-center justify-center transition-all active:scale-90"
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Cancel (when searching) — mobile only */}
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, x: 8, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: 8, width: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setQuery("")}
              className="md:hidden text-[var(--accent)] text-[15px] font-medium whitespace-nowrap shrink-0"
            >
              Cancel
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filters row: segmented control + date + live + count */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut, delay: 0.05 }}
        className="flex items-center gap-2 mb-5 flex-wrap"
      >
        {/* iOS segmented control */}
        <div className="segmented-control" style={{ width: "fit-content" }}>
          {filterTabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`segmented-control-item min-w-[64px] px-3 gap-1.5 ${filter === key ? "active" : ""}`}
            >
              {label}
              <span className={`text-[11px] font-mono px-1 py-px rounded-full leading-none ${
                filter === key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--muted-foreground)]/20 text-[var(--muted-foreground)]"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="h-[32px] pl-3 pr-7 rounded-[8px] bg-[var(--muted)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer appearance-none transition-all"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center"
            }}
          >
            <option value="all">All time</option>
            <option value="this-month">This month</option>
            <option value="this-year">This year</option>
          </select>
        </div>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-3">
          {watching && (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              live
            </span>
          )}
          <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
            {filtered.length} post{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.div>

      {/* Post list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="py-16 flex flex-col items-center gap-3 text-[var(--muted-foreground)]"
        >
          <div className="w-12 h-12 rounded-[14px] border border-[var(--border)] flex items-center justify-center bg-[var(--muted)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[15px]">
            {query ? `No results for "${query}"` : "No posts found."}
          </p>
          {(query || dateRange !== "all") && (
            <button
              onClick={() => { setQuery(""); setDateRange("all"); }}
              className="text-[13px] text-[var(--accent)] font-medium"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="rounded-[14px] overflow-hidden bg-[var(--card)] border border-[var(--border)]">
          {filtered.map((post, i) => (
            <PostCard
              key={post.filepath}
              post={post}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
              index={i}
              siteConfig={siteConfig}
              isLast={i === filtered.length - 1}
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
