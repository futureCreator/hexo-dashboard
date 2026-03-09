import { Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PostList from "@/components/posts/PostList";
import { PostListSkeleton } from "@/components/ui/Skeleton";
import { loadSettings } from "@/lib/settings";
import { readPosts, hexoPathValid, getSiteConfig } from "@/lib/hexo";

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
      <div className="px-4 py-5 sm:px-8 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--foreground)] leading-tight tracking-[-0.5px] mb-1">
            Your <span className="gradient-text">Blog Posts</span>
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Manage and organize all your Hexo blog posts.
          </p>
        </div>

        {/* Not configured */}
        {!configured && (
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
            <div className="w-14 h-14 rounded-[16px] bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-[var(--foreground)] mb-2">No Hexo path configured</h2>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-6 max-w-xs mx-auto">
              Set your local Hexo blog directory path to start managing your posts.
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
        )}

        {/* Invalid path */}
        {configured && !valid && (
          <div className="rounded-[18px] border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-10 text-center">
            <div className="w-14 h-14 rounded-[16px] bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-red-800 dark:text-red-300 mb-2">Invalid Hexo path</h2>
            <p className="text-[14px] text-red-600 dark:text-red-400 mb-6 max-w-xs mx-auto">
              The configured path is missing or invalid.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 h-[44px] rounded-[12px] bg-red-600 text-white text-[15px] font-semibold hover:bg-red-700 active:scale-[0.98] transition-all duration-150"
            >
              Update Settings
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
