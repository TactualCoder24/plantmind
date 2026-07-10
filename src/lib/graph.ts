import { SourceDocument, KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType } from "@/lib/types";
import { DOC_CODE_RE } from "@/lib/docCodes";

function nodeId(type: NodeType, key: string): string {
  return `${type}:${key}`;
}

class GraphBuilder {
  nodes = new Map<string, GraphNode>();
  edges = new Map<string, GraphEdge>();

  addNode(type: NodeType, key: string, label: string, meta?: Record<string, string>) {
    const id = nodeId(type, key);
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, type, label, meta });
    }
    return id;
  }

  addEdge(from: string, to: string, type: EdgeType) {
    if (from === to) return;
    const id = `${from}|${type}|${to}`;
    if (!this.edges.has(id)) {
      this.edges.set(id, { id, from, to, type });
    }
  }

  build(): KnowledgeGraph {
    return { nodes: Array.from(this.nodes.values()), edges: Array.from(this.edges.values()) };
  }
}

/**
 * Rebuilds the full knowledge graph from all ingested documents + their
 * extracted entities, including cross-document reference edges (e.g. a
 * work order referencing an incident report by code).
 */
export function buildGraph(documents: SourceDocument[]): KnowledgeGraph {
  const g = new GraphBuilder();

  // First pass: map document "codes" (WO-2024-0187, INC-2024-031, etc.) to doc ids.
  const codeToDocId = new Map<string, string>();
  for (const doc of documents) {
    const codes = `${doc.title} ${doc.filename}`.match(DOC_CODE_RE) || [];
    for (const code of codes) codeToDocId.set(code, doc.id);
    const regCodes = doc.content.match(/\bREG-[A-Z0-9-]+\b/g) || [];
    if (doc.type === "regulation") for (const rc of regCodes) codeToDocId.set(rc, doc.id);
  }

  for (const doc of documents) {
    const docNodeId = g.addNode("Document", doc.id, doc.title, { docType: doc.type });

    for (const tag of doc.entities.equipmentTags) {
      const eqId = g.addNode("Equipment", tag, tag);
      g.addEdge(docNodeId, eqId, "MENTIONS");
    }

    for (const person of doc.entities.personnel) {
      const pId = g.addNode("Person", person, person);
      if (doc.type === "work_order" || doc.type === "inspection_report") {
        g.addEdge(pId, docNodeId, "PERFORMED_BY");
      } else {
        g.addEdge(docNodeId, pId, "MENTIONS");
      }
    }

    for (const reg of doc.entities.regulatoryRefs) {
      const regId = g.addNode("Regulation", reg, reg);
      if (doc.type === "sop") g.addEdge(docNodeId, regId, "SATISFIES");
      else g.addEdge(docNodeId, regId, "REFERENCES");
    }

    if (doc.type === "sop") {
      for (const tag of doc.entities.equipmentTags) {
        g.addEdge(docNodeId, nodeId("Equipment", tag), "APPLIES_TO");
      }
    }

    if (doc.type === "incident_report" || doc.type === "work_order") {
      const primaryEquip = doc.entities.equipmentTags[0];
      if (primaryEquip) {
        const eqId = nodeId("Equipment", primaryEquip);
        g.addEdge(eqId, docNodeId, "HAS_INCIDENT");
      }
    }

    // cross-document reference edges via code mentions in body text
    const mentionedCodes = doc.content.match(DOC_CODE_RE) || [];
    for (const code of mentionedCodes) {
      const targetId = codeToDocId.get(code);
      if (targetId && targetId !== doc.id) {
        g.addEdge(docNodeId, nodeId("Document", targetId), "REFERENCES");
      }
    }
  }

  return g.build();
}

/** Given a set of equipment tags / doc ids, returns human-readable graph facts (1-hop + 2-hop) for RAG context. */
export function graphFactsFor(graph: KnowledgeGraph, seedIds: string[], depth = 2): string[] {
  const facts: string[] = [];
  const visited = new Set<string>();
  let frontier = new Set(seedIds);

  for (let d = 0; d < depth; d++) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      const fromInFrontier = frontier.has(edge.from);
      const toInFrontier = frontier.has(edge.to);
      if (!fromInFrontier && !toInFrontier) continue;
      const key = edge.id;
      if (visited.has(key)) continue;
      visited.add(key);
      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (fromNode && toNode) {
        facts.push(`${fromNode.label} (${fromNode.type}) -[${edge.type}]-> ${toNode.label} (${toNode.type})`);
        next.add(edge.from);
        next.add(edge.to);
      }
    }
    frontier = next;
  }
  return Array.from(new Set(facts)).slice(0, 30);
}

export function equipmentSeedIdsFromText(graph: KnowledgeGraph, text: string): string[] {
  const tags = text.match(/\b[A-Z]{1,5}-\d{1,4}\b/g) || [];
  const ids: string[] = [];
  for (const tag of tags) {
    const id = nodeId("Equipment", tag);
    if (graph.nodes.some((n) => n.id === id)) ids.push(id);
  }
  return ids;
}
