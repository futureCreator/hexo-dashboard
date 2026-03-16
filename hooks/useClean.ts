"use client";
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";

export type ActionStatus = "idle" | "loading" | "success" | "error";

export function useClean() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const { showToast } = useToast();

  const handleClean = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(apiUrl("/api/clean"), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Clean succeeded." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Clean failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach clean API." });
    }
    setTimeout(() => setStatus("idle"), 300);
  }, [status, showToast]);

  return { status, handleClean };
}
