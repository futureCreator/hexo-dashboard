"use client";
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";

export type ActionStatus = "idle" | "loading" | "success" | "error";

export function useCommit() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const { showToast } = useToast();

  const handleCommit = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(apiUrl("/api/git/commit"), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Changes committed and pushed to remote." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Commit failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach git commit API." });
    }
    setTimeout(() => setStatus("idle"), 300);
  }, [status, showToast]);

  return { status, handleCommit };
}
