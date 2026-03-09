"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

type CommitStatus = "idle" | "loading" | "success" | "error";

export default function CommitButton() {
  const [status, setStatus] = useState<CommitStatus>("idle");
  const { showToast } = useToast();

  async function handleCommit() {
    setStatus("loading");

    try {
      const res = await fetch("/api/git/commit", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Changes committed and pushed to remote." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Commit failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach git commit API." });
    }

    // Reset to idle so the button can be used again
    setTimeout(() => setStatus("idle"), 300);
  }

  const isLoading = status === "loading";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "c" && e.key !== "C") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (status !== "idle") return;
      handleCommit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status]);

  return (
    <button
      onClick={handleCommit}
      disabled={isLoading}
      title="Commit & Push (c)"
      className={`
        flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 w-full sm:w-auto rounded-xl text-sm font-medium
        transition-all duration-200 cursor-pointer select-none border
        ${
          isLoading
            ? "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] cursor-not-allowed"
            : "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }
      `}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="hidden sm:inline">Pushing…</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="hidden sm:inline">Commit & Push</span>
          <kbd className="hidden sm:inline-flex ml-1 text-[10px] font-mono px-1 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]">
            c
          </kbd>
        </>
      )}
    </button>
  );
}
