"use client";

import { useRouter } from "next/navigation";
import type { HexoPost } from "@/lib/hexo";

interface Props {
  posts: HexoPost[];
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return "Just now";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 shrink-0 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function RecentDrafts({ posts }: Props) {
  const router = useRouter();

  const drafts = posts
    .filter((p) => p.draft)
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 3);

  if (drafts.length === 0) return null;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {drafts.map((post, i) => (
        <div key={post.filepath}>
          <button
            className="w-full flex items-center justify-between active:bg-[var(--muted)] transition-colors"
            style={{ padding: "12px 16px" }}
            onClick={() => router.push(`/edit?path=${encodeURIComponent(post.filepath)}`)}
          >
            <div className="flex flex-col items-start min-w-0 mr-2">
              <span className="text-[14px] font-medium text-[var(--foreground)] truncate w-full text-left leading-snug">
                {post.title}
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                Draft · {relativeTime(post.date)}
              </span>
            </div>
            <ChevronRight />
          </button>
          {i < drafts.length - 1 && (
            <div className="h-px bg-[var(--border)] mx-4" />
          )}
        </div>
      ))}
    </div>
  );
}
