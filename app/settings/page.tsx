"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function SettingsPage() {
  const router = useRouter();
  const [hexoPath, setHexoPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.hexoPath) setHexoPath(data.hexoPath);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hexoPath: hexoPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/posts");
      }, 800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-10 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-8"
        >
          <SectionLabel className="mb-4">Settings</SectionLabel>
          <h1 className="font-display text-4xl text-[var(--foreground)] leading-tight mb-2">
            Configure{" "}
            <span className="gradient-text">Your Blog</span>
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            Point the dashboard to your local Hexo blog directory.
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
        >
          <Card className="p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label
                  htmlFor="hexoPath"
                  className="block text-sm font-medium text-[var(--foreground)] mb-2"
                >
                  Hexo Blog Path
                </label>
                <p className="text-xs text-[var(--muted-foreground)] mb-3">
                  The absolute path to your Hexo blog root directory (e.g.{" "}
                  <code className="font-mono bg-[var(--muted)] px-1.5 py-0.5 rounded text-[0.7rem]">
                    /Users/you/my-blog
                  </code>
                  ). The directory must contain a{" "}
                  <code className="font-mono bg-[var(--muted)] px-1.5 py-0.5 rounded text-[0.7rem]">
                    source/_posts
                  </code>{" "}
                  folder.
                </p>
                <input
                  id="hexoPath"
                  type="text"
                  value={hexoPath}
                  onChange={(e) => {
                    setHexoPath(e.target.value);
                    setError(null);
                    setSuccess(false);
                  }}
                  placeholder="/Users/you/my-hexo-blog"
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] text-sm font-mono placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:border-transparent transition-all duration-200 disabled:opacity-60"
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100"
                >
                  <svg
                    className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Success */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100"
                >
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-emerald-700">
                    Settings saved! Redirecting to posts…
                  </p>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving || loading || !hexoPath.trim()}
                className="w-full"
              >
                {saving ? (
                  <>
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h-4z"
                      />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    Save Settings
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.2 }}
        >
          <Card variant="inverted" className="mt-6 p-6">
            <div
              className="absolute inset-0 opacity-[0.03] rounded-xl overflow-hidden pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[var(--accent-secondary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                How it works
              </h3>
              <ul className="text-xs text-white/60 space-y-1.5 font-mono leading-relaxed">
                <li>→ Posts are read from <code className="text-white/80">{"{hexoPath}"}/source/_posts/*.md</code></li>
                <li>→ Drafts from <code className="text-white/80">{"{hexoPath}"}/source/_drafts/*.md</code></li>
                <li>→ Settings saved to <code className="text-white/80">~/.hexo-dashboard-config.json</code></li>
              </ul>
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
