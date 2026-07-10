import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB } from "@/lib/db";
import { ComplianceFollowup } from "@/lib/types";

interface Body {
  regulationCode: string;
  regulationTitle: string;
  note: string;
}

/**
 * Executes a compliance-followup proposal an agent drafted (src/lib/rcaTools.ts
 * proposeComplianceFollowup). Same pattern as the work-order action: only ever triggered by an
 * explicit user click, never by the agent itself.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Body>;
  if (!body.regulationCode || !body.note) {
    return NextResponse.json({ error: "regulationCode and note are required" }, { status: 400 });
  }

  const db = await readDB();
  const entry: ComplianceFollowup = {
    id: randomUUID(),
    regulationCode: body.regulationCode,
    regulationTitle: body.regulationTitle || body.regulationCode,
    note: body.note,
    raisedBy: "agent",
    createdAt: new Date().toISOString(),
  };
  db.complianceFollowups = [...(db.complianceFollowups || []), entry];
  await writeDB(db);

  return NextResponse.json({ followup: entry });
}

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ followups: db.complianceFollowups || [] });
}
