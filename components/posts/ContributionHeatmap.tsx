"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { HexoPost } from "@/lib/hexo";
import { toLocalDateKey, countLevel, calcStreaks } from "@/lib/streak";

interface Props {
  posts: HexoPost[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
}

const CELL = 11;
const GAP = 3;
const DAY_GUTTER = 28;
const MONTH_GUTTER = 18;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const easeOut = [0.16, 1, 0.3, 1] as const;

function StreakStat({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] select-none">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color: highlight ? "var(--accent)" : "var(--foreground)" }}
        >
          {value}
        </span>
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{unit}</span>
      </div>
    </div>
  );
}

export default function ContributionHeatmap({ posts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, label: "" });

  // Build date → count map
  const countMap = new Map<string, number>();
  for (const post of posts) {
    if (!post.date) continue;
    const d = new Date(post.date);
    if (isNaN(d.getTime())) continue;
    const key = toLocalDateKey(d);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(0, ...countMap.values());

  // Build grid cells
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - 363); // 364 days total (today inclusive)

  // Rewind to Sunday
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());

  // Walk from gridStart to today collecting cells
  type Cell = { date: Date | null; count: number; key: string };
  const cells: Cell[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= today) {
    const isBeforeStart = cursor < start;
    if (isBeforeStart) {
      cells.push({ date: null, count: 0, key: "" });
    } else {
      const key = toLocalDateKey(cursor);
      cells.push({ date: new Date(cursor), count: countMap.get(key) ?? 0, key });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const { current: currentStreak, longest: longestStreak, totalPosts } = calcStreaks(cells);

  // Chunk into weeks (7-cell columns)
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    // Pad last week to 7 if needed
    while (week.length < 7) week.push({ date: null, count: 0, key: "" });
    weeks.push(week);
  }

  // Month labels: find first real cell of each month per week
  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    for (const cell of week) {
      if (!cell.date) continue;
      const m = cell.date.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ weekIdx: wi, label: MONTHS[m] });
        lastMonth = m;
      }
      break;
    }
  }

  // Total grid width
  const gridWidth = weeks.length * (CELL + GAP) - GAP;

  function handleMouseEnter(e: React.MouseEvent, cell: Cell) {
    if (!cell.date || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = cellRect.left - rect.left + CELL / 2;
    const y = cellRect.top - rect.top;
    const dateStr = toLocalDateKey(cell.date);
    const label =
      cell.count === 0
        ? `No posts on ${dateStr}`
        : `${cell.count} post${cell.count !== 1 ? "s" : ""} on ${dateStr}`;
    setTooltip({ visible: true, x, y, label });
  }

  function handleMouseLeave() {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: easeOut }}
      className="mb-8"
    >
      <div
        ref={containerRef}
        className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 pt-4 pb-4 flex flex-col gap-4"
      >
        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div style={{ width: DAY_GUTTER + gridWidth }}>
            {/* Month labels */}
            <div className="flex mb-1" style={{ paddingLeft: DAY_GUTTER }}>
              <div style={{ width: gridWidth, position: "relative", height: MONTH_GUTTER }}>
                {monthLabels.map(({ weekIdx, label }) => (
                  <span
                    key={`${weekIdx}-${label}`}
                    className="absolute text-[10px] font-mono text-[var(--muted-foreground)] select-none"
                    style={{ left: weekIdx * (CELL + GAP) }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Day labels + grid */}
            <div className="flex">
              {/* Day labels (Mon/Wed/Fri only) */}
              <div className="flex flex-col shrink-0" style={{ width: DAY_GUTTER, gap: GAP }}>
                {DAYS.map((day, i) => (
                  <div
                    key={day}
                    style={{ height: CELL, lineHeight: `${CELL}px` }}
                    className="text-[9px] font-mono text-[var(--muted-foreground)] select-none text-right pr-1.5"
                  >
                    {i === 1 || i === 3 || i === 5 ? day : ""}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="flex" style={{ gap: GAP }}>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {week.map((cell, di) => {
                      if (!cell.date) {
                        return (
                          <div
                            key={di}
                            className="heatmap-cell-empty rounded-sm"
                            style={{ width: CELL, height: CELL }}
                          />
                        );
                      }
                      const level = countLevel(cell.count, maxCount);
                      return (
                        <div
                          key={di}
                          className="heatmap-cell rounded-sm cursor-pointer transition-opacity duration-100 hover:opacity-80"
                          data-level={level}
                          style={{ width: CELL, height: CELL }}
                          onMouseEnter={(e) => handleMouseEnter(e, cell)}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-[9px] font-mono text-[var(--muted-foreground)] select-none">Less</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className="heatmap-cell rounded-sm"
              data-level={level}
              style={{ width: CELL, height: CELL }}
            />
          ))}
          <span className="text-[9px] font-mono text-[var(--muted-foreground)] select-none">More</span>
        </div>

        {/* Streak stats */}
        <div className="flex items-center gap-6 pt-3 border-t border-[var(--border)]">
          <StreakStat label="Current Streak" value={currentStreak} unit="days" highlight={currentStreak > 0} />
          <div className="w-px h-8 bg-[var(--border)]" />
          <StreakStat label="Longest Streak" value={longestStreak} unit="days" />
          <div className="w-px h-8 bg-[var(--border)]" />
          <StreakStat label="This Year" value={totalPosts} unit="posts" />
        </div>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-50 px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap"
            style={{
              left: tooltip.x,
              top: tooltip.y - 36,
              transform: "translateX(-50%)",
              background: "var(--foreground)",
              color: "var(--background)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            {tooltip.label}
          </div>
        )}
      </div>
    </motion.div>
  );
}
