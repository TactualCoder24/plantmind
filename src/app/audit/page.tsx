"use client";

import { useEffect, useState } from "react";
import { ListChecks, Loader2, ChevronDown, Bot, FileText, Network } from "lucide-react";
import { confidenceLabel, formatGraphFact, friendlyToolLabel } from "@/lib/labels";

interface AuditEntry {
  id: string;
  question: string;
  role: string;
  answer: string;
  confidence: number;
  citationTitles: string[];
  graphFacts: string[];
  agentic: boolean;
  toolSteps: string[];
  createdAt: string;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-text flex items-center gap-2">
          <ListChecks size={18} className="text-accent" /> Audit Log
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Every question asked through the copilot, with exactly what it checked and cited — so you
          can justify an AI-assisted answer after the fact, not just trust it.
        </p>
      </div>

      {!entries ? (
        <div className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading audit log...
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-muted">No questions asked yet — anything asked on the Ask a Question page will show up here.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <div key={e.id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <button onClick={() => setExpanded(isOpen ? null : e.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text">{e.question}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(e.createdAt).toLocaleString()} · {e.role} · {confidenceLabel(e.confidence)}
                        {e.agentic && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-accent">
                            <Bot size={11} /> agentic
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronDown size={16} className={`text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="pt-2 border-t border-border space-y-3">
                    <p className="text-sm text-text whitespace-pre-wrap">{e.answer}</p>

                    {e.toolSteps.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1 mb-1">
                          <Bot size={11} /> What it checked
                        </div>
                        <p className="text-xs text-text-secondary">{e.toolSteps.map(friendlyToolLabel).join(" → ")}</p>
                      </div>
                    )}

                    {e.citationTitles.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1 mb-1">
                          <FileText size={11} /> Sources cited
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {e.citationTitles.map((t, i) => (
                            <span key={i} className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {e.graphFacts.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1 mb-1">
                          <Network size={11} /> Related connections used
                        </div>
                        <div className="space-y-0.5">
                          {e.graphFacts.slice(0, 4).map((f, i) => (
                            <p key={i} className="text-xs text-info">
                              {formatGraphFact(f)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
