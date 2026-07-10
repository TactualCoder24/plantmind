import { NextResponse } from "next/server";
import { resetDB } from "@/lib/db";
import { ingestBatch } from "@/lib/ingest";
import { seedDocs } from "@/data/seedDocs";

export async function POST() {
  resetDB();
  const docs = await ingestBatch(
    seedDocs.map((d) => ({ title: d.title, type: d.type, filename: d.filename, content: d.content }))
  );
  return NextResponse.json({ ok: true, count: docs.length });
}

export async function GET() {
  return POST();
}
