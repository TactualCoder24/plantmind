import { ExtractedEntities } from "@/lib/types";
import { llmExtractEntities } from "@/lib/llm";
import { DOC_CODE_PREFIXES, isDocCode } from "@/lib/docCodes";

// Negative lookbehind excludes matches that are actually the tail segment of a
// multi-part document code (e.g. "FACT-001" inside "REG-FACT-001") rather than
// a real equipment tag.
const EQUIPMENT_RE = new RegExp(`(?<!(?:${DOC_CODE_PREFIXES.join("|")})-)\\b[A-Z]{1,5}-\\d{1,4}\\b`, "g");
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
const REG_RE = /\b(?:REG-[A-Z0-9-]+|OISD-\d+|PESO|PSV-\d+)\b/g;
const PERSON_RE = /\b[A-Z]\.\s?[A-Z][a-zA-Z]+\b/g;

// The LLM extractor is asked for "regulatory references" in free text and tends to over-include
// anything that sounds official (standards, doc codes, act names). Only keep entries that actually
// look like a formal regulation code — same shape the regex fallback matches.
const REG_CODE_SHAPE = /^(?:REG-[A-Z0-9-]+|OISD-\d+|PESO|PSV-\d+)$/;

function regexExtract(content: string): ExtractedEntities {
  const equipmentTags = Array.from(new Set(content.match(EQUIPMENT_RE) || [])).filter((tag) => !isDocCode(tag));
  const dates = Array.from(new Set(content.match(DATE_RE) || []));
  const regulatoryRefs = Array.from(new Set(content.match(REG_RE) || []));
  const personnel = Array.from(new Set(content.match(PERSON_RE) || []));

  const processParameters: { name: string; value: string }[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9 /]{2,40}):\s*(.+)$/);
    if (m && /\d/.test(m[2])) {
      processParameters.push({ name: m[1].trim(), value: m[2].trim().slice(0, 80) });
    }
  }

  return { equipmentTags, personnel, dates, regulatoryRefs, processParameters };
}

/**
 * Entity extraction: tries LLM-based structured extraction first (higher
 * recall on personnel/parameters), falls back to deterministic regex
 * extraction if no API key is configured or the call fails, so ingestion
 * never blocks a demo on network/key availability.
 */
export async function extractEntities(content: string): Promise<ExtractedEntities> {
  const fallback = regexExtract(content);
  const llmResult = await llmExtractEntities(content);
  if (!llmResult) return fallback;

  // merge: prefer LLM entities, but keep any regex hits it missed
  const merge = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  return {
    equipmentTags: merge(llmResult.equipmentTags, fallback.equipmentTags),
    personnel: merge(llmResult.personnel, fallback.personnel),
    dates: merge(llmResult.dates, fallback.dates),
    regulatoryRefs: merge(llmResult.regulatoryRefs, fallback.regulatoryRefs).filter((ref) => REG_CODE_SHAPE.test(ref)),
    processParameters: llmResult.processParameters.length > 0 ? llmResult.processParameters : fallback.processParameters,
  };
}
