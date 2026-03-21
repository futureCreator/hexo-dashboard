"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";
import type { HexoPost } from "@/lib/hexo";

// ─── Public interface ──────────────────────────────────────────────────────────

export interface WriteFormState {
  canSubmit: boolean;
  isGenerating: boolean;
}

export interface WriteFormHandle {
  submit: () => void;
}

interface WriteFormProps {
  onCreated: (post: HexoPost) => void;
  onStateChange?: (state: WriteFormState) => void;
}

// ─── Constants & helpers ───────────────────────────────────────────────────────

const GEN_STEPS = [
  { label: "Fetching sources", detail: "Reading articles and URLs in parallel…" },
  { label: "Analyzing content", detail: "Understanding key points and context…" },
  { label: "Writing post", detail: "Composing your blog post with AI…" },
  { label: "Saving draft", detail: "Almost done, wrapping up…" },
];

const OPINION_GEN_STEPS = [
  { label: "관련 자료 검색 중", detail: "Perplexity로 객관적 자료를 찾고 있습니다…" },
  { label: "자료 분석 중", detail: "수집한 자료를 분석하고 있습니다…" },
  { label: "글 작성 중", detail: "의견과 자료를 합쳐 글을 작성하고 있습니다…" },
  { label: "저장 중", detail: "거의 다 됐습니다…" },
];

function AiGeneratingView({ step, steps }: { step: number; steps: { label: string; detail: string }[] }) {
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
        {steps.map((s, i) => {
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
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  done
                    ? "bg-[var(--accent)] text-white"
                    : active
                    ? "border-2 border-[var(--accent)]"
                    : "border border-[var(--border)]"
                }`}
              >
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
                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {s.label}
                </span>
                {active && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-[var(--muted-foreground)]"
                  >
                    {s.detail}
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

type Mode = "source" | "opinion";

// ─── WriteForm ─────────────────────────────────────────────────────────────────

const WriteForm = forwardRef<WriteFormHandle, WriteFormProps>(function WriteForm(
  { onCreated, onStateChange },
  ref
) {
  const [mode, setMode] = useState<Mode>("source");

  // Source mode state
  const [sources, setSources] = useState<string[]>([""]);
  const [perspective, setPerspective] = useState("");
  const [aiCategory, setAiCategory] = useState("AI");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  // Opinion mode state
  const [opinion, setOpinion] = useState("");
  const [opinionCategory, setOpinionCategory] = useState("AI");
  const [opinionSelectedRefs, setOpinionSelectedRefs] = useState<string[]>([]);
  const [isOpinionGenerating, setIsOpinionGenerating] = useState(false);
  const [opinionGenStep, setOpinionGenStep] = useState(0);
  const [opinionRefSearch, setOpinionRefSearch] = useState("");

  // Reference posts state
  const [allPosts, setAllPosts] = useState<HexoPost[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [refSearch, setRefSearch] = useState("");

  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const opinionRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Load posts list on mount
  useEffect(() => {
    fetch(apiUrl("/api/posts"))
      .then((r) => r.json())
      .then((d) => {
        if (d.posts) setAllPosts(d.posts);
      })
      .catch(() => {});
  }, []);

  // Focus management when mode changes
  useEffect(() => {
    if (mode === "source") {
      setTimeout(() => sourceRef.current?.focus(), 50);
    } else {
      setTimeout(() => opinionRef.current?.focus(), 50);
    }
  }, [mode]);

  // Computed
  const canSourceSubmit = sources.some((s) => s.trim().length > 0) && !isGenerating;
  const canOpinionSubmit = opinion.trim().length >= 50 && !isOpinionGenerating;
  const isAnyGenerating = isGenerating || isOpinionGenerating;

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({
      canSubmit: mode === "source" ? canSourceSubmit : canOpinionSubmit,
      isGenerating: isAnyGenerating,
    });
  }, [canSourceSubmit, canOpinionSubmit, isAnyGenerating, mode, onStateChange]);

  const handleAiSubmit = useCallback(async () => {
    const validSources = sources.filter((s) => s.trim());
    if (validSources.length === 0) return;
    setIsGenerating(true);
    setGenStep(0);

    const stepTimers = [
      setTimeout(() => setGenStep(1), 2500),
      setTimeout(() => setGenStep(2), 6000),
      setTimeout(() => setGenStep(3), 11000),
    ];

    try {
      const res = await fetch(apiUrl("/api/ai-write"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: validSources,
          perspective: perspective.trim(),
          category: aiCategory,
          referencePosts: selectedRefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", message: data.error || "Failed to generate post" });
        return;
      }
      showToast({ type: "success", message: `"${data.post.title}" generated and saved as draft` });
      onCreated(data.post);
    } catch (err) {
      showToast({ type: "error", message: String(err) });
    } finally {
      stepTimers.forEach(clearTimeout);
      setIsGenerating(false);
      setGenStep(0);
    }
  }, [sources, perspective, aiCategory, selectedRefs, onCreated, showToast]);

  const handleOpinionSubmit = useCallback(async () => {
    if (opinion.trim().length < 50) return;
    setIsOpinionGenerating(true);
    setOpinionGenStep(0);

    const stepTimers = [
      setTimeout(() => setOpinionGenStep(1), 5000),
      setTimeout(() => setOpinionGenStep(2), 10000),
    ];

    try {
      const res = await fetch(apiUrl("/api/ai-write-opinion"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opinion: opinion.trim(),
          category: opinionCategory,
          referencePosts: opinionSelectedRefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", message: data.error || "Failed to generate post" });
        return;
      }
      setOpinionGenStep(3); // "저장 중" — triggered on API response, not timer
      showToast({ type: "success", message: `"${data.post.title}" 생성 완료, 드래프트로 저장됨` });
      onCreated(data.post);
    } catch (err) {
      showToast({ type: "error", message: String(err) });
    } finally {
      stepTimers.forEach(clearTimeout);
      setIsOpinionGenerating(false);
      setOpinionGenStep(0);
    }
  }, [opinion, opinionCategory, opinionSelectedRefs, onCreated, showToast]);

  // Expose submit via ref
  useImperativeHandle(
    ref,
    () => ({
      submit: mode === "source" ? handleAiSubmit : handleOpinionSubmit,
    }),
    [mode, handleAiSubmit, handleOpinionSubmit]
  );

  return (
    <div className="flex flex-col">
      {/* Mode tabs */}
      <div className="flex border-b border-[var(--border)]">
        {([
          { key: "source" as Mode, label: "소스 기반" },
          { key: "opinion" as Mode, label: "의견 기반" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
              mode === tab.key
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form body */}
      <div className="px-5 py-5 flex flex-col gap-4">
        {mode === "source" ? (
          isGenerating ? (
            <AiGeneratingView step={genStep} steps={GEN_STEPS} />
          ) : (
            <>
              {/* Sources */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  Sources <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {sources.map((src, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <textarea
                        ref={idx === 0 ? sourceRef : undefined}
                        value={src}
                        onChange={(e) => {
                          const next = [...sources];
                          next[idx] = e.target.value;
                          setSources(next);
                        }}
                        placeholder={
                          idx === 0
                            ? "https://example.com/article  or paste text directly"
                            : "https://... or paste text"
                        }
                        rows={2}
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 resize-none font-mono"
                      />
                      {sources.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSources(sources.filter((_, i) => i !== idx))}
                          className="w-7 h-7 mt-1 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {sources.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setSources([...sources, ""])}
                    className="self-start flex items-center gap-1.5 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity cursor-pointer mt-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add source
                  </button>
                )}
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

              {/* Reference Posts */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  Reference Posts
                  {selectedRefs.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] normal-case font-semibold">
                      {selectedRefs.length}
                    </span>
                  )}
                </label>
                <div className="flex flex-col gap-1.5 border border-[var(--border)] rounded-lg overflow-hidden">
                  <div className="px-2.5 pt-2.5">
                    <input
                      type="text"
                      value={refSearch}
                      onChange={(e) => setRefSearch(e.target.value)}
                      placeholder="Search posts…"
                      className="w-full h-8 px-2.5 rounded-md border border-[var(--border)] bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto px-1 pb-1.5">
                    {allPosts
                      .filter((p) => {
                        if (refSearch === "") return true;
                        const q = refSearch.toLowerCase();
                        return (
                          p.title.toLowerCase().includes(q) ||
                          p.content.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 30)
                      .map((p) => {
                        const checked = selectedRefs.includes(p.filepath);
                        return (
                          <button
                            key={p.filepath}
                            type="button"
                            onClick={() => {
                              if (checked) {
                                setSelectedRefs(selectedRefs.filter((f) => f !== p.filepath));
                              } else if (selectedRefs.length < 3) {
                                setSelectedRefs([...selectedRefs, p.filepath]);
                              }
                            }}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                              checked
                                ? "bg-[var(--accent-subtle)]"
                                : selectedRefs.length >= 3
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[var(--muted)]"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                checked
                                  ? "bg-[var(--accent)] border-[var(--accent)]"
                                  : "border-[var(--border)]"
                              }`}
                            >
                              {checked && (
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs text-[var(--foreground)] truncate flex-1">
                              {p.title}
                            </span>
                            {p.date && (
                              <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                                {new Date(p.date).toLocaleDateString("ko-KR", {
                                  year: "2-digit",
                                  month: "numeric",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    {allPosts.filter((p) => {
                      if (refSearch === "") return true;
                      const q = refSearch.toLowerCase();
                      return (
                        p.title.toLowerCase().includes(q) ||
                        p.content.toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <p className="text-xs text-[var(--muted-foreground)] px-2 py-2">
                        No posts found
                      </p>
                    )}
                  </div>
                  {selectedRefs.length >= 3 && (
                    <p className="text-xs text-[var(--muted-foreground)] px-3 pb-2">
                      Max 3 reference posts
                    </p>
                  )}
                </div>
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
                <span>
                  Tags: <span className="text-[var(--foreground)]">auto</span>
                </span>
                <span>·</span>
                <span>
                  Saved as: <span className="text-[var(--foreground)]">draft</span>
                </span>
              </div>
            </>
          )
        ) : isOpinionGenerating ? (
          <AiGeneratingView step={opinionGenStep} steps={OPINION_GEN_STEPS} />
        ) : (
          <>
            {/* Opinion textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                내 의견 <span className="text-red-400">*</span>
              </label>
              <textarea
                ref={opinionRef}
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                placeholder="내 생각이나 의견을 자유롭게 작성하세요..."
                rows={6}
                maxLength={5000}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 resize-none"
              />
              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                <span>
                  {opinion.trim().length < 50
                    ? `최소 50자 (현재 ${opinion.trim().length}자)`
                    : `${opinion.trim().length}자`}
                </span>
                <span>{opinion.length} / 5000</span>
              </div>
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
                    onClick={() => setOpinionCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      opinionCategory === cat
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Posts */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Reference Posts
                {opinionSelectedRefs.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] normal-case font-semibold">
                    {opinionSelectedRefs.length}
                  </span>
                )}
              </label>
              <div className="flex flex-col gap-1.5 border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-2.5 pt-2.5">
                  <input
                    type="text"
                    value={opinionRefSearch}
                    onChange={(e) => setOpinionRefSearch(e.target.value)}
                    placeholder="Search posts…"
                    className="w-full h-8 px-2.5 rounded-md border border-[var(--border)] bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto px-1 pb-1.5">
                  {allPosts
                    .filter((p) => {
                      if (opinionRefSearch === "") return true;
                      const q = opinionRefSearch.toLowerCase();
                      return (
                        p.title.toLowerCase().includes(q) ||
                        p.content.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 30)
                    .map((p) => {
                      const checked = opinionSelectedRefs.includes(p.filepath);
                      return (
                        <button
                          key={p.filepath}
                          type="button"
                          onClick={() => {
                            if (checked) {
                              setOpinionSelectedRefs(opinionSelectedRefs.filter((f) => f !== p.filepath));
                            } else if (opinionSelectedRefs.length < 3) {
                              setOpinionSelectedRefs([...opinionSelectedRefs, p.filepath]);
                            }
                          }}
                          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            checked
                              ? "bg-[var(--accent-subtle)]"
                              : opinionSelectedRefs.length >= 3
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-[var(--muted)]"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                              checked
                                ? "bg-[var(--accent)] border-[var(--accent)]"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {checked && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-xs text-[var(--foreground)] truncate flex-1">
                            {p.title}
                          </span>
                          {p.date && (
                            <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                              {new Date(p.date).toLocaleDateString("ko-KR", {
                                year: "2-digit",
                                month: "numeric",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  {allPosts.filter((p) => {
                    if (opinionRefSearch === "") return true;
                    const q = opinionRefSearch.toLowerCase();
                    return (
                      p.title.toLowerCase().includes(q) ||
                      p.content.toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <p className="text-xs text-[var(--muted-foreground)] px-2 py-2">
                      No posts found
                    </p>
                  )}
                </div>
                {opinionSelectedRefs.length >= 3 && (
                  <p className="text-xs text-[var(--muted-foreground)] px-3 pb-2">
                    Max 3 reference posts
                  </p>
                )}
              </div>
            </div>

            {/* Metadata notice */}
            <div className="flex gap-3 text-xs text-[var(--muted-foreground)] bg-[var(--accent-subtle)] rounded-lg px-3 py-2.5">
              <span>
                Tags: <span className="text-[var(--foreground)]">auto</span>
              </span>
              <span>·</span>
              <span>
                Saved as: <span className="text-[var(--foreground)]">draft</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default WriteForm;
