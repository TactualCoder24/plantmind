import { DB } from "@/lib/types";
import { runComplianceCheck } from "@/lib/compliance";
import { computeTrends } from "@/lib/predictive";

export interface DigestItem {
  kind: "compliance_gap" | "trend" | "new_document";
  title: string;
  detail: string;
}

export interface Digest {
  generatedAt: string;
  items: DigestItem[];
  summary: { gaps: number; trending: number; newDocuments: number };
}

/**
 * On-demand summary of what changed / what needs attention right now —
 * compliance gaps, equipment trending toward an alarm threshold, and
 * recently added documents. There's no scheduler/email infra in this build,
 * so this is computed live rather than pushed on a cadence; the shape is
 * the same either way, so wiring up a real cron + email later is a
 * transport change, not a rebuild of this logic.
 */
export function buildDigest(db: DB): Digest {
  const items: DigestItem[] = [];

  const gaps = runComplianceCheck(db).filter((f) => f.status === "gap");
  for (const g of gaps) {
    items.push({
      kind: "compliance_gap",
      title: `${g.regulationTitle} — needs attention`,
      detail: g.recommendation,
    });
  }

  const trends = computeTrends(db).filter((t) => t.trending);
  for (const t of trends) {
    items.push({
      kind: "trend",
      title: `${t.equipmentTag} ${t.metric} trending toward alarm`,
      detail: t.message,
    });
  }

  const recentDocs = [...db.documents]
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .slice(0, 5);
  for (const d of recentDocs) {
    items.push({
      kind: "new_document",
      title: d.title,
      detail: `${d.type.replace(/_/g, " ")} · added ${new Date(d.uploadedAt).toLocaleDateString()}`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: { gaps: gaps.length, trending: trends.length, newDocuments: recentDocs.length },
  };
}
