"use client";
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";

export type DeployStatus = "idle" | "running" | "success" | "error";

export function stripAnsi(str: string) {
  return str.replace(/\x1b\[[0-9;]*[mGKHFJ]/g, "");
}

export function getLineClass(line: string) {
  const l = line.toLowerCase();
  if (l.includes("error") || l.includes("fatal")) return "text-red-400";
  if (l.includes("warn")) return "text-yellow-400";
  if (l.match(/^\s*(info|inf)\s/i)) return "text-sky-400";
  return "text-white/70";
}

export function useDeploy() {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  const handleDeploy = useCallback(async () => {
    if (status === "running" || showModal) return;

    setStatus("running");
    setLogs([]);
    setShowModal(true);

    try {
      const res = await fetch(apiUrl("/api/deploy"), { method: "POST" });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(event.slice(6));
            if (data.type === "log") {
              const line = stripAnsi(data.line);
              if (line.trim()) setLogs((prev) => [...prev, line]);
            } else if (data.type === "done") {
              if (data.success) {
                setStatus("success");
                showToast({ type: "success", message: "Deploy succeeded." });
              } else {
                setStatus("error");
                showToast({ type: "error", message: "Deploy failed." });
              }
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach deploy API." });
    }
  }, [status, showModal, showToast]);

  const handleClose = useCallback(() => {
    if (status === "running") return;
    setShowModal(false);
    setTimeout(() => setStatus("idle"), 200);
  }, [status]);

  return { status, logs, showModal, handleDeploy, handleClose, getLineClass };
}
