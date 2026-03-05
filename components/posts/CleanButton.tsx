"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

type CleanStatus = "idle" | "loading" | "success" | "error";

export default function CleanButton() {
  const [status, setStatus] = useState<CleanStatus>("idle");
  const { showToast } = useToast();

  async function handleClean() {
    setStatus("loading");

    try {
      const res = await fetch("/api/clean", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Clean succeeded." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Clean failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach clean API." });
    }

    setTimeout(() => setStatus("idle"), 300);
  }

  const isLoading = status === "loading";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "x" && e.key !== "X") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (isLoading) return;
      handleClean();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <button
      onClick={handleClean}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 cursor-pointer select-none
        ${
          isLoading
            ? "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] cursor-not-allowed"
            : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-y-0.5"
        }
      `}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cleaning…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clean
          <kbd className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] bg-[var(--surface)]">
            x
          </kbd>
        </>
      )}
    </button>
  );
}
