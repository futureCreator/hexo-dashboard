"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { HexoPage } from "@/lib/hexo";

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (page: HexoPage) => void;
}

function clientSlugify(value: string): string {
  return value
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewPageModal({ isOpen, onClose, onCreated }: NewPageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setSlugOverride("");
      setIsSubmitting(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const derivedSlug = slugOverride || clientSlugify(title) || (title.trim() ? "untitled" : "");

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !derivedSlug) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), slug: derivedSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", message: data.error || "Failed to create page" });
        return;
      }
      showToast({ type: "success", message: `"${title.trim()}" created` });
      onClose();
      onCreated(data.page);
    } catch (err) {
      showToast({ type: "error", message: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, derivedSlug, onClose, onCreated, showToast]);

  const canSubmit = title.trim().length > 0 && derivedSlug.length > 0 && !isSubmitting;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

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
                  <svg className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-[var(--foreground)]">New Page</span>
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
                    onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
                    placeholder="About"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Slug */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Slug (directory name)
                  </label>
                  <input
                    type="text"
                    value={slugOverride}
                    onChange={(e) => setSlugOverride(clientSlugify(e.target.value))}
                    placeholder={clientSlugify(title) || "about"}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] font-mono placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                  />
                  {derivedSlug && (
                    <p className="text-xs text-[var(--muted-foreground)] font-mono">
                      <span className="opacity-50">path: </span>source/{derivedSlug}/index.md
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
                  {isSubmitting ? "Creating…" : "Create Page"}
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
