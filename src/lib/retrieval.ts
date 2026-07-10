import { Chunk } from "@/lib/types";
import { cosineSim, embedQuery } from "@/lib/embeddings";

export async function retrieveTopChunks(query: string, chunks: Chunk[], k = 5): Promise<(Chunk & { score: number })[]> {
  const qVec = await embedQuery(query);
  return chunks
    .map((c) => ({ ...c, score: cosineSim(qVec, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((c) => c.score > 0.01);
}
