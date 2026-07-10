import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { DB } from "@/lib/types";
import { RCA_TOOL_SPECS, runRcaTool } from "@/lib/rcaTools";
import { runComplianceCheck } from "@/lib/compliance";

const MODEL = "gemini-flash-lite-latest";
const MAX_STEPS = 5;

export interface ComplianceAgentStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ComplianceAgentResult {
  regulationCode: string;
  report: string;
  steps: ComplianceAgentStep[];
  agentic: boolean;
}

// The agent gets the same tool set as RCA/chat, plus one extra: reading the full regulation text
// (the rule-based checker below only does keyword matching over it, never actually reasons about
// what it says).
const GET_REGULATION_TEXT_SPEC = {
  name: "get_regulation_text",
  description: "Get the full text of a regulation document by its code (e.g. REG-OISD-001), plus which equipment and documents are already linked to it.",
  args: { regulationCode: "string, the regulation code" },
} as const;

function getRegulationText(db: DB, regulationCode: string) {
  const doc = db.documents.find((d) => d.type === "regulation" && (d.content.includes(regulationCode) || d.title.includes(regulationCode)));
  if (!doc) return { error: `No regulation document found for ${regulationCode}` };
  const finding = runComplianceCheck(db).find((f) => f.regulationCode === regulationCode);
  return {
    text: doc.content,
    relatedEquipment: finding?.relatedEquipment || [],
    relatedDocuments: finding?.relatedDocuments.map((d) => d.title) || [],
  };
}

function toGeminiTools(): FunctionDeclaration[] {
  const specs = [GET_REGULATION_TEXT_SPEC, ...RCA_TOOL_SPECS];
  return specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(spec.args).map(([key, desc]) => [key, { type: SchemaType.STRING, description: desc as string }])
      ),
      required: Object.keys(spec.args),
    },
  }));
}

async function runTool(db: DB, name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === "get_regulation_text") return getRegulationText(db, String(args.regulationCode || ""));
  return runRcaTool(db, name, args);
}

/**
 * Agentic compliance reasoning: unlike src/lib/compliance.ts's runComplianceCheck() — a fixed
 * keyword-regex-and-graph-traversal pass with zero LLM involvement, honestly labeled as
 * rule-based rather than agentic — this actually reads the regulation's full text, decides for
 * itself what else to check (equipment history, related documents, trend data), and reasons about
 * whether the regulation is actually being satisfied rather than just scanning for gap-sounding
 * words. Can propose a follow-up flag if it finds a real issue, same propose-not-write pattern as
 * the RCA/chat agents. Falls back to the rule-based check (explicitly labeled non-agentic) if no
 * API key is set or the agent loop fails.
 */
export async function runComplianceAgent(db: DB, regulationCode: string): Promise<ComplianceAgentResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return runRuleBasedFallback(db, regulationCode);

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({ model: MODEL, tools: [{ functionDeclarations: toGeminiTools() }] });
  const chat = model.startChat();
  const steps: ComplianceAgentStep[] = [];

  try {
    let result = await chat.sendMessage(
      `You are a compliance officer reviewing regulation "${regulationCode}" for an industrial plant. ` +
        `Read its full text first (get_regulation_text), then decide what else you need — equipment ` +
        `history, related documents, trend data — to judge whether it's actually being satisfied, not ` +
        `just whether the regulation document happens to contain gap-sounding words. You decide which ` +
        `tools to call and in what order. If you find a specific, real gap, propose a compliance ` +
        `follow-up (propose_compliance_followup) — this only drafts a proposal for the user to confirm, ` +
        `it doesn't create anything itself. When you're done, respond with a final plain-text verdict: ` +
        `whether this regulation is satisfied, needs review, or has a gap, with your reasoning and the ` +
        `specific evidence you found. Do not call more than ${MAX_STEPS} tools total.`
    );

    for (let i = 0; i < MAX_STEPS; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      const responses = [];
      for (const call of calls) {
        const args = (call.args as Record<string, unknown>) || {};
        const toolResult = await runTool(db, call.name, args);
        steps.push({ step: steps.length + 1, tool: call.name, args, result: toolResult });
        responses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
      }
      result = await chat.sendMessage(responses);
    }

    const report = result.response.text() || "The agent did not produce a final verdict within its step budget.";
    return { regulationCode, report, steps, agentic: true };
  } catch (e) {
    console.error("[complianceAgent] Gemini agent loop failed, falling back to rule-based check:", e instanceof Error ? e.message : e);
    return runRuleBasedFallback(db, regulationCode);
  }
}

/** Deterministic, explicitly non-agentic fallback: the same keyword-matching check /compliance always uses. */
function runRuleBasedFallback(db: DB, regulationCode: string): ComplianceAgentResult {
  const finding = runComplianceCheck(db).find((f) => f.regulationCode === regulationCode);
  const report = finding
    ? `Rule-based check for ${regulationCode} (no GEMINI_API_KEY set — this is keyword matching, not reasoning):\n\nStatus: ${finding.status}\n${finding.evidence}\n\nRecommendation: ${finding.recommendation}`
    : `No regulation document found for ${regulationCode}.`;
  return { regulationCode, report, steps: [], agentic: false };
}
