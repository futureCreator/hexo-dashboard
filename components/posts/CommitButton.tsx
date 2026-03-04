"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

type CommitStatus = "idle" | "loading" | "success" | "error";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function CommitButton() {
  const [status, setStatus] = useState<CommitStatus>("idle");
  const [output, setOutput] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleCommit() {
    setStatus("loading");
    setShowLog(false);

    try {
      const res = await fetch("/api/git/commit", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
      setOutput(data.output || data.error || "");
    } catch {
      setStatus("error");
      setOutput("Network error: Failed to reach git commit API.");
    }
  }

  function handleDismiss() {
    setStatus("idle");
    setOutput("");
    setShowLog(false);
  }

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

  const isLoading = status === "loading";

  const toast = (status === "success" || status === "error") && (
    <motion.div
      key="toast"
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: easeOut }}
      className={`
        w-80 rounded-xl border p-4 shadow-lg
        ${status === "success" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
            ${status === "success" ? "bg-emerald-500" : "bg-red-500"}
          `}
        >
          {status === "success" ? (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${status === "success" ? "text-emerald-800" : "text-red-800"}`}>
            {status === "success" ? "Committed & Pushed" : "Failed"}
          </p>
          <p className={`text-xs mt-0.5 ${status === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {status === "success"
              ? "Changes committed and pushed to remote"
              : "An error occurred. Check the log."}
          </p>

          {output && (
            <button
              onClick={() => setShowLog((v) => !v)}
              className={`
                mt-2 text-xs underline underline-offset-2 cursor-pointer
                ${status === "success" ? "text-emerald-700" : "text-red-700"}
              `}
            >
              {showLog ? "Hide log" : "View log"}
            </button>
          )}

          <AnimatePresence>
            {showLog && output && (
              <motion.pre
                key="log"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`
                  mt-2 text-[10px] font-mono leading-relaxed
                  max-h-48 overflow-y-auto whitespace-pre-wrap break-all
                  rounded-lg p-2.5
                  ${status === "success" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}
                `}
              >
                {output}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleDismiss}
          className={`
            flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
            opacity-50 hover:opacity-100 transition-opacity cursor-pointer
            ${status === "success" ? "text-emerald-800" : "text-red-800"}
          `}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* Commit & Push button */}
      <button
        onClick={handleCommit}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
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
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Pushing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Commit & Push
            <kbd className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]">
              c
            </kbd>
          </>
        )}
      </button>

      {mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <AnimatePresence>
            {toast && <div className="pointer-events-auto">{toast}</div>}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </>
  );
}
