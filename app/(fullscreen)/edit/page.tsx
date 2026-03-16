"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import PostEditor from "@/components/posts/PostEditor";
import type { PostEditorHandle } from "@/components/posts/PostEditor";
import MarkdownAccessoryBar from "@/components/editor/MarkdownAccessoryBar";
import { useKeyboardHeight } from "@/components/editor/useKeyboardHeight";

// ─── Inner content (requires Suspense boundary for useSearchParams) ────────────

function EditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filepath = searchParams.get("path") ?? "";
  const filename = filepath.split("/").pop() ?? "";

  const editorRef = useRef<PostEditorHandle>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const { keyboardVisible } = useKeyboardHeight();

  const handleBack = useCallback(() => {
    if (editorRef.current?.isDirty) {
      setShowConfirm(true);
    } else {
      router.back();
    }
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    setIsSavingLocal(true);
    try {
      await editorRef.current.save();
    } finally {
      setIsSavingLocal(false);
    }
  }, []);

  if (!filepath) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--muted-foreground)]">No file path provided</p>
      </div>
    );
  }

  // Derive a display-friendly filename (strip extension)
  const displayName = filename.replace(/\.md$/, "");

  return (
    <div className="h-dvh bg-[var(--background)] flex flex-col overflow-hidden">
      {/* ── Nav bar ─────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 border-b border-[var(--border)] shrink-0"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          background: "color-mix(in srgb, var(--card) 85%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-11">
          {/* Left: Back / Done button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-[var(--accent)] text-[15px] font-medium min-w-[60px]"
          >
            {keyboardVisible ? (
              /* When keyboard is visible show "Done" without chevron */
              <span>Done</span>
            ) : (
              <>
                <svg
                  className="w-[18px] h-[18px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 18l-6-6 6-6"
                  />
                </svg>
                <span>Back</span>
              </>
            )}
          </button>

          {/* Center: title area */}
          <div className="flex items-center gap-1.5 min-w-0">
            {!keyboardVisible && (
              /* Edit icon — only when keyboard hidden */
              <svg
                className="w-[15px] h-[15px] text-[var(--muted-foreground)] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            )}
            <span className="text-[15px] font-semibold text-[var(--foreground)] truncate max-w-[180px]">
              {displayName}
            </span>
            {/* Unsaved indicator dot */}
            {!keyboardVisible && (
              <UnsavedDot editorRef={editorRef} />
            )}
          </div>

          {/* Right: Save button */}
          <button
            onClick={handleSave}
            disabled={isSavingLocal}
            className="text-[var(--accent)] text-[15px] font-semibold disabled:opacity-40 min-w-[60px] text-right"
          >
            {isSavingLocal ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────────── */}
      <PostEditor
        ref={editorRef}
        filepath={filepath}
        filename={filename}
        onSaved={() => {}}
      />

      {/* ── Markdown accessory bar (keyboard visible only) ───────────────────── */}
      {keyboardVisible && (
        <MarkdownAccessoryBar
          onInsert={(text) => editorRef.current?.insertTextAtCursor(text)}
          onDismiss={() => (document.activeElement as HTMLElement)?.blur()}
        />
      )}

      {/* ── Unsaved changes confirmation dialog ─────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-[env(safe-area-inset-bottom)] sm:items-center">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />

          {/* Dialog card */}
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--card)" }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-[var(--border)]">
              <h2 className="text-[17px] font-semibold text-[var(--foreground)]">
                Discard changes?
              </h2>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                Your changes will be lost.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col divide-y divide-[var(--border)]">
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 text-[17px] font-medium text-[var(--accent)] hover:bg-[var(--muted)] active:bg-[var(--muted)] transition-colors"
              >
                Keep editing
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  router.back();
                }}
                className="w-full py-4 text-[17px] font-semibold text-red-500 hover:bg-[var(--muted)] active:bg-[var(--muted)] transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tiny reactive unsaved-dot component ─────────────────────────────────────
// Uses a polling trick since PostEditorHandle.isDirty is a getter on the ref,
// not React state — we re-read it on every render triggered by the parent.
// A simpler approach: subscribe via a local state updated through onSaved/onChange
// is not available here, so we use a small self-contained observer.

function UnsavedDot({ editorRef }: { editorRef: React.RefObject<PostEditorHandle | null> }) {
  // We read from the ref synchronously. Since this is rendered as part of the
  // parent's render cycle, any state change in PostEditor that causes a parent
  // re-render will naturally update this too.
  const isDirty = editorRef.current?.isDirty ?? false;

  if (!isDirty) return null;

  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"
      aria-label="Unsaved changes"
    />
  );
}

// ─── Page export with Suspense boundary ──────────────────────────────────────

export default function EditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
          <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
        </div>
      }
    >
      <EditPageContent />
    </Suspense>
  );
}
