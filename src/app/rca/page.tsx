"use client";

import { useEffect, useState } from "react";
import { Wrench, Loader2, Bot, ListTree, ChevronDown } from "lucide-react";
import { GraphNode } from "@/lib/types";
import { friendlyToolLabel } from "@/lib/labels";
import { ProposalCard } from "@/components/ProposalCard";

interface RcaStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  resultPreview: string;
  result: unknown;
}

interface RcaResult {
  equipmentTag: string;
  report: string;
  steps: RcaStep[];
  agentic: boolean;
}

export default function RcaPage() {
  const [equipment, setEquipment] = useState<GraphNode[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RcaResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then((d) => {
        const eq = d.graph.nodes.filter((n: GraphNode) => n.type === "Equipment");
        setEquipment(eq);
        if (eq.length > 0) setSelected(eq[0].label);
      });
  }, []);

  async function run() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    setShowDetails(false);
    const res = await fetch("/api/rca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentTag: selected }),
    });
    const data = await res.json();
    setResult(data);
    setRunning(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-text flex items-center gap-2">
          <Wrench size={18} className="text-accent" /> Find the Root Cause
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Pick a piece of equipment and this tool automatically digs through its repair history,
          checks nearby equipment, and reviews compliance records — then explains, in plain
          language, what most likely caused the problem.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text flex-1"
        >
          {equipment.map((e) => (
            <option key={e.id} value={e.label}>
              {e.label}
            </option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={running || !selected}
          className="bg-accent hover:bg-accent-strong disabled:opacity-50 text-accent-fg font-medium rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
          {running ? "Investigating..." : "Investigate"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border w-fit ${
              result.agentic
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-warning/40 bg-warning/10 text-warning"
            }`}
          >
            <Bot size={13} />
            {result.agentic
              ? `Investigated automatically in ${result.steps.length} step${result.steps.length === 1 ? "" : "s"} — no fixed script, it decided what to check`
              : "Using a simplified offline check (connect an AI key for the full automatic investigation)"}
          </div>

          {result.steps.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text"
              >
                <span className="flex items-center gap-1.5">
                  <ListTree size={13} /> What it checked, step by step
                </span>
                <ChevronDown size={14} className={`transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </button>
              <div className="space-y-1.5 pt-1">
                {result.steps.map((s) => (
                  <div key={s.step} className="text-sm bg-canvas/60 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-accent font-medium shrink-0">{s.step}.</span>
                      <span className="text-text">{friendlyToolLabel(s.tool)}</span>
                    </div>
                    {showDetails && (
                      <div className="pl-5 space-y-1">
                        <div className="text-text-muted text-xs font-mono">{JSON.stringify(s.args)}</div>
                        <div className="text-text-muted text-xs">{s.resultPreview}</div>
                      </div>
                    )}
                    <div className="pl-5">
                      <ProposalCard result={s.result} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-xs text-text-muted mb-2">Findings for {result.equipmentTag}</div>
            <div className="text-sm text-text whitespace-pre-wrap">{result.report}</div>
          </div>
        </div>
      )}
    </div>
  );
}
