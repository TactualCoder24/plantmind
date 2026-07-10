import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { runRcaAgent } from "@/lib/rcaAgent";

export async function POST(req: Request) {
  const { equipmentTag } = (await req.json()) as { equipmentTag?: string };
  if (!equipmentTag || !equipmentTag.trim()) {
    return NextResponse.json({ error: "equipmentTag is required" }, { status: 400 });
  }
  const db = await readDB();
  const result = await runRcaAgent(db, equipmentTag.trim());
  return NextResponse.json(result);
}
