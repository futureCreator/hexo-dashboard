"use client";

import { useRouter } from "next/navigation";
import type { HexoPost } from "@/lib/hexo";
import StreakCard from "./StreakCard";
import QuickActions from "./QuickActions";
import RecentDrafts from "./RecentDrafts";

interface Props {
  posts: HexoPost[];
}

function SparkleIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 px-0.5">
    {children}
  </div>
);

export default function MobileHome({ posts }: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* Streak Card */}
      <StreakCard posts={posts} />

      {/* AI Write CTA */}
      <button
        onClick={() => router.push("/write")}
        className="flex items-center gap-3.5 p-[18px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] rounded-2xl active:scale-[0.98] transition-transform w-full text-left select-none"
      >
        {/* Sparkle icon container */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.20)" }}
        >
          <SparkleIcon />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-white leading-snug">AI로 새 글 쓰기</div>
          <div className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.70)" }}>
            AI가 아이디어에서 초안까지 도와드려요
          </div>
        </div>

        {/* Chevron */}
        <div style={{ color: "rgba(255,255,255,0.60)" }}>
          <ChevronRightIcon />
        </div>
      </button>

      {/* Quick Actions */}
      <div>
        <SectionLabel>Quick Actions</SectionLabel>
        <QuickActions />
      </div>

      {/* Recent Drafts */}
      <div>
        <SectionLabel>Recent Drafts</SectionLabel>
        <RecentDrafts posts={posts} />
      </div>
    </div>
  );
}
