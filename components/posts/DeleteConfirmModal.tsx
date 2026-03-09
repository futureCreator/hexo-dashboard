"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

interface ReferencedPost {
  filename: string;
  title: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  referencedBy?: ReferencedPost[];
  isCheckingRefs?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  onConfirm,
  onCancel,
  isDeleting = false,
  referencedBy,
  isCheckingRefs = false,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hasRefs = referencedBy && referencedBy.length > 0;

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md px-4"
          >
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_20px_25px_rgba(0,0,0,0.1)] p-6">
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Delete Post
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Are you sure you want to delete{" "}
                <span className="font-medium text-[var(--foreground)]">
                  &ldquo;{title}&rdquo;
                </span>
                ? This action cannot be undone.
              </p>

              {/* Reference warning */}
              {isCheckingRefs && (
                <div className="mb-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Checking references...
                </div>
              )}

              {!isCheckingRefs && hasRefs && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1.5">
                        {referencedBy.length}개의 포스트에서 이 글을 참조하고 있습니다. 삭제 시 해당 참조도 자동으로 제거됩니다.
                      </p>
                      <ul className="space-y-0.5">
                        {referencedBy.map((ref) => (
                          <li
                            key={ref.filename}
                            className="text-xs text-amber-700 dark:text-amber-400 font-mono truncate"
                          >
                            {ref.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCancel}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="solid-danger"
                  size="sm"
                  onClick={onConfirm}
                  disabled={isDeleting || isCheckingRefs}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
