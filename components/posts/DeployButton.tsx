"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

type DeployStatus = "idle" | "loading" | "success" | "error";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function DeployButton() {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [output, setOutput] = useState<string>("");
  const [showLog, setShowLog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleDeploy() {
    setStatus("loading");
    setOutput("");
    setShowLog(false);

    try {
      const res = await fetch("/api/deploy", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
      setOutput(data.output || data.error || "");
    } catch {
      setStatus("error");
      setOutput("Network error: Failed to reach deploy API.");
    }
  }

  function handleDismiss() {
    setStatus("idle");
    setOutput("");
    setShowLog(false);
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

  const toast = (status === "success" || status === "error") && (
    <motion.div
      key="toast"
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: easeOut }}
      className={`
        w-80 rounded-xl border p-4 shadow-lg
        ${
          status === "success"
            ? "bg-emerald-50 border-emerald-200"
            : "bg-red-50 border-red-200"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold ${
              status === "success" ? "text-emerald-800" : "text-red-800"
            }`}
          >
            {status === "success" ? "Deployed" : "Deploy Failed"}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              status === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {status === "success"
              ? "Build & deploy succeeded"
              : "An error occurred. Check the log."}
          </p>

          {/* Log toggle */}
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
                  ${
                    status === "success"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-red-100 text-red-900"
                  }
                `}
              >
                {output}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>

        {/* Dismiss */}
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
      {/* Deploy button */}
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
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Deploying…
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Deploy
            <kbd className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded border border-white/30 text-white/70 bg-white/10">
              d
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
