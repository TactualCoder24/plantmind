import { GoogleGenerativeAI } from "@google/generative-ai";
import { Citation, ExtractedEntities } from "@/lib/types";

const MODEL = "gemini-flash-lite-latest";

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const client = new GoogleGenerativeAI(key);
  return client.getGenerativeModel({ model: MODEL });
}

export function llmAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * LLM-based structured entity extraction. Returns null (triggering the
 * regex fallback in extract.ts) if no API key is set or the call fails.
 */
export async function llmExtractEntities(content: string): Promise<ExtractedEntities | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(
      `Extract structured entities from this industrial document. Return ONLY valid JSON matching this shape, no prose, no markdown fences:
{"equipmentTags": string[], "personnel": string[], "dates": string[] (YYYY-MM-DD), "regulatoryRefs": string[], "processParameters": [{"name": string, "value": string}]}

Document:
"""
${content.slice(0, 6000)}
"""`
    );
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      equipmentTags: parsed.equipmentTags || [],
      personnel: parsed.personnel || [],
      dates: parsed.dates || [],
      regulatoryRefs: parsed.regulatoryRefs || [],
      processParameters: parsed.processParameters || [],
    };
  } catch (e) {
    console.error("[llmExtractEntities] falling back to regex extraction:", e instanceof Error ? e.message : e);
    return null;
  }
}

export interface VisionExtraction {
  extractedText: string;
  entities: ExtractedEntities;
}

/**
 * Vision-based ingestion: feeds a PDF/image file directly to Gemini's
 * multimodal input to transcribe it and extract structured entities in one
 * call, rather than running a separate OCR stage. Returns null if no API
 * key is set or the call fails — vision ingestion has no offline fallback
 * (there's no local OCR in this build), so the caller should surface that
 * clearly rather than silently degrading.
 */
export async function llmExtractFromFile(base64Data: string, mimeType: string): Promise<VisionExtraction | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const result = await model.generateContent([
      {
        inlineData: { data: base64Data, mimeType },
      },
      {
        text: `This is a scanned/photographed industrial document (work order, spec sheet, inspection form, etc). Transcribe its full text content, then extract structured entities. Return ONLY valid JSON, no prose, no markdown fences, matching this shape:
{"extractedText": string (full transcription), "entities": {"equipmentTags": string[], "personnel": string[], "dates": string[] (YYYY-MM-DD), "regulatoryRefs": string[], "processParameters": [{"name": string, "value": string}]}}`,
      },
    ]);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      extractedText: parsed.extractedText || "",
      entities: {
        equipmentTags: parsed.entities?.equipmentTags || [],
        personnel: parsed.entities?.personnel || [],
        dates: parsed.entities?.dates || [],
        regulatoryRefs: parsed.entities?.regulatoryRefs || [],
        processParameters: parsed.entities?.processParameters || [],
      },
    };
  } catch (e) {
    console.error("[llmExtractFromFile] vision extraction failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export interface RagContext {
  chunks: { documentId: string; documentTitle: string; documentType: string; text: string }[];
  graphFacts: string[];
}

/**
 * Synthesizes a cited answer from retrieved chunks + graph facts. Falls
 * back to an extractive template (no LLM) when no API key is present, so
 * the demo still answers with citations offline.
 */
export async function synthesizeAnswer(
  question: string,
  role: string,
  ctx: RagContext
): Promise<{ answer: string; confidence: number }> {
  const model = getModel();

  if (!model) {
    const top = ctx.chunks.slice(0, 3);
    const answer = [
      `Based on ${top.length} retrieved source(s)${ctx.graphFacts.length ? " and the knowledge graph" : ""}:`,
      ...top.map((c, i) => `[${i + 1}] (${c.documentTitle}) ${c.text.slice(0, 280).trim()}...`),
      ctx.graphFacts.length ? `\nRelated graph facts:\n- ${ctx.graphFacts.slice(0, 5).join("\n- ")}` : "",
      `\n(Offline mode: set GEMINI_API_KEY for synthesized natural-language answers.)`,
    ]
      .filter(Boolean)
      .join("\n");
    return { answer, confidence: top.length > 0 ? 0.55 : 0.15 };
  }

  try {
    const contextBlock = ctx.chunks
      .map((c, i) => `[Source ${i + 1}] (${c.documentType} - "${c.documentTitle}")\n${c.text}`)
      .join("\n\n");
    const graphBlock = ctx.graphFacts.length
      ? `\n\nKnowledge graph relationships relevant to this query:\n${ctx.graphFacts.map((f) => `- ${f}`).join("\n")}`
      : "";

    const roleGuidance: Record<string, string> = {
      technician: "Answer for a field technician: be concise, action-oriented, and safety-conscious.",
      engineer: "Answer for a maintenance/reliability engineer: include technical detail, root causes, and trends.",
      compliance: "Answer for a compliance officer: highlight regulatory implications and any documented gaps.",
    };

    const result = await model.generateContent(
      `You are an industrial knowledge copilot for a plant. Answer the question using ONLY the provided sources and graph facts. Cite sources inline using [Source N] notation. If the sources don't fully answer the question, say so explicitly. ${roleGuidance[role] || ""}

${contextBlock}${graphBlock}

Question: ${question}

Answer (with inline [Source N] citations):`
    );
    const text = result.response.text();
    const confidence = ctx.chunks.length >= 3 ? 0.9 : ctx.chunks.length > 0 ? 0.7 : 0.2;
    return { answer: text, confidence };
  } catch (e) {
    console.error("[synthesizeAnswer] Gemini call failed, falling back to extractive answer:", e instanceof Error ? e.message : e);
    const top = ctx.chunks.slice(0, 3);
    return {
      answer: `(LLM call failed, showing retrieved sources instead)\n` + top.map((c) => `- ${c.documentTitle}: ${c.text.slice(0, 200)}`).join("\n"),
      confidence: 0.3,
    };
  }
}

export function buildCitations(chunks: { documentId: string; documentTitle: string; documentType: string; text: string }[]): Citation[] {
  return chunks.map((c) => ({
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    documentType: c.documentType as Citation["documentType"],
    snippet: c.text.slice(0, 220).trim() + (c.text.length > 220 ? "..." : ""),
  }));
}
