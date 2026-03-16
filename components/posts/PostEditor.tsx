"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditorView } from "@codemirror/view";
import CodeEditor, { CodeEditorHandle } from "@/components/posts/CodeEditor";
import { useTheme } from "@/components/providers/ThemeProvider";
import { apiUrl } from "@/lib/api";
import type { HexoPost } from "@/lib/hexo";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface PostEditorHandle {
  isDirty: boolean;
  save: () => Promise<void>;
  isSaving: boolean;
  insertTextAtCursor: (text: string) => void;
  openLinkPicker: () => void;
}

interface PostEditorProps {
  filepath: string;
  filename: string;
  onSaved: () => void;
  contentApiBase?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ filepath, filename: _filename, onSaved, contentApiBase = "/api/posts/content" }, ref) => {
    const { resolvedTheme } = useTheme();

    // Content state
    const [content, setContent] = useState("");
    const [original, setOriginal] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Drag-and-drop state
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Post link picker state
    const [showPostPicker, setShowPostPicker] = useState(false);
    const [pickerPosts, setPickerPosts] = useState<HexoPost[]>([]);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerLoading, setPickerLoading] = useState(false);

    // Refs
    const codeEditorRef = useRef<CodeEditorHandle>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const dragCounterRef = useRef(0);
    const pickerSearchRef = useRef<HTMLInputElement>(null);

    // Computed
    const isDirty = content !== original;

    // ── Fetch content on filepath change ──────────────────────────────────────
    useEffect(() => {
      if (!filepath) return;

      setIsLoading(true);
      setError(null);
      setContent("");
      setOriginal("");
      fetch(apiUrl(`${contentApiBase}?filepath=${encodeURIComponent(filepath)}`))
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
    }, [filepath, contentApiBase]);

    // ── Focus editor after load ───────────────────────────────────────────────
    useEffect(() => {
      if (!isLoading) {
        codeEditorRef.current?.view?.focus();
      }
    }, [isLoading]);

    // ── Save handler ──────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(contentApiBase), {
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
      } catch (err) {
        setError(String(err));
      } finally {
        setIsSaving(false);
      }
    }, [filepath, content, contentApiBase, onSaved]);

    // ── Insert text at cursor ─────────────────────────────────────────────────
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

    // ── Post link picker ──────────────────────────────────────────────────────
    const openPostPicker = useCallback(() => {
      setPickerSearch("");
      setShowPostPicker(true);
      setPickerLoading(true);
      fetch(apiUrl("/api/posts"))
        .then((r) => r.json())
        .then((data) => setPickerPosts(data.posts ?? []))
        .catch(() => setPickerPosts([]))
        .finally(() => {
          setPickerLoading(false);
          setTimeout(() => pickerSearchRef.current?.focus(), 50);
        });
    }, []);

    const handleInsertPostLink = useCallback(
      (post: HexoPost) => {
        const base = post.filename.replace(/\.md$/, "");
        const dateSlugMatch = base.match(/^\d{8}-(.+)$/);
        const slug = dateSlugMatch ? dateSlugMatch[1] : base;
        const tag = `{% post_link ${slug} "${post.title}" %}`;
        insertTextAtCursor(tag);
        setShowPostPicker(false);
        setPickerSearch("");
      },
      [insertTextAtCursor]
    );

    // ── Drag & drop handlers ──────────────────────────────────────────────────
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
            const res = await fetch(apiUrl("/api/media/upload"), { method: "POST", body: fd });
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

    // ── Imperative handle ─────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      get isDirty() {
        return content !== original;
      },
      save: handleSave,
      get isSaving() {
        return isSaving;
      },
      insertTextAtCursor,
      openLinkPicker: openPostPicker,
    }));

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div
        className="relative flex-1 min-h-0 h-full"
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
                <svg
                  className="w-10 h-10 text-[var(--accent)] mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
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
                Uploading…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading / error / editor */}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          <CodeEditor
            ref={codeEditorRef}
            value={content}
            onChange={setContent}
            isDark={resolvedTheme === "dark"}
            onViewMount={(view) => {
              editorViewRef.current = view;
            }}
          />
        )}

        {/* Post link picker panel */}
        <AnimatePresence>
          {showPostPicker && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 bottom-0 z-20 bg-[var(--card)] border-t border-[var(--border)] shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "55%" }}
            >
              {/* Picker header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <svg
                  className="w-4 h-4 text-[var(--accent)] shrink-0"
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
                <input
                  ref={pickerSearchRef}
                  type="text"
                  placeholder="포스트 검색…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="flex-1 text-sm bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                />
                <button
                  onClick={() => setShowPostPicker(false)}
                  className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
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

              {/* Post list */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(55vh - 52px)" }}>
                {pickerLoading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-[var(--muted-foreground)]">
                    <svg
                      className="w-4 h-4 animate-spin mr-2"
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
                ) : (() => {
                  const q = pickerSearch.toLowerCase();
                  const filtered = pickerPosts.filter(
                    (p) =>
                      !q ||
                      p.title.toLowerCase().includes(q) ||
                      p.filename.toLowerCase().includes(q) ||
                      p.tags.some((tag) => tag.toLowerCase().includes(q))
                  );
                  return filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    filtered.map((post) => (
                      <button
                        key={post.filepath}
                        onClick={() => handleInsertPostLink(post)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--muted)] transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {post.draft && (
                              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]">
                                Draft
                              </span>
                            )}
                            <span className="text-sm text-[var(--foreground)] truncate font-medium">
                              {post.title}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)] font-mono">
                            {post.abbrlink != null ? `abbrlink: ${post.abbrlink}` : post.filename}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                          삽입 →
                        </span>
                      </button>
                    ))
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

PostEditor.displayName = "PostEditor";
export default PostEditor;
