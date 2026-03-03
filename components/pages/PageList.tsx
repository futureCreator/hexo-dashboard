"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import PageCard from "./PageCard";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import EditModal from "@/components/posts/EditModal";
import NewPageModal from "./NewPageModal";
import type { HexoPage } from "@/lib/hexo";

interface PageListProps {
  initialPages: HexoPage[];
}

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function PageList({ initialPages }: PageListProps) {
  const [pages, setPages] = useState<HexoPage[]>(initialPages);
  const [query, setQuery] = useState("");
  const [newPageModalOpen, setNewPageModalOpen] = useState(false);
  const [pendingEditPage, setPendingEditPage] = useState<HexoPage | null>(null);
  const [watching, setWatching] = useState(false);
  const isRefreshing = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const refreshPages = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      const res = await fetch("/api/pages");
      if (!res.ok) return;
      const data = await res.json();
      setPages(data.pages);
      showToast({ type: "success", message: "Pages synced from disk" });
    } catch {
      // ignore
    } finally {
      isRefreshing.current = false;
    }
  }, [showToast]);

  // SSE file watch
  useEffect(() => {
    const es = new EventSource("/api/watch");
    es.addEventListener("connected", () => setWatching(true));
    es.addEventListener("change", refreshPages);
    es.addEventListener("error", () => setWatching(false));
    return () => {
      es.close();
      setWatching(false);
    };
  }, [refreshPages]);

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

  const filtered = pages.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  function handleDeleted(filepath: string) {
    setPages((prev) => prev.filter((p) => p.filepath !== filepath));
  }

  const handleCreated = useCallback((newPage: HexoPage) => {
    setPages((prev) => [newPage, ...prev]);
    setPendingEditPage(newPage);
  }, []);

  return (
    <div>
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="grid grid-cols-1 gap-4 mb-8 max-w-xs"
      >
        <div className="bg-[var(--stat-card)] rounded-xl p-5 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <div className="text-3xl font-bold mb-1 text-white">{pages.length}</div>
            <div className="text-xs text-white/60 font-mono uppercase tracking-wider">Total Pages</div>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search pages… (press "/" to focus)'
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
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2 mb-6"
      >
        <div className="ml-auto flex items-center gap-3">
          {watching && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400/80 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          )}
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            {filtered.length} page{filtered.length !== 1 ? "s" : ""}
          </span>
          <Button variant="primary" size="sm" onClick={() => setNewPageModalOpen(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Page
          </Button>
        </div>
      </motion.div>

      {/* Page list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 flex flex-col items-center gap-3 text-[var(--muted-foreground)]"
        >
          <div className="w-12 h-12 rounded-2xl border border-[var(--border)] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm">
            {query ? `No pages matching "${query}"` : "No pages found."}
          </p>
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Clear search
            </button>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {filtered.map((page, i) => (
            <PageCard
              key={page.filepath}
              page={page}
              onDeleted={handleDeleted}
              index={i}
            />
          ))}
        </div>
      )}

      <NewPageModal
        isOpen={newPageModalOpen}
        onClose={() => setNewPageModalOpen(false)}
        onCreated={handleCreated}
      />

      {pendingEditPage && (
        <EditModal
          isOpen={true}
          filepath={pendingEditPage.filepath}
          filename={pendingEditPage.filename}
          contentApiBase="/api/pages/content"
          onClose={() => setPendingEditPage(null)}
          onSaved={() => {
            showToast({ type: "success", message: `"${pendingEditPage.title}" saved` });
            setPendingEditPage(null);
          }}
        />
      )}
    </div>
  );
}
