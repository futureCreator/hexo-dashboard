"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { LinkGraph } from "@/lib/link-graph";

// Canvas-based force graph — SSR incompatible, must be dynamically imported
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[540px] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

interface FGNode {
  id: string;
  title: string;
  draft: boolean;
  isBrokenTarget: boolean;
  hasBroken: boolean;
  outCount: number;
  inCount: number;
  // injected by force-graph at runtime
  x?: number;
  y?: number;
}

interface FGLink {
  source: string | FGNode;
  target: string | FGNode;
  broken: boolean;
}

function nodeId(n: string | FGNode): string {
  return typeof n === "string" ? n : n.id;
}

export function ForceGraphView({
  graph,
  isDark,
}: {
  graph: LinkGraph;
  isDark: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<FGNode | null>(null);

  // Track container width for responsive canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  // Tune force simulation once graph mounts
  const handleEngineStop = useCallback(() => {}, []);

  // Build graph data from LinkGraph
  const graphData = useMemo(() => {
    const nodeMap = new Map(graph.nodes.map((n) => [n.filename, n]));

    const connectedFns = new Set<string>();
    for (const e of graph.edges) {
      connectedFns.add(e.fromFilename);
      if (e.toFilename) connectedFns.add(e.toFilename);
    }

    const nodes: FGNode[] = Array.from(connectedFns)
      .map((fn) => nodeMap.get(fn))
      .filter(Boolean)
      .map((n) => ({
        id: n!.filename,
        title: n!.title,
        draft: n!.draft,
        isBrokenTarget: false,
        hasBroken: n!.outgoing.some((e) => e.broken),
        outCount: n!.outgoing.filter((e) => e.toFilename).length,
        inCount: n!.incoming.length,
      }));

    // Ghost nodes for broken link targets (unresolved slugs)
    const addedBrokenTargets = new Set<string>();
    for (const e of graph.brokenLinks) {
      const ghostId = `broken:${e.href}`;
      if (!addedBrokenTargets.has(ghostId)) {
        addedBrokenTargets.add(ghostId);
        nodes.push({
          id: ghostId,
          title: e.href,
          draft: false,
          isBrokenTarget: true,
          hasBroken: false,
          outCount: 0,
          inCount: 0,
        });
      }
    }

    const links: FGLink[] = [
      // Valid edges
      ...graph.edges
        .filter((e) => e.toFilename)
        .map((e) => ({
          source: e.fromFilename,
          target: e.toFilename!,
          broken: false,
        })),
      // Broken edges → ghost nodes
      ...graph.brokenLinks.map((e) => ({
        source: e.fromFilename,
        target: `broken:${e.href}`,
        broken: true,
      })),
    ];

    return { nodes, links };
  }, [graph]);

  const accent = isDark ? "#5E6AD2" : "#0052FF";

  const nodeColor = useCallback(
    (node: object) => {
      const n = node as FGNode;
      if (n.isBrokenTarget) return "rgba(239,68,68,0.25)";
      if (n.hasBroken) return "#ef4444";
      if (n.draft) return isDark ? "#4b5563" : "#9ca3af";
      return accent;
    },
    [isDark, accent]
  );

  const nodeVal = useCallback((node: object) => {
    const n = node as FGNode;
    if (n.isBrokenTarget) return 0.6;
    return Math.max(1, n.outCount + n.inCount);
  }, []);

  const linkColor = useCallback(
    (link: object) => {
      const l = link as FGLink;
      if (l.broken) return "rgba(239,68,68,0.55)";
      return isDark ? "rgba(94,106,210,0.4)" : "rgba(0,82,255,0.3)";
    },
    [isDark]
  );

  // Draw label text on nodes when zoomed in enough
  const nodeCanvasObject = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (globalScale < 2) return;
      const n = node as FGNode & { x: number; y: number };
      if (n.isBrokenTarget) return;

      const label = n.title.length > 20 ? n.title.slice(0, 20) + "…" : n.title;
      const fontSize = 10 / globalScale;
      const nodeR = Math.sqrt(Math.max(1, n.outCount + n.inCount)) * 4;

      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.7)";
      ctx.fillText(label, n.x, n.y + nodeR + 2 / globalScale);
    },
    [isDark]
  );

  const handleNodeClick = useCallback(
    (node: object) => {
      const n = node as FGNode;
      if (n.isBrokenTarget) return;
      setSelected((prev) => (prev?.id === n.id ? null : n));
    },
    []
  );

  const selectedNodeData = selected
    ? graph.nodes.find((n) => n.filename === selected.id)
    : null;

  const showBrokenGhosts = graph.brokenLinks.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
      style={{ minHeight: 540 }}
    >
      {width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={width}
          height={540}
          backgroundColor="transparent"
          nodeLabel={(n: object) => {
            const node = n as FGNode;
            return node.isBrokenTarget
              ? `⚠ "${node.title}" — 포스트를 찾을 수 없음`
              : `${node.title}${node.draft ? " (Draft)" : ""}`;
          }}
          nodeVal={nodeVal}
          nodeColor={nodeColor}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={nodeCanvasObject}
          linkColor={linkColor}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkWidth={1.2}
          onNodeClick={handleNodeClick}
          onEngineStop={handleEngineStop}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 bg-[var(--card)]/90 backdrop-blur-sm rounded-xl border border-[var(--border)] px-3 py-2.5">
        <LegendRow color={accent} label="포스트" />
        <LegendRow color="#ef4444" label="끊어진 링크 포함" />
        {showBrokenGhosts && (
          <LegendRow
            color="rgba(239,68,68,0.4)"
            label="링크 없는 대상"
            border="rgba(239,68,68,0.6)"
          />
        )}
        <LegendRow color={isDark ? "#4b5563" : "#9ca3af"} label="Draft" />
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <div
            className="w-5 h-px"
            style={{
              background: isDark ? "rgba(94,106,210,0.6)" : "rgba(0,82,255,0.5)",
            }}
          />
          내부 링크
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <div className="w-5 h-px bg-red-500 opacity-60" />
          끊어진 링크
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 opacity-60">
          스크롤로 줌, 드래그로 이동
        </p>
      </div>

      {/* Node detail panel */}
      {selected && selectedNodeData && (
        <div className="absolute bottom-3 right-3 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-[var(--muted-foreground)] mb-0.5 truncate">
                {selectedNodeData.filename}
              </p>
              <p className="text-sm font-semibold text-[var(--foreground)] leading-snug">
                {selectedNodeData.title}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 mt-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-4 text-xs text-[var(--muted-foreground)] mb-3">
            <span>→ {selectedNodeData.outgoing.length}개 아웃고잉</span>
            <span>← {selectedNodeData.incoming.length}개 인커밍</span>
          </div>

          {selectedNodeData.outgoing.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Links to
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {selectedNodeData.outgoing.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        e.broken ? "bg-red-500" : "bg-[var(--accent)]"
                      }`}
                    />
                    {e.broken ? (
                      <span className="text-red-400 font-mono truncate">{e.href}</span>
                    ) : (
                      <span className="text-[var(--foreground)] truncate">{e.toTitle}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedNodeData.incoming.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Linked from
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {selectedNodeData.incoming.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--muted-foreground)]" />
                    <span className="text-[var(--foreground)] truncate">{e.fromTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendRow({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{
          background: color,
          border: border ? `1.5px solid ${border}` : undefined,
        }}
      />
      {label}
    </div>
  );
}
