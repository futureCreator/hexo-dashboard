"use client";

import { useEffect } from "react";
import { useClean } from "@/hooks/useClean";

export default function CleanButton() {
  const { status, handleClean } = useClean();
  const isLoading = status === "loading";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "x" && e.key !== "X") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (status !== "idle") return;
      handleClean();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, handleClean]);

  return (
    <button
      onClick={handleClean}
      disabled={isLoading}
      title="Clean (x)"
      className={`
        flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 w-full sm:w-auto rounded-xl text-sm font-medium
        transition-all duration-200 cursor-pointer select-none
        ${
          isLoading
            ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
            : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] hover:-translate-y-0.5"
        }
      `}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="hidden sm:inline">Cleaning…</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Clean</span>
          <kbd className="hidden sm:inline-flex ml-1 text-[10px] font-mono px-1 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]">
            x
          </kbd>
        </>
      )}
    </button>
  );
}
