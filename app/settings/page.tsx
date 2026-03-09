"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";

const easeOut = [0.16, 1, 0.3, 1] as const;

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[var(--muted-foreground)] px-1 mb-2 mt-6 first:mt-0">
      {children}
    </p>
  );
}

function FormGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] rounded-[14px] overflow-hidden border border-[var(--border)]">
      {children}
    </div>
  );
}

function FormRow({
  label,
  hint,
  children,
  isLast,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={`px-4 py-3.5 ${!isLast ? "border-b border-[var(--border)]" : ""}`}>
      <label className="block text-[15px] font-medium text-[var(--foreground)] mb-1.5">
        {label}
      </label>
      {hint && (
        <p className="text-[12px] text-[var(--muted-foreground)] mb-2 leading-relaxed">{hint}</p>
      )}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [hexoPath, setHexoPath] = useState("");
  const [gaPropertyId, setGaPropertyId] = useState("");
  const [gaServiceAccountPath, setGaServiceAccountPath] = useState("");
  const [gscSiteUrl, setGscSiteUrl] = useState("");
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
        if (data.gscSiteUrl) setGscSiteUrl(data.gscSiteUrl);
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
          gscSiteUrl: gscSiteUrl.trim(),
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

  const inputClass =
    "w-full bg-transparent text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none font-mono disabled:opacity-50";

  return (
    <DashboardLayout>
      <form onSubmit={handleSave}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="px-4 py-5 sm:px-8 sm:py-8 max-w-xl"
        >

          {/* ── Hexo Blog Path ── */}
          <SectionHeader>Blog Directory</SectionHeader>
          <FormGroup>
            <FormRow
              label="Hexo Blog Path"
              hint="Your Hexo blog root directory. Must contain a source/_posts folder."
              isLast
            >
              <input
                type="text"
                value={hexoPath}
                onChange={(e) => { setHexoPath(e.target.value); setError(null); setSuccess(false); }}
                placeholder="/Users/you/my-hexo-blog"
                disabled={loading}
                className={inputClass}
              />
            </FormRow>
          </FormGroup>

          {/* ── Google Analytics ── */}
          <SectionHeader>Google Analytics</SectionHeader>
          <FormGroup>
            <FormRow
              label="GA4 Property ID"
              hint="Numeric ID from Admin → Property Settings (not the G-XXXXXXXX measurement ID)."
            >
              <input
                type="text"
                value={gaPropertyId}
                onChange={(e) => setGaPropertyId(e.target.value)}
                placeholder="123456789"
                disabled={loading}
                className={inputClass}
              />
            </FormRow>
            <FormRow
              label="Service Account JSON Path"
              hint="Download from Google Cloud Console after granting Viewer access to your GA4 property."
              isLast
            >
              <input
                type="text"
                value={gaServiceAccountPath}
                onChange={(e) => setGaServiceAccountPath(e.target.value)}
                placeholder="/path/to/service-account.json"
                disabled={loading}
                className={inputClass}
              />
            </FormRow>
          </FormGroup>

          {/* ── Search Console ── */}
          <SectionHeader>Search Console</SectionHeader>
          <FormGroup>
            <FormRow
              label="Site URL"
              hint="The property URL registered in Search Console. Add the service account email to GSC users."
              isLast
            >
              <input
                type="text"
                value={gscSiteUrl}
                onChange={(e) => setGscSiteUrl(e.target.value)}
                placeholder="https://your-blog.com"
                disabled={loading}
                className={inputClass}
              />
            </FormRow>
          </FormGroup>

          {/* ── Error / Success feedback ── */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-3 p-4 rounded-[14px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50"
            >
              <svg className="w-4 h-4 text-[var(--error)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[14px] text-red-700 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center justify-between gap-3 p-4 rounded-[14px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[14px] text-emerald-700 dark:text-emerald-400">Saved! Redirecting…</p>
              </div>
              <Link
                href="/posts"
                className="text-[14px] text-emerald-700 dark:text-emerald-400 font-medium underline underline-offset-2 shrink-0"
              >
                Go to Posts →
              </Link>
            </motion.div>
          )}

          {/* ── Save button ── */}
          <button
            type="submit"
            disabled={saving || loading || !hexoPath.trim()}
            className="mt-5 w-full h-[50px] rounded-[14px] bg-[var(--accent)] text-white text-[17px] font-semibold
              transition-all duration-150 active:scale-[0.98] active:brightness-95
              hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h-4z" />
                </svg>
                Saving…
              </>
            ) : (
              "Save Settings"
            )}
          </button>

          {/* ── How it works ── */}
          <SectionHeader>How it works</SectionHeader>
          <div className="bg-[var(--background-secondary)] dark:bg-[var(--card)] rounded-[14px] border border-[var(--border)] p-4">
            <ul className="text-[12px] text-[var(--muted-foreground)] space-y-2 font-mono leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[var(--accent)] shrink-0">→</span>
                <span>Posts read from <code className="text-[var(--foreground)]">{"<hexoPath>"}/source/_posts/*.md</code></span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)] shrink-0">→</span>
                <span>Drafts from <code className="text-[var(--foreground)]">{"<hexoPath>"}/source/_drafts/*.md</code></span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)] shrink-0">→</span>
                <span>Settings saved to <code className="text-[var(--foreground)]">~/.hexo-dashboard-config.json</code></span>
              </li>
            </ul>
          </div>

          {/* Bottom spacing for tab bar */}
          <div className="h-6" />
        </motion.div>
      </form>
    </DashboardLayout>
  );
}
