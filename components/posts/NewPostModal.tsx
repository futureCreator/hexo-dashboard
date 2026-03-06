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

const GEN_STEPS = [
  { label: "Fetching source", detail: "Reading the article or URL…" },
  { label: "Analyzing content", detail: "Understanding key points and context…" },
  { label: "Writing post", detail: "Composing your blog post with AI…" },
  { label: "Saving draft", detail: "Almost done, wrapping up…" },
];

function AiGeneratingView({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-6">
      {/* Spinner */}
      <div className="relative w-12 h-12">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[var(--accent)] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-1.5 rounded-full bg-[var(--accent-subtle)]" />
      </div>

      {/* Steps */}
      <div className="w-full flex flex-col gap-2">
        {GEN_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: done ? 0.4 : active ? 1 : 0.25, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="flex items-center gap-3"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                done
                  ? "bg-[var(--accent)] text-white"
                  : active
                  ? "border-2 border-[var(--accent)]"
                  : "border border-[var(--border)]"
              }`}>
                {done ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[var(--accent)]"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : null}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                }`}>{s.label}</span>
                {active && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-[var(--muted-foreground)]"
                  >{s.detail}</motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function clientSlugify(title: string): string {
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Mode = "manual" | "ai";

export default function NewPostModal({ isOpen, onClose, onCreated }: NewPostModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");

  // Manual mode state
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState("");
  const [draft, setDraft] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI mode state
  const [source, setSource] = useState("");
  const [perspective, setPerspective] = useState("");
  const [aiCategory, setAiCategory] = useState("AI");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      setMode("ai");
      setTitle("");
      setTags("");
      setCategories("");
      setDraft(true);
      setIsSubmitting(false);
      setSource("");
      setPerspective("");
      setAiCategory("AI");
      setIsGenerating(false);
      setGenStep(0);
      setTimeout(() => sourceRef.current?.focus(), 50);
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

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "ai") {
      setTimeout(() => sourceRef.current?.focus(), 50);
    } else {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [mode, isOpen]);

  const handleManualSubmit = useCallback(async () => {
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

  const handleAiSubmit = useCallback(async () => {
    if (!source.trim()) return;
    setIsGenerating(true);
    setGenStep(0);

    const stepTimers = [
      setTimeout(() => setGenStep(1), 2500),
      setTimeout(() => setGenStep(2), 6000),
      setTimeout(() => setGenStep(3), 11000),
    ];

    try {
      const res = await fetch("/api/ai-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.trim(), perspective: perspective.trim(), category: aiCategory }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", message: data.error || "Failed to generate post" });
        return;
      }
      showToast({ type: "success", message: `"${data.post.title}" generated and saved as draft` });
      onClose();
      onCreated(data.post);
    } catch (err) {
      showToast({ type: "error", message: String(err) });
    } finally {
      stepTimers.forEach(clearTimeout);
      setIsGenerating(false);
      setGenStep(0);
    }
  }, [source, perspective, onClose, onCreated, showToast]);

  const slug = clientSlugify(title) || (title.trim() ? "untitled" : "");
  const canManualSubmit = title.trim().length > 0 && !isSubmitting;
  const canAiSubmit = source.trim().length > 0 && !isGenerating;

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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

              {/* Mode tabs */}
              <div className="flex border-b border-[var(--border)]">
                {(["manual", "ai"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                      mode === m
                        ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {m === "manual" ? "Manual" : "AI Write"}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="px-5 py-5 flex flex-col gap-4">
                {mode === "manual" ? (
                  <>
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
                        onKeyDown={(e) => { if (e.key === "Enter" && canManualSubmit) handleManualSubmit(); }}
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
                  </>
                ) : isGenerating ? (
                  <AiGeneratingView step={genStep} />
                ) : (
                  <>
                    {/* Source */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                        Source <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        ref={sourceRef}
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="https://example.com/article  or paste text directly"
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 resize-none font-mono"
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">URL or plain text</p>
                    </div>

                    {/* Perspective */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                        My Perspective
                      </label>
                      <textarea
                        value={perspective}
                        onChange={(e) => setPerspective(e.target.value)}
                        placeholder="What's your take on this? Any specific angle you want to highlight?"
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 resize-none"
                      />
                    </div>

                    {/* Category selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                        Category
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {["AI", "Blog", "Engineering", "Cloud", "Insight"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setAiCategory(cat)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                              aiCategory === cat
                                ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                                : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Metadata notice */}
                    <div className="flex gap-3 text-xs text-[var(--muted-foreground)] bg-[var(--accent-subtle)] rounded-lg px-3 py-2.5">
                      <span>Tags: <span className="text-[var(--foreground)]">auto</span></span>
                      <span>·</span>
                      <span>Saved as: <span className="text-[var(--foreground)]">draft</span></span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting || isGenerating}>
                  Cancel
                </Button>
                {mode === "manual" ? (
                  <Button variant="primary" size="sm" onClick={handleManualSubmit} disabled={!canManualSubmit}>
                    {isSubmitting ? "Creating…" : "Create Post"}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleAiSubmit} disabled={!canAiSubmit}>
                    Generate & Create
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
