"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PostCard from "./PostCard";
import type { HexoPost } from "@/lib/hexo";

type FilterType = "all" | "published" | "draft";

interface PostListProps {
  initialPosts: HexoPost[];
}

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function PostList({ initialPosts }: PostListProps) {
  const [posts, setPosts] = useState<HexoPost[]>(initialPosts);
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = posts.filter((p) => {
    if (filter === "all") return true;
    if (filter === "published") return !p.draft;
    if (filter === "draft") return p.draft;
    return true;
  });

  const published = posts.filter((p) => !p.draft).length;
  const drafts = posts.filter((p) => p.draft).length;

  function handleDeleted(filepath: string) {
    setPosts((prev) => prev.filter((p) => p.filepath !== filepath));
  }

  const filterBtns: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: posts.length },
    { key: "published", label: "Published", count: published },
    { key: "draft", label: "Drafts", count: drafts },
  ];

  return (
    <div>
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { label: "Total Posts", value: posts.length },
          { label: "Published", value: published },
          { label: "Drafts", value: drafts },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--foreground)] rounded-xl p-5 relative overflow-hidden"
          >
            {/* dot pattern texture */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative">
              <div className="text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-white/60 font-mono uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2 mb-6"
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
      </motion.div>

      {/* Post list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-[var(--muted-foreground)]"
        >
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">No posts found.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {filtered.map((post, i) => (
            <PostCard
              key={post.filepath}
              post={post}
              onDeleted={handleDeleted}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
