"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { HexoPost } from "@/lib/hexo";

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (post: HexoPost) => void;
}

function clientSlugify(title: string): string {
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewPostModal({ isOpen, onClose, onCreated }: NewPostModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState("");
  const [draft, setDraft] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form and focus on open
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setTags("");
      setCategories("");
      setDraft(true);
      setIsSubmitting(false);
      // Delay focus to after animation
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          categories: categories.split(",").map((c) => c.trim()).filter(Boolean),
          draft,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", message: data.error || "Failed to create post" });
        return;
      }
      showToast({ type: "success", message: `"${title.trim()}" created` });
      onClose();
      onCreated(data.post);
    } catch (err) {
      showToast({ type: "error", message: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, tags, categories, draft, onClose, onCreated, showToast]);

  const slug = clientSlugify(title) || (title.trim() ? "untitled" : "");
  const canSubmit = title.trim().length > 0 && !isSubmitting;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_24px_40px_rgba(0,0,0,0.15)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-[var(--muted-foreground)] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm font-medium text-[var(--foreground)]">New Post</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={titleRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSubmit) handleSubmit();
                    }}
                    placeholder="My new post"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                  />
                  {slug && (
                    <p className="text-xs text-[var(--muted-foreground)] font-mono">
                      <span className="opacity-50">slug: </span>{slug}.md
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Categories
                  </label>
                  <input
                    type="text"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    placeholder="category1, category2"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Draft toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Draft</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {draft ? "Saved to _drafts" : "Saved to _posts"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft((d) => !d)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                      draft ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        draft ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? "Creating…" : "Create Post"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
