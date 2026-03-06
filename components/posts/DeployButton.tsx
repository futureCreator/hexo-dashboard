"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";

type DeployStatus = "idle" | "running" | "success" | "error";

const easeOut = [0.16, 1, 0.3, 1];

function stripAnsi(str: string) {
  return str.replace(/\x1b\[[0-9;]*[mGKHFJ]/g, "");
}

function getLineClass(line: string) {
  const l = line.toLowerCase();
  if (l.includes("error") || l.includes("fatal")) return "text-red-400";
  if (l.includes("warn")) return "text-yellow-400";
  if (l.match(/^\s*(info|inf)\s/i)) return "text-sky-400";
  return "text-white/70";
}

export default function DeployButton() {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();
  const logEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "running";

  async function handleDeploy() {
    if (isLoading || showModal) return;

    setStatus("running");
    setLogs([]);
    setShowModal(true);

    try {
      const res = await fetch("/api/deploy", { method: "POST" });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(event.slice(6));
            if (data.type === "log") {
              const line = stripAnsi(data.line);
              if (line.trim()) setLogs((prev) => [...prev, line]);
            } else if (data.type === "done") {
              if (data.success) {
                setStatus("success");
                showToast({ type: "success", message: "Deploy succeeded." });
              } else {
                setStatus("error");
                showToast({ type: "error", message: "Deploy failed." });
              }
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach deploy API." });
    }
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "d" && e.key !== "D") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (isLoading || showModal) return;
      handleDeploy();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, showModal]);

  function handleClose() {
    if (isLoading) return;
    setShowModal(false);
    setTimeout(() => setStatus("idle"), 200);
  }

  return (
    <>
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

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-[660px] max-w-[92vw] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.07]"
                style={{ background: "#0d0d10" }}
              >
                {/* Terminal title bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                      <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                    </div>
                    <span className="text-xs text-white/40 font-mono">
                      hexo generate &amp;&amp; hexo deploy
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {status === "success" && (
                      <span className="text-xs text-green-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Succeeded
                      </span>
                    )}
                    {status === "error" && (
                      <span className="text-xs text-red-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Failed
                      </span>
                    )}
                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className="text-white/30 hover:text-white/70 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Log output */}
                <div className="h-80 overflow-y-auto p-4 space-y-0.5">
                  {logs.length === 0 && isLoading && (
                    <span className="text-white/30 text-xs font-mono animate-pulse">Initializing...</span>
                  )}
                  {logs.map((line, i) => (
                    <div key={i} className={`text-xs font-mono leading-5 whitespace-pre-wrap break-all ${getLineClass(line)}`}>
                      {line}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>

                {/* Footer */}
                {isLoading && (
                  <div className="px-4 py-2.5 border-t border-white/[0.07] flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-white/30 font-mono">Running…</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
