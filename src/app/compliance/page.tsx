"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, FileText, Download, Bot } from "lucide-react";
import { friendlyStatusLabel } from "@/lib/labels";

interface Finding {
  regulationCode: string;
  regulationTitle: string;
  status: "gap" | "compliant" | "needs_review";
  evidence: string;
  relatedEquipment: string[];
  relatedDocuments: { id: string; title: string; type: string }[];
  recommendation: string;
}

interface Followup {
  id: string;
  regulationCode: string;
  regulationTitle: string;
  note: string;
  raisedBy: "agent" | "user";
  createdAt: string;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadFindingsCsv(findings: Finding[]) {
  const header = ["Regulation", "Status", "What we found", "Recommendation", "Related equipment"];
  const rows = findings.map((f) => [
    f.regulationTitle,
    friendlyStatusLabel(f.status),
    f.evidence,
    f.recommendation,
    f.relatedEquipment.join("; "),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "compliance-report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_STYLE: Record<Finding["status"], { icon: typeof ShieldCheck; card: string; badge: string }> = {
  gap: { icon: ShieldAlert, card: "border-danger/40 bg-danger/5", badge: "bg-danger/20 text-danger" },
  needs_review: { icon: ShieldQuestion, card: "border-warning/40 bg-warning/5", badge: "bg-warning/20 text-warning" },
  compliant: { icon: ShieldCheck, card: "border-accent/30 bg-accent/5", badge: "bg-accent/20 text-accent" },
};

export default function CompliancePage() {
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then((d) => setFindings(d.findings));
    fetch("/api/actions/compliance-followup")
      .then((r) => r.json())
      .then((d) => setFollowups(d.followups || []));
  }, []);

  const gapCount = findings?.filter((f) => f.status === "gap").length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-display font-semibold text-text flex items-center gap-2">
            <ShieldCheck size={18} className="text-accent" /> Compliance Check
          </h1>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            Compares your regulations against current procedures and inspection records, and flags
            anything that looks missing or out of date — before an auditor finds it.
          </p>
        </div>
        {findings && findings.length > 0 && (
          <button
            onClick={() => downloadFindingsCsv(findings)}
            className="flex items-center gap-1.5 text-sm border border-border hover:border-border-strong text-text-secondary hover:text-text rounded-lg px-3 py-2 shrink-0"
          >
            <Download size={14} /> Download report (CSV)
          </button>
        )}
      </div>

      {findings && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 flex-1">
            <div className="text-2xl font-display font-semibold text-text">{findings.length}</div>
            <div className="text-xs text-text-muted">Regulations checked</div>
          </div>
          <div className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 flex-1">
            <div className="text-2xl font-display font-semibold text-danger">{gapCount}</div>
            <div className="text-xs text-text-muted">Need attention</div>
          </div>
        </div>
      )}

      {followups.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-text-muted">Flagged for follow-up</div>
          {followups.map((f) => (
            <div key={f.id} className="rounded-xl border border-warning/40 bg-warning/5 p-3 flex items-start gap-2">
              {f.raisedBy === "agent" ? (
                <Bot size={14} className="text-warning shrink-0 mt-0.5" />
              ) : (
                <ShieldQuestion size={14} className="text-warning shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm text-text font-medium">{f.regulationTitle}</div>
                <div className="text-xs text-text-secondary mt-0.5">{f.note}</div>
                <div className="text-[10px] text-text-muted mt-1">
                  {f.raisedBy === "agent" ? "Flagged by the copilot" : "Flagged by a user"} · {new Date(f.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!findings ? (
        <div className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Running the compliance check...
        </div>
      ) : findings.length === 0 ? (
        <p className="text-sm text-text-muted">No regulations ingested yet — add some on the Documents page to see a compliance check here.</p>
      ) : (
        <div className="space-y-3">
          {findings.map((f) => {
            const style = STATUS_STYLE[f.status];
            const Icon = style.icon;
            return (
              <div key={f.regulationCode} className={`rounded-xl border p-4 space-y-2 ${style.card}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="shrink-0" />
                    <span className="text-sm font-medium text-text">{f.regulationTitle}</span>
                  </div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded shrink-0 ${style.badge}`}>
                    {friendlyStatusLabel(f.status)}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{f.evidence}</p>
                <p className="text-xs text-text-muted italic">Suggested next step: {f.recommendation}</p>
                {f.relatedDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {f.relatedDocuments.map((d) => (
                      <span key={d.id} className="flex items-center gap-1 text-[10px] text-text-muted bg-canvas/60 px-1.5 py-0.5 rounded">
                        <FileText size={10} /> {d.title}
                      </span>
                    ))}
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
