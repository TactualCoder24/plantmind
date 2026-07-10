const VEC_DIM = 384;

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
