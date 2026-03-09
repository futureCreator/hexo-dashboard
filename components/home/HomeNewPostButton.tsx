"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NewPostModal from "@/components/posts/NewPostModal";
import type { HexoPost } from "@/lib/hexo";

export default function HomeNewPostButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCreated = useCallback((_post: HexoPost) => {
    router.push("/posts");
    router.refresh();
  }, [router]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="New Post"
        className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 w-full sm:w-auto rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shrink-0"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">New Post</span>
      </button>
      <NewPostModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
