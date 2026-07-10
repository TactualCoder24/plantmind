# PlantMind — Build TODO

Living checklist. Updated as work progresses — see "Log" at the bottom for a running diary.

## Is this agentic, honestly?

**Two parts of the system are agentic in the strict sense, and both fall back to something
explicitly non-agentic if there's no API key or the agent loop fails.**

- `/chat` **is agentic**: `src/lib/chatAgent.ts` hands the copilot the same 4 tools as the RCA
  agent (`get_equipment_history`, `get_colocated_equipment`, `get_compliance_status`,
  `search_documents`) via Gemini function calling, and the model decides for itself which to call,
  in what order, and when it has enough evidence to answer — instead of the fixed
  retrieve-then-generate pass it used to always run. Verified live: asked "Show me all maintenance
  history connected to CT-02," it chose `get_equipment_history` on its own and cited the correct 5
  documents. Falls back to the original fixed RAG pipeline (single retrieval pass, single
  generation call, no tool selection) if no API key or the agent loop fails — that fallback path
  is explicitly not agentic, and the UI/API response says so (`agentic: false`).
- `/rca` **is agentic**: Gemini function calling over the same 4 tools, and the model decides for
  itself which to call, with what arguments, in what order, and when it has enough evidence to
  stop (capped at 6 steps as a safety bound, not a script). Verified live on C-301: it autonomously
  chose `get_equipment_history` → `get_colocated_equipment` → `get_compliance_status` in that
  order — nobody told it that sequence — then produced a cited RCA report. Falls back to a fixed,
  explicitly-labeled non-agentic correlation if no API key is set.
- `/compliance` is a **deterministic rule checker**: regex keyword matching + a fixed graph
  traversal. Zero LLM involvement. Calling it an "agent" would be aspirational labeling, not
  accurate — it's not claimed as one anywhere in the UI.
- The graph explorer and document browser are plain CRUD/UI — no agent behavior implied there
  anyway.

**Bottom line for the pitch:** claim precisely: two genuinely agentic tool-users (copilot + RCA,
same tool set, both gracefully degrade to a fixed pipeline offline) plus a rule-based compliance
checker. That's a more defensible and more interesting story than a blanket "AI agents" claim, and
it's exactly the kind of precision a technical judge will reward.

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
- [x] **Supabase Storage is live** — real project credentials (`SUPABASE_URL` +
      `SUPABASE_SERVICE_ROLE_KEY`) added to `.env.local`, `plant-documents` bucket created and set
      public. Verified end-to-end: uploaded a real file through `POST /api/documents`, got back a
      `backend: "supabase"` response with a `https://<project>.supabase.co/storage/v1/object/
      public/plant-documents/...` URL, and confirmed that URL is publicly fetchable (200, correct
      byte size). Test file cleaned up from the bucket afterward. No code changes needed — this was
      always the intended "upgrade automatically" behavior once the env vars are set.

## Done — Supabase Auth + full stretch-list pass (this session)

- [x] **Real Supabase Auth** — `src/lib/supabaseClient.ts` + `src/lib/authContext.tsx`. `/login`
      now does real sign-up/sign-in/sign-out against Supabase (email confirmation handled — shows
      a "check your inbox" state if the project has confirmation enabled) instead of "any
      email/password proceeds through." `Nav.tsx` and the landing page show the signed-in user's
      email + a sign-out button. Deliberately does **not** gate the rest of the app behind login —
      the demo still works with zero setup, exploring is still the default per the landing page
      footer, since there's no per-user/per-plant data model to actually restrict yet (see the
      still-open item below).
- [x] **`/chat` is now genuinely agentic** — `src/lib/chatAgent.ts` hands the copilot the same 4
      tools as the RCA agent (`get_equipment_history`, `get_colocated_equipment`,
      `get_compliance_status`, `search_documents`) via Gemini function calling; the model decides
      for itself which to call and in what order, rather than /chat's original fixed
      retrieve-then-generate pass. Falls back to that original fixed RAG pipeline if no API key or
      the agent loop fails — never breaks. Verified live: asked "Show me all maintenance history
      connected to CT-02," it chose `get_equipment_history` on its own and cited the correct 5
      documents tracing the real CT-02 → C-301 causal chain. The chat UI now shows a step badge
      ("Worked it out in 1 step: Checking maintenance & repair history") when the agentic path ran.
- [x] **Predictive maintenance trend flagging** — `src/lib/predictive.ts`, `GET /api/trends`,
      surfaced on the dashboard. Trends vibration/temperature readings mentioned in work orders,
      inspection reports, shift logs and incident reports per equipment tag (dates parsed directly
      from doc text, not dependent on LLM-extracted entities being available), and flags equipment
      whose *peak* reading — not just its current one — came within 10% of the highest threshold
      mentioned in that equipment's own spec/SOP docs. Using the peak rather than the latest
      reading matters here: it's what correctly flags C-301/CT-02 vibration as "trending toward
      alarm" even after the July 2025 fix brought the live reading back down, which is exactly the
      "we treated the symptom as resolved and missed the recurring pattern" gap NM-2025-07 (the
      corpus's own near-miss report) calls out. Restricted to equipment tags with their own spec
      document, and temperature thresholds capped to a plausible range, to filter out false
      positives the extractor otherwise picks up (a vibration sensor tag like "RV-2", or an
      unrelated design maximum like a compressor's 165°C discharge gas limit).
- [x] **Explainability/audit log** — `db.auditLog`, `GET /api/audit`, `/audit` page. Every `/chat`
      interaction (agentic or fallback) is persisted with its question, answer, confidence,
      cited document titles, graph facts used, and tool-call steps — so a compliance officer can
      review afterward exactly what the copilot checked and cited, not just trust the answer.
- [x] **Notification digest** — `src/lib/digest.ts`, `GET /api/digest`, surfaced on the dashboard
      as a "Needs your attention" panel combining live compliance gaps, trending equipment, and
      recently added documents. Computed on demand rather than pushed on a schedule (no cron/email
      infra in this build) — but the shape is the same either way, so wiring up real delivery later
      is a transport change, not a rebuild of this logic.
- [x] **Real Gemini embeddings — opt-in** — `USE_REAL_EMBEDDINGS=true` env flag,
      `src/lib/embeddings.ts` `embedRemote()`/`embedQuery()`. Off by default and deliberately
      **not** a silent per-chunk fallback like every other LLM call path in this app: local hashed
      vectors and real semantic embeddings are different vector spaces, so mixing them within one
      searchable corpus wouldn't just risk a dimension mismatch, it would silently corrupt
      retrieval. Since ingestion happens incrementally and this key's free tier caps out at 15
      requests/minute (seeding already fires ~18 extraction calls), a mid-seed quota failure with
      per-chunk fallback would leave part of the corpus embedded remotely and part locally with no
      easy way to detect it later. So this mode fails loudly on any embedding-call failure instead
      (same philosophy as vision ingestion having no OCR fallback), rather than degrading quietly.
      Recommend leaving this off unless you have a paid-tier key.

## Done — critical Vercel deployment fix + document viewer (this session)

- [x] **Fixed a real, critical bug: the "database" didn't persist on Vercel.** `src/lib/db.ts`
      stored all app state (documents, chunks, graph, feedback, audit log) as a single JSON file
      on local disk (`data/db.json`). That's fine for local dev, where the Node process stays
      alive — but it silently breaks on Vercel: serverless functions run in ephemeral containers
      with a read-only filesystem outside `/tmp`, and `/tmp` itself isn't guaranteed to survive
      between invocations or be shared across concurrent instances. A write from one request
      (seeding) could simply be gone before the next request (asking a question) read it — which
      is exactly the reported symptom: "Load Demo Corpus" reports success, but `/chat` shows
      "Based on 0 retrieved source(s)." **Fixed** by making `readDB`/`writeDB`/`resetDB` persist
      the whole DB as a single JSON blob in Supabase Storage (a new private bucket,
      `plantmind-state`, auto-created on first write) whenever Supabase is configured — a real
      persistent store shared across every invocation, unlike local disk on serverless. Falls back
      to the original local-fs behavior when Supabase isn't configured, so local dev still needs
      zero external setup. This touched every API route and `src/lib/ingest.ts` (all now `await`
      the now-async `readDB`/`writeDB`). Verified live against the real Supabase project: seeded
      18 documents, confirmed `plantmind-state/db.json` (219 KB) actually exists in the bucket,
      restarted the dev server (a fresh process, simulating a cold serverless start) and confirmed
      the 18 documents were still there and `/chat` retrieval found 6 real sources — the exact
      failure mode from the bug report, now fixed.
- [x] **"View document" option** — document cards on `/documents` are now clickable and open a
      modal with the full document text, its entity tags, and (for scans) a link to the original
      file. Citations in `/chat` now link to `/documents?id=<id>`, which deep-links straight into
      that document's viewer.

### If you're still seeing "offline mode" / empty answers after this fix, on Vercel specifically

That symptom has two independent causes — the persistence bug above (now fixed in code), and
`GEMINI_API_KEY` not actually reaching the deployed function, which is a Vercel configuration
issue I can't fix from here. Checklist:
1. Vercel dashboard → your project → **Settings → Environment Variables** — confirm `GEMINI_API_KEY`
   is spelled exactly right, has no extra quotes/whitespace in the value, and is checked for the
   **Production** environment (not just Preview/Development).
2. Add the same four Supabase variables there too: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — without these, Storage/Auth/DB
   persistence all silently fall back to their local/demo modes in production.
3. **Redeploy after adding or changing any environment variable** — Vercel does not retroactively
   apply env var changes to an existing deployment; you need a new deployment (redeploy the latest
   commit, or push a new one) for the values to take effect.
4. If it still fails after that, check the function logs in the Vercel dashboard (Deployments →
   the deployment → Functions) for the actual error — `console.error` calls throughout this
   codebase (`[llmExtractEntities] falling back...`, `[chatAgent] Gemini agent loop failed...`,
   etc.) are designed to make the real cause visible there.

## Not started / stretch (incl. new feature ideas)

Everything not yet built, in one list. What's left after this session is either genuinely
out of scope for an app with this data model, or needs an input I don't have access to:

- [ ] **Real per-plant/per-role data permissions** — accounts are now real (Supabase Auth, above),
      but there's still only one shared dataset; role only changes prompt framing, not which data
      a signed-in user can see. A real deployment would need a multi-tenant data model (plants,
      row-level permissions) that doesn't exist here — this is a data-model change, not an auth one.
- [ ] **Lessons-learned clustering** — semantic clustering of incident/near-miss reports to surface
      recurring failure patterns across equipment. Not attempted: the seed corpus has exactly one
      incident/near-miss document (NM-2025-07), and clustering a single point isn't meaningful —
      this needs a corpus with several incidents before it's worth building, not just wiring.
- [ ] **Document versioning** — SOP/procedure revision history (e.g. "this guidance was updated
      after the failure pattern was identified"). Not attempted: the corpus's SOP-C301-OPLIM
      *narrates* being revised to Rev 2 after WO-2025-0287, but only one version of that document
      is seeded — real versioning needs at least two stored revisions of the same document to
      demonstrate against, which would mean authoring new corpus content, not just app plumbing.
- [ ] Seed 1-2 example scanned/photographed documents so the vision ingestion path has a built-in
      demo. Not attempted: this needs an actual image/PDF asset (a photographed work-order form),
      and there's no image-generation tool available in this environment to produce one — still
      requires the presenter to supply their own file, as documented on `/documents`.

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
- User created a real Supabase project and bucket; added `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and verified Supabase Storage live — uploaded a real
  PNG through the ingestion API, confirmed the response backend flipped from `"inline"` to
  `"supabase"` with a real public storage URL, and confirmed that URL actually serves the file
  (200, correct byte size). No code changes needed; this was the fallback-safe design working as
  intended. Test file removed from the bucket afterward to keep it clean.
- Closed out the rest of the stretch backlog. Real Supabase Auth on `/login` (sign up/sign in/sign
  out, session shown in Nav) — the one item that genuinely needed Supabase. Gave `/chat` real
  agentic tool-calling by reusing the RCA agent's tool set, with a fixed-RAG fallback; verified
  live that it autonomously picked the right tool and cited the correct 5 documents for a CT-02
  history question. Added predictive maintenance trend flagging, tuned twice after first-pass
  testing: the initial version only looked at an equipment's *latest* reading, so it missed
  C-301's July trip (which hit its exact 7.1 mm/s RMS threshold) once the equipment was fixed
  afterward — switched to peak-reading detection instead, which now correctly flags it and reads
  as the same "we fixed the symptom, not the pattern" gap NM-2025-07 itself calls out. Also caught
  and filtered a false-positive equipment tag (a sensor label, "RV-2") and a wrong-threshold bug
  (temperature trends were comparing against an unrelated 165°C spec value from a different
  parameter) during that same testing pass. Added a chat audit log (`/audit`) and an on-demand
  notification digest, both surfaced on the dashboard. Wired up real Gemini embeddings behind an
  opt-in flag, deliberately fail-loud rather than silently-falling-back per chunk, after working
  through why mixing local-hashed and real-semantic embeddings in one corpus would silently
  corrupt retrieval rather than just risk a dimension mismatch. Explicitly did not attempt 3 items
  that need something this session doesn't have: lessons-learned clustering (corpus only has one
  incident report — nothing to cluster), document versioning (corpus narrates a revision but only
  one version is seeded), and a seeded scan/photo demo (no image-generation tool available). Full
  rebuild clean; RCA, chat (agentic and fallback), feedback, trends, digest, and audit log all
  smoke-tested live end-to-end.
- User reported the deployed (Vercel) app showing "0 retrieved source(s)" and "Offline mode" on
  `/chat` despite having set `GEMINI_API_KEY` there. Root-caused it as two separate problems: (1)
  a real, critical bug — `src/lib/db.ts` stored the entire app database as a local JSON file,
  which works in local dev but silently loses data on serverless hosts, since their filesystem is
  ephemeral/read-only outside `/tmp` and isn't shared or guaranteed to persist across invocations;
  seeding and querying were very likely landing on different, unrelated filesystems. Fixed by
  making the DB persist as a JSON blob in Supabase Storage whenever Supabase is configured (a real
  shared persistent store), falling back to local disk only when it isn't — required converting
  `readDB`/`writeDB`/`resetDB` to async and updating every one of their ~12 call sites across the
  API routes and `ingest.ts`. Verified against the real Supabase project: seeded 18 docs, confirmed
  the state blob exists in a new `plantmind-state` bucket, killed and restarted the dev server
  (simulating a cold serverless start) and confirmed the data survived and `/chat` retrieval found
  real sources again. (2) The `GEMINI_API_KEY`-not-being-read symptom is a Vercel environment
  variable configuration issue that can't be fixed from code — documented the checklist (env var
  set for Production specifically, redeploy required after adding/changing env vars) in both
  `README.md` and `TODO.md`. Also added a "View document" option — document cards on `/documents`
  now open a full-content modal, and chat citations deep-link into it. Full rebuild clean.
