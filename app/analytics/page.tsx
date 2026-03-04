"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
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

function formatDate(raw: string) {
  // raw: "YYYYMMDD"
  if (raw.length !== 8) return raw;
  return `${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
}

function AnimatedNumber({ value }: { value: number }) {
  return <span>{value.toLocaleString()}</span>;
}

function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props as {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
  };
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--muted-foreground)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const [period, setPeriod] = useState<7 | 30>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (days: 7 | 30) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${days}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // Chart color tokens resolved from CSS vars
  const accentColor = resolvedTheme === "dark" ? "#5E6AD2" : "#0052FF";
  const accentSecondary = resolvedTheme === "dark" ? "#7B8FE8" : "#4F87FF";
  const mutedColor = resolvedTheme === "dark" ? "#3a3a4a" : "#e5e7eb";
  const mutedFg = resolvedTheme === "dark" ? "#71717a" : "#6b7280";

  const statCards = data?.summary
    ? [
        { label: "Active Users", value: data.summary.activeUsers, format: "number" },
        { label: "Sessions", value: data.summary.sessions, format: "number" },
        { label: "Pageviews", value: data.summary.pageviews, format: "number" },
        { label: "Bounce Rate", value: data.summary.bounceRate, format: "percent" },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-8 sm:py-10 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <SectionLabel className="mb-4">Analytics</SectionLabel>
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] leading-tight mb-2">
              Site{" "}
              <span className="gradient-text">Analytics</span>
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Google Analytics 4 metrics for your blog.
            </p>
          </div>
          {/* Period toggle */}
          {data?.configured !== false && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--muted)] shrink-0">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    period === d
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Not configured */}
        {!loading && data?.configured === false && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
          >
            <Card className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Google Analytics not configured
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
                Add your GA4 Property ID and service account JSON path in Settings to start viewing analytics.
              </p>
              <Link href="/settings">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-200">
                  Go to Settings
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Link>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {!loading && data?.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
          >
            <Card className="p-8">
              <p className="text-sm text-red-500 font-mono">{data.error}</p>
            </Card>
          </motion.div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))}
            </div>
            <Card className="p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-48 w-full" />
            </Card>
            <Card className="p-6">
              <Skeleton className="h-5 w-28 mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Data */}
        {!loading && data?.configured && data.summary && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: easeOut, delay: 0.1 + i * 0.05 }}
                >
                  <Card className="p-5">
                    <p className="text-xs text-[var(--muted-foreground)] mb-2">{card.label}</p>
                    <p className="text-2xl font-semibold text-[var(--foreground)] tabular-nums">
                      {card.format === "percent"
                        ? `${(card.value * 100).toFixed(1)}%`
                        : <AnimatedNumber value={card.value} />}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Trend chart */}
            {data.trend && data.trend.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOut, delay: 0.3 }}
              >
                <Card className="p-6">
                  <h2 className="text-sm font-semibold text-[var(--foreground)] mb-5">
                    Daily Trend — last {period} days
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={data.trend.map((r) => ({ ...r, date: formatDate(r.date) }))}
                      margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid stroke={mutedColor} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: mutedFg }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: mutedFg }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="sessions"
                        name="Sessions"
                        stroke={accentColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="activeUsers"
                        name="Active Users"
                        stroke={accentSecondary}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-5 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-0.5 rounded" style={{ backgroundColor: accentColor, display: "inline-block" }} />
                      <span className="text-xs text-[var(--muted-foreground)]">Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-0.5 rounded" style={{ backgroundColor: accentSecondary, display: "inline-block", borderBottom: `2px dashed ${accentSecondary}`, height: 0 }} />
                      <span className="text-xs text-[var(--muted-foreground)]">Active Users</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Top pages */}
            {data.topPages && data.topPages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOut, delay: 0.35 }}
              >
                <Card className="p-6">
                  <h2 className="text-sm font-semibold text-[var(--foreground)] mb-5">
                    Top Pages — last {period} days
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--muted-foreground)] w-8">#</th>
                          <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--muted-foreground)]">Page</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-[var(--muted-foreground)]">Views</th>
                          <th className="text-right py-2 text-xs font-medium text-[var(--muted-foreground)]">Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topPages.map((row, i) => (
                          <tr
                            key={row.page}
                            className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors duration-150"
                          >
                            <td className="py-2.5 pr-4 text-xs text-[var(--muted-foreground)] tabular-nums">{i + 1}</td>
                            <td className="py-2.5 pr-4 font-mono text-xs text-[var(--foreground)] max-w-xs truncate">
                              {row.page}
                            </td>
                            <td className="py-2.5 pr-4 text-right text-xs tabular-nums text-[var(--foreground)]">
                              {row.views.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-xs tabular-nums text-[var(--foreground)]">
                              {row.sessions.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
