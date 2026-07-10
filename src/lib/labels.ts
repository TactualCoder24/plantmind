// Plain-language labels for the technical identifiers used across the UI
// (tool names, graph edge types, compliance statuses) so the app reads like
// a product, not a database dump.

export const RCA_TOOL_LABELS: Record<string, string> = {
  get_equipment_history: "Checking maintenance & repair history",
  get_colocated_equipment: "Looking for nearby connected equipment",
  get_compliance_status: "Checking regulatory compliance status",
  search_documents: "Searching related documents",
  check_trend: "Checking if readings are trending toward alarm",
  propose_work_order: "Drafting a work order proposal",
  propose_compliance_followup: "Drafting a compliance follow-up flag",
  get_regulation_text: "Reading the full regulation text",
};

export function friendlyToolLabel(toolName: string): string {
  return RCA_TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
}

export const EDGE_TYPE_LABELS: Record<string, string> = {
  HAS_INCIDENT: "had an incident:",
  REFERENCES: "references",
  APPLIES_TO: "applies to",
  SATISFIES: "satisfies",
  PERFORMED_ON: "was performed on",
  PERFORMED_BY: "was performed by",
  MENTIONS: "mentions",
  CAUSED_BY: "was caused by",
  PART_OF: "is part of",
};

export function friendlyEdgeLabel(edgeType: string): string {
  return EDGE_TYPE_LABELS[edgeType] || edgeType.replace(/_/g, " ").toLowerCase();
}

// Turns a raw graph fact string like:
//   "C-301 (Equipment) -[CAUSED_BY]-> P-104 (Equipment)"
// into a plain sentence like:
//   "C-301 was caused by P-104"
export function formatGraphFact(fact: string): string {
  const match = fact.match(/^(.+?) \(\w+\) -\[(\w+)\]-> (.+?) \(\w+\)$/);
  if (!match) return fact;
  const [, from, edgeType, to] = match;
  return `${from} ${friendlyEdgeLabel(edgeType)} ${to}`;
}

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  gap: "Needs attention",
  compliant: "Compliant",
  needs_review: "Needs a closer look",
};

export function friendlyStatusLabel(status: string): string {
  return COMPLIANCE_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export function confidenceLabel(confidence: number): string {
  if (confidence > 0.7) return "High confidence";
  if (confidence > 0.4) return "Medium confidence";
  return "Low confidence";
}
