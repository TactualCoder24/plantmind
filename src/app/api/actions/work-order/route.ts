import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest";

interface Body {
  equipmentTag: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
}

/**
 * Executes a work-order proposal an agent drafted (src/lib/rcaTools.ts proposeWorkOrder). This is
 * the only place an AI-drafted work order actually gets written — only ever called from an
 * explicit user click on a proposal card, never by the agent itself. Creates it as a normal
 * work_order document through the standard ingestion pipeline, so it's searchable and shows up in
 * the graph exactly like any human-entered work order, just tagged as AI-drafted for traceability.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Body>;
  if (!body.equipmentTag || !body.description) {
    return NextResponse.json({ error: "equipmentTag and description are required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const priority = body.priority || "medium";
  const title = `AI-Drafted Work Order - ${body.equipmentTag} - ${today}`;
  const content = `Work Order ID: AI-DRAFT-${Date.now()}
Equipment Tag: ${body.equipmentTag}
Raised Date: ${today}
Raised By: Innfetch Copilot (AI-drafted, confirmed by user)
Priority: ${priority}
Status: Open

Description: ${body.description}

Note: This work order was drafted by an AI agent based on its investigation and confirmed by a user before creation. Review and validate before acting on it as you would any other work order.`;

  try {
    const doc = await ingestDocument({ title, type: "work_order", filename: `${title}.txt`, content });
    return NextResponse.json({ document: doc });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create work order" }, { status: 502 });
  }
}
