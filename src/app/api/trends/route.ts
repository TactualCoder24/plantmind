import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { computeTrends } from "@/lib/predictive";

export async function GET() {
  const db = await readDB();
  const trends = computeTrends(db);
  return NextResponse.json({ trends });
}
