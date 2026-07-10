import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { DB, Citation } from "@/lib/types";
import { RCA_TOOL_SPECS, runRcaTool } from "@/lib/rcaTools";
import { graphFactsFor } from "@/lib/graph";

const MODEL = "gemini-flash-lite-latest";
const MAX_STEPS = 4;

export interface ChatAgentStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ChatAgentResult {
  answer: string;
  confidence: number;
  citations: Citation[];
  graphFacts: string[];
  steps: ChatAgentStep[];
  agentic: true;
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

function collectDocTitles(toolResult: unknown, out: Set<string>) {
  if (!Array.isArray(toolResult)) return;
  for (const item of toolResult) {
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      if (typeof rec.title === "string") out.add(rec.title);
      if (typeof rec.document === "string") out.add(rec.document);
    }
  }
}

function buildCitationsFromTitles(db: DB, titles: Set<string>): Citation[] {
  const citations: Citation[] = [];
  for (const title of titles) {
    const doc = db.documents.find((d) => d.title === title);
    if (!doc) continue;
    citations.push({
      documentId: doc.id,
      documentTitle: doc.title,
      documentType: doc.type,
      snippet: doc.content.slice(0, 220).trim() + (doc.content.length > 220 ? "..." : ""),
    });
  }
  return citations.slice(0, 6);
}

/**
 * Agentic version of the copilot: instead of always doing a fixed
 * retrieve-then-generate pass, the model is handed the same tools as the
 * RCA agent (search documents, equipment history, co-located equipment,
 * compliance status) and decides for itself which to call, in what order,
 * and when it has enough evidence to answer — genuinely agentic, matching
 * the RCA agent's pattern rather than /chat's original single-pass RAG.
 *
 * Returns null (never throws) if no GEMINI_API_KEY is set or the agent loop
 * fails, so the caller can fall back to the original fixed RAG pipeline.
 */
export async function runChatAgent(db: DB, question: string, role: string): Promise<ChatAgentResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: MODEL,
    tools: [{ functionDeclarations: toGeminiTools() }],
  });

  const chat = model.startChat();
  const steps: ChatAgentStep[] = [];
  const usedDocTitles = new Set<string>();
  const usedEquipmentTags = new Set<string>();

  const roleGuidance: Record<string, string> = {
    technician: "Answer for a field technician: be concise, action-oriented, and safety-conscious.",
    engineer: "Answer for a maintenance/reliability engineer: include technical detail, root causes, and trends.",
    compliance: "Answer for a compliance officer: highlight regulatory implications and any documented gaps.",
  };

  try {
    let result = await chat.sendMessage(
      `You are an industrial knowledge copilot for a plant. ${roleGuidance[role] || ""} ` +
        `Use the available tools to find whatever information you need to answer the question — search ` +
        `documents, check an equipment's history, check what other equipment shares documents with it, ` +
        `check its compliance status, or check whether its readings are trending toward an alarm ` +
        `threshold, in whatever combination is relevant. You decide which tools to call, in what order, ` +
        `and when you have enough evidence to stop. If — and only if — the question calls for a concrete ` +
        `corrective action and the evidence clearly supports one, you may propose a work order ` +
        `(propose_work_order) or flag a compliance follow-up (propose_compliance_followup); these only ` +
        `draft a proposal for the user to confirm, they don't create anything themselves. Don't force it ` +
        `for questions that are just asking for information. When you're done, respond with a final ` +
        `plain-text answer that cites the specific document titles you drew on, and mentions explicitly ` +
        `if you drafted a proposal. If the tools don't turn up enough to answer confidently, say so ` +
        `explicitly. Do not call more than ${MAX_STEPS} tools total.\n\n` +
        `Question: ${question}`
    );

    for (let i = 0; i < MAX_STEPS; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      const responses = [];
      for (const call of calls) {
        const args = (call.args as Record<string, unknown>) || {};
        const toolResult = await runRcaTool(db, call.name, args);
        steps.push({ step: steps.length + 1, tool: call.name, args, result: toolResult });
        if (typeof args.equipmentTag === "string" && args.equipmentTag) usedEquipmentTags.add(args.equipmentTag);
        collectDocTitles(toolResult, usedDocTitles);
        responses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
      }
      result = await chat.sendMessage(responses);
    }

    const answer = result.response.text() || "The agent did not produce a final answer within its step budget.";
    const citations = buildCitationsFromTitles(db, usedDocTitles);
    const seedIds = Array.from(usedEquipmentTags)
      .map((tag) => `Equipment:${tag}`)
      .filter((id) => db.graph.nodes.some((n) => n.id === id));
    const graphFacts = graphFactsFor(db.graph, seedIds);
    const confidence = citations.length >= 2 ? 0.85 : citations.length > 0 ? 0.6 : 0.3;

    return { answer, confidence, citations, graphFacts, steps, agentic: true };
  } catch (e) {
    console.error("[chatAgent] Gemini agent loop failed, falling back to fixed RAG:", e instanceof Error ? e.message : e);
    return null;
  }
}
