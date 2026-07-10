import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { ingestDocument, ingestFile } from "@/lib/ingest";
import { DocType } from "@/lib/types";

export async function GET() {
  const db = await readDB();
  const docs = db.documents.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    filename: d.filename,
    content: d.content,
    uploadedAt: d.uploadedAt,
    entities: d.entities,
    fileUrl: d.fileUrl,
    sourceKind: d.sourceKind,
  }));
  return NextResponse.json({ documents: docs });
}

interface TextUploadBody {
  title: string;
  type: DocType;
  filename: string;
  content: string;
}

interface FileUploadBody {
  title: string;
  type: DocType;
  filename: string;
  base64Data: string;
  mimeType: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<TextUploadBody & FileUploadBody>;
  const { title, type, filename } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (body.base64Data && body.mimeType) {
    try {
      const result = await ingestFile({
        title,
        type: type || "equipment_spec",
        filename: filename || `${title}`,
        base64Data: body.base64Data,
        mimeType: body.mimeType,
      });
      if (!result.document) {
        return NextResponse.json({ error: result.error || "Vision ingestion failed" }, { status: 502 });
      }
      return NextResponse.json({ document: result.document });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Ingestion failed" }, { status: 502 });
    }
  }

  if (!body.content) {
    return NextResponse.json({ error: "content (or base64Data+mimeType for scans/images) is required" }, { status: 400 });
  }
  try {
    const doc = await ingestDocument({ title, type: type || "sop", filename: filename || `${title}.txt`, content: body.content });
    return NextResponse.json({ document: doc });
  } catch (e) {
    // Only reachable when USE_REAL_EMBEDDINGS=true and the Gemini embedding call fails — that
    // path deliberately doesn't fall back silently (see src/lib/embeddings.ts).
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ingestion failed" }, { status: 502 });
  }
}
