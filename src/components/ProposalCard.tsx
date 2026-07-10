"use client";

import { useState } from "react";
import { ClipboardPlus, ShieldAlert, Check, Loader2 } from "lucide-react";

interface WorkOrderProposal {
  kind: "work_order_proposal";
  equipmentTag: string;
  description: string;
  priority: string;
}

interface ComplianceFollowupProposal {
  kind: "compliance_followup_proposal";
  regulationCode: string;
  regulationTitle: string;
  note: string;
}

type Proposal = WorkOrderProposal | ComplianceFollowupProposal;

function isProposal(result: unknown): result is Proposal {
  if (!result || typeof result !== "object") return false;
  const kind = (result as { kind?: unknown }).kind;
  return kind === "work_order_proposal" || kind === "compliance_followup_proposal";
}

/**
 * Renders a confirm-before-acting card when an agent tool result is a proposal (drafted by
 * propose_work_order / propose_compliance_followup in src/lib/rcaTools.ts) rather than a plain
 * read result. The agent never writes anything itself — this is the only path from "the AI
 * suggested it" to "it actually exists," and it only fires on an explicit click.
 */
export function ProposalCard({ result }: { result: unknown }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  if (!isProposal(result)) return null;
  const proposal = result;

  async function confirm() {
    setStatus("loading");
    try {
      if (proposal.kind === "work_order_proposal") {
        const res = await fetch("/api/actions/work-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipmentTag: proposal.equipmentTag,
            description: proposal.description,
            priority: proposal.priority,
          }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch("/api/actions/compliance-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regulationCode: proposal.regulationCode,
            regulationTitle: proposal.regulationTitle,
            note: proposal.note,
          }),
        });
        if (!res.ok) throw new Error();
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (proposal.kind === "work_order_proposal") {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
          <ClipboardPlus size={13} /> Proposed work order — {proposal.equipmentTag} ({proposal.priority})
        </div>
        <p className="text-xs text-text-secondary">{proposal.description}</p>
        <ConfirmButton status={status} onClick={confirm} doneLabel="Work order created" actionLabel="Create work order" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
        <ShieldAlert size={13} /> Proposed compliance follow-up — {proposal.regulationTitle}
      </div>
      <p className="text-xs text-text-secondary">{proposal.note}</p>
      <ConfirmButton status={status} onClick={confirm} doneLabel="Flagged for follow-up" actionLabel="Flag it" />
    </div>
  );
}

function ConfirmButton({
  status,
  onClick,
  actionLabel,
  doneLabel,
}: {
  status: "idle" | "loading" | "done" | "error";
  onClick: () => void;
  actionLabel: string;
  doneLabel: string;
}) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-accent">
        <Check size={13} /> {doneLabel}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={status === "loading"}
      className="flex items-center gap-1.5 text-xs font-medium bg-accent hover:bg-accent-strong disabled:opacity-60 text-accent-fg rounded-md px-2.5 py-1.5"
    >
      {status === "loading" && <Loader2 size={12} className="animate-spin" />}
      {status === "error" ? "Failed — try again" : actionLabel}
    </button>
  );
}
