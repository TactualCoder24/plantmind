# PlantMind — Architecture

Six layers, mapped to what's actually built in this repo vs. still open. See `TODO.md` for the
live task list and `README.md` for the quick-start.

## 1. Sources

**Target:** synthetic corpus of ~15-20 documents telling one coherent, interconnected story —
3-4 pieces of equipment with a shared failure/maintenance history — mixing PDFs, scanned-looking
work orders, spreadsheets, and paraphrased regulatory excerpts.

**Built:** 18 synthetic documents in `src/data/seedDocs.ts` (sourced from
`synthetic_docs/synthetic_docs/`) — equipment specs, work orders, inspection reports, SOPs, a
near-miss report, a paraphrased-regulation pair, and a shift log — covering Process Gas Compressor
C-301, Cooling Tower Fan CT-02, Boiler Feed Pump P-105, and Steam Boiler B-201, with a single
traceable root-cause story running through all of them (see README "Demo corpus" section). This is
the **only mock data in the repo** — loaded via **Load Demo Corpus** on the dashboard or
`POST /api/seed`; everything else (graph, chunks, RCA history) is derived from it at ingest time,
nothing else is hardcoded.

Ingestion supports three paths: paste/`.txt`/`.md` upload (text), scan/photo/PDF upload (vision —
see layer 2), and `.csv` spreadsheet upload (parsed client-side into a readable row-by-row text
block, then ingested through the text path) — all on `/documents`.

## 2. Ingestion & extraction

**Target:** no custom OCR/NER — prompt an LLM for structured JSON per document (equipment tags,
dates, personnel, process parameters, regulatory references); feed images/scans directly to the
LLM's vision input; store raw extraction alongside the source document for citation.

**Built:** `src/lib/extract.ts` + `src/lib/llm.ts`. `llmExtractEntities()` prompts **Gemini**
(`gemini-flash-lite-latest`, via `@google/generative-ai` — chosen empirically as the model this
key's free-tier quota actually serves; `gemini-flash-latest`/`gemini-2.0-flash` returned 503/429s)
for the structured JSON shape below, merged with a deterministic regex pass (`regexExtract`) that
also runs unconditionally — so ingestion never blocks on network/key availability, and the regex
hits fill in anything the LLM missed.

```json
{
  "equipmentTags": ["C-301", "..."],
  "personnel": ["S. Menon", "..."],
  "dates": ["2024-08-19", "..."],
  "regulatoryRefs": ["REG-OISD-001", "..."],
  "processParameters": [{ "name": "Max discharge temp", "value": "145C" }]
}
```

Every `SourceDocument` stores its extracted entities alongside the raw content
(`src/lib/types.ts`), so the RAG layer and graph builder both read from the same extraction
output and can cite back to the source document ID.

**Vision ingestion (built):** `llmExtractFromFile()` (`src/lib/llm.ts`) feeds a PDF/image directly
to Gemini as `inlineData` (base64) alongside a prompt asking for both a full transcription and the
same structured-entity JSON, in one call — no separate OCR stage. `ingestFile()`
(`src/lib/ingest.ts`) uses the transcription as the document's `content` (so it flows through the
same chunking/embedding/graph pipeline as text documents) and stores extracted entities the same
way. Unlike text ingestion, there's **no offline fallback** here — no local OCR exists in this
build, so a missing `GEMINI_API_KEY` or a failed vision call surfaces as an explicit error to the
`/documents` upload UI rather than silently degrading. The original file is preserved via
`uploadRawFile()` — see layer 3's storage note.

**Open:** spreadsheet ingestion (inspection logs, parts inventory) as tabular input.

## 3. Knowledge graph + vector store

**Target:** don't over-engineer — a lightweight relationship table is enough to demo relationship
queries; use Supabase/pgvector for chunk embeddings.

**Built:** deliberately the same "don't over-engineer" call, taken one step further for a
dependency-free hackathon build:

- **Graph** (`src/lib/graph.ts`): nodes (`Equipment`, `Procedure`, `Document`, `Person`,
  `Regulation`, `Incident`) and typed edges (`MENTIONS`, `HAS_INCIDENT`, `APPLIES_TO`,
  `SATISFIES`, `REFERENCES`, `PERFORMED_BY`, ...), rebuilt from all documents on every ingest.
  Cross-document edges are inferred by scanning body text for other documents' codes (e.g. a work
  order mentioning `INC-2024-031` gets a `REFERENCES` edge to that incident report) — this is what
  lets the RAG layer trace a chain across documents nobody explicitly linked.
- **Vector store**: chunks (`src/lib/embeddings.ts` `chunkText`) are embedded with a local,
  deterministic feature-hashed term-frequency vector (`embed()`) — no external embeddings API, so
  retrieval works fully offline. `cosineSim` + `retrieveTopChunks` (`src/lib/retrieval.ts`) do the
  top-k search.
- **Storage**: both live in a single JSON file (`src/lib/db.ts`, `data/db.json`, falling back to
  `/tmp` on read-only filesystems) instead of Postgres+pgvector — chosen so the hackathon build
  needs zero external database provisioning. The module boundary (`db.ts` / `retrieval.ts` /
  `graph.ts`) is exactly where a Postgres+pgvector swap (as originally planned) or Neo4j would
  slot in without touching API routes or UI.
- **Raw file storage (built and configured)**: `src/lib/storage.ts` `uploadRawFile()` puts
  scanned/photographed source files in a Supabase Storage bucket (`plant-documents`) if
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, and returns the public URL. This
  deployment has both set in `.env.local` — verified live by uploading a real file and confirming
  it's served back from a `supabase.co/storage/v1/object/public/...` URL, not an inline data URI.
  Without those env vars (e.g. a fresh clone that hasn't set up Supabase yet), it falls back to
  embedding the file as an inline `data:` URI directly on the document record — same
  fallback-safe pattern as the LLM provider, so scan upload works with zero external setup and
  upgrades automatically once Supabase is configured.

**Open:** if there's time, swap the local hashed embeddings for real Gemini embeddings
(`text-embedding-004`) for better semantic recall — current approach trades some recall for
zero external dependency.

## 4. RAG query engine

**Target:** embed the question, pull top-k chunks, also pull relevant graph relationships for
named entities in the question, feed both to the LLM with forced source-ID citation, always
return confidence + source.

**Built:** `POST /api/chat` (`src/app/api/chat/route.ts`):
1. `retrieveTopChunks(question, chunks, 6)` — top-k over the vector store.
2. `equipmentSeedIdsFromText` pulls equipment tags mentioned in the question *and* in the
   retrieved chunks, then `graphFactsFor` walks 2 hops from those seed nodes to collect graph
   relationship facts.
3. `synthesizeAnswer(question, role, { chunks, graphFacts })` (`src/lib/llm.ts`) sends both blocks
   to Gemini with a prompt that forces `[Source N]` inline citations and role-specific framing
   (technician / engineer / compliance). Confidence is derived from retrieval depth (more,
   higher-quality matches → higher confidence) — a simple heuristic, not a learned calibration.
4. If no `GEMINI_API_KEY` is set, or the call fails, falls back to an extractive answer built
   directly from the top chunks + graph facts, so the copilot never goes silent.
5. `buildCitations()` returns per-chunk source metadata (`documentId`, `title`, `type`, snippet)
   alongside the answer, satisfying the "citations and confidence scores" evaluation criterion.

Surfaced in the `/chat` UI with a confidence bar, expandable source list, and the graph facts that
were actually used — so judges can see *why* the answer is trustworthy, not just read the answer.

## 5. Agents

Priority order per the plan: **knowledge copilot chat first** (reuses the RAG engine directly, no
extra logic) → **maintenance & RCA** → **compliance** (stretch). All three are built. Only one of
them is actually "agentic" in the strict sense — worth being precise about which, since it's easy
to over-claim this in a pitch.

| Agent | Status | Agentic? | Notes |
|---|---|---|---|
| Knowledge copilot chat | **Built** | No — single-pass RAG | Layer 4 above. One retrieval call, one generation call, fixed pipeline. No planning, no tool selection. |
| Compliance gap detection | **Built** | No — fixed rules | `src/lib/compliance.ts`, `GET /api/compliance`, `/compliance` UI. Regex keyword matching (`recommend`, `deferred`, `not logged`, ...) plus a deterministic graph traversal. Zero LLM calls. Surfaces two real flagged gaps in the seed corpus (CT-02's deferred bearing replacement against REG-OISD-001, and B-201's overdue statutory relief-valve test against REG-FACT-001), but the word "agent" here means "automated checker," not "autonomous." |
| Maintenance & RCA agent | **Built** | **Yes — autonomous tool use** | `src/lib/rcaAgent.ts`, `POST /api/rca`, `/rca` UI. Given an equipment tag, the model is handed four tools (`get_equipment_history`, `get_colocated_equipment`, `get_compliance_status`, `search_documents` — declared in `src/lib/rcaTools.ts`) via Gemini function calling, and it decides for itself which to call, with what arguments, in what order, and when it has enough evidence to stop (capped at 6 steps as a safety bound, not a script). Verified live on C-301: it chose `get_equipment_history` → `get_colocated_equipment` → `get_compliance_status`, in that order, without being told that sequence, then produced a structured RCA report (failure pattern, root cause, evidence, corrective actions) citing the specific work orders and inspection reports it pulled. The step trace is returned in the API response and rendered in the UI so this is demonstrable, not just asserted. Falls back to a fixed, explicitly-labeled non-agentic correlation (`runOfflineRca`) if no `GEMINI_API_KEY` is set. |

## 6. Web interface

**Target:** one responsive React app with a role switcher (technician/engineer/compliance) rather
than three separate apps — same UI, different default views; technician view chat-first and
mobile-sized.

**Built:** Next.js App Router, single app, `useRole()` context (`src/lib/roleContext.tsx`)
persisted to `localStorage`, switchable from the nav on every page. `src/components/Nav.tsx`
renders a top nav on desktop and a bottom tab bar on mobile (chat-first ordering). The role is
passed into `/api/chat` and shapes the answer framing (concise/action-oriented for technician,
technical/root-cause for engineer, regulatory-focused for compliance) — same underlying data and
RAG engine, different presentation, matching the "one app, role-scoped views" target rather than
three separate interfaces.

**Open:** structured engineer/compliance dashboards (open compliance gaps, recent RCA flags,
document search as first-class dashboard widgets) currently live one click away on their own
pages (`/compliance`, `/documents`) rather than surfaced inline on a role-specific home screen.
