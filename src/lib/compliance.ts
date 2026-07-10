import { DB } from "@/lib/types";

const GAP_KEYWORDS =
  /(recommend|gap|deferr|overdue|breach|delay|never completed|not logged|out-of-cycle|omission|no standby|non-compliant|was not|were not|has not been|had not been)/i;

export interface ComplianceFinding {
  regulationCode: string;
  regulationTitle: string;
  status: "gap" | "compliant" | "needs_review";
  evidence: string;
  relatedEquipment: string[];
  relatedDocuments: { id: string; title: string; type: string }[];
  recommendation: string;
}

export function runComplianceCheck(db: DB): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const regDocs = db.documents.filter((d) => d.type === "regulation");

  for (const doc of regDocs) {
    // Regulatory excerpts label their code differently depending on source template
    // ("Reference: REG-..." vs "**Document ID:** REG-..."), so try known formats before
    // falling back to any REG-code anywhere in the doc, then finally the title.
    const codeMatch =
      doc.content.match(/Reference:\s*(REG-[A-Z0-9-]+)/) ||
      doc.content.match(/Document ID:\**\s*(REG-[A-Z0-9-]+)/) ||
      doc.content.match(/\b(REG-[A-Z0-9-]+)\b/) ||
      doc.title.match(/(REG-[A-Z0-9-]+)/);
    const code = codeMatch ? codeMatch[1] : doc.title;

    const sentences = doc.content.split(/\n|(?<=\.)\s+/).filter((s) => GAP_KEYWORDS.test(s));
    const hasGap = sentences.length > 0;

    const relatedEquipment = doc.entities.equipmentTags;

    // pull in related documents via the knowledge graph (references + equipment mentions)
    const regNodeId = `Regulation:${code}`;
    const relatedDocIds = new Set<string>();
    for (const edge of db.graph.edges) {
      if (edge.to === regNodeId && edge.from.startsWith("Document:")) relatedDocIds.add(edge.from.slice("Document:".length));
      if (edge.from === regNodeId && edge.to.startsWith("Document:")) relatedDocIds.add(edge.to.slice("Document:".length));
    }
    for (const tag of relatedEquipment) {
      const eqNodeId = `Equipment:${tag}`;
      for (const edge of db.graph.edges) {
        if ((edge.from === eqNodeId || edge.to === eqNodeId) && edge.type === "HAS_INCIDENT") {
          const docSide = edge.from.startsWith("Document:") ? edge.from : edge.to.startsWith("Document:") ? edge.to : null;
          if (docSide) relatedDocIds.add(docSide.slice("Document:".length));
        }
      }
    }

    const relatedDocuments = Array.from(relatedDocIds)
      .map((id) => db.documents.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({ id: d.id, title: d.title, type: d.type }));

    findings.push({
      regulationCode: code,
      regulationTitle: doc.title,
      status: hasGap ? "gap" : "compliant",
      evidence: hasGap ? sentences.slice(0, 2).join(" ") : "No gap language detected in applicability notes.",
      relatedEquipment,
      relatedDocuments,
      recommendation: hasGap
        ? `Review flagged gap for ${code} against ${relatedEquipment.join(", ") || "the referenced equipment"} and confirm corrective action is tracked to closure.`
        : `No action required; continue current monitoring cadence for ${relatedEquipment.join(", ") || "referenced equipment"}.`,
    });
  }

  return findings;
}
