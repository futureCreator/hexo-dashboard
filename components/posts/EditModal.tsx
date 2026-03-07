"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { EditorView } from "@codemirror/view";
import Button from "@/components/ui/Button";
import AIToolbar from "@/components/posts/AIToolbar";
import CodeEditor, { CodeEditorHandle } from "@/components/posts/CodeEditor";
import { useTheme } from "@/components/providers/ThemeProvider";

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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !filepath) return;

    setIsLoading(true);
    setError(null);
    fetch(`${contentApiBase}?filepath=${encodeURIComponent(filepath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content);
          setOriginal(data.content);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setIsLoading(false));
  }, [isOpen, filepath]);

  // Focus editor after load
  useEffect(() => {
    if (!isLoading && isOpen) {
      codeEditorRef.current?.view?.focus();
    }
  }, [isLoading, isOpen]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(contentApiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setOriginal(content);
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  }, [filepath, content, onSaved, onClose]);

  const isDirty = content !== original;

  const insertTextAtCursor = useCallback((text: string) => {
    const view = editorViewRef.current;
    if (!view) {
      setContent((prev) => prev + "\n" + text);
      return;
    }
    const { from } = view.state.selection.main;
    view.dispatch({
      changes: { from, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }, []);

  const handleEditorDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleEditorDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleEditorDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      setIsUploading(true);
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch("/api/media/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (res.ok && data.relpath) {
            const alt = data.filename ?? data.relpath;
            insertTextAtCursor(`![${alt}](/images/${data.relpath})`);
          }
        } catch {
          // silently skip failed uploads
        }
      }
      setIsUploading(false);
    },
    [insertTextAtCursor]
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Cmd/Ctrl+S to save, Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
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
  }, [isOpen, handleSave, handleClose, showConfirm]);

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
                  {isDirty && (
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                      · Unsaved changes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || isLoading || !isDirty}
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div
                className="flex-1 min-h-0 relative"
                onDragEnter={handleEditorDragEnter}
                onDragLeave={handleEditorDragLeave}
                onDragOver={handleEditorDragOver}
                onDrop={handleEditorDrop}
              >
                {/* Drag-over overlay */}
                <AnimatePresence>
                  {isDragOver && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)] rounded-b-2xl pointer-events-none"
                    >
                      <div className="text-center">
                        <svg className="w-10 h-10 text-[var(--accent)] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="text-[var(--accent)] font-medium text-sm">Drop image to insert</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload spinner overlay */}
                <AnimatePresence>
                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--card)]/70 backdrop-blur-[2px] pointer-events-none"
                    >
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
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
                      Loading…
                    </div>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : (
                  <>
                  <AIToolbar
                    editorViewRef={editorViewRef}
                    content={content}
                    onApply={(newContent) => {
                      setContent(newContent);
                      requestAnimationFrame(() => codeEditorRef.current?.view?.focus());
                    }}
                  />
                  <CodeEditor
                    ref={codeEditorRef}
                    value={content}
                    onChange={setContent}
                    isDark={resolvedTheme === "dark"}
                    onViewMount={(view) => { editorViewRef.current = view; }}
                  />
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2 border-t border-[var(--border)] shrink-0 flex items-center justify-end">
                <span className="text-xs text-[var(--muted-foreground)]">
                  ⌘S Save · Esc Close · 텍스트 드래그로 AI 편집 · 이미지 드롭으로 삽입
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
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={onClose}
                        >
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
