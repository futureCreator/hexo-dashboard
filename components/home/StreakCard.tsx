"use client";

import { useMemo } from "react";
import type { HexoPost } from "@/lib/hexo";
import {
  buildPostCountMap,
  getLast7Days,
  calcStreaks,
  toLocalDateKey,
} from "@/lib/streak";

interface Props {
  posts: HexoPost[];
}

export default function StreakCard({ posts }: Props) {
  const { days, stats } = useMemo(() => {
    const countMap = buildPostCountMap(posts);
    const last7 = getLast7Days(countMap);

    // Build full-year cells: 364 days from today backwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yearCells: { date: Date; count: number }[] = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toLocalDateKey(d);
      yearCells.push({ date: d, count: countMap.get(key) ?? 0 });
    }

    const streakStats = calcStreaks(yearCells);
    const yearPostCount = yearCells.reduce((s, c) => s + c.count, 0);

    return {
      days: last7,
      stats: { ...streakStats, yearTotal: yearPostCount },
    };
  }, [posts]);

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
      {/* Header */}
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-[28px] font-extrabold leading-none text-[var(--foreground)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {stats.current}
        </span>
        <span className="text-sm font-semibold text-[var(--accent)]">day streak</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
            Best <span className="text-[var(--foreground)]">{stats.longest}d</span>
          </span>
          <span className="text-[var(--border)]">·</span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
            Year <span className="text-[var(--foreground)]">{stats.yearTotal}</span>
          </span>
        </div>
      </div>

      {/* 7-day bar row */}
      <div className="flex gap-1.5">
        {days.map((day) => {
          const isEmptyToday = day.isToday && day.count === 0;
          return (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={[
                  "w-full rounded-lg flex items-center justify-center",
                  isEmptyToday
                    ? "border-2 border-dashed border-[var(--accent)]/35"
                    : "",
                ].join(" ")}
                style={{
                  height: 32,
                  background: isEmptyToday
                    ? "transparent"
                    : `var(--heatmap-${day.level})`,
                }}
              >
                {isEmptyToday && (
                  <span className="text-[11px] font-bold text-[var(--accent)]/50">?</span>
                )}
              </div>
              <span
                className={[
                  "text-[10px] font-medium leading-none",
                  day.isToday
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted-foreground)]",
                ].join(" ")}
              >
                {day.isToday ? "Today" : day.dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
