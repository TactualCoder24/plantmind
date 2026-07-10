import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { buildDigest } from "@/lib/digest";

export async function GET() {
  const db = await readDB();
  const digest = buildDigest(db);
  return NextResponse.json(digest);
}
