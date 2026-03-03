"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import DeleteConfirmModal from "@/components/posts/DeleteConfirmModal";
import EditModal from "@/components/posts/EditModal";
import { useToast } from "@/components/ui/Toast";
import type { HexoPage } from "@/lib/hexo";

interface PageCardProps {
  page: HexoPage;
  onDeleted: (filepath: string) => void;
  index?: number;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOut, delay: i * 0.04 },
  }),
};

export default function PageCard({ page, onDeleted, index = 0 }: PageCardProps) {
  const { showToast } = useToast();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("No date");

  useEffect(() => {
    if (!page.date) return;
    const d = new Date(page.date);
    setFormattedDate(
      d.toLocaleDateString(navigator.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }, [page.date]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: page.filepath }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast({ type: "error", message: data.error || "Failed to delete page" });
        return;
      }
      onDeleted(page.filepath);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  }

  return (
    <>
      <motion.div
        custom={index}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="group flex items-start gap-4 px-4 py-3.5 rounded-lg hover:bg-[var(--muted)] transition-colors duration-150"
      >
        {/* Slug column */}
        <div className="pt-0.5 shrink-0 w-[120px] flex justify-end">
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] border border-[rgba(0,82,255,0.15)]">
            /{page.slug}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors duration-150">
            {page.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              {page.filepath.split("/source/").pop() ?? page.filepath}
            </span>
            <span className="text-[var(--border)] text-xs">·</span>
            <span className="text-xs text-[var(--muted-foreground)]">{formattedDate}</span>
          </div>
        </div>

        {/* Actions — visible on hover */}
        <div className="shrink-0 pt-0.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            title="Edit page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </Button>

          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </Button>
        </div>
      </motion.div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={page.title}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isDeleting={isDeleting}
      />

      <EditModal
        isOpen={editModalOpen}
        filepath={page.filepath}
        filename={page.filename}
        contentApiBase="/api/pages/content"
        onClose={() => setEditModalOpen(false)}
        onSaved={() => showToast({ type: "success", message: `"${page.title}" saved` })}
      />
    </>
  );
}
