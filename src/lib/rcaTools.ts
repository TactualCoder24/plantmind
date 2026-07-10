import { DB } from "@/lib/types";
import { retrieveTopChunks } from "@/lib/retrieval";
import { runComplianceCheck } from "@/lib/compliance";
import { computeTrends } from "@/lib/predictive";

/**
 * Tool functions available to the RCA and chat agents. Each is a pure function over the current
 * DB snapshot so the agent loop can call them repeatedly without side effects or re-reading disk
 * on every step. The two "propose_*" tools are the exception to "pure read" — they still don't
 * write anything themselves (see runRcaTool's docstring for why), but they're the tools that let
 * an agent go from "here's what I found" to "here's a specific action, ready for you to confirm."
 */

export function getEquipmentHistory(db: DB, equipmentTag: string) {
  const relevant = db.documents.filter(
    (d) =>
      d.entities.equipmentTags.includes(equipmentTag) &&
      ["work_order", "inspection_report", "incident_report"].includes(d.type)
  );
  const withDates = relevant.map((d) => {
    const dateMatch = d.content.match(/(?:Reported|Date(?: Opened)?):\s*(\d{4}-\d{2}-\d{2})/);
    return {
      title: d.title,
      type: d.type,
      date: dateMatch ? dateMatch[1] : d.entities.dates[0] || "unknown",
      summary: d.content.split("\n").slice(0, 6).join(" ").slice(0, 400),
    };
  });
  withDates.sort((a, b) => (a.date < b.date ? -1 : 1));
  return withDates;
}

export function getColocatedEquipment(db: DB, equipmentTag: string) {
  const docsWithTag = db.documents.filter((d) => d.entities.equipmentTags.includes(equipmentTag));
  const others = new Set<string>();
  for (const d of docsWithTag) {
    for (const tag of d.entities.equipmentTags) {
      if (tag !== equipmentTag) others.add(tag);
    }
  }
  return Array.from(others);
}

export function getComplianceStatus(db: DB, equipmentTag: string) {
  const findings = runComplianceCheck(db);
  return findings
    .filter((f) => f.relatedEquipment.includes(equipmentTag))
    .map((f) => ({
      regulation: f.regulationCode,
      status: f.status,
      evidence: f.evidence,
      recommendation: f.recommendation,
    }));
}

export async function searchDocuments(db: DB, query: string) {
  const top = await retrieveTopChunks(query, db.chunks, 5);
  return top.map((c) => ({
    document: c.documentTitle,
    type: c.documentType,
    excerpt: c.text.slice(0, 300),
  }));
}

export function checkTrend(db: DB, equipmentTag: string) {
  const matches = computeTrends(db).filter((t) => t.equipmentTag === equipmentTag);
  if (matches.length === 0) return { equipmentTag, message: "No multi-reading trend data found for this equipment tag." };
  return matches.map((t) => ({ metric: t.metric, trending: t.trending, threshold: t.threshold, message: t.message }));
}

export interface WorkOrderProposal {
  kind: "work_order_proposal";
  equipmentTag: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
}

/**
 * Drafts a work order — but does NOT create one. The agent has no direct write access to the
 * document store; this returns a structured proposal that the UI renders as a confirm-before-
 * creating card, and only src/app/api/actions/work-order/route.ts (triggered by an explicit user
 * click) actually persists it. An LLM autonomously filing real work orders on an industrial plant
 * with no human in the loop is a materially different (and materially riskier) claim than an LLM
 * autonomously deciding which documents to read — the read tools above are safe to let it run
 * freely; this one isn't, so it doesn't.
 */
export function proposeWorkOrder(equipmentTag: string, description: string, priority: string): WorkOrderProposal {
  const validPriorities = ["low", "medium", "high", "critical"];
  const normalizedPriority = validPriorities.includes(priority.toLowerCase()) ? (priority.toLowerCase() as WorkOrderProposal["priority"]) : "medium";
  return { kind: "work_order_proposal", equipmentTag, description, priority: normalizedPriority };
}

export interface ComplianceFollowupProposal {
  kind: "compliance_followup_proposal";
  regulationCode: string;
  regulationTitle: string;
  note: string;
}

/** Same "propose, don't write" pattern as proposeWorkOrder — see that docstring. */
export function proposeComplianceFollowup(db: DB, regulationCode: string, note: string): ComplianceFollowupProposal {
  const findings = runComplianceCheck(db);
  const match = findings.find((f) => f.regulationCode === regulationCode);
  return {
    kind: "compliance_followup_proposal",
    regulationCode,
    regulationTitle: match?.regulationTitle || regulationCode,
    note,
  };
}

export const RCA_TOOL_SPECS = [
  {
    name: "get_equipment_history",
    description:
      "Get the chronological work order, inspection, and incident history for a specific equipment tag (e.g. C-301). Returns dated summaries.",
    args: { equipmentTag: "string, the equipment tag e.g. C-301" },
  },
  {
    name: "get_colocated_equipment",
    description:
      "Find other equipment tags that co-occur in the same documents as the given equipment tag (e.g. sharing a skid, foundation, or utility system) — useful for finding structural/shared-asset root causes.",
    args: { equipmentTag: "string, the equipment tag e.g. C-301" },
  },
  {
    name: "get_compliance_status",
    description: "Get regulatory compliance findings (gaps or compliant status) linked to a specific equipment tag.",
    args: { equipmentTag: "string, the equipment tag e.g. C-301" },
  },
  {
    name: "search_documents",
    description: "Semantic search across all ingested documents for a free-text query. Use for anything not covered by the other tools.",
    args: { query: "string, free-text search query" },
  },
  {
    name: "check_trend",
    description:
      "Check whether an equipment tag's tracked readings (vibration, temperature) are trending toward their alarm threshold, based on historical readings — not just its current/latest state.",
    args: { equipmentTag: "string, the equipment tag e.g. C-301" },
  },
  {
    name: "propose_work_order",
    description:
      "Draft a work order for a specific corrective action on a piece of equipment, when the evidence clearly points to one. This does NOT create the work order — it only prepares a proposal that will be shown to the user to confirm or reject. Use this when you've identified a concrete, actionable fix, not for vague recommendations.",
    args: {
      equipmentTag: "string, the equipment tag this work order is for",
      description: "string, what the work order should say to do and why",
      priority: "string, one of: low, medium, high, critical",
    },
  },
  {
    name: "propose_compliance_followup",
    description:
      "Flag a regulation for follow-up review, when you've found a specific gap or ambiguity worth a compliance officer's attention. This does NOT create the flag — it only prepares a proposal the user must confirm.",
    args: {
      regulationCode: "string, the regulation code, e.g. REG-OISD-001",
      note: "string, what specifically needs follow-up and why",
    },
  },
] as const;

export type RcaToolName = (typeof RCA_TOOL_SPECS)[number]["name"];

export async function runRcaTool(db: DB, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_equipment_history":
      return getEquipmentHistory(db, String(args.equipmentTag || ""));
    case "get_colocated_equipment":
      return getColocatedEquipment(db, String(args.equipmentTag || ""));
    case "get_compliance_status":
      return getComplianceStatus(db, String(args.equipmentTag || ""));
    case "search_documents":
      return searchDocuments(db, String(args.query || ""));
    case "check_trend":
      return checkTrend(db, String(args.equipmentTag || ""));
    case "propose_work_order":
      return proposeWorkOrder(String(args.equipmentTag || ""), String(args.description || ""), String(args.priority || "medium"));
    case "propose_compliance_followup":
      return proposeComplianceFollowup(db, String(args.regulationCode || ""), String(args.note || ""));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
