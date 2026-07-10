# PlantMind — Build TODO

Living checklist. Updated as work progresses — see "Log" at the bottom for a running diary.

## Is this agentic, honestly?

**Only one part of the system is agentic in the strict sense — and now it's built.**

- `/chat` is **RAG, not an agent**: one retrieval pass, one generation call, fixed pipeline. No
  planning, no tool selection, no multi-step reasoning.
- `/compliance` is a **deterministic rule checker**: regex keyword matching + a fixed graph
  traversal. Zero LLM involvement. Calling it an "agent" was aspirational labeling, not accurate.
- `/rca` **is agentic**: Gemini function calling over 4 tools (`get_equipment_history`,
  `get_colocated_equipment`, `get_compliance_status`, `search_documents`), and the model decides
  for itself which to call, with what arguments, in what order, and when it has enough evidence to
  stop (capped at 6 steps as a safety bound, not a script). Verified live on C-301: it autonomously
  chose `get_equipment_history` → `get_colocated_equipment` → `get_compliance_status` in that
  order — nobody told it that sequence — then produced a cited RCA report. The step trace is
  returned by the API and rendered in the UI so this is demonstrable, not just claimed.
- The graph explorer and document browser are plain CRUD/UI — no agent behavior implied there
  anyway.

**Bottom line for the pitch:** don't claim the whole platform is "agentic." Claim precisely: RAG
copilot + rule-based compliance checker + one genuinely agentic RCA tool-user. That's a more
defensible and more interesting story than a blanket "AI agents" claim, and it's exactly the kind
of precision a technical judge will reward.

## Mockup / demo data — what exists

- **`src/data/seedDocs.ts`** — the only mock data in the repo. 18 synthetic text documents
  (equipment specs, work orders, SOPs, inspection reports, a near-miss report, 2 paraphrased
  regulatory excerpts, 1 shift log), sourced from `synthetic_docs/synthetic_docs/`, telling one
  coherent, interconnected failure story across four equipment (C-301, CT-02, P-105, B-201) plus
  two independent side-threads. Loaded via **Load Demo Corpus** on the dashboard or
  `POST /api/seed`. See `synthetic_docs/synthetic_docs/00_INDEX_and_demo_queries.md` for the full
  causal chain and a ranked list of demo queries — the chat page's suggested questions are pulled
  straight from that list.
- **No mock images/scans/PDFs ship with the repo.** Vision ingestion (below) is now built and
  testable, but you'd need to supply your own scanned form / equipment photo / PDF to demo it —
  there's no seeded example scan. Spreadsheet ingestion, on the other hand, works against any
  `.csv` you hand it (no seeded example needed there since it reuses the plain-text path).
- Everything else (the knowledge graph, chunks/embeddings, RCA history, compliance findings) is
  **derived** from the seed docs at ingest time — nothing beyond the 18 documents is hardcoded.

## Done this session

- [x] Migrated LLM provider from Anthropic to **Gemini API** (`gemini-flash-lite-latest`, chosen
      empirically after two other models 503'd/429'd on this key's free tier)
- [x] **Genuinely agentic RCA agent** — `src/lib/rcaAgent.ts` + `src/lib/rcaTools.ts`,
      `POST /api/rca`, `/rca` UI with visible step trace. Verified live with real autonomous
      multi-step tool use (see "Is this agentic" above). Falls back to an explicitly-labeled
      non-agentic offline correlation if no API key is set.
- [x] **PDF/image ingestion via Gemini vision** — `llmExtractFromFile()` in `src/lib/llm.ts`,
      `ingestFile()` in `src/lib/ingest.ts`, scan/photo/PDF upload on `/documents`. One vision call
      transcribes + extracts entities; no separate OCR stage. No offline fallback (requires
      `GEMINI_API_KEY`) — surfaces as an explicit error rather than degrading silently.
- [x] **Optional Supabase Storage integration** — `src/lib/storage.ts` `uploadRawFile()`. Stores
      scanned source files in a Supabase bucket if `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are
      set; falls back to an inline `data:` URI on the document record if not configured, so scan
      upload works with zero external setup and upgrades automatically once Supabase is wired up.
- [x] `ARCHITECTURE.md` and `README.md` updated to reflect all of the above, including an explicit
      per-agent "is this actually agentic" call-out
- [x] Full rebuild (`npm run build`) clean, all 6 pages + all API routes (including new `/rca` and
      `POST /api/rca`) smoke-tested end-to-end, RCA agent verified live with real tool-call trace

## Done — UI/UX overhaul + feature pass (this session)

- [x] **Full UI/UX redesign** — new design-token system (light + dark mode, toggle persisted to
      `localStorage`), distinctive typography (Space Grotesk / IBM Plex Sans / IBM Plex Mono
      instead of generic Geist), responsive layout pass across every page.
- [x] **New marketing landing page** at `/` with a hero section and a "pick your role"
      entry point for all three user types (Field Technician / Maintenance Engineer / Compliance
      Officer); the old dashboard moved to `/dashboard`.
- [x] **Login page** at `/login` — email/password form; Google sign-in is visibly present but
      disabled ("Soon") since there's no OAuth wired up yet.
- [x] **Plain-language pass across the whole app** — renamed jargon-heavy labels and copy
      throughout (`/lib/labels.ts` centralizes friendly names for RCA tool calls, graph edge
      types, and compliance statuses). RCA's tool trace, the knowledge-graph explorer, and
      compliance findings now read as sentences instead of raw identifiers/JSON.
- [x] **Feedback loop** — thumbs up/down on every copilot answer in `/chat`, stored via
      `POST/GET /api/feedback` (`db.feedback`), addresses the "query answer quality" criterion
      from the stretch list below.
- [x] **Compliance evidence export** — "Download report (CSV)" button on `/compliance` exports
      all findings (regulation, status, evidence, recommendation, related equipment).
- [x] **Structured role-specific dashboard** — `/dashboard` now reorders its quick links and
      shows a role-specific "what to do first" panel per role (technician/engineer/compliance),
      instead of the same generic layout for everyone.
- [x] **Spreadsheet ingestion** — `.csv` upload on `/documents` (inspection logs, parts
      inventory, etc.), parsed client-side into a readable row-by-row text block and ingested
      through the existing text pipeline.
- [x] **Fixed a real (pre-existing) dependency bug**: `package.json` was missing
      `@google/generative-ai`, `@supabase/supabase-js`, `lucide-react`, `pdf-parse`, and `uuid` as
      declared dependencies even though the app imports all five — they only existed in
      `node_modules` from a prior ad-hoc install. A clean `npm install` on another machine would
      have broken the build. Now declared properly in `dependencies`.
- [x] **Replaced the demo corpus** with the richer 18-document set from
      `synthetic_docs/synthetic_docs/` (4 equipment units, a proper deferred-maintenance causal
      chain, 2 side-threads) and added the `shift_log` document type it introduces. Updated every
      example query in the app (chat suggestions, dashboard, landing page) to match the new
      corpus, and refreshed `README.md`/`ARCHITECTURE.md`'s corpus description.
- [x] **Found and fixed 3 real extraction/graph bugs surfaced by the new corpus** (would affect
      any future corpus with similar document-ID conventions, not just this one):
      1. `compliance.ts` only recognized a regulation's code via `Reference: REG-...`; the new
         docs use `**Document ID:** REG-...`, so both regulation findings collapsed onto the same
         (wrong) code and lost their linked-document lookups. Now tries multiple formats.
      2. `extract.ts`'s equipment-tag regex matched the tail segment of multi-part document codes
         (e.g. pulled a fake "FACT-001" equipment tag out of "REG-FACT-001") and didn't know about
         the new corpus's `NM-`/`INS-`/`SL-` document prefixes, so those leaked into the graph as
         equipment. Fixed via a shared `src/lib/docCodes.ts` prefix list plus a negative lookbehind.
      3. The LLM entity extractor tagged things like "ISO 10816-3" and document codes as
         "regulatory references," inflating the knowledge graph to 20 fake Regulation nodes instead
         of the real 2. Now validated against the actual regulation-code shape after merging.
      Also broadened `compliance.ts`'s gap-keyword matching (`deferred` → `deferr`, plus `overdue`,
      `breach`, `delay`) since the new regulation docs describe gaps with different wording than
      the old ones did. Verified after the fix: both regulations correctly flagged as gaps with
      accurate related-equipment/related-document lists, and the graph shows exactly 2 Regulation
      nodes, 8 Equipment nodes, and 18 Document nodes for the 18 seeded documents.

## Not started / stretch (incl. new feature ideas)

Everything not yet built, in one list — original stretch items plus ideas brainstormed for
judging weight on Innovation/Business Impact. Not all will get built; tracked here so the option
is visible:

- [ ] **Predictive maintenance scoring** — trend the numeric `processParameters` extracted from
      inspection reports over time (e.g. vibration mm/s) and flag when a piece of equipment is
      trending toward its alarm threshold, not just reacting after an alarm fires
- [ ] **Explainability/audit log** — every chat answer's retrieval trace (which chunks, which
      graph facts, which prompt) persisted and viewable, so a compliance officer can justify an
      AI-assisted decision after the fact. The RCA agent's step trace is a version of this
      already; the chat feedback log (`db.feedback`, above) is a first step toward this for
      `/chat`, but doesn't yet persist the full retrieval trace.
- [ ] **Lessons-learned clustering** — semantic clustering of incident/near-miss reports to
      surface recurring failure patterns across equipment, not just within one asset (the
      Problem Statement's "stretch" Failure Intelligence Engine)
- [ ] **Notification digest** — a daily/weekly summary of new compliance gaps, RCA findings, and
      overdue corrective actions (the near-miss report NM-2025-07's management escalation is
      exactly this pattern)
- [ ] **Document versioning** — SOP/procedure revision history, so the copilot can say "this
      guidance was updated after the failure pattern was identified" instead of just citing the
      latest version
- [ ] **Real multi-user access control** — role currently only changes prompt framing, not actual
      data visibility; login is demo-mode only (no real auth backend). A real deployment would
      need actual accounts plus row-level permissions per role/plant.
- [ ] **Give `/chat` real agentic behavior too** — right now only RCA uses tool calling; the
      copilot could use the same pattern (let it decide whether to search docs, walk the graph, or
      both, instead of always doing both on every query)
- [ ] Swap local feature-hashed embeddings for real Gemini embeddings (`text-embedding-004`) if
      time allows — current approach is deliberately dependency-free/offline-safe
- [ ] Seed 1-2 example scanned/photographed documents so the vision ingestion path has a built-in
      demo, not just a feature that requires the presenter to supply their own file
- [ ] Fully wire up Supabase Storage with real project credentials — currently correct but
      untested against a live bucket since no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` exist
      in this environment; falls back to inline `data:` URIs, which still works end-to-end.

## Log

- Initial build: Next.js app, full ingestion→graph→RAG→compliance pipeline, Anthropic as LLM
  provider with offline regex/extractive fallback. Verified working end-to-end locally.
- Migrated LLM provider to Gemini, landed on `gemini-flash-lite-latest` after two dead-end models,
  verified live with a real cited answer.
- Added `ARCHITECTURE.md` mapping the six-layer target architecture to what's built.
- Reassessed agentic-ness honestly (chat = RAG, compliance = rules, neither is an "agent" in the
  autonomous-tool-use sense). Built a genuinely agentic RCA tool-calling loop (`/rca`), PDF/image
  ingestion via Gemini vision, and optional Supabase Storage for raw files. Verified the RCA agent
  live: it autonomously chose a 3-tool investigation sequence for C-301 without being told the
  order, and produced a cited root-cause report. Updated all docs and did a full smoke-test pass
  (build clean, all 6 pages + all API routes 200).
- Full UI/UX pass: rebuilt the design system (light/dark theme, distinctive typography), added a
  proper marketing landing page and a demo-mode login page, and did an app-wide plain-language
  copy pass so RCA traces, graph relationships, and compliance statuses read as sentences instead
  of raw tool names/edge types/JSON. Then closed out every remaining TODO item that didn't need
  Supabase: chat feedback (thumbs up/down), compliance CSV export, role-specific dashboards, and
  CSV/spreadsheet document ingestion. Along the way found and fixed a real bug predating this
  session — `package.json` was missing 5 dependencies the code actually imports (only present in
  `node_modules` from an earlier ad-hoc install), which would have broken a clean `npm install`
  on any other machine. Full rebuild verified clean; RCA investigation and chat feedback flows
  smoke-tested live end-to-end with the seeded demo corpus.
- Swapped in the new 18-document demo corpus from `synthetic_docs/synthetic_docs/` (richer
  4-equipment causal chain plus two side-threads) and updated every example query across the app
  to match it. Seeding the new corpus immediately surfaced 3 real extraction/graph bugs that the
  old corpus's document-ID conventions happened not to trigger: a regulation-code parser that only
  understood one doc template, an equipment-tag regex that pulled fake tags out of compound
  document codes, and an LLM entity extractor that over-tagged things as "regulatory references."
  Fixed all three plus broadened the compliance gap-keyword matcher; verified live post-fix that
  both regulations correctly flag as gaps with accurate cross-references, the graph shows exactly
  2 Regulation nodes (was 20), and a real chat query traces the full CT-02 → C-301 causal chain
  with citations. Full rebuild clean.
