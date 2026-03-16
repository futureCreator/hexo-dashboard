import type { HexoPost } from "@/lib/hexo";

export interface StreakStats {
  current: number;
  longest: number;
  totalPosts: number;
}

export interface DayActivity {
  date: string;
  dayLabel: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function countLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

export function calcStreaks(cells: { date: Date | null; count: number }[]): StreakStats {
  // Only real cells (date != null)
  const real = cells.filter((c) => c.date !== null);
  if (real.length === 0) return { current: 0, longest: 0, totalPosts: 0 };

  const totalPosts = real.reduce((s, c) => s + c.count, 0);

  // Longest streak
  let longest = 0;
  let run = 0;
  for (const c of real) {
    if (c.count > 0) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak: count back from last real cell (today)
  let current = 0;
  for (let i = real.length - 1; i >= 0; i--) {
    if (real[i].count > 0) current++;
    else break;
  }

  return { current, longest, totalPosts };
}

export function buildPostCountMap(posts: HexoPost[]): Map<string, number> {
  const countMap = new Map<string, number>();
  for (const post of posts) {
    if (!post.date) continue;
    const d = new Date(post.date);
    if (isNaN(d.getTime())) continue;
    const key = toLocalDateKey(d);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  return countMap;
}

export function getLast7Days(countMap: Map<string, number>): DayActivity[] {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: string; dayLabel: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toLocalDateKey(d);
    days.push({
      date: key,
      dayLabel: DAY_LABELS[d.getDay()],
      count: countMap.get(key) ?? 0,
    });
  }

  const max = Math.max(0, ...days.map((d) => d.count));
  const todayKey = toLocalDateKey(today);

  return days.map((d) => ({
    date: d.date,
    dayLabel: d.dayLabel,
    count: d.count,
    level: countLevel(d.count, max),
    isToday: d.date === todayKey,
  }));
}
