import { Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
import PostList from "@/components/posts/PostList";
import DeployButton from "@/components/posts/DeployButton";
import CommitButton from "@/components/posts/CommitButton";
import { PostListSkeleton } from "@/components/ui/Skeleton";
import { loadSettings } from "@/lib/settings";
import { readPosts, hexoPathValid, getSiteConfig, type SiteConfig } from "@/lib/hexo";

export const dynamic = "force-dynamic";

async function getPostsData() {
  const { hexoPath } = loadSettings();
  if (!hexoPath) return { configured: false, posts: [], hexoPath: "", siteConfig: { url: "", permalink: "" } };
  if (!hexoPathValid(hexoPath)) return { configured: true, valid: false, posts: [], hexoPath, siteConfig: { url: "", permalink: "" } };
  const posts = readPosts(hexoPath);
  const siteConfig = getSiteConfig(hexoPath);
  return { configured: true, valid: true, posts, hexoPath, siteConfig };
}

export default async function PostsPage() {
  const { configured, valid, posts, siteConfig } = await getPostsData();

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-8 sm:py-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <SectionLabel pulse className="mb-4">
              Posts
            </SectionLabel>
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] leading-tight mb-2">
              Your{" "}
              <span className="gradient-text">Blog Posts</span>
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Manage and organize all your Hexo blog posts in one place.
            </p>
          </div>
          {configured && valid && (
            <div className="flex items-center gap-2 shrink-0">
              <CommitButton />
              <DeployButton />
            </div>
          )}
        </div>

        {/* Not configured */}
        {!configured && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(0,82,255,0.06)] border border-[rgba(0,82,255,0.2)] flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-[var(--accent)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              No Hexo path configured
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
              Set your local Hexo blog directory path to start managing your posts.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#4D7CFF] text-white text-sm font-medium shadow-sm hover:shadow-[0_4px_14px_rgba(0,82,255,0.25)] hover:-translate-y-0.5 transition-all duration-200"
            >
              Configure Settings
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}

        {/* Invalid path */}
        {configured && !valid && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Invalid Hexo path
            </h2>
            <p className="text-sm text-red-600 mb-6 max-w-sm mx-auto">
              The configured path no longer exists or is missing a{" "}
              <code className="font-mono text-xs bg-red-100 px-1.5 py-0.5 rounded">
                source/_posts
              </code>{" "}
              folder. Please update your settings.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium shadow-sm hover:bg-red-700 hover:-translate-y-0.5 transition-all duration-200"
            >
              Update Settings
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}

        {/* Posts list */}
        {configured && valid && (
          <Suspense fallback={<PostListSkeleton />}>
            <PostList initialPosts={posts} siteConfig={siteConfig} />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
