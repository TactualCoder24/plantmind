import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB } from "@/lib/db";
import { Feedback } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Omit<Feedback, "id" | "createdAt">>;
  if (!body.question || !body.answer || (body.rating !== "up" && body.rating !== "down")) {
    return NextResponse.json({ error: "question, answer and rating ('up' | 'down') are required" }, { status: 400 });
  }

  const db = readDB();
  const entry: Feedback = {
    id: randomUUID(),
    question: body.question,
    answer: body.answer,
    rating: body.rating,
    role: body.role,
    createdAt: new Date().toISOString(),
  };
  db.feedback = [...(db.feedback || []), entry];
  writeDB(db);

  return NextResponse.json({ feedback: entry });
}

export async function GET() {
  const db = readDB();
  const feedback = db.feedback || [];
  const up = feedback.filter((f) => f.rating === "up").length;
  const down = feedback.filter((f) => f.rating === "down").length;
  return NextResponse.json({ feedback, summary: { up, down, total: feedback.length } });
}
