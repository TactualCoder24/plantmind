// Prefixes used by document identifiers in this corpus (work orders, incidents,
// inspections, near-misses, shift logs, SOPs, regulations). Centralized so the
// equipment-tag extractor (which must exclude these) and the graph builder's
// cross-reference matcher (which must include these) stay in sync — a new
// document-ID convention only needs to be added here once.
export const DOC_CODE_PREFIXES = ["WO", "INC", "INSP", "INS", "NM", "SL", "SOP", "REG", "OISD"];

export const DOC_CODE_RE = new RegExp(`\\b(?:${DOC_CODE_PREFIXES.join("|")})-[A-Z0-9-]+\\b`, "g");

export function isDocCode(tag: string): boolean {
  return DOC_CODE_PREFIXES.some((p) => tag.startsWith(`${p}-`));
}
