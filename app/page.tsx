import fs from "fs";
import path from "path";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
import { loadSettings } from "@/lib/settings";
import { readPosts, hexoPathValid, getSiteConfig } from "@/lib/hexo";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const { hexoPath } = loadSettings();
  if (!hexoPath) return { configured: false as const };
  if (!hexoPathValid(hexoPath)) return { configured: true as const, valid: false as const };

  const posts = readPosts(hexoPath);
  const siteConfig = getSiteConfig(hexoPath);

  const published = posts.filter((p) => !p.draft);
  const drafts = posts.filter((p) => p.draft);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayPosts = posts.filter((p) => {
    if (!p.date) return false;
    const d = new Date(p.date);
    const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return localStr === todayStr;
  });

  const recentPosts = posts.slice(0, 6);

  let lastGeneratedAt: string | null = null;
  const publicDir = path.join(hexoPath, "public");
  if (fs.existsSync(publicDir)) {
    lastGeneratedAt = fs.statSync(publicDir).mtime.toISOString();
  }

  return {
    configured: true as const,
    valid: true as const,
    totalCount: posts.length,
    publishedCount: published.length,
    draftCount: drafts.length,
    todayCount: todayPosts.length,
    recentPosts,
    siteConfig,
    lastGeneratedAt,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: boolean;
}

function StatCard({ label, value, icon, accent = false }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 flex items-start gap-4 ${
        accent
          ? "border-[rgba(0,82,255,0.2)] bg-[var(--accent-subtle)]"
          : "border-[var(--border)] bg-[var(--card)] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          accent
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold text-[var(--foreground)] leading-none mb-1">
          {value}
        </div>
        <div className="text-xs text-[var(--muted-foreground)] font-medium">{label}</div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-8 sm:py-10 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <SectionLabel pulse className="mb-4">
            Overview
          </SectionLabel>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] leading-tight mb-2">
            Welcome to{" "}
            <span className="gradient-text">Hexo Dashboard</span>
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            {data.configured && data.valid && data.siteConfig.url
              ? `Managing ${data.siteConfig.url}`
              : "Your Hexo blog management hub."}
          </p>
        </div>

        {/* Not configured */}
        {!data.configured && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] border border-[rgba(0,82,255,0.2)] flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">No Hexo path configured</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
              Set your local Hexo blog directory path to get started.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
            >
              Configure Settings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Invalid path */}
        {data.configured && !data.valid && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">Invalid Hexo path</h2>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6">The configured path is missing or invalid.</p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all duration-200"
            >
              Update Settings
            </Link>
          </div>
        )}

        {/* Dashboard content */}
        {data.configured && data.valid && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <StatCard
                label="Total Posts"
                value={data.totalCount}
                accent
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Published"
                value={data.publishedCount}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <StatCard
                label="Drafts"
                value={data.draftCount}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2.828-2.828a2 2 0 010 2.828l-9 9A2 2 0 017 17H5v-2a2 2 0 01.586-1.414l9-9z" />
                  </svg>
                }
              />
              <StatCard
                label="Written Today"
                value={data.todayCount}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent posts */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent Posts</h2>
                  <Link
                    href="/posts"
                    className="text-xs text-[var(--accent)] hover:underline font-medium"
                  >
                    View all
                  </Link>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_2px_6px_rgba(0,0,0,0.06)] overflow-hidden">
                  {data.recentPosts.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                      No posts yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--border)]">
                      {data.recentPosts.map((post) => (
                        <li key={post.filepath} className="px-5 py-3.5 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-[var(--foreground)] truncate">
                                {post.title}
                              </span>
                              {post.draft && (
                                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  Draft
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-[var(--muted-foreground)]">
                                {formatDate(post.date)}
                              </span>
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)] font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
                {/* Quick actions */}
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Quick Actions</h2>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/posts"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--accent)]/30 transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">Manage Posts</span>
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] ml-auto group-hover:text-[var(--foreground)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link
                      href="/pages"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--accent)]/30 transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">Manage Pages</span>
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] ml-auto group-hover:text-[var(--foreground)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link
                      href="/analytics"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--accent)]/30 transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">Analytics</span>
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] ml-auto group-hover:text-[var(--foreground)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Site info */}
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Site Info</h2>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_2px_6px_rgba(0,0,0,0.06)] divide-y divide-[var(--border)]">
                    {data.siteConfig.url && (
                      <div className="px-4 py-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5">
                          Site URL
                        </div>
                        <div className="text-xs font-medium text-[var(--foreground)] truncate">
                          {data.siteConfig.url}
                        </div>
                      </div>
                    )}
                    {data.lastGeneratedAt && (
                      <div className="px-4 py-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5">
                          Last Generated
                        </div>
                        <div className="text-xs font-medium text-[var(--foreground)]">
                          {formatRelative(data.lastGeneratedAt)}
                        </div>
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5">
                        Most Recent Post
                      </div>
                      <div className="text-xs font-medium text-[var(--foreground)]">
                        {data.recentPosts[0]
                          ? formatRelative(data.recentPosts[0].date)
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
