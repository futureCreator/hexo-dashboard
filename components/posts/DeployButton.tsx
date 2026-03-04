"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

type DeployStatus = "idle" | "loading" | "success" | "error";

export default function DeployButton() {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const { showToast } = useToast();

  async function handleDeploy() {
    setStatus("loading");

    try {
      const res = await fetch("/api/deploy", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Build & deploy succeeded." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Deploy failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach deploy API." });
    }

    setTimeout(() => setStatus("idle"), 300);
  }

  const isLoading = status === "loading";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "d" && e.key !== "D") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (isLoading) return;
      handleDeploy();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <button
      onClick={handleDeploy}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 cursor-pointer select-none
        ${
          isLoading
            ? "bg-[rgba(0,82,255,0.08)] text-[var(--accent)] border border-[rgba(0,82,255,0.2)] cursor-not-allowed"
            : "bg-gradient-to-r from-[var(--accent)] to-[#4D7CFF] text-white shadow-sm hover:shadow-[0_4px_14px_rgba(0,82,255,0.25)] hover:-translate-y-0.5"
        }
      `}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Deploying…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Deploy
          <kbd className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded border border-white/30 text-white/70 bg-white/10">
            d
          </kbd>
        </>
      )}
    </button>
  );
}
