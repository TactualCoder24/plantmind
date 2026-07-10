export type Role = "technician" | "engineer" | "compliance";

export type DocType =
  | "equipment_spec"
  | "work_order"
  | "sop"
  | "inspection_report"
  | "regulation"
  | "incident_report"
  | "shift_log"
  | "email";

export interface SourceDocument {
  id: string;
  title: string;
  type: DocType;
  filename: string;
  content: string;
  uploadedAt: string;
  entities: ExtractedEntities;
  /** Present for image/PDF sources ingested via vision extraction — Supabase Storage URL, or an inline data: URI fallback if Supabase isn't configured. */
  fileUrl?: string;
  sourceKind?: "text" | "scan";
}

export interface ExtractedEntities {
  equipmentTags: string[];
  personnel: string[];
  dates: string[];
  regulatoryRefs: string[];
  processParameters: { name: string; value: string }[];
}

export interface Chunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: DocType;
  text: string;
  index: number;
  vector: number[];
}

export type NodeType =
  | "Equipment"
  | "Procedure"
  | "Document"
  | "Person"
  | "Regulation"
  | "Incident";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  meta?: Record<string, string>;
}

export type EdgeType =
  | "HAS_INCIDENT"
  | "REFERENCES"
  | "APPLIES_TO"
  | "SATISFIES"
  | "PERFORMED_ON"
  | "PERFORMED_BY"
  | "MENTIONS"
  | "CAUSED_BY"
  | "PART_OF";

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Feedback {
  id: string;
  question: string;
  answer: string;
  rating: "up" | "down";
  role?: string;
  createdAt: string;
}

export interface ChatAuditEntry {
  id: string;
  question: string;
  role: string;
  answer: string;
  confidence: number;
  citationTitles: string[];
  graphFacts: string[];
  agentic: boolean;
  toolSteps: string[];
  createdAt: string;
}

export interface ComplianceFollowup {
  id: string;
  regulationCode: string;
  regulationTitle: string;
  note: string;
  raisedBy: "agent" | "user";
  createdAt: string;
}

export interface DB {
  documents: SourceDocument[];
  chunks: Chunk[];
  graph: KnowledgeGraph;
  feedback?: Feedback[];
  auditLog?: ChatAuditEntry[];
  complianceFollowups?: ComplianceFollowup[];
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  documentType: DocType;
  snippet: string;
}

export interface ChatAnswer {
  answer: string;
  confidence: number;
  citations: Citation[];
  graphContext?: string[];
}
