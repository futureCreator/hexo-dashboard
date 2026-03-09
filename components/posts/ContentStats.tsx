"use client";

import { useMemo, useState } from "react";
import { analyzeContent } from "@/lib/content-stats";

interface ContentStatsProps {
  content: string;
}

const levelColor: Record<string, string> = {
  "very-easy": "var(--color-green, #22c55e)",
  easy: "var(--color-green, #22c55e)",
  medium: "var(--color-yellow, #eab308)",
  hard: "var(--color-orange, #f97316)",
  "very-hard": "var(--color-red, #ef4444)",
};

function seoColor(score: number) {
  if (score >= 75) return "var(--color-green, #22c55e)";
  if (score >= 50) return "var(--color-yellow, #eab308)";
  if (score >= 25) return "var(--color-orange, #f97316)";
  return "var(--color-red, #ef4444)";
}

export default function ContentStats({ content }: ContentStatsProps) {
  const [showSEODetail, setShowSEODetail] = useState(false);

  const stats = useMemo(() => analyzeContent(content), [content]);
  const { readability, seo } = stats;

  return (
    <div className="relative flex items-center gap-3">
      {/* Word count & reading time */}
      <span className="text-xs text-[var(--muted-foreground)]">
        {readability.charCount.toLocaleString()}자
      </span>
      <span className="text-[var(--border)]">·</span>
      <span className="text-xs text-[var(--muted-foreground)]">
        {readability.readingTime}분 읽기
      </span>
      <span className="text-[var(--border)]">·</span>

      {/* Readability */}
      <span className="text-xs flex items-center gap-1">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: levelColor[readability.level] }}
        />
        <span style={{ color: levelColor[readability.level] }}>
          {readability.levelLabel}
        </span>
      </span>
      <span className="text-[var(--border)]">·</span>

      {/* SEO score */}
      <button
        onClick={() => setShowSEODetail((v) => !v)}
        className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
        title="SEO 점수 상세보기"
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: seoColor(seo.score) }}
        />
        <span style={{ color: seoColor(seo.score) }}>SEO {seo.score}%</span>
      </button>

      {/* SEO detail popover */}
      {showSEODetail && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setShowSEODetail(false)}
          />
          <div className="absolute bottom-6 left-0 z-[80] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-3 w-56">
            <p className="text-xs font-medium text-[var(--foreground)] mb-2">
              SEO 체크리스트
            </p>
            <div className="flex flex-col gap-1.5">
              <SEOItem ok={seo.titleOk} label={`제목 길이 (${seo.titleLength}자)`} okLabel="적절" />
              <SEOItem ok={seo.descriptionOk} label="메타 설명" okLabel={seo.hasDescription ? `${seo.descriptionLength}자` : "없음"} />
              <SEOItem ok={seo.hasImages} label="이미지" okLabel="포함" />
              <SEOItem ok={seo.hasTags} label="태그/카테고리" okLabel="있음" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SEOItem({
  ok,
  label,
  okLabel,
}: {
  ok: boolean;
  label: string;
  okLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <span
        className="text-xs shrink-0"
        style={{
          color: ok
            ? "var(--color-green, #22c55e)"
            : "var(--color-red, #ef4444)",
        }}
      >
        {ok ? `✓ ${okLabel}` : "✗"}
      </span>
    </div>
  );
}
