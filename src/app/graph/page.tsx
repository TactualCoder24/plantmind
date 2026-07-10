"use client";

import { useEffect, useMemo, useState } from "react";
import { Network, Loader2, ArrowRight } from "lucide-react";
import { GraphEdge, GraphNode, KnowledgeGraph, NodeType } from "@/lib/types";
import { friendlyEdgeLabel } from "@/lib/labels";

const TYPE_COLORS: Record<NodeType, string> = {
  Equipment: "text-accent bg-accent/10 border-accent/40",
  Procedure: "text-violet bg-violet/10 border-violet/40",
  Document: "text-text-muted bg-surface-2 border-border-strong",
  Person: "text-warning bg-warning/10 border-warning/40",
  Regulation: "text-info bg-info/10 border-info/40",
  Incident: "text-danger bg-danger/10 border-danger/40",
};

export default function GraphPage() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<NodeType>("Equipment");

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then((d) => setGraph(d.graph));
  }, []);

  const nodesByType = useMemo(() => {
    if (!graph) return {} as Record<NodeType, GraphNode[]>;
    const map: Partial<Record<NodeType, GraphNode[]>> = {};
    for (const n of graph.nodes) {
      map[n.type] = map[n.type] || [];
      map[n.type]!.push(n);
    }
    return map as Record<NodeType, GraphNode[]>;
  }, [graph]);

  const connections = useMemo(() => {
    if (!graph || !selected) return [];
    return graph.edges
      .filter((e) => e.from === selected || e.to === selected)
      .map((e) => {
        const otherId = e.from === selected ? e.to : e.from;
        const other = graph.nodes.find((n) => n.id === otherId);
        const outgoing = e.from === selected;
        return { edge: e, other, outgoing };
      })
      .filter((c) => c.other);
  }, [graph, selected]);

  const twoHop = useMemo(() => {
    if (!graph || !selected) return [];
    const oneHopIds = new Set(connections.map((c) => c.other!.id));
    const results: { via: GraphEdge; from: GraphNode; edge: GraphEdge; other: GraphNode }[] = [];
    for (const id of oneHopIds) {
      for (const e of graph.edges) {
        if (e.from === id || e.to === id) {
          const otherId = e.from === id ? e.to : e.from;
          if (otherId === selected || oneHopIds.has(otherId)) continue;
          const other = graph.nodes.find((n) => n.id === otherId);
          const fromNode = graph.nodes.find((n) => n.id === id);
          if (other && fromNode) results.push({ via: e, from: fromNode, edge: e, other });
        }
      }
    }
    return results.slice(0, 12);
  }, [graph, selected, connections]);

  if (!graph) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-sm text-text-muted flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Loading knowledge graph...
      </div>
    );
  }

  const selectedNode = graph.nodes.find((n) => n.id === selected);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-text flex items-center gap-2">
          <Network size={18} className="text-accent" /> How Everything Connects
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Equipment, procedures, people, incidents and regulations — {graph.nodes.length} items and{" "}
          {graph.edges.length} connections between them. Pick something on the left to see what
          it's linked to.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(Object.keys(nodesByType) as NodeType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              typeFilter === t ? TYPE_COLORS[t] : "border-border text-text-muted hover:text-text-secondary"
            }`}
          >
            {t} ({nodesByType[t]?.length ?? 0})
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-3 max-h-[420px] overflow-y-auto">
          <div className="text-xs text-text-muted mb-2 px-1">{typeFilter} items</div>
          <div className="space-y-1">
            {(nodesByType[typeFilter] || []).map((n) => (
              <button
                key={n.id}
                onClick={() => setSelected(n.id)}
                className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg border ${
                  selected === n.id ? TYPE_COLORS[n.type] : "border-transparent hover:bg-surface-2 text-text-secondary"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 rounded-xl border border-border bg-surface p-4 min-h-[420px]">
          {!selectedNode ? (
            <p className="text-sm text-text-muted">Pick something on the left to see how it connects to everything else.</p>
          ) : (
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${TYPE_COLORS[selectedNode.type]}`}>
                <span className="text-xs uppercase tracking-wide opacity-70">{selectedNode.type}</span>
                <span className="font-medium">{selectedNode.label}</span>
              </div>

              <div>
                <div className="text-xs text-text-muted mb-2">
                  {connections.length === 0 ? "No direct connections" : `Directly connected to ${connections.length}`}
                </div>
                <div className="space-y-1.5">
                  {connections.map(({ edge, other, outgoing }, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-text-secondary">
                        {outgoing ? friendlyEdgeLabel(edge.type) : `is linked from (${friendlyEdgeLabel(edge.type)})`}
                      </span>
                      <ArrowRight size={12} className="text-text-muted shrink-0" />
                      <button
                        onClick={() => setSelected(other!.id)}
                        className={`px-2 py-0.5 rounded border text-xs ${TYPE_COLORS[other!.type]}`}
                      >
                        {other!.label}
                      </button>
                    </div>
                  ))}
                  {connections.length === 0 && <p className="text-xs text-text-muted">Nothing else references this item yet.</p>}
                </div>
              </div>

              {twoHop.length > 0 && (
                <div>
                  <div className="text-xs text-text-muted mb-2">A step further out ({twoHop.length})</div>
                  <div className="space-y-1.5">
                    {twoHop.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded border ${TYPE_COLORS[h.from.type]}`}>{h.from.label}</span>
                        <span>{friendlyEdgeLabel(h.edge.type)}</span>
                        <span className={`px-1.5 py-0.5 rounded border ${TYPE_COLORS[h.other.type]}`}>{h.other.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
