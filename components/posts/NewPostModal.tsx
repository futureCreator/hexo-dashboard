"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import type { HexoPost } from "@/lib/hexo";
import WriteForm, {
  WriteFormHandle,
  WriteFormState,
} from "@/components/posts/WriteForm";

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (post: HexoPost) => void;
}

export default function NewPostModal({ isOpen, onClose, onCreated }: NewPostModalProps) {
  const [mounted, setMounted] = useState(false);
  const writeFormRef = useRef<WriteFormHandle>(null);
  const [formState, setFormState] = useState<WriteFormState>({
    canSubmit: false,
    isGenerating: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleCreated = useCallback(
    (post: HexoPost) => {
      onClose();
      onCreated(post);
    },
    [onClose, onCreated]
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_24px_40px_rgba(0,0,0,0.15)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-[var(--muted-foreground)] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    New Post
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* WriteForm — key forces remount on open/close for state reset */}
              <WriteForm
                ref={writeFormRef}
                onCreated={handleCreated}
                onStateChange={setFormState}
                key={isOpen ? "open" : "closed"}
              />

              {/* Footer — hidden while AI is generating */}
              {!formState.isGenerating && (
                <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)]">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    disabled={formState.isGenerating}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!formState.canSubmit}
                    onClick={() => writeFormRef.current?.submit()}
                  >
                    Create Post
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
