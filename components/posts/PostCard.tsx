"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DeleteConfirmModal from "./DeleteConfirmModal";
import type { HexoPost } from "@/lib/hexo";

interface PostCardProps {
  post: HexoPost;
  onDeleted: (filepath: string) => void;
  index?: number;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOut, delay: i * 0.04 },
  }),
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostCard({ post, onDeleted, index = 0 }: PostCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: post.filepath }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete post");
        return;
      }
      onDeleted(post.filepath);
    } finally {
      setIsDeleting(false);
      setModalOpen(false);
    }
  }

  return (
    <>
      <motion.div
        custom={index}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="group flex items-start gap-4 px-4 py-3.5 rounded-lg hover:bg-[var(--muted)] transition-colors duration-150"
      >
        {/* Status badge — fixed width column */}
        <div className="pt-0.5 shrink-0 w-[78px] flex justify-end">
          <Badge variant={post.draft ? "draft" : "published"}>
            {post.draft ? "Draft" : "Published"}
          </Badge>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors duration-150">
            {post.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              {post.filename}
            </span>
            <span className="text-[var(--border)] text-xs">·</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatDate(post.date)}
            </span>
            {post.categories.map((cat) => (
              <Badge key={cat} variant="category">
                {cat}
              </Badge>
            ))}
            {post.tags.map((tag) => (
              <Badge key={tag} variant="tag">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Delete button */}
        <div className="shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </Button>
        </div>
      </motion.div>

      <DeleteConfirmModal
        isOpen={modalOpen}
        title={post.title}
        onConfirm={handleDelete}
        onCancel={() => setModalOpen(false)}
        isDeleting={isDeleting}
      />
    </>
  );
}
