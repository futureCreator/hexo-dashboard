import fs from "fs";
import path from "path";
import Link from "next/link";
import HomeNewPostButton from "@/components/home/HomeNewPostButton";
import MobileHome from "@/components/home/MobileHome";
import MonthlyBarChart from "@/components/home/MonthlyBarChart";
import WritingCoachCard from "@/components/home/WritingCoachCard";
import ContributionHeatmap from "@/components/posts/ContributionHeatmap";
import CleanButton from "@/components/posts/CleanButton";
import CommitButton from "@/components/posts/CommitButton";
import DeployButton from "@/components/posts/DeployButton";
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

  const recentPosts = posts.slice(0, 8);

  const categoryCountMap: Record<string, number> = {};
  posts.forEach((p) => {
    p.categories.forEach((c) => {
      categoryCountMap[c] = (categoryCountMap[c] || 0) + 1;
    });
  });
  const topCategories = Object.entries(categoryCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const tagCountMap: Record<string, number> = {};
  posts.forEach((p) => {
    p.tags.forEach((t) => {
      tagCountMap[t] = (tagCountMap[t] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const now2 = new Date();
  const monthCountMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCountMap[key] = 0;
  }
  posts.forEach((p) => {
    if (!p.date) return;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthCountMap) monthCountMap[key]++;
  });
  const monthlyCounts = Object.entries(monthCountMap).map(([month, count]) => ({ month, count }));

  let lastGeneratedAt: string | null = null;
  const publicDir = path.join(hexoPath, "public");
  if (fs.existsSync(publicDir)) {
    lastGeneratedAt = fs.statSync(publicDir).mtime.toISOString();
  }

  return {
    configured: true as const,
    valid: true as const,
    posts,
    totalCount: posts.length,
    publishedCount: published.length,
    draftCount: drafts.length,
    todayCount: todayPosts.length,
    recentPosts,
    monthlyCounts,
    siteConfig,
    lastGeneratedAt,
    topCategories,
    topTags,
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
      className={`rounded-[14px] border p-4 flex items-center gap-3 ${
        accent
          ? "border-[var(--accent)]/20 bg-[var(--accent-subtle)]"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0 ${
          accent
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[22px] font-semibold text-[var(--foreground)] leading-none mb-0.5 tabular-nums">
          {value}
        </div>
        <div className="text-[12px] text-[var(--muted-foreground)]">{label}</div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const data = await getDashboardData();

  // Not configured — render for all viewports
  if (!data.configured) {
    return (
      <div className="px-4 py-5 sm:px-8 sm:py-8 max-w-5xl">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-10 text-center mt-4">
          <div className="w-14 h-14 rounded-[16px] bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold text-[var(--foreground)] mb-2">No Hexo path configured</h2>
          <p className="text-[14px] text-[var(--muted-foreground)] mb-6 max-w-xs mx-auto">
            Set your local Hexo blog directory to get started.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 h-[44px] rounded-[12px] bg-[var(--accent)] text-white text-[15px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-150"
          >
            Configure Settings
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // Invalid path — render for all viewports
  if (!data.valid) {
    return (
      <div className="px-4 py-5 sm:px-8 sm:py-8 max-w-5xl">
        <div className="rounded-[18px] border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-10 text-center mt-4">
          <div className="w-14 h-14 rounded-[16px] bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold text-red-800 dark:text-red-300 mb-2">Invalid Hexo path</h2>
          <p className="text-[14px] text-red-600 dark:text-red-400 mb-6">The configured path is missing or invalid.</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 h-[44px] rounded-[12px] bg-red-600 text-white text-[15px] font-semibold hover:bg-red-700 active:scale-[0.98] transition-all duration-150"
          >
            Update Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile view */}
      <div className="md:hidden">
        <MobileHome posts={data.posts} />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <div className="px-4 py-5 sm:px-8 sm:py-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--foreground)] leading-tight tracking-[-0.5px] mb-1">
                <span className="gradient-text">Hexo</span> Dashboard
              </h1>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {data.siteConfig.url ? `Managing ${data.siteConfig.url}` : "Your Hexo blog management hub."}
              </p>
            </div>
            <div className="hidden md:flex md:items-center gap-2 shrink-0">
              <HomeNewPostButton />
              <CleanButton />
              <CommitButton />
              <DeployButton />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Posts"
              value={data.totalCount}
              accent
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              label="Published"
              value={data.publishedCount}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <StatCard
              label="Drafts"
              value={data.draftCount}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M15.232 5.232l3.536 3.536M9 13l6-6m2.828-2.828a2 2 0 010 2.828l-9 9A2 2 0 017 17H5v-2a2 2 0 01.586-1.414l9-9z" />
                </svg>
              }
            />
            <StatCard
              label="Today"
              value={data.todayCount}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>

          {/* Contribution heatmap */}
          <ContributionHeatmap posts={data.posts} />

          {/* Monthly bar chart */}
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] px-5 pt-4 pb-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-[var(--foreground)]">Posts per Month</h2>
              <span className="text-[11px] text-[var(--muted-foreground)]">Last 12 months</span>
            </div>
            <MonthlyBarChart data={data.monthlyCounts} />
          </div>

          {/* AI Writing Coach */}
          <WritingCoachCard />

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
            {/* Recent posts */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-[13px] font-semibold text-[var(--foreground)]">Recent Posts</h2>
                <Link
                  href="/posts"
                  className="text-[13px] text-[var(--accent)] font-medium"
                >
                  View all
                </Link>
              </div>
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                {data.recentPosts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[14px] text-[var(--muted-foreground)]">
                    No posts yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {data.recentPosts.map((post) => {
                      const postUrl = (() => {
                        if (!data.siteConfig.url || post.draft) return "";
                        const date = post.date ? new Date(post.date) : null;
                        const slug = data.siteConfig.permalink
                          .replace(/:abbrlink/g, post.abbrlink != null ? String(post.abbrlink) : "")
                          .replace(/:year/g, date ? String(date.getUTCFullYear()) : "")
                          .replace(/:month/g, date ? String(date.getUTCMonth() + 1).padStart(2, "0") : "")
                          .replace(/:day/g, date ? String(date.getUTCDate()).padStart(2, "0") : "")
                          .replace(/:title/g, post.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""))
                          .replace(/:filename/g, post.filename.replace(/\.md$/, ""));
                        return `${data.siteConfig.url}/${slug}`.replace(/([^:])\/\//g, "$1/");
                      })();
                      return (
                        <li key={post.filepath} className="px-4 py-3.5 min-h-[52px] flex items-start gap-3">
                          <div className={`w-[3px] h-[18px] rounded-full mt-1 shrink-0 ${post.draft ? "bg-amber-400" : "bg-[var(--success)]"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {postUrl ? (
                                <a
                                  href={postUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[14px] font-medium text-[var(--foreground)] truncate hover:text-[var(--accent)] transition-colors duration-150 inline-flex items-center gap-1 group/link"
                                >
                                  {post.title}
                                  <svg className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-60 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-[14px] font-medium text-[var(--foreground)] truncate">{post.title}</span>
                              )}
                              {post.draft && (
                                <span className="shrink-0 inline-flex items-center px-1.5 py-px rounded-[5px] text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 leading-none">
                                  Draft
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] text-[var(--muted-foreground)]">{formatDate(post.date)}</span>
                              {post.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[11px] px-1.5 py-px rounded-[5px] bg-[var(--muted)] text-[var(--muted-foreground)]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Site info */}
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-2.5">Site Info</h2>
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                  {data.siteConfig.url && (
                    <div className="px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5 font-mono">Site URL</div>
                      <div className="text-[13px] font-medium text-[var(--foreground)] truncate">{data.siteConfig.url}</div>
                    </div>
                  )}
                  {data.lastGeneratedAt && (
                    <div className="px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5 font-mono">Last Generated</div>
                      <div className="text-[13px] font-medium text-[var(--foreground)]">{formatRelative(data.lastGeneratedAt)}</div>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5 font-mono">Most Recent Post</div>
                    <div className="text-[13px] font-medium text-[var(--foreground)]">
                      {data.recentPosts[0] ? formatRelative(data.recentPosts[0].date) : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Categories */}
              {data.topCategories.length > 0 && (
                <div>
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-2.5">Top Categories</h2>
                  <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                    {data.topCategories.map(({ name, count }) => (
                      <div key={name} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-[var(--foreground)] truncate">{name}</span>
                        <span className="shrink-0 text-[11px] font-semibold px-1.5 py-px rounded-[5px] bg-[var(--accent-subtle)] text-[var(--accent)]">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Tags */}
              {data.topTags.length > 0 && (
                <div>
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)] mb-2.5">Top Tags</h2>
                  <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {data.topTags.map(({ name, count }) => (
                        <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] bg-[var(--muted)] text-[var(--foreground)] text-[12px] font-medium">
                          {name}
                          <span className="text-[10px] text-[var(--muted-foreground)]">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
