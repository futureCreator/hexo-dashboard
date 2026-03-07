"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";

interface MediaFile {
  filename: string;
  size: number;
  mtime: string;
}

interface FolderData {
  folders: string[];
  images: MediaFile[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  // folderPath: array of path segments, e.g. [] = root, ["2024"] = source/images/2024
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const [data, setData] = useState<FolderData>({ folders: [], images: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async (path: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const folder = path.join("/");
      const res = await fetch(`/api/media${folder ? `?folder=${encodeURIComponent(folder)}` : ""}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
      } else {
        setData(json);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(folderPath);
  }, [folderPath, fetchData]);

  const navigateTo = useCallback((segments: string[]) => {
    setFolderPath(segments);
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      setUploading(true);
      let uploaded = 0;
      const folder = folderPath.join("/");
      for (const file of arr) {
        const fd = new FormData();
        fd.append("file", file);
        if (folder) fd.append("folder", folder);
        try {
          const res = await fetch("/api/media/upload", { method: "POST", body: fd });
          const d = await res.json();
          if (res.ok) {
            uploaded++;
          } else {
            showToast(`${file.name}: ${d.error}`, "error");
          }
        } catch {
          showToast(`${file.name}: upload failed`, "error");
        }
      }
      setUploading(false);
      if (uploaded > 0) {
        showToast(uploaded === 1 ? "Image uploaded" : `${uploaded} images uploaded`, "success");
        await fetchData(folderPath);
      }
    },
    [folderPath, fetchData, showToast]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      const relpath = [...folderPath, filename].join("/");
      setDeletingFile(filename);
      try {
        const res = await fetch("/api/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relpath }),
        });
        const d = await res.json();
        if (res.ok) {
          setData((prev) => ({
            ...prev,
            images: prev.images.filter((img) => img.filename !== filename),
          }));
          showToast("Image deleted", "success");
        } else {
          showToast(d.error ?? "Delete failed", "error");
        }
      } catch {
        showToast("Delete failed", "error");
      } finally {
        setDeletingFile(null);
      }
    },
    [folderPath, showToast]
  );

  const handleCopy = useCallback(
    (filename: string) => {
      const hexoRelPath = [...folderPath, filename].join("/");
      const markdown = `![${filename}](/images/${hexoRelPath})`;
      navigator.clipboard.writeText(markdown).then(() => {
        setCopiedFile(filename);
        setTimeout(() => setCopiedFile(null), 2000);
      });
    },
    [folderPath]
  );

  // Page-level drag-and-drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) uploadFiles(files);
    },
    [uploadFiles]
  );

  const isEmpty = !isLoading && !error && data.folders.length === 0 && data.images.length === 0;

  return (
    <DashboardLayout>
      <div
        className="px-4 py-6 sm:px-8 sm:py-10 max-w-6xl relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <SectionLabel pulse className="mb-4">
              Media
            </SectionLabel>
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] leading-tight mb-2">
              Your <span className="gradient-text">Images</span>
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              <code className="font-mono text-xs bg-[var(--muted)] px-1.5 py-0.5 rounded">
                source/images
              </code>{" "}
              폴더 관리 · 드래그 앤 드롭으로 업로드
            </p>
          </div>
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#4D7CFF] text-white text-sm font-medium shadow-sm hover:shadow-[0_4px_14px_rgba(0,82,255,0.25)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 mb-6 text-sm flex-wrap">
          <button
            onClick={() => navigateTo([])}
            className={`px-2 py-1 rounded-md transition-colors ${
              folderPath.length === 0
                ? "text-[var(--foreground)] font-medium"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            images
          </button>
          {folderPath.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[var(--border)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button
                onClick={() => navigateTo(folderPath.slice(0, i + 1))}
                className={`px-2 py-1 rounded-md transition-colors ${
                  i === folderPath.length - 1
                    ? "text-[var(--foreground)] font-medium"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {seg}
              </button>
            </span>
          ))}
        </nav>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-6 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-[var(--muted)] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(0,82,255,0.06)] border border-[rgba(0,82,255,0.2)] flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">이미지가 없습니다</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              버튼을 클릭하거나 이미지를 드래그 앤 드롭하세요.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#4D7CFF] text-white text-sm font-medium shadow-sm hover:shadow-[0_4px_14px_rgba(0,82,255,0.25)] hover:-translate-y-0.5 transition-all duration-200"
            >
              Upload Images
            </button>
          </div>
        )}

        {/* Folder + Image grid */}
        {!isLoading && (data.folders.length > 0 || data.images.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Folders */}
            {data.folders.map((folder) => (
              <motion.button
                key={`folder-${folder}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigateTo([...folderPath, folder])}
                className="group relative flex flex-col items-center justify-center aspect-square rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] transition-all duration-200 p-4 gap-2"
              >
                <svg className="w-10 h-10 text-[var(--muted-foreground)] group-hover:text-[var(--accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-xs font-medium text-[var(--foreground)] text-center truncate w-full px-1">{folder}</span>
              </motion.button>
            ))}

            {/* Images */}
            {data.images.map((img) => (
              <motion.div
                key={img.filename}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="group relative rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-[var(--muted)] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/file/${[...folderPath, img.filename].map(encodeURIComponent).join("/")}`}
                    alt={img.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="px-2.5 py-2">
                  <p className="text-xs font-mono text-[var(--foreground)] truncate" title={img.filename}>
                    {img.filename}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {formatBytes(img.size)}
                  </p>
                </div>

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => handleCopy(img.filename)}
                    title="마크다운 복사"
                    className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    {copiedFile === img.filename ? (
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(img.filename)}
                    disabled={deletingFile === img.filename}
                    title="삭제"
                    className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-600/80 transition-colors disabled:opacity-50"
                  >
                    {deletingFile === img.filename ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Drag-over overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/10 backdrop-blur-sm border-2 border-dashed border-[var(--accent)] m-4 rounded-2xl pointer-events-none"
            >
              <div className="text-center">
                <svg className="w-12 h-12 text-[var(--accent)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-[var(--accent)] font-semibold text-lg">
                  {folderPath.length > 0 ? `${folderPath.join("/")} 에 업로드` : "images/ 에 업로드"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                toast.type === "success"
                  ? "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
                  : "bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {toast.type === "success" ? (
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
