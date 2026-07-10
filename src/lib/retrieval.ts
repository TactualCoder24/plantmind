import { Chunk } from "@/lib/types";
import { embed, cosineSim } from "@/lib/embeddings";

export function retrieveTopChunks(query: string, chunks: Chunk[], k = 5): (Chunk & { score: number })[] {
  const qVec = embed(query);
  return chunks
    .map((c) => ({ ...c, score: cosineSim(qVec, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((c) => c.score > 0.01);
}
