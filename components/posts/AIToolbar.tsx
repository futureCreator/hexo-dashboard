"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EditorView } from "@codemirror/view";

type Action = "rewrite" | "expand" | "shorten" | "fix-grammar";

const ACTIONS: { id: Action; label: string }[] = [
  { id: "rewrite", label: "Rewrite" },
  { id: "expand", label: "Expand" },
  { id: "shorten", label: "Shorten" },
  { id: "fix-grammar", label: "Fix Grammar" },
];

interface SelectionState {
  text: string;
  start: number;
  end: number;
  x: number;
  y: number;
}

interface AIToolbarProps {
  editorViewRef: React.RefObject<EditorView | null>;
  content: string;
  onApply: (newContent: string) => void;
}

export default function AIToolbar({ editorViewRef, content, onApply }: AIToolbarProps) {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Detect text selection on mouseup — listen globally so timing of editor
  // mount doesn't matter; check the CodeMirror selection state on each event.
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      setTimeout(() => {
        const view = editorViewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        if (sel.empty) return;
        const text = view.state.sliceDoc(sel.from, sel.to);
        setSelection({ text, start: sel.from, end: sel.to, x: e.clientX, y: e.clientY });
        setResult(null);
      }, 10);
    }

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  // editorViewRef is a stable ref object — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on click outside toolbar (in capture phase to beat backdrop handlers)
  useEffect(() => {
    if (!selection) return;
    function onPointerDown(e: PointerEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setSelection(null);
        setResult(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selection]);

  // Escape dismisses toolbar (capture phase so it runs before EditModal's handler)
  useEffect(() => {
    if (!selection) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelection(null);
        setResult(null);
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [selection]);

  const runAction = useCallback(
    async (action: Action) => {
      if (!selection) return;
      setIsLoading(true);
      setResult("");

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, text: selection.text }),
        });

        if (!res.ok) {
          const data = await res.json();
          setResult(`Error: ${data.error}`);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }
      } catch (err) {
        setResult(`Error: ${String(err)}`);
      } finally {
        setIsLoading(false);
      }
    },
    [selection]
  );

  const handleApply = useCallback(() => {
    if (!selection || result === null) return;
    const newContent =
      content.substring(0, selection.start) + result + content.substring(selection.end);
    onApply(newContent);
    setSelection(null);
    setResult(null);
  }, [selection, result, content, onApply]);

  if (!selection) return null;

  // Position toolbar above the mouse point, clamped to viewport
  const TOOLBAR_WIDTH = result !== null ? 320 : 280;
  const rawX = selection.x - TOOLBAR_WIDTH / 2;
  const clampedX = Math.max(8, Math.min(rawX, window.innerWidth - TOOLBAR_WIDTH - 8));
  const clampedY = Math.max(8, selection.y - 12);

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: clampedX,
        top: clampedY,
        transform: "translateY(-100%)",
        zIndex: 200,
        width: TOOLBAR_WIDTH,
      }}
    >
      <AnimatePresence mode="wait">
        {result === null ? (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-0.5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1"
          >
            {/* Sparkle icon */}
            <span className="px-2 text-[var(--muted-foreground)]">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 3l1.5 4.5L11 9l-4.5 1.5L5 15l-1.5-4.5L-1 9l4.5-1.5L5 3z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
              </svg>
            </span>
            <div className="w-px h-4 bg-[var(--border)] mx-0.5" />
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => runAction(a.id)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-[var(--foreground)] hover:bg-[var(--accent-subtle)] transition-colors whitespace-nowrap cursor-pointer"
              >
                {a.label}
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden"
          >
            {/* Result preview */}
            <div className="p-3 max-h-44 overflow-y-auto">
              <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                {result}
                {isLoading && (
                  <span className="inline-block w-[2px] h-[13px] ml-0.5 align-middle bg-current opacity-70 animate-pulse" />
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)] bg-[var(--background)]">
              <button
                onClick={() => setResult(null)}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={handleApply}
                disabled={isLoading}
                style={{ backgroundColor: "var(--accent)" }}
                className="px-3 py-1 text-xs font-medium rounded-lg text-white disabled:opacity-40 transition-opacity cursor-pointer"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
