"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DeleteConfirmModal from "./DeleteConfirmModal";
import EditModal from "./EditModal";
import { useToast } from "@/components/ui/Toast";
import type { HexoPost, SiteConfig } from "@/lib/hexo";

interface PostCardProps {
  post: HexoPost;
  onDeleted: (filepath: string) => void;
  onUpdated: (post: HexoPost, oldFilepath?: string) => void;
  index?: number;
  siteConfig?: SiteConfig;
}

function buildPostUrl(siteConfig: SiteConfig, post: HexoPost): string {
  if (!siteConfig.url || post.draft) return "";
  const date = post.date ? new Date(post.date) : null;
  const slug = siteConfig.permalink
    .replace(/:abbrlink/g, post.abbrlink != null ? String(post.abbrlink) : "")
    .replace(/:year/g, date ? String(date.getUTCFullYear()) : "")
    .replace(/:month/g, date ? String(date.getUTCMonth() + 1).padStart(2, "0") : "")
    .replace(/:day/g, date ? String(date.getUTCDate()).padStart(2, "0") : "")
    .replace(/:title/g, post.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""))
    .replace(/:filename/g, post.filename.replace(/\.md$/, ""));
  return `${siteConfig.url}/${slug}`.replace(/([^:])\/\//g, "$1/");
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

export default function PostCard({
  post,
  onDeleted,
  onUpdated,
  index = 0,
  siteConfig,
}: PostCardProps) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("No date");

  useEffect(() => {
    if (!post.date) return;
    const d = new Date(post.date);
    setFormattedDate(
      d.toLocaleDateString(navigator.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }, [post.date]);

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
        showToast({ type: "error", message: data.error || "Failed to delete post" });
        return;
      }
      onDeleted(post.filepath);
    } finally {
      setIsDeleting(false);
      setModalOpen(false);
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    const oldFilepath = post.filepath;
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: oldFilepath }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", message: data.error || "Failed to toggle draft status" });
        return;
      }
      onUpdated(data.post, oldFilepath);
      showToast({
        type: "success",
        message: data.post.draft
          ? `Moved "${post.title}" to Drafts`
          : `Published "${post.title}"`,
      });
    } finally {
      setIsToggling(false);
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
          {siteConfig && buildPostUrl(siteConfig, post) ? (
            <a
              href={buildPostUrl(siteConfig, post)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium font-kopub text-[var(--foreground)] leading-snug hover:text-[var(--accent)] transition-colors duration-150 inline-flex items-center gap-1 group/link"
              onClick={(e) => e.stopPropagation()}
            >
              {post.title}
              <svg className="w-3 h-3 opacity-0 group-hover/link:opacity-60 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <p className="text-sm font-medium font-kopub text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors duration-150">
              {post.title}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              {post.filename}
            </span>
            <span className="text-[var(--border)] text-xs">·</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {formattedDate}
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

        {/* Action buttons — always visible on mobile, hover-only on desktop */}
        <div className="shrink-0 pt-0.5 flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
          {/* Edit */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            title="Edit file"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="hidden sm:inline">Edit</span>
          </Button>

          {/* Toggle Draft/Published */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={isToggling}
            title={post.draft ? "Publish post" : "Move to drafts"}
          >
            {post.draft ? (
              <>
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span className="hidden sm:inline">Publish</span>
              </>
            ) : (
              <>
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
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
                <span className="hidden sm:inline">Draft</span>
              </>
            )}
          </Button>

          {/* Delete */}
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
            <span className="hidden sm:inline">Delete</span>
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

      <EditModal
        isOpen={editModalOpen}
        filepath={post.filepath}
        filename={post.filename}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => showToast({ type: "success", message: `"${post.title}" saved` })}
      />
    </>
  );
}
