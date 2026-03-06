"use client";

import { motion } from "framer-motion";

interface MonthlyData {
  month: string; // "YYYY-MM"
  count: number;
}

interface MonthlyBarChartProps {
  data: MonthlyData[];
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const d = new Date(Number(year), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short" });
}

export default function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((item, i) => {
          const heightPct = (item.count / max) * 100;
          const isCurrentMonth = i === data.length - 1;
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
              {/* Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                <div className="bg-[var(--foreground)] text-[var(--background)] text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  {item.count}
                </div>
              </div>
              {/* Bar */}
              <motion.div
                className={`w-full rounded-t-sm ${
                  isCurrentMonth
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--muted-foreground)]/20 group-hover:bg-[var(--accent)]/50"
                } transition-colors duration-150`}
                style={{ minHeight: item.count > 0 ? 4 : 2 }}
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.5, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 mt-1.5">
        {data.map((item, i) => (
          <div key={item.month} className="flex-1 text-center">
            <span className={`text-[9px] font-medium ${i === data.length - 1 ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`}>
              {formatMonthLabel(item.month)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
