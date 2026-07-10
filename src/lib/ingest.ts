import { randomUUID } from "crypto";
import { DB, DocType, SourceDocument } from "@/lib/types";
import { readDB, writeDB } from "@/lib/db";
import { extractEntities } from "@/lib/extract";
import { chunkText, embed } from "@/lib/embeddings";
import { buildGraph } from "@/lib/graph";
import { llmExtractFromFile } from "@/lib/llm";
import { uploadRawFile } from "@/lib/storage";

export interface IngestInput {
  title: string;
  type: DocType;
  filename: string;
  content: string;
}

function persistDocument(db: DB, doc: SourceDocument): void {
  db.documents.push(doc);
  const textChunks = chunkText(doc.content);
  for (let i = 0; i < textChunks.length; i++) {
    db.chunks.push({
      id: randomUUID(),
      documentId: doc.id,
      documentTitle: doc.title,
      documentType: doc.type,
      text: textChunks[i],
      index: i,
      vector: embed(textChunks[i]),
    });
  }
  db.graph = buildGraph(db.documents);
}

export async function ingestDocument(input: IngestInput): Promise<SourceDocument> {
  const db = readDB();
  const entities = await extractEntities(input.content);

  const doc: SourceDocument = {
    id: randomUUID(),
    title: input.title,
    type: input.type,
    filename: input.filename,
    content: input.content,
    uploadedAt: new Date().toISOString(),
    entities,
    sourceKind: "text",
  };

  persistDocument(db, doc);
  writeDB(db);
  return doc;
}

export interface IngestFileInput {
  title: string;
  type: DocType;
  filename: string;
  base64Data: string;
  mimeType: string;
}

export interface IngestFileResult {
  document: SourceDocument | null;
  error?: string;
}

/**
 * Ingests a scanned/photographed document (image or PDF) via Gemini vision:
 * one call transcribes the content and extracts entities, no separate OCR
 * stage. Requires GEMINI_API_KEY — there's no local vision fallback, so a
 * missing key surfaces as an explicit error rather than a degraded result.
 */
export async function ingestFile(input: IngestFileInput): Promise<IngestFileResult> {
  const extraction = await llmExtractFromFile(input.base64Data, input.mimeType);
  if (!extraction || !extraction.extractedText.trim()) {
    return {
      document: null,
      error:
        "Vision extraction failed or returned no text. This requires GEMINI_API_KEY to be set (no local OCR fallback in this build).",
    };
  }

  const db = readDB();
  const id = randomUUID();
  const { url: fileUrl } = await uploadRawFile(id, input.filename, input.base64Data, input.mimeType);

  const doc: SourceDocument = {
    id,
    title: input.title,
    type: input.type,
    filename: input.filename,
    content: extraction.extractedText,
    uploadedAt: new Date().toISOString(),
    entities: extraction.entities,
    fileUrl,
    sourceKind: "scan",
  };

  persistDocument(db, doc);
  writeDB(db);
  return { document: doc };
}

export async function ingestBatch(inputs: IngestInput[]): Promise<SourceDocument[]> {
  const results: SourceDocument[] = [];
  for (const input of inputs) {
    results.push(await ingestDocument(input));
  }
  return results;
}

export function rebuildGraph(db: DB): DB {
  db.graph = buildGraph(db.documents);
  writeDB(db);
  return db;
}
