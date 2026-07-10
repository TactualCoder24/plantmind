import { GoogleGenerativeAI } from "@google/generative-ai";

const VEC_DIM = 384;
const REMOTE_MODEL = "text-embedding-004";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "was",
  "were", "at", "by", "with", "this", "that", "it", "as", "be", "are", "from",
  "has", "have", "had", "not", "no", "per", "will", "which", "than", "then",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic local "embedding": feature-hashed term-frequency vector.
 * Avoids depending on an external embeddings API so retrieval works offline.
 */
export function embed(text: string): number[] {
  const vec = new Array(VEC_DIM).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  for (const tok of tokens) {
    const idx = hash(tok) % VEC_DIM;
    vec[idx] += 1;
  }
  // also hash bigrams for a bit of phrase sensitivity
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = tokens[i] + "_" + tokens[i + 1];
    const idx = hash(bigram) % VEC_DIM;
    vec[idx] += 0.5;
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Whether this deployment should use real Gemini embeddings (`text-embedding-004`) instead of
 * the local feature-hashed vectors. Deliberately opt-in (env flag), off by default:
 *
 * Local hashed vectors and real semantic embeddings are NOT comparable — mixing them within the
 * same searchable corpus doesn't just risk a dimension mismatch, it silently corrupts retrieval
 * (cosine similarity between two different vector spaces is meaningless). Since ingestion happens
 * incrementally per-document, a mid-seed quota failure (this key's free tier is capped at 15
 * requests/minute, and seeding fires ~18 back-to-back calls already) would leave some chunks
 * embedded remotely and others locally with no easy way to detect the corruption later. So unlike
 * every other LLM call path in this app, this one does NOT silently fall back per-call — if
 * remote mode is on and a call fails, ingestion fails loudly (same philosophy as vision ingestion
 * having no OCR fallback) rather than quietly mixing embedding schemes.
 */
export function useRemoteEmbeddings(): boolean {
  return process.env.USE_REAL_EMBEDDINGS === "true" && Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Embeds multiple texts in one batched Gemini call (one call per document at ingest time,
 * covering all its chunks, rather than one call per chunk) to keep quota usage bounded. Throws on
 * any failure — see useRemoteEmbeddings() for why this doesn't fall back silently.
 */
export async function embedRemote(texts: string[]): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({ model: REMOTE_MODEL });
  const result = await model.batchEmbedContents({
    requests: texts.map((text) => ({ content: { role: "user", parts: [{ text }] } })),
  });
  return result.embeddings.map((e) => e.values);
}

/** Embeds a single query string with whichever scheme the stored corpus was embedded with. */
export async function embedQuery(text: string): Promise<number[]> {
  if (useRemoteEmbeddings()) {
    const [vec] = await embedRemote([text]);
    return vec;
  }
  return embed(text);
}

export function chunkText(text: string, maxLen = 700): string[] {
  const paras = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";
  for (const p of paras) {
    if ((current + "\n" + p).length > maxLen && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n" + p : p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}
