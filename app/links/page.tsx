"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SectionLabel from "@/components/ui/SectionLabel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ForceGraphView } from "@/components/links/ForceGraphView";
import type { LinkGraph, PostNode, LinkEdge } from "@/lib/link-graph";

const easeOut = [0.16, 1, 0.3, 1] as const;

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-1 ${
        accent
          ? "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.04)]"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-3xl font-bold tabular-nums leading-none ${
          accent ? "text-red-500" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs text-[var(--muted-foreground)]">{sub}</span>
      )}
    </div>
  );
}

function BrokenLinkRow({ edge }: { edge: LinkEdge }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)] hover:bg-[rgba(239,68,68,0.06)] transition-colors">
      <div className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)] truncate max-w-[200px]">
            {edge.fromTitle}
          </span>
          <svg className="w-3.5 h-3.5 text-[var(--muted-foreground)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="text-red-500 font-mono text-xs bg-[rgba(239,68,68,0.1)] px-2 py-0.5 rounded-md truncate max-w-[220px]">
            {edge.href}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              edge.type === "post_link"
                ? "bg-[rgba(94,106,210,0.12)] text-[var(--accent)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            {edge.type === "post_link" ? "{% post_link %}" : "markdown"}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            {edge.fromFilename}
          </span>
        </div>
      </div>
    </div>
  );
}

function GraphNode({ node, expanded, onToggle }: { node: PostNode; expanded: boolean; onToggle: () => void }) {
  const hasLinks = node.outgoing.length > 0 || node.incoming.length > 0;
  if (!hasLinks) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {node.draft && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]">
              Draft
            </span>
          )}
          <span className="font-medium text-sm text-[var(--foreground)] truncate">
            {node.title}
          </span>
          <span className="shrink-0 text-xs text-[var(--muted-foreground)] font-mono">
            {node.filename}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {node.outgoing.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {node.outgoing.length}
            </span>
          )}
          {node.incoming.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              {node.incoming.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[var(--border)]">
              {node.outgoing.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                    Links to
                  </p>
                  <div className="space-y-1.5">
                    {node.outgoing.map((edge, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <svg className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        {edge.broken ? (
                          <span className="text-red-500 font-mono text-xs bg-[rgba(239,68,68,0.08)] px-2 py-0.5 rounded">
                            {edge.href} <span className="opacity-60">(not found)</span>
                          </span>
                        ) : (
                          <span className="text-[var(--foreground)]">{edge.toTitle}</span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${
                            edge.type === "post_link"
                              ? "bg-[rgba(94,106,210,0.12)] text-[var(--accent)]"
                              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                          }`}
                        >
                          {edge.type === "post_link" ? "post_link" : "md"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {node.incoming.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                    Linked from
                  </p>
                  <div className="space-y-1.5">
                    {node.incoming.map((edge, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <svg className="w-3.5 h-3.5 text-[var(--muted-foreground)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        <span className="text-[var(--foreground)]">{edge.fromTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type ViewMode = "list" | "graph";

export default function LinksPage() {
  const { resolvedTheme } = useTheme();
  const [graph, setGraph] = useState<LinkGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showOnlyBroken, setShowOnlyBroken] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  useEffect(() => {
    fetch("/api/links")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGraph(data as LinkGraph);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleNode = (filename: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const linkedNodes = graph?.nodes.filter(
    (n) => n.outgoing.length > 0 || n.incoming.length > 0
  ) ?? [];

  const filteredNodes = linkedNodes.filter((n) => {
    if (showOnlyBroken && !n.outgoing.some((e) => e.broken)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.filename.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort: posts with broken links first, then by total connections desc
  const sortedNodes = [...filteredNodes].sort((a, b) => {
    const aBroken = a.outgoing.some((e) => e.broken) ? 1 : 0;
    const bBroken = b.outgoing.some((e) => e.broken) ? 1 : 0;
    if (bBroken !== aBroken) return bBroken - aBroken;
    return (b.outgoing.length + b.incoming.length) - (a.outgoing.length + a.incoming.length);
  });

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-8 sm:py-10 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <SectionLabel pulse className="mb-4">
            Links
          </SectionLabel>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] leading-tight mb-2">
            Internal{" "}
            <span className="gradient-text">Link Graph</span>
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            포스트 간 내부 링크 관계와 끊어진 링크를 탐지합니다.
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
            {error.includes("not configured") && (
              <Link href="/settings" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
                Settings에서 Hexo 경로를 설정해 주세요 →
              </Link>
            )}
          </div>
        )}

        {!loading && !error && graph && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Connected Posts"
                value={linkedNodes.length}
                sub={`/ ${graph.nodes.length} total`}
              />
              <StatCard
                label="Total Links"
                value={graph.edges.length}
              />
              <StatCard
                label="post_link Tags"
                value={graph.edges.filter((e) => e.type === "post_link").length}
              />
              <StatCard
                label="Broken Links"
                value={graph.brokenLinks.length}
                accent={graph.brokenLinks.length > 0}
                sub={graph.brokenLinks.length > 0 ? "수정이 필요합니다" : "모두 정상"}
              />
            </div>

            {/* Broken links */}
            {graph.brokenLinks.length > 0 && (
              <div className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.02)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    끊어진 링크 — {graph.brokenLinks.length}개
                  </h2>
                </div>
                <div className="space-y-2">
                  {graph.brokenLinks.map((edge, i) => (
                    <BrokenLinkRow key={i} edge={edge} />
                  ))}
                </div>
              </div>
            )}

            {graph.brokenLinks.length === 0 && graph.edges.length > 0 && (
              <div className="rounded-2xl border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.03)] px-5 py-4 flex items-center gap-3">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-[var(--foreground)]">
                  끊어진 내부 링크가 없습니다. 모든 링크가 정상입니다.
                </span>
              </div>
            )}

            {/* Graph */}
            {linkedNodes.length > 0 ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-[var(--foreground)] flex-1">
                    링크 그래프 — {linkedNodes.length}개 포스트
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5 bg-[var(--muted)]">
                      <button
                        onClick={() => setViewMode("graph")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          viewMode === "graph"
                            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Graph
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          viewMode === "list"
                            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        List
                      </button>
                    </div>

                    {/* List-only controls */}
                    {viewMode === "list" && (
                      <>
                        {/* Search */}
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="포스트 검색..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] w-40"
                          />
                        </div>
                        {/* Filter toggle */}
                        <button
                          onClick={() => setShowOnlyBroken((v) => !v)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            showOnlyBroken
                              ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-red-500"
                              : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          끊어진 링크만
                        </button>
                        {/* Expand all */}
                        <button
                          onClick={() => {
                            if (expandedNodes.size === sortedNodes.length) {
                              setExpandedNodes(new Set());
                            } else {
                              setExpandedNodes(new Set(sortedNodes.map((n) => n.filename)));
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                        >
                          {expandedNodes.size === sortedNodes.length ? "모두 접기" : "모두 펼치기"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {viewMode === "graph" ? (
                  <ForceGraphView graph={graph} isDark={resolvedTheme === "dark"} />
                ) : (
                <div className="space-y-2">
                  {sortedNodes.length === 0 ? (
                    <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    sortedNodes.map((node) => (
                      <GraphNode
                        key={node.filename}
                        node={node}
                        expanded={expandedNodes.has(node.filename)}
                        onToggle={() => toggleNode(node.filename)}
                      />
                    ))
                  )}
                </div>
                )}
              </div>
            ) : (
              !loading && graph.nodes.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                    내부 링크가 없습니다
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    포스트에{" "}
                    <code className="font-mono bg-[var(--muted)] px-1 py-0.5 rounded text-[var(--accent)]">
                      {"{% post_link slug %}"}
                    </code>{" "}
                    태그를 사용해 포스트를 연결해 보세요.
                  </p>
                </div>
              )
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
