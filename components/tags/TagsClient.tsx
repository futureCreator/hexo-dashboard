"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/Skeleton";

const WordCloud = dynamic(() => import("react-d3-cloud"), { ssr: false });

const easeOut = [0.16, 1, 0.3, 1] as const;

interface TagItem {
  name: string;
  count: number;
}

type SortBy = "count" | "alpha";

function lerp(min: number, max: number, t: number) {
  return min + (max - min) * t;
}


export default function TagsClient() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("count");
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load tags");
        return;
      }
      setTags(data.tags ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const sortedTags = [...tags].sort((a, b) =>
    sortBy === "count" ? b.count - a.count : a.name.localeCompare(b.name)
  );

  const minCount = tags.length ? Math.min(...tags.map((t) => t.count)) : 1;
  const maxCount = tags.length ? Math.max(...tags.map((t) => t.count)) : 1;
  const totalUses = tags.reduce((s, t) => s + t.count, 0);
  const topTag = tags[0];

  function startRename(name: string) {
    setRenamingTag(name);
    setRenameValue(name);
    setDeletingTag(null);
  }

  function cancelRename() {
    setRenamingTag(null);
    setRenameValue("");
  }

  async function saveRename() {
    if (!renamingTag || !renameValue.trim() || renameValue.trim() === renamingTag) {
      cancelRename();
      return;
    }
    setRenameSaving(true);
    try {
      const res = await fetch("/api/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldTag: renamingTag, newTag: renameValue.trim() }),
      });
      if (res.ok) {
        cancelRename();
        await fetchTags();
      }
    } finally {
      setRenameSaving(false);
    }
  }

  function startDelete(name: string) {
    setDeletingTag(name);
    setRenamingTag(null);
  }

  function cancelDelete() {
    setDeletingTag(null);
  }

  async function confirmDelete() {
    if (!deletingTag) return;
    setDeleteConfirming(true);
    try {
      const res = await fetch("/api/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: deletingTag }),
      });
      if (res.ok) {
        setDeletingTag(null);
        await fetchTags();
      }
    } finally {
      setDeleteConfirming(false);
    }
  }

  function handleCloudTagClick(name: string) {
    setHighlightedTag(name);
    const el = document.getElementById(`tag-row-${name}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightedTag(null), 1800);
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-5 sm:px-8 sm:py-8 max-w-4xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="mb-5"
        >
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--foreground)] leading-tight tracking-[-0.5px]">
            Tag <span className="gradient-text">Manager</span>
          </h1>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4">
                  <Skeleton className="h-3 w-16 mb-3" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ))}
            </div>
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
              <Skeleton className="h-4 w-24 mb-4" />
              <div className="flex flex-wrap gap-2">
                {["w-12", "w-16", "w-10", "w-20", "w-14", "w-8", "w-16", "w-12", "w-24", "w-10", "w-18", "w-14"].map((w, i) => (
                  <Skeleton key={i} className={`h-7 rounded-full ${w}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-8 text-center"
          >
            <p className="text-[14px] text-[var(--error)] font-mono">{error}</p>
          </motion.div>
        )}

        {/* Empty */}
        {!loading && !error && tags.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-12 text-center"
          >
            <div className="w-14 h-14 rounded-[16px] bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-[var(--foreground)] mb-1">태그가 없습니다</h2>
            <p className="text-[14px] text-[var(--muted-foreground)]">포스트에 태그를 추가하면 여기에 표시됩니다.</p>
          </motion.div>
        )}

        {/* Content */}
        {!loading && !error && tags.length > 0 && (
          <div className="space-y-4">

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOut, delay: 0.04 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { label: "전체 태그", value: tags.length.toString() },
                { label: "총 사용 횟수", value: totalUses.toLocaleString() },
                { label: "최다 사용 태그", value: topTag?.name ?? "-" },
              ].map((s) => (
                <div key={s.label} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
                  <p className="text-[12px] text-[var(--muted-foreground)] mb-1.5">{s.label}</p>
                  <p className="text-[20px] font-semibold text-[var(--foreground)] leading-none truncate">{s.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Tag Cloud */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOut, delay: 0.1 }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5 overflow-hidden"
            >
              <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-2">태그 클라우드</h2>
              <WordCloud
                data={tags.map((t) => ({ text: t.name, value: t.count }))}
                width={680}
                height={260}
                font="Inter, sans-serif"
                fontWeight="600"
                fontSize={(word) => {
                  const t = maxCount === minCount ? 1 : (word.value - minCount) / (maxCount - minCount);
                  return Math.round(lerp(14, 52, t));
                }}
                rotate={0}
                padding={4}
                fill={(_word: unknown, i: number) => {
                  const palette = [
                    "var(--accent)",
                    "#7C86FF",
                    "#34C88A",
                    "#F59E0B",
                    "#EF6C6C",
                    "#A78BFA",
                    "#22D3EE",
                  ];
                  return palette[i % palette.length];
                }}
                onWordClick={(_e, word) => handleCloudTagClick(word.text)}
              />
            </motion.div>

            {/* Tag List */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOut, delay: 0.18 }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] overflow-hidden"
            >
              {/* List header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
                  태그 목록 <span className="text-[var(--muted-foreground)] font-normal">({tags.length})</span>
                </h2>
                <div className="segmented-control">
                  <button
                    onClick={() => setSortBy("count")}
                    className={`segmented-control-item px-3 ${sortBy === "count" ? "active" : ""}`}
                  >
                    사용 빈도
                  </button>
                  <button
                    onClick={() => setSortBy("alpha")}
                    className={`segmented-control-item px-3 ${sortBy === "alpha" ? "active" : ""}`}
                  >
                    알파벳
                  </button>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[var(--border)]">
                {sortedTags.map((tag, idx) => {
                  const isRenaming = renamingTag === tag.name;
                  const isDeleting = deletingTag === tag.name;
                  const isHighlighted = highlightedTag === tag.name;
                  const barWidth = maxCount > 0 ? (tag.count / maxCount) * 100 : 0;

                  return (
                    <motion.div
                      key={tag.name}
                      id={`tag-row-${tag.name}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, backgroundColor: isHighlighted ? "var(--accent-subtle)" : "transparent" }}
                      transition={{ duration: 0.3, ease: easeOut, delay: idx < 20 ? idx * 0.015 : 0 }}
                      className="flex items-center gap-3 px-5 py-3 transition-colors duration-300"
                    >
                      {/* Rank */}
                      <span className="w-6 text-[12px] text-[var(--muted-foreground)] tabular-nums shrink-0">
                        {idx + 1}
                      </span>

                      {/* Tag name + rename input */}
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename();
                                if (e.key === "Escape") cancelRename();
                              }}
                              className="w-full max-w-[200px] px-2.5 py-1 rounded-[8px] border border-[var(--accent)] bg-[var(--background)] text-[13px] text-[var(--foreground)] font-medium focus:outline-none"
                            />
                            <button
                              onClick={saveRename}
                              disabled={renameSaving || !renameValue.trim()}
                              className="px-3 h-[28px] rounded-[7px] bg-[var(--accent)] text-white text-[12px] font-medium disabled:opacity-40 hover:brightness-110 transition-all"
                            >
                              {renameSaving ? "…" : "저장"}
                            </button>
                            <button
                              onClick={cancelRename}
                              className="px-3 h-[28px] rounded-[7px] border border-[var(--border)] text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <span className="text-[13px] font-medium text-[var(--foreground)] truncate block">
                            {tag.name}
                          </span>
                        )}
                      </div>

                      {/* Count bar */}
                      {!isRenaming && (
                        <div className="flex items-center gap-2.5 w-[120px] shrink-0">
                          <div className="flex-1 h-[4px] rounded-full bg-[var(--muted)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                              style={{ width: `${barWidth}%`, opacity: 0.7 }}
                            />
                          </div>
                          <span className="text-[12px] tabular-nums text-[var(--muted-foreground)] w-6 text-right shrink-0">
                            {tag.count}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      {!isRenaming && (
                        <div className="flex items-center gap-1 shrink-0">
                          <AnimatePresence mode="wait">
                            {isDeleting ? (
                              <motion.div
                                key="confirm"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-1.5"
                              >
                                <span className="text-[12px] text-[var(--error)] font-medium">삭제할까요?</span>
                                <button
                                  onClick={confirmDelete}
                                  disabled={deleteConfirming}
                                  className="px-2.5 h-[26px] rounded-[6px] bg-[var(--error)] text-white text-[12px] font-medium disabled:opacity-40 hover:brightness-110 transition-all"
                                >
                                  {deleteConfirming ? "…" : "삭제"}
                                </button>
                                <button
                                  onClick={cancelDelete}
                                  className="px-2.5 h-[26px] rounded-[6px] border border-[var(--border)] text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                                >
                                  취소
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="btns"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                className="flex items-center gap-1"
                              >
                                {/* Rename button */}
                                <button
                                  onClick={() => startRename(tag.name)}
                                  className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-150"
                                  title="이름 변경"
                                >
                                  <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                {/* Delete button */}
                                <button
                                  onClick={() => startDelete(tag.name)}
                                  className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--error)] hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150"
                                  title="삭제"
                                >
                                  <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
