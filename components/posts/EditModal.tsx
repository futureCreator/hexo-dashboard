"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import PostEditor, { PostEditorHandle } from "@/components/posts/PostEditor";

interface EditModalProps {
  isOpen: boolean;
  filepath: string;
  filename: string;
  onClose: () => void;
  onSaved: () => void;
  contentApiBase?: string;
}

export default function EditModal({
  isOpen,
  filepath,
  filename,
  onClose,
  onSaved,
  contentApiBase = "/api/posts/content",
}: EditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const editorRef = useRef<PostEditorHandle>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    if (editorRef.current?.isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [onClose]);

  // Cmd/Ctrl+S to save, Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        editorRef.current?.save();
      } else if (e.key === "Escape") {
        if (showConfirm) {
          setShowConfirm(false);
        } else {
          handleClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose, showConfirm]);

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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-[60] flex flex-col"
          >
            <div className="relative flex flex-col h-full">
              <div className="flex flex-col h-full bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_24px_40px_rgba(0,0,0,0.15)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span className="text-sm font-mono text-[var(--foreground)] truncate">
                      {filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => editorRef.current?.openLinkPicker()}
                      title="관련 글 삽입"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      관련 글
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleClose}
                      disabled={editorRef.current?.isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => editorRef.current?.save()}
                      disabled={editorRef.current?.isSaving}
                    >
                      {editorRef.current?.isSaving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>

                {/* Body — PostEditor fills the remaining space */}
                <PostEditor
                  ref={editorRef}
                  filepath={filepath}
                  filename={filename}
                  onSaved={onSaved}
                  contentApiBase={contentApiBase}
                />

                {/* Footer */}
                <div className="px-5 py-2 border-t border-[var(--border)] shrink-0 flex items-center justify-end">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    ⌘S Save · Esc Close · 이미지 드롭으로 삽입
                  </span>
                </div>
              </div>

              {/* Unsaved changes confirm overlay */}
              <AnimatePresence>
                {showConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-[2px]"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-80 mx-4"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                        Discard changes?
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mb-5">
                        Your changes will be lost.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowConfirm(false)}
                        >
                          Keep editing
                        </Button>
                        <Button variant="danger" size="sm" onClick={onClose}>
                          Discard
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
