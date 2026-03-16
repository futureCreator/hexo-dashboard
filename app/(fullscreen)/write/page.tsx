"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import WriteForm from "@/components/posts/WriteForm";
import type { WriteFormHandle, WriteFormState } from "@/components/posts/WriteForm";
import type { HexoPost } from "@/lib/hexo";

export default function WritePage() {
  const router = useRouter();
  const formRef = useRef<WriteFormHandle>(null);
  const [formState, setFormState] = useState<WriteFormState>({ canSubmit: false, isGenerating: false });

  const handleCreated = useCallback(
    (post: HexoPost) => {
      router.replace(`/edit?path=${encodeURIComponent(post.filepath)}`);
    },
    [router]
  );

  return (
    <div className="min-h-dvh bg-[var(--background)] flex flex-col">
      {/* iOS-style nav bar */}
      <div
        className="sticky top-0 z-10 border-b border-[var(--border)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          background: "color-mix(in srgb, var(--card) 85%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-11">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[var(--accent)] text-[15px] font-medium"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <span className="text-[16px] font-semibold text-[var(--foreground)]">New Post</span>
          <div className="w-[60px]" />
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        <WriteForm ref={formRef} onCreated={handleCreated} onStateChange={setFormState} />
      </div>

      {/* Sticky bottom button */}
      {!formState.isGenerating && (
        <div
          className="fixed bottom-0 left-0 right-0 z-10 px-4 pt-3"
          style={{
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, var(--background) 70%, transparent)",
          }}
        >
          <button
            onClick={() => formRef.current?.submit()}
            disabled={!formState.canSubmit}
            className="w-full py-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white text-[16px] font-bold rounded-[14px] disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            Create Post
          </button>
        </div>
      )}
    </div>
  );
}
