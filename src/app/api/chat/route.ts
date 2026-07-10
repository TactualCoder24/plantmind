import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { retrieveTopChunks } from "@/lib/retrieval";
import { equipmentSeedIdsFromText, graphFactsFor } from "@/lib/graph";
import { synthesizeAnswer, buildCitations } from "@/lib/llm";

export async function POST(req: Request) {
  const { question, role } = (await req.json()) as { question: string; role?: string };
  if (!question || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const db = readDB();
  const topChunks = retrieveTopChunks(question, db.chunks, 6);

  const seedIds = new Set<string>(equipmentSeedIdsFromText(db.graph, question));
  for (const c of topChunks) {
    for (const id of equipmentSeedIdsFromText(db.graph, c.text)) seedIds.add(id);
  }
  const graphFacts = graphFactsFor(db.graph, Array.from(seedIds));

  const { answer, confidence } = await synthesizeAnswer(question, role || "engineer", {
    chunks: topChunks.map((c) => ({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      documentType: c.documentType,
      text: c.text,
    })),
    graphFacts,
  });

  const citations = buildCitations(
    topChunks.map((c) => ({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      documentType: c.documentType,
      text: c.text,
    }))
  );

  return NextResponse.json({
    answer,
    confidence,
    citations,
    graphFacts,
    retrievedCount: topChunks.length,
  });
}
