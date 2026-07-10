import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { runComplianceAgent } from "@/lib/complianceAgent";

export async function POST(req: Request) {
  const { regulationCode } = (await req.json()) as { regulationCode?: string };
  if (!regulationCode || !regulationCode.trim()) {
    return NextResponse.json({ error: "regulationCode is required" }, { status: 400 });
  }
  const db = await readDB();
  const result = await runComplianceAgent(db, regulationCode.trim());
  return NextResponse.json(result);
}
