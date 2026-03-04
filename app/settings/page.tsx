"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [hexoPath, setHexoPath] = useState("");
  const [gaPropertyId, setGaPropertyId] = useState("");
  const [gaServiceAccountPath, setGaServiceAccountPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.hexoPath) setHexoPath(data.hexoPath);
        if (data.gaPropertyId) setGaPropertyId(data.gaPropertyId);
        if (data.gaServiceAccountPath) setGaServiceAccountPath(data.gaServiceAccountPath);
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
        body: JSON.stringify({
          hexoPath: hexoPath.trim(),
          gaPropertyId: gaPropertyId.trim(),
          gaServiceAccountPath: gaServiceAccountPath.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/posts"), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-8 sm:py-10 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-8"
        >
          <SectionLabel className="mb-4">Settings</SectionLabel>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] leading-tight mb-2">
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
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100"
                >
                  <div className="flex items-center gap-3">
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
                    <p className="text-sm text-emerald-700">Settings saved! Redirecting…</p>
                  </div>
                  <Link
                    href="/posts"
                    className="text-sm text-emerald-700 font-medium underline underline-offset-2 hover:no-underline shrink-0"
                  >
                    Go to Posts →
                  </Link>
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

        {/* Google Analytics card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.15 }}
        >
          <Card className="mt-6 p-8">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              Google Analytics
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-5">
              Connect your GA4 property to view analytics on the{" "}
              <Link href="/analytics" className="text-[var(--accent)] hover:underline">Analytics page</Link>.{" "}
              Property ID는 <code className="font-mono bg-[var(--muted)] px-1.5 py-0.5 rounded text-[0.7rem]">G-XXXXXXXXXX</code>가 아닌 관리 → 속성 설정의 숫자 ID입니다.
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="gaPropertyId"
                  className="block text-sm font-medium text-[var(--foreground)] mb-2"
                >
                  GA4 Property ID
                </label>
                <input
                  id="gaPropertyId"
                  type="text"
                  value={gaPropertyId}
                  onChange={(e) => setGaPropertyId(e.target.value)}
                  placeholder="123456789 (numeric Property ID)"
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] text-sm font-mono placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:border-transparent transition-all duration-200 disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="gaServiceAccountPath"
                  className="block text-sm font-medium text-[var(--foreground)] mb-2"
                >
                  Service Account JSON Path
                </label>
                <input
                  id="gaServiceAccountPath"
                  type="text"
                  value={gaServiceAccountPath}
                  onChange={(e) => setGaServiceAccountPath(e.target.value)}
                  placeholder="/path/to/service-account.json"
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] text-sm font-mono placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:border-transparent transition-all duration-200 disabled:opacity-60"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  Create a service account in Google Cloud Console, grant it the{" "}
                  <code className="font-mono bg-[var(--muted)] px-1.5 py-0.5 rounded text-[0.7rem]">Viewer</code>{" "}
                  role on your GA4 property, then download the JSON key.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Appearance card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.15 }}
        >
          <Card className="mt-6 p-8">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              Appearance
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-5">
              Choose how Hexo Dashboard looks for you.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(
                [
                  {
                    value: "light",
                    label: "Light",
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l.71.71M6.34 6.34l.71.71M12 8a4 4 0 100 8 4 4 0 000-8z"
                        />
                      </svg>
                    ),
                  },
                  {
                    value: "dark",
                    label: "Dark",
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                        />
                      </svg>
                    ),
                  },
                  {
                    value: "system",
                    label: "System",
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    ),
                  },
                ] as { value: Theme; label: string; icon: React.ReactNode }[]
              ).map(({ value, label, icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`
                      flex flex-col items-center gap-2.5 p-4 rounded-xl border text-sm font-medium
                      transition-all duration-200
                      ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }
                    `}
                  >
                    {icon}
                    {label}
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
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
