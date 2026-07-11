import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { DB } from "@/lib/types";
import { RCA_TOOL_SPECS, runRcaTool, getEquipmentHistory, getColocatedEquipment, getComplianceStatus } from "@/lib/rcaTools";

const MODEL = "gemini-flash-lite-latest";
const MAX_STEPS = 6;

export interface RcaStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  resultPreview: string;
  result: unknown;
}

export interface RcaResult {
  equipmentTag: string;
  report: string;
  steps: RcaStep[];
  agentic: boolean;
}

function toGeminiTools(): FunctionDeclaration[] {
  return RCA_TOOL_SPECS.map((spec) => ({
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

/**
 * Autonomous RCA agent: the model is given tools over the graph/document
 * store and decides for itself which to call, in what order, and when it
 * has enough evidence to produce a final root-cause report. This is the
 * one part of Innfetch that is agentic in the strict sense (autonomous
 * multi-step tool use), as opposed to /chat (single-pass RAG) or
 * /compliance (fixed rule traversal).
 *
 * Falls back to a deterministic, non-agentic correlation (no LLM, no tool
 * loop) if no GEMINI_API_KEY is set, so the endpoint never breaks offline —
 * but that fallback path is explicitly NOT agentic and is labeled as such.
 */
export async function runRcaAgent(db: DB, equipmentTag: string): Promise<RcaResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return runOfflineRca(db, equipmentTag);

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: MODEL,
    tools: [{ functionDeclarations: toGeminiTools() }],
  });

  const chat = model.startChat();
  const steps: RcaStep[] = [];

  try {
    let result = await chat.sendMessage(
      `You are a reliability engineering RCA (root cause analysis) agent for an industrial plant. ` +
        `Investigate repeat or notable failures for equipment tag "${equipmentTag}". ` +
        `Use the available tools to gather its work order/incident history, check for co-located ` +
        `equipment that might be a structural/shared-asset root cause, check whether its readings ` +
        `are trending toward an alarm threshold (not just its current state), and check its ` +
        `regulatory compliance status. Call tools as many times as you need — you decide the order ` +
        `and when you have enough evidence. If the evidence clearly points to a specific corrective ` +
        `action, propose a work order for it (propose_work_order) — this only drafts a proposal for ` +
        `the user to confirm, it does not create anything itself, so don't hesitate to use it when ` +
        `warranted. Same for propose_compliance_followup if you find a specific compliance gap worth ` +
        `flagging. When you're done, respond with a final plain-text RCA report (no more function ` +
        `calls) covering: failure pattern, root cause, evidence, and recommended corrective actions ` +
        `— mention explicitly if you drafted a work order or compliance flag proposal. Do not call ` +
        `more than ${MAX_STEPS} tools total.`
    );

    for (let i = 0; i < MAX_STEPS; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      const responses = [];
      for (const call of calls) {
        const toolResult = await runRcaTool(db, call.name, (call.args as Record<string, unknown>) || {});
        steps.push({
          step: steps.length + 1,
          tool: call.name,
          args: (call.args as Record<string, unknown>) || {},
          resultPreview: JSON.stringify(toolResult).slice(0, 300),
          result: toolResult,
        });
        responses.push({
          functionResponse: { name: call.name, response: { result: toolResult } },
        });
      }
      result = await chat.sendMessage(responses);
    }

    const report = result.response.text() || "The agent did not produce a final report within the step budget.";
    return { equipmentTag, report, steps, agentic: true };
  } catch (e) {
    console.error("[rcaAgent] Gemini agent loop failed, falling back to offline RCA:", e instanceof Error ? e.message : e);
    return runOfflineRca(db, equipmentTag);
  }
}

/** Deterministic, non-agentic fallback: fixed correlation logic, no LLM, no tool loop. */
function runOfflineRca(db: DB, equipmentTag: string): RcaResult {
  const history = getEquipmentHistory(db, equipmentTag);
  const colocated = getColocatedEquipment(db, equipmentTag);
  const compliance = getComplianceStatus(db, equipmentTag);

  const failureEvents = history.filter((h) => h.type === "work_order" || h.type === "incident_report");
  const lines = [
    `Offline RCA summary for ${equipmentTag} (no GEMINI_API_KEY set — this is a fixed correlation, not an autonomous agent):`,
    "",
    `${failureEvents.length} work order / incident record(s) found:`,
    ...failureEvents.map((h) => `- ${h.date}: ${h.title}`),
    "",
    colocated.length > 0
      ? `Co-located equipment sharing documents with ${equipmentTag}: ${colocated.join(", ")}. Investigate shared foundation/utility causes if failures repeat.`
      : `No co-located equipment found in shared documents.`,
    "",
    compliance.length > 0
      ? `Compliance findings tied to ${equipmentTag}:\n` + compliance.map((c) => `- ${c.regulation}: ${c.status} — ${c.recommendation}`).join("\n")
      : `No compliance findings linked to ${equipmentTag}.`,
  ];

  return { equipmentTag, report: lines.join("\n"), steps: [], agentic: false };
}
