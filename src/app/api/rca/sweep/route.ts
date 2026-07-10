import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { computeTrends } from "@/lib/predictive";
import { runRcaAgent } from "@/lib/rcaAgent";

const MAX_SWEEP = 3;

/**
 * Autonomous batch investigation: instead of a human picking one piece of equipment at a time on
 * /rca, this finds everything currently trending toward its alarm threshold (src/lib/predictive.ts)
 * and runs the RCA agent on each automatically, one investigation triggering the next with no
 * per-equipment manual step. Capped at MAX_SWEEP equipment tags per call — each RCA investigation
 * is itself several Gemini calls, and this key's free tier caps out at 15 requests/minute, so an
 * uncapped sweep across many trending assets would reliably blow through quota mid-sweep.
 */
export async function POST() {
  const db = await readDB();
  const trendingTags = Array.from(new Set(computeTrends(db).filter((t) => t.trending).map((t) => t.equipmentTag))).slice(0, MAX_SWEEP);

  if (trendingTags.length === 0) {
    return NextResponse.json({ investigated: [], results: [] });
  }

  const results = [];
  for (const tag of trendingTags) {
    const result = await runRcaAgent(db, tag);
    results.push(result);
  }

  return NextResponse.json({ investigated: trendingTags, results });
}
