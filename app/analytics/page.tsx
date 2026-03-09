"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/components/providers/ThemeProvider";

const easeOut = [0.16, 1, 0.3, 1] as const;

interface Summary {
  activeUsers: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
}

interface TrendRow {
  date: string;
  activeUsers: number;
  sessions: number;
}

interface TopPage {
  page: string;
  title?: string;
  views: number;
  sessions: number;
}

interface AnalyticsData {
  configured: boolean;
  summary?: Summary;
  trend?: TrendRow[];
  topPages?: TopPage[];
  error?: string;
}

interface GscSummary {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscTrendRow {
  date: string;
  clicks: number;
  impressions: number;
}

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscPage {
  page: string;
  title?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscData {
  configured: boolean;
  summary?: GscSummary;
  trend?: GscTrendRow[];
  topQueries?: GscQuery[];
  topPages?: GscPage[];
  error?: string;
}

interface ContentMonthRow {
  month: string;
  avgChars: number;
  postCount: number;
}

interface ContentStatsData {
  postCount: number;
  totalWords: number;
  totalChars: number;
  totalReadingTime: number;
  avgCharCount: number;
  monthlyTrend: ContentMonthRow[];
}

function formatDate(raw: string) {
  if (raw.length !== 8) return raw;
  return `${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
}

function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props as {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
  };
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-lg text-[12px]">
      <p className="text-[var(--muted-foreground)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
      <p className="text-[12px] text-[var(--muted-foreground)] mb-1.5">{label}</p>
      <p className="text-[22px] font-semibold text-[var(--foreground)] tabular-nums leading-none">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const [period, setPeriod] = useState<7 | 14 | 30 | 90>(7);
  const [tab, setTab] = useState<"ga" | "gsc" | "content">("ga");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [contentStats, setContentStats] = useState<ContentStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (days: 7 | 14 | 30 | 90) => {
    setLoading(true);
    try {
      const [gaRes, gscRes] = await Promise.all([
        fetch(`/api/analytics?period=${days}`),
        fetch(`/api/search-console?period=${days}`),
      ]);
      const [gaJson, gscJson] = await Promise.all([gaRes.json(), gscRes.json()]);
      setData(gaJson);
      setGscData(gscJson);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  useEffect(() => {
    if (tab !== "content" || contentStats) return;
    fetch("/api/content-stats").then((r) => r.json()).then(setContentStats).catch(() => {});
  }, [tab, contentStats]);

  const accentColor = resolvedTheme === "dark" ? "#5E6AD2" : "#0052FF";
  const accentSecondary = resolvedTheme === "dark" ? "#7B8FE8" : "#4F87FF";
  const mutedColor = resolvedTheme === "dark" ? "#2c2c2e" : "#f2f2f7";
  const mutedFg = resolvedTheme === "dark" ? "#636366" : "#8E8E93";
  const gscClickColor = resolvedTheme === "dark" ? "#30D158" : "#34C759";
  const gscImpressionColor = resolvedTheme === "dark" ? "#63E6BE" : "#30D158";

  return (
    <DashboardLayout>
      <div className="px-4 py-5 sm:px-8 sm:py-8 max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="mb-5"
        >
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--foreground)] leading-tight tracking-[-0.5px] mb-1">
            Site <span className="gradient-text">Analytics</span>
          </h1>
        </motion.div>

        {/* Tabs + Period — scrollable on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeOut, delay: 0.05 }}
          className="flex items-center gap-3 mb-5 flex-wrap"
        >
          {/* Tab segmented control */}
          <div className="segmented-control flex-shrink-0">
            {(
              [
                { key: "ga" as const, label: "Google Analytics" },
                { key: "gsc" as const, label: "Search Console" },
                { key: "content" as const, label: "Content" },
              ]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`segmented-control-item px-3 whitespace-nowrap ${tab === key ? "active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period picker — only for GA & GSC tabs */}
          {tab !== "content" && (
            <div className="segmented-control flex-shrink-0">
              {([7, 14, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`segmented-control-item min-w-[40px] ${period === d ? "active" : ""}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Not configured (GA) ── */}
        {!loading && tab === "ga" && data?.configured === false && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
          >
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
              <div className="w-14 h-14 rounded-[16px] bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-[17px] font-semibold text-[var(--foreground)] mb-2">Google Analytics not configured</h2>
              <p className="text-[14px] text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
                Add your GA4 Property ID and service account JSON path in Settings.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-5 h-[44px] rounded-[12px] bg-[var(--accent)] text-white text-[15px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-150"
              >
                Go to Settings
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Error (GA) ── */}
        {!loading && tab === "ga" && data?.error && (
          <Card className="p-6">
            <p className="text-[13px] text-[var(--error)] font-mono">{data.error}</p>
          </Card>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4">
                  <Skeleton className="h-3 w-16 mb-3" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
            <Card className="p-5">
              <Skeleton className="h-4 w-28 mb-4" />
              <Skeleton className="h-44 w-full" />
            </Card>
          </div>
        )}

        {/* ── GSC not configured ── */}
        {!loading && tab === "gsc" && gscData?.configured === false && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            className="mb-5"
          >
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[11px] bg-[var(--accent-subtle)] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[var(--foreground)]">Search Console not configured</p>
                <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                  Add your site URL in{" "}
                  <Link href="/settings" className="text-[var(--accent)]">Settings</Link>.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── GA Data ── */}
        {!loading && tab === "ga" && data?.configured && data.summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Active Users", value: data.summary.activeUsers.toLocaleString() },
                { label: "Sessions", value: data.summary.sessions.toLocaleString() },
                { label: "Pageviews", value: data.summary.pageviews.toLocaleString() },
                { label: "Bounce Rate", value: `${(data.summary.bounceRate * 100).toFixed(1)}%` },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: easeOut, delay: 0.05 + i * 0.04 }}
                >
                  <StatCard label={card.label} value={card.value} />
                </motion.div>
              ))}
            </div>

            {data.trend && data.trend.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.25 }}>
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">Daily Trends</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.trend.map((r) => ({ ...r, date: formatDate(r.date) }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke={mutedColor} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: mutedFg }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: mutedFg }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="sessions" name="Sessions" stroke={accentColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke={accentSecondary} strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-5 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-[2px] rounded" style={{ backgroundColor: accentColor, display: "inline-block" }} />
                      <span className="text-[11px] text-[var(--muted-foreground)]">Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-[2px] rounded" style={{ backgroundColor: accentSecondary, display: "inline-block" }} />
                      <span className="text-[11px] text-[var(--muted-foreground)]">Active Users</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {data.topPages && data.topPages.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.3 }}>
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">Top Pages</h2>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="text-left py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)] w-7">#</th>
                          <th className="text-left py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">Page</th>
                          <th className="text-right py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">Views</th>
                          <th className="text-right py-2 text-[11px] font-medium text-[var(--muted-foreground)]">Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topPages.map((row, i) => (
                          <tr key={row.page} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2.5 pr-3 text-[12px] text-[var(--muted-foreground)] tabular-nums">{i + 1}</td>
                            <td className="py-2.5 pr-3 text-[12px] text-[var(--foreground)] max-w-[180px] truncate">
                              {row.title ? <span title={row.page}>{row.title}</span> : <span className="font-mono text-[var(--muted-foreground)]">{row.page}</span>}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-[12px] tabular-nums text-[var(--foreground)]">{row.views.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-[12px] tabular-nums text-[var(--foreground)]">{row.sessions.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── GSC Error ── */}
        {!loading && tab === "gsc" && gscData?.error && (
          <Card className="p-6">
            <p className="text-[13px] text-[var(--error)] font-mono">{gscData.error}</p>
          </Card>
        )}

        {/* ── GSC Data ── */}
        {!loading && tab === "gsc" && gscData?.configured && gscData.summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Clicks", value: gscData.summary.clicks.toLocaleString() },
                { label: "Impressions", value: gscData.summary.impressions.toLocaleString() },
                { label: "CTR", value: `${(gscData.summary.ctr * 100).toFixed(1)}%` },
                { label: "Avg. Position", value: gscData.summary.position.toFixed(1) },
              ].map((card, i) => (
                <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.05 + i * 0.04 }}>
                  <StatCard label={card.label} value={card.value} />
                </motion.div>
              ))}
            </div>

            {gscData.trend && gscData.trend.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.25 }}>
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">Search Trend — last {period} days</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={gscData.trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke={mutedColor} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: mutedFg }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: mutedFg }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="clicks" name="Clicks" stroke={gscClickColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="impressions" name="Impressions" stroke={gscImpressionColor} strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {gscData.topQueries && gscData.topQueries.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.3 }}>
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">Top Queries</h2>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="text-left py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)] w-7">#</th>
                          <th className="text-left py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">Query</th>
                          <th className="text-right py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">Clicks</th>
                          <th className="text-right py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">Impr.</th>
                          <th className="text-right py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">CTR</th>
                          <th className="text-right py-2 text-[11px] font-medium text-[var(--muted-foreground)]">Pos.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscData.topQueries.map((row, i) => (
                          <tr key={row.query} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2.5 pr-3 text-[12px] text-[var(--muted-foreground)] tabular-nums">{i + 1}</td>
                            <td className="py-2.5 pr-3 text-[12px] text-[var(--foreground)] max-w-[180px] truncate">{row.query}</td>
                            <td className="py-2.5 pr-3 text-right text-[12px] tabular-nums text-[var(--foreground)]">{row.clicks.toLocaleString()}</td>
                            <td className="py-2.5 pr-3 text-right text-[12px] tabular-nums text-[var(--foreground)]">{row.impressions.toLocaleString()}</td>
                            <td className="py-2.5 pr-3 text-right text-[12px] tabular-nums text-[var(--muted-foreground)]">{(row.ctr * 100).toFixed(1)}%</td>
                            <td className="py-2.5 text-right text-[12px] tabular-nums text-[var(--muted-foreground)]">{row.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Content Stats ── */}
        {tab === "content" && (
          <div className="space-y-4">
            {!contentStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4">
                      <Skeleton className="h-3 w-16 mb-3" />
                      <Skeleton className="h-7 w-20" />
                    </div>
                  ))}
                </div>
                <Card className="p-5">
                  <Skeleton className="h-4 w-28 mb-4" />
                  <Skeleton className="h-44 w-full" />
                </Card>
              </div>
            )}

            {contentStats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "총 글 수", value: contentStats.postCount.toLocaleString() },
                    { label: "총 글자 수", value: contentStats.totalChars.toLocaleString() },
                    { label: "총 읽기 시간", value: `${contentStats.totalReadingTime.toLocaleString()}분` },
                    { label: "글 평균 길이", value: contentStats.avgCharCount.toLocaleString() },
                  ].map((card, i) => (
                    <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.04 + i * 0.04 }}>
                      <StatCard label={card.label} value={card.value} />
                    </motion.div>
                  ))}
                </div>

                {contentStats.monthlyTrend.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.2 }}>
                    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
                      <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">월별 평균 글 길이 추세</h2>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={contentStats.monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <CartesianGrid stroke={mutedColor} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: mutedFg }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: mutedFg }} axisLine={false} tickLine={false} />
                          <Tooltip
                            content={(props) => {
                              const { active, payload, label } = props as unknown as { active?: boolean; payload?: { value: number }[]; label?: string };
                              if (!active || !payload?.length) return null;
                              const row = contentStats.monthlyTrend.find((r) => r.month === label);
                              return (
                                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-lg text-[12px]">
                                  <p className="text-[var(--muted-foreground)] mb-1">{label}</p>
                                  <p style={{ color: accentColor }} className="font-medium">평균 {payload[0].value.toLocaleString()}자</p>
                                  {row && <p className="text-[var(--muted-foreground)]">글 {row.postCount}편</p>}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="avgChars" fill={accentColor} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}

                {contentStats.monthlyTrend.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut, delay: 0.3 }}>
                    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5">
                      <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">월별 상세</h2>
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full min-w-[280px]">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="text-left py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">월</th>
                              <th className="text-right py-2 pr-3 text-[11px] font-medium text-[var(--muted-foreground)]">글 수</th>
                              <th className="text-right py-2 text-[11px] font-medium text-[var(--muted-foreground)]">평균 글자 수</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...contentStats.monthlyTrend].reverse().map((row) => (
                              <tr key={row.month} className="border-b border-[var(--border)] last:border-0">
                                <td className="py-2.5 pr-3 text-[12px] font-mono text-[var(--foreground)]">{row.month}</td>
                                <td className="py-2.5 pr-3 text-right text-[12px] tabular-nums text-[var(--muted-foreground)]">{row.postCount}</td>
                                <td className="py-2.5 text-right text-[12px] tabular-nums text-[var(--foreground)]">{row.avgChars.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
