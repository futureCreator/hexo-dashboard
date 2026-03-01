import { Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
import PostList from "@/components/posts/PostList";
import DeployButton from "@/components/posts/DeployButton";
import { loadSettings } from "@/lib/settings";
import { readPosts, hexoPathValid } from "@/lib/hexo";

export const dynamic = "force-dynamic";

async function getPostsData() {
  const { hexoPath } = loadSettings();
  if (!hexoPath) return { configured: false, posts: [], hexoPath: "" };
  if (!hexoPathValid(hexoPath)) return { configured: true, valid: false, posts: [], hexoPath };
  const posts = readPosts(hexoPath);
  return { configured: true, valid: true, posts, hexoPath };
}

export default async function PostsPage() {
  const { configured, valid, posts } = await getPostsData();

  return (
    <DashboardLayout>
      <div className="px-8 py-10 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <SectionLabel pulse className="mb-4">
              Posts
            </SectionLabel>
            <h1 className="font-display text-4xl text-[var(--foreground)] leading-tight mb-2">
              Your{" "}
              <span className="gradient-text">Blog Posts</span>
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Manage and organize all your Hexo blog posts in one place.
            </p>
          </div>
          {configured && valid && <DeployButton />}
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
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
            <p className="text-sm text-red-700 mb-4">
              The configured Hexo path is no longer valid. Please update your settings.
            </p>
            <Link
              href="/settings"
              className="text-sm text-red-700 underline hover:no-underline"
            >
              Update Settings →
            </Link>
          </div>
        )}

        {/* Posts list */}
        {configured && valid && (
          <Suspense fallback={<div className="text-[var(--muted-foreground)] text-sm">Loading posts...</div>}>
            <PostList initialPosts={posts} />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
