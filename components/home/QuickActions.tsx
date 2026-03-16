"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCommit } from "@/hooks/useCommit";
import { useDeploy, getLineClass } from "@/hooks/useDeploy";
import { useClean } from "@/hooks/useClean";

const easeOut = [0.16, 1, 0.3, 1] as const;

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CommitIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h6m6 0h6" />
    </svg>
  );
}

function DeployIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function CleanIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function QuickActions() {
  const { status: commitStatus, handleCommit } = useCommit();
  const { status: deployStatus, logs, showModal, handleDeploy, handleClose } = useDeploy();
  const { status: cleanStatus, handleClean } = useClean();
  const logEndRef = useRef<HTMLDivElement>(null);

  const isCommitting = commitStatus === "loading";
  const isDeploying = deployStatus === "running";
  const isCleaning = cleanStatus === "loading";

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const buttonBase =
    "flex flex-col items-center gap-2 p-3.5 bg-[var(--card)] rounded-[14px] border border-[var(--border)] active:scale-95 transition-transform select-none cursor-pointer";

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {/* Commit */}
        <button className={buttonBase} onClick={handleCommit} disabled={isCommitting}>
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--success)" }}
          >
            {isCommitting ? <Spinner /> : <CommitIcon />}
          </div>
          <span className="text-[13px] font-semibold text-[var(--foreground)]">Commit</span>
        </button>

        {/* Deploy */}
        <button className={buttonBase} onClick={handleDeploy} disabled={isDeploying}>
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--accent)" }}
          >
            {isDeploying ? <Spinner /> : <DeployIcon />}
          </div>
          <span className="text-[13px] font-semibold text-[var(--foreground)]">Deploy</span>
        </button>

        {/* Clean */}
        <button className={buttonBase} onClick={handleClean} disabled={isCleaning}>
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--warning)" }}
          >
            {isCleaning ? <Spinner /> : <CleanIcon />}
          </div>
          <span className="text-[13px] font-semibold text-[var(--foreground)]">Clean</span>
        </button>
      </div>

      {/* Deploy bottom sheet */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleClose}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] rounded-t-2xl border-t border-[var(--border)] flex flex-col"
              style={{ maxHeight: "70vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-[var(--muted-foreground)]/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-2">
                  {isDeploying && (
                    <svg className="w-4 h-4 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {deployStatus === "success" && (
                    <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {deployStatus === "error" && (
                    <svg className="w-4 h-4 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="text-sm font-semibold text-[var(--foreground)]">Deploy Logs</span>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isDeploying}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] disabled:opacity-30 active:bg-[var(--muted)] transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Log body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-0.5" style={{ background: "#0d0d10" }}>
                {logs.length === 0 && isDeploying && (
                  <span className="text-white/30 text-xs font-mono animate-pulse">Initializing...</span>
                )}
                {logs.map((line, i) => (
                  <div
                    key={i}
                    className={`text-xs font-mono leading-5 whitespace-pre-wrap break-all ${getLineClass(line)}`}
                  >
                    {line}
                  </div>
                ))}
                {isDeploying && logs.length > 0 && (
                  <span className="text-[var(--accent)] text-xs font-mono animate-pulse">▌</span>
                )}
                <div ref={logEndRef} />
              </div>

              {/* Safe area bottom padding */}
              <div className="shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
