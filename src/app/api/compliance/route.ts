import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { runComplianceCheck } from "@/lib/compliance";

export async function GET() {
  const db = readDB();
  const findings = runComplianceCheck(db);
  return NextResponse.json({ findings });
}
