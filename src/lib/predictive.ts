import { DB, SourceDocument } from "@/lib/types";

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

const DOC_DATE_RE = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;

/** Pulls a document's primary date directly from its body text (e.g. "Raised Date: 14 July 2025") so trend ordering doesn't depend on LLM-extracted entities, which may be empty if the API quota was exhausted at ingest time. */
function docDate(doc: SourceDocument): string | null {
  const m = doc.content.match(DOC_DATE_RE);
  if (!m) return null;
  const [, day, month, year] = m;
  const mm = MONTHS[month.toLowerCase()];
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

const VIBRATION_RE = /(\d+(?:\.\d+)?)\s*mm\/s\s*RMS/gi;
const TEMP_RE = /(\d+(?:\.\d+)?)\s*°?C\b/g;

const READING_DOC_TYPES = new Set(["work_order", "inspection_report", "shift_log", "incident_report"]);
const THRESHOLD_DOC_TYPES = new Set(["equipment_spec", "sop"]);

export interface TrendPoint {
  date: string;
  value: number;
  docTitle: string;
}

export interface EquipmentTrend {
  equipmentTag: string;
  metric: "vibration" | "temperature";
  unit: string;
  points: TrendPoint[];
  threshold: number | null;
  trending: boolean;
  message: string;
}

function collectReadings(docs: SourceDocument[], re: RegExp): Map<string, TrendPoint[]> {
  const byTag = new Map<string, TrendPoint[]>();
  for (const doc of docs) {
    if (!READING_DOC_TYPES.has(doc.type)) continue;
    const date = docDate(doc);
    if (!date) continue;
    const matches = Array.from(doc.content.matchAll(re));
    if (matches.length === 0) continue;
    // Take the last reading mentioned in the doc — RCA/shift-log docs often quote an earlier
    // baseline first, then the actual event reading later in the text.
    const value = parseFloat(matches[matches.length - 1][1]);
    for (const tag of doc.entities.equipmentTags) {
      const list = byTag.get(tag) || [];
      list.push({ date, value, docTitle: doc.title });
      byTag.set(tag, list);
    }
  }
  for (const list of byTag.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return byTag;
}

function collectThresholds(docs: SourceDocument[], re: RegExp, plausibleMax = Infinity): Map<string, number> {
  const byTag = new Map<string, number>();
  for (const doc of docs) {
    if (!THRESHOLD_DOC_TYPES.has(doc.type)) continue;
    const matches = Array.from(doc.content.matchAll(re))
      .map((m) => parseFloat(m[1]))
      .filter((v) => v <= plausibleMax);
    if (matches.length === 0) continue;
    const max = Math.max(...matches);
    for (const tag of doc.entities.equipmentTags) {
      byTag.set(tag, Math.max(byTag.get(tag) ?? 0, max));
    }
  }
  return byTag;
}

/**
 * Best-effort predictive maintenance signal: trends numeric vibration/temperature readings
 * mentioned in work orders, inspection reports, shift logs and incident reports over time (per
 * equipment tag), and flags equipment where the trend is rising toward the highest threshold
 * mentioned for that tag in its spec/SOP documents — not just reacting after an alarm already
 * fired. Deliberately simple regex-over-text rather than a real time-series store, consistent
 * with the rest of this build's dependency-light approach.
 */
export function computeTrends(db: DB): EquipmentTrend[] {
  const results: EquipmentTrend[] = [];

  // Restrict to tags that have their own equipment_spec document — the entity extractor also
  // picks up incidental codes mentioned in prose (e.g. a vibration sensor tag like "RV-2"), which
  // aren't actually tracked assets and would otherwise show up here as noise.
  const trackedTags = new Set(
    db.documents.filter((d) => d.type === "equipment_spec").flatMap((d) => d.entities.equipmentTags)
  );

  // Temperature thresholds are capped to a plausible range for the cooling-water/process
  // readings actually being trended (~20-60°C in this corpus) — without this, the regex also
  // picks up unrelated design maximums like a compressor's 165°C discharge gas temp limit, which
  // is a different physical quantity than what's in the readings, and would produce a threshold
  // so far away it makes every real reading look harmless.
  const metrics: { metric: "vibration" | "temperature"; re: RegExp; unit: string; plausibleMax: number }[] = [
    { metric: "vibration", re: VIBRATION_RE, unit: "mm/s RMS", plausibleMax: Infinity },
    { metric: "temperature", re: TEMP_RE, unit: "°C", plausibleMax: 60 },
  ];

  for (const { metric, re, unit, plausibleMax } of metrics) {
    const readings = collectReadings(db.documents, re);
    const thresholds = collectThresholds(db.documents, re, plausibleMax);

    for (const [tag, points] of readings) {
      if (!trackedTags.has(tag)) continue;
      if (points.length < 2) continue;
      const threshold = thresholds.get(tag) ?? null;
      const first = points[0].value;
      const last = points[points.length - 1].value;
      const peakPoint = points.reduce((a, b) => (b.value > a.value ? b : a));
      const peak = peakPoint.value;

      // Use the peak reading, not just the latest one — a value that already approached the
      // threshold and was then brought back down is exactly the "we fixed the symptom once, not
      // the recurring pattern" case this corpus's NM-2025-07 near-miss report calls out, and it's
      // more useful to keep surfacing than to go quiet the moment one fix lands.
      const roseTowardPeak = peak > first;
      const hitThreshold = threshold !== null && peak >= threshold * 0.9;
      const trending = roseTowardPeak && hitThreshold;
      const sinceRecovered = trending && threshold !== null && last < threshold * 0.9;

      const message = !trending
        ? roseTowardPeak
          ? `${tag} ${metric} rose to a peak of ${peak} ${unit} but is currently at ${last} ${unit}, comfortably under threshold.`
          : `${tag} ${metric} is stable or improving (currently ${last} ${unit}).`
        : sinceRecovered
          ? `${tag} ${metric} peaked at ${peak} ${unit} on ${peakPoint.date} (${peakPoint.docTitle}) — within 10% of the ${threshold} ${unit} threshold. It's since been brought back to ${last} ${unit}, but has repeatedly approached this limit — worth a standing check, not just a one-time fix.`
          : `${tag} ${metric} has risen to ${last} ${unit}, within 10% of the ${threshold} ${unit} threshold. Worth checking before it trips, not after.`;

      results.push({ equipmentTag: tag, metric, unit, points, threshold, trending, message });
    }
  }

  // Trending-toward-alarm first, then by how many readings back it up.
  return results.sort((a, b) => Number(b.trending) - Number(a.trending) || b.points.length - a.points.length);
}
