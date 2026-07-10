# PlantMind — Unified Asset & Operations Brain

AI for industrial knowledge intelligence. Ingests heterogeneous plant documents (equipment specs,
work orders, SOPs, inspection reports, incident reports, regulatory excerpts, emails), links them
into a knowledge graph, and exposes them through a cited, role-aware conversational copilot —
mobile-first for field technicians, not just desktop for engineers.

Built for ET AI Hackathon 2026 — Problem Statement 8.

## Why this architecture

Flat document search (or plain RAG) returns keyword matches. It cannot answer relationship
questions like *"what deferred maintenance is implicated in this failure?"* because the answer
spans multiple documents and none of them alone contains it. PlantMind pairs a **knowledge graph**
(equipment ↔ procedures ↔ personnel ↔ regulations ↔ incidents) with **RAG over chunked, embedded
documents**, so the copilot can synthesize both keyword-relevant text *and* graph-traced
relationships into one cited answer.

## Architecture

```
 Upload (PDF/txt/md)
        │
        ▼
 Ingestion Pipeline  ── LLM structured extraction (Gemini) w/ regex fallback (offline-safe)
        │                 → equipment tags, personnel, dates, regulatory refs, process params
        ▼
   ┌────┴─────┐
   ▼          ▼
Knowledge   Chunk + Embed
 Graph       (local feature-hashed
(nodes/edges  vectors, no external
 in JSON,     API dependency)
 rebuilt on
 each ingest)
   │          │
   └────┬─────┘
        ▼
  Retrieval layer: top-k chunk similarity + 2-hop graph traversal
  seeded from equipment tags found in the query/chunks
        │
        ▼
  RAG synthesis (Gemini) — cites [Source N], reports a confidence score
  Falls back to an extractive, graph-annotated answer if no API key is set,
  so the demo never breaks on network/key availability.
        │
        ▼
  Interfaces: Copilot chat · Document browser · Graph explorer · Compliance agent
  Role-aware (Field Technician / Maintenance Engineer / Compliance Officer)
  Mobile-first responsive (bottom nav on mobile, top nav on desktop)
```

## Modules

| Module | Status | Where |
|---|---|---|
| Universal document ingestion + entity extraction (text + vision) | Built | `src/lib/extract.ts`, `src/lib/llm.ts`, `src/lib/ingest.ts`, `POST /api/documents` |
| Knowledge graph (Equipment/Procedure/Document/Person/Regulation/Incident) | Built | `src/lib/graph.ts`, `GET /api/graph`, `/graph` UI |
| Expert Knowledge Copilot (RAG + citations + confidence) | Built | `src/lib/retrieval.ts`, `POST /api/chat`, `/chat` UI |
| **Maintenance & RCA agent — genuinely agentic** (Gemini function-calling loop, autonomous tool use) | Built | `src/lib/rcaAgent.ts`, `src/lib/rcaTools.ts`, `POST /api/rca`, `/rca` UI |
| Mobile-first field interface | Built | responsive Tailwind layout, `src/components/Nav.tsx` |
| Compliance gap-detection agent (rule-based, not LLM-agentic) | Built | `src/lib/compliance.ts`, `GET /api/compliance`, `/compliance` UI |
| Optional Supabase Storage for scanned/photographed source files | Built, optional | `src/lib/storage.ts` — falls back to inline data URIs if unconfigured |

See `ARCHITECTURE.md` for an honest breakdown of which of these are actually agentic (autonomous,
multi-step tool use) vs. RAG or fixed rules — only the RCA agent currently qualifies in the strict
sense. `TODO.md` tracks what's done, in progress, and a running feature-idea backlog.

## Demo corpus

18 synthetic-but-realistic documents (`src/data/seedDocs.ts`, sourced from
`synthetic_docs/synthetic_docs/`) covering four interconnected pieces of equipment — Process Gas
Compressor **C-301**, Cooling Tower Fan **CT-02**, Boiler Feed Pump **P-105**, and Steam Boiler
**B-201** — with a deliberately traceable failure story: a bearing wear inspection on CT-02 gets
deferred twice, causing degraded cooling water supply to C-301 that triggers a March 2025
vibration alert and, since the fix was never implemented, a July 2025 unplanned trip — then a
September near-miss shows the pattern wasn't fully resolved even after the bearing was eventually
replaced. Two independent side-threads (a P-105 cavitation event, a B-201 overdue statutory relief-
valve test) add breadth without complicating the main chain. Two paraphrased regulatory excerpts
(OISD-style rotating-equipment monitoring, Factory-Act style boiler compliance) back a documented
compliance gap. This lets a single question like *"why did C-301 trip in July 2025, and had this
happened before?"* demonstrate real cross-document reasoning instead of single-document Q&A. See
`synthetic_docs/synthetic_docs/00_INDEX_and_demo_queries.md` for the full causal chain and a
ranked list of demo queries.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Load Demo Corpus** on the dashboard (or `POST /api/seed`).

### Enabling LLM-synthesized answers (recommended for the demo)

Without an API key, ingestion and chat still work end-to-end (regex entity extraction,
extractive/graph-annotated answers) — useful so the demo never breaks offline. For natural-language
synthesized answers with inline citations, set a Gemini API key:

```bash
cp .env.local.example .env.local
# edit .env.local and set GEMINI_API_KEY=...
npm run dev
```

The same key powers entity extraction, RAG synthesis, vision ingestion (scans/PDFs), and the RCA
agent's tool-calling loop. **Note:** free-tier Gemini keys are rate-limited (observed: 15
requests/minute on `gemini-flash-lite-latest`) — seeding the 16-doc corpus fires ~16 extraction
calls back-to-back and can transiently exhaust that quota. Every LLM call path degrades gracefully
on a 429/503 (regex extraction, extractive chat answers, the offline RCA correlation), so nothing
breaks, but retry a request a few seconds later if you see a fallback response right after seeding.

### Optional: Supabase Storage for scanned documents

Scan/photo/PDF uploads on `/documents` work without any setup — the original file is embedded as
an inline `data:` URI on the document record. To persist raw files in a real bucket instead:

```bash
# in your Supabase project: create a public Storage bucket named "plant-documents"
# then in .env.local:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`src/lib/storage.ts` picks this up automatically — no code changes needed either way.

## Storage

Documents, chunks, embeddings, and the graph are persisted to `data/db.json` (falls back to
`/tmp` on read-only serverless filesystems). This keeps the hackathon build dependency-free —
no external database to provision — while the code is structured so `src/lib/db.ts` is the only
place that would need to change to swap in Postgres/pgvector/Neo4j for production scale. Raw
scanned files go through `src/lib/storage.ts` (Supabase Storage or inline fallback, see above).

## Scalability notes

- Ingestion, extraction, and graph-linking are per-document and stateless — horizontally
  scalable across document types and additional plants without re-engineering.
- The entity extraction schema (equipment/personnel/dates/regulatory refs/process params) is
  domain-general; new document types just need a `DocType` and get extracted the same way.
- Swapping the JSON store for Postgres + pgvector (documents/chunks) and Neo4j (graph) is a
  drop-in replacement behind `src/lib/db.ts`, `src/lib/retrieval.ts`, and `src/lib/graph.ts` —
  no UI or API route changes required.
