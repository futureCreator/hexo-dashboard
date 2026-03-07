"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1] as const;

interface Insight {
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
  metric?: string;
}

interface WritingCoachData {
  insights: Insight[];
  generatedAt: string;
}

export default function WritingCoachCard() {
  const [data, setData] = useState<WritingCoachData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch("/api/ai-writing-coach");
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch {
      setError("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reanalyze = useCallback(() => {
    setData(null);
    analyze();
  }, [analyze]);

  const insightColors = {
    positive: {
      wrap: "bg-emerald-500/8 border-emerald-500/20",
      icon: "bg-emerald-500/12 text-emerald-500",
      metric: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    warning: {
      wrap: "bg-amber-500/8 border-amber-500/20",
      icon: "bg-amber-500/12 text-amber-500",
      metric: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    info: {
      wrap: "bg-[var(--accent-subtle)] border-[var(--accent)]/15",
      icon: "bg-[var(--accent-subtle)] text-[var(--accent)]",
      metric: "bg-[var(--accent-subtle)] text-[var(--accent)]",
    },
  } as const;

  const InsightIcon = ({ type }: { type: Insight["type"] }) => {
    if (type === "positive") return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
    if (type === "warning") return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
      </svg>
    );
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M12 14h.01M12 10h.01M12 6h.01" />
      </svg>
    );
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_2px_6px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">AI 라이팅 코치</p>
            {data && (
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {new Date(data.generatedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} 분석
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {data && (
            <button
              onClick={reanalyze}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-200 disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              재분석
            </button>
          )}
          {!open ? (
            <button
              onClick={analyze}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
              분석 시작
            </button>
          ) : (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-200"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {open ? "접기" : "펼치기"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[var(--border)] pt-4 space-y-3">
              {/* Loading */}
              {loading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-[var(--border)] p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[var(--muted)] shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-[var(--muted)] rounded w-2/5" />
                          <div className="h-3 bg-[var(--muted)] rounded w-4/5" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-xs text-[var(--muted-foreground)] pt-1">글 패턴을 분석하는 중…</p>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-4 flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
                  <button
                    onClick={analyze}
                    className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                  >
                    재시도
                  </button>
                </div>
              )}

              {/* Insights */}
              {!loading && data && data.insights.map((insight, i) => {
                const c = insightColors[insight.type];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: easeOut, delay: i * 0.06 }}
                    className={`rounded-xl border p-4 flex items-start gap-3 ${c.wrap}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${c.icon}`}>
                      <InsightIcon type={insight.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-[var(--foreground)] leading-snug">{insight.title}</p>
                        {insight.metric && (
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${c.metric}`}>
                            {insight.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{insight.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
