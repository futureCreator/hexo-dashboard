"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import DeleteConfirmModal from "./DeleteConfirmModal";
import EditModal from "./EditModal";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";
import type { HexoPost, SiteConfig } from "@/lib/hexo";

interface PostCardProps {
  post: HexoPost;
  onDeleted: (filepath: string) => void;
  onUpdated: (post: HexoPost, oldFilepath?: string) => void;
  index?: number;
  siteConfig?: SiteConfig;
  isLast?: boolean;
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
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut, delay: Math.min(i * 0.03, 0.3) },
  }),
};

export default function PostCard({
  post,
  onDeleted,
  onUpdated,
  index = 0,
  siteConfig,
  isLast = false,
}: PostCardProps) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("No date");
  const [referencedBy, setReferencedBy] = useState<{ filename: string; title: string }[] | undefined>(undefined);
  const [isCheckingRefs, setIsCheckingRefs] = useState(false);

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

  async function openDeleteModal() {
    setReferencedBy(undefined);
    setModalOpen(true);
    setIsCheckingRefs(true);
    try {
      const slug = post.filename.replace(/\.md$/, "");
      const res = await fetch(apiUrl(`/api/posts?refs=${encodeURIComponent(slug)}`));
      if (res.ok) {
        const data = await res.json();
        setReferencedBy(data.refs ?? []);
      }
    } finally {
      setIsCheckingRefs(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(apiUrl("/api/posts"), {
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
      const res = await fetch(apiUrl("/api/posts"), {
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

  const postUrl = siteConfig ? buildPostUrl(siteConfig, post) : "";

  return (
    <>
      <motion.div
        custom={index}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className={`group flex items-stretch gap-0 transition-colors duration-100 active:bg-[var(--muted)] hover:bg-[var(--background)] ${
          !isLast ? "border-b border-[var(--border)]" : ""
        }`}
      >
        {/* Status indicator strip */}
        <div className={`w-[3px] shrink-0 my-[10px] rounded-r-full ${post.draft ? "bg-amber-400" : "bg-[var(--success)]"}`} />

        {/* Main content — tap to edit */}
        <button
          className="flex-1 min-w-0 text-left px-4 py-3.5 cursor-pointer"
          onClick={() => setEditModalOpen(true)}
        >
          <div className="flex items-start gap-2 mb-1">
            <p className="text-[15px] font-medium font-kopub text-[var(--foreground)] leading-snug flex-1 min-w-0 text-left">
              {post.title}
            </p>
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 mt-0.5 text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
                title="Open live post"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[12px] text-[var(--muted-foreground)]">{formattedDate}</span>
            {post.draft && (
              <span className="inline-flex items-center px-1.5 py-px rounded-[5px] text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 leading-none">
                Draft
              </span>
            )}
            {post.categories.map((cat) => (
              <Badge key={cat} variant="category">{cat}</Badge>
            ))}
            {post.content.length > 0 && (
              <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                {post.content.length.toLocaleString()}자
              </span>
            )}
          </div>
        </button>

        {/* Action buttons — always visible, 44px touch targets */}
        <div className="shrink-0 flex items-center pr-3 gap-1">
          {/* Toggle Draft/Published */}
          <button
            onClick={handleToggle}
            disabled={isToggling}
            title={post.draft ? "Publish" : "Move to drafts"}
            className="flex items-center justify-center w-[36px] h-[44px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] active:scale-95 transition-all duration-100 disabled:opacity-40"
          >
            {post.draft ? (
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>

          {/* Delete */}
          <button
            onClick={openDeleteModal}
            title="Delete"
            className="flex items-center justify-center w-[36px] h-[44px] text-[var(--error)]/60 hover:text-[var(--error)] active:scale-95 transition-all duration-100"
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </motion.div>

      <DeleteConfirmModal
        isOpen={modalOpen}
        title={post.title}
        onConfirm={handleDelete}
        onCancel={() => setModalOpen(false)}
        isDeleting={isDeleting}
        referencedBy={referencedBy}
        isCheckingRefs={isCheckingRefs}
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
