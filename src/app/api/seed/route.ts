import { NextResponse } from "next/server";
import { resetDB } from "@/lib/db";
import { ingestBatch } from "@/lib/ingest";
import { seedDocs } from "@/data/seedDocs";

export async function POST() {
  await resetDB();
  try {
    const docs = await ingestBatch(
      seedDocs.map((d) => ({ title: d.title, type: d.type, filename: d.filename, content: d.content }))
    );
    return NextResponse.json({ ok: true, count: docs.length });
  } catch (e) {
    // Only reachable with USE_REAL_EMBEDDINGS=true — a mid-seed quota failure there is exactly
    // why that mode is opt-in and off by default; see src/lib/embeddings.ts.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Seeding failed", hint: "If USE_REAL_EMBEDDINGS=true, this is likely a Gemini quota limit — unset it or retry shortly." },
      { status: 502 }
    );
  }
}

export async function GET() {
  return POST();
}
