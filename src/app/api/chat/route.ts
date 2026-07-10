import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB } from "@/lib/db";
import { retrieveTopChunks } from "@/lib/retrieval";
import { equipmentSeedIdsFromText, graphFactsFor } from "@/lib/graph";
import { synthesizeAnswer, buildCitations } from "@/lib/llm";
import { runChatAgent } from "@/lib/chatAgent";
import { ChatAuditEntry, Citation } from "@/lib/types";

export async function POST(req: Request) {
  const { question, role } = (await req.json()) as { question: string; role?: string };
  if (!question || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const db = await readDB();
  const roleValue = role || "engineer";

  // Try the agentic path first (model decides which tools to call, mirroring the RCA agent).
  // Falls back to the original fixed retrieve-then-generate RAG pipeline if no API key is set
  // or the agent loop fails, so /chat never breaks.
  const agentic = await runChatAgent(db, question, roleValue);

  let answer: string;
  let confidence: number;
  let citations: Citation[];
  let graphFacts: string[];
  let steps: { step: number; tool: string; args: Record<string, unknown> }[];
  let isAgentic: boolean;

  if (agentic) {
    ({ answer, confidence, citations, graphFacts, steps } = agentic);
    isAgentic = true;
  } else {
    const topChunks = await retrieveTopChunks(question, db.chunks, 6);
    const seedIds = new Set<string>(equipmentSeedIdsFromText(db.graph, question));
    for (const c of topChunks) {
      for (const id of equipmentSeedIdsFromText(db.graph, c.text)) seedIds.add(id);
    }
    graphFacts = graphFactsFor(db.graph, Array.from(seedIds));

    const chunkRefs = topChunks.map((c) => ({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      documentType: c.documentType,
      text: c.text,
    }));
    const synth = await synthesizeAnswer(question, roleValue, { chunks: chunkRefs, graphFacts });
    answer = synth.answer;
    confidence = synth.confidence;
    citations = buildCitations(chunkRefs);
    steps = [];
    isAgentic = false;
  }

  // Explainability/audit log: persist every interaction's retrieval trace so a compliance
  // officer (or anyone) can review afterward what the copilot actually used to answer.
  const auditEntry: ChatAuditEntry = {
    id: randomUUID(),
    question,
    role: roleValue,
    answer,
    confidence,
    citationTitles: citations.map((c) => c.documentTitle),
    graphFacts,
    agentic: isAgentic,
    toolSteps: steps.map((s) => s.tool),
    createdAt: new Date().toISOString(),
  };
  db.auditLog = [...(db.auditLog || []), auditEntry].slice(-200);
  await writeDB(db);

  return NextResponse.json({
    answer,
    confidence,
    citations,
    graphFacts,
    steps,
    agentic: isAgentic,
    retrievedCount: citations.length,
  });
}
