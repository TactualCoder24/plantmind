import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";

export async function GET() {
  const db = await readDB();
  const entries = [...(db.auditLog || [])].reverse();
  return NextResponse.json({ entries });
}
