import { DB } from "@/lib/types";
import { retrieveTopChunks } from "@/lib/retrieval";
import { runComplianceCheck } from "@/lib/compliance";

/**
 * Tool functions available to the RCA agent. Each is a pure function over
 * the current DB snapshot so the agent loop can call them repeatedly
 * without side effects or re-reading disk on every step.
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
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
