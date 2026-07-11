# Innfetch Demo Corpus — Index

18 synthetic documents covering 4 equipment units with a deliberately interconnected failure history, so cross-document RAG and knowledge-graph queries have a real, traceable answer.

## Equipment units
- **C-301** — Process gas compressor (vibration/trip history)
- **CT-02** — Cooling tower fan (bearing wear, deferred maintenance — the root cause thread)
- **P-105** — Boiler feed pump (cavitation, unrelated side-thread)
- **B-201** — Steam boiler (statutory compliance thread)

## The core causal chain (use this for your best demo query)
`INS-2025-004` (Jan 2025, bearing wear flagged) → `WO-2025-0142` (bearing replacement deferred twice) → `WO-2025-0198` (Mar 2025, C-301 vibration event #1, RCA traces to CT-02) → `WO-2025-0287` (Jul 2025, C-301 unplanned shutdown, RCA traces to same unresolved CT-02 issue) → `NM-2025-07` (Sep 2025, near-miss flags the pattern as systemic, not one-off) → `SOP-C301-OPLIM` Rev 2 (Jan 2026, procedure updated as a result)

## Suggested demo queries (in rough order of impressiveness)
1. **"Why did C-301 trip in July 2025, and had this happened before?"** — tests cross-document RCA reasoning across WO-2025-0287, WO-2025-0198, and INS-2025-004.
2. **"Show me all maintenance history connected to CT-02"** — tests knowledge graph relationship traversal (5 documents reference CT-02).
3. **"Is there a pattern of deferred maintenance leading to unplanned shutdowns?"** — tests the maintenance/RCA agent's pattern-detection capability directly against NM-2025-07's own framing.
4. **"What's the compliance status of B-201?"** — tests the compliance agent against WO-2026-0019 and REG-FACT-001 (separate thread, good for showing breadth).
5. **"What caused the P-105 cavitation event?"** — simpler single-thread query, good as an easy warm-up demo query if the first one doesn't land well live.

## Document list
| File | Type | Equipment | Date |
|---|---|---|---|
| 01_equipment_spec_C301.md | Spec | C-301 | — |
| 02_equipment_spec_P105.md | Spec | P-105 | — |
| 03_equipment_spec_CT02.md | Spec | CT-02 | — |
| 04_equipment_spec_B201.md | Spec | B-201 | — |
| 05_work_order_WO-2025-0142.md | Work order | CT-02 | Jan–Jul 2025 |
| 06_work_order_WO-2025-0198.md | Work order (RCA) | C-301 | Mar 2025 |
| 07_work_order_WO-2025-0231.md | Work order | P-105 | Jun 2025 |
| 08_work_order_WO-2025-0287.md | Work order (RCA) | C-301 | Jul 2025 |
| 09_work_order_WO-2026-0019.md | Work order | B-201 | Feb 2026 |
| 10_inspection_report_INS-2025-004.md | Inspection | CT-02 | Jan 2025 |
| 11_inspection_report_INS-2025-011.md | Inspection | P-105 | Jun 2025 |
| 12_inspection_report_INS-2026-002.md | Inspection | B-201 | Feb 2026 |
| 13_sop_gas_compressor_operating_limits.md | SOP | C-301 | Rev 2, Jan 2026 |
| 14_sop_permit_to_work_hot_work.md | SOP | All areas | Rev 4 |
| 15_incident_report_NM-2025-07.md | Near-miss | CT-02/C-301 | Sep 2025 |
| 16_regulatory_excerpt_oisd_inspection_intervals.md | Regulatory | General | — |
| 17_regulatory_excerpt_factory_act_compliance.md | Regulatory | B-201 | — |
| 18_shift_log_2025-07-14_C301_shutdown.md | Shift log | C-301/CT-02 | Jul 2025 |

## Named personnel (for entity extraction testing)
Rajesh Kumar (Shift Engineer), Anita Sharma (Maintenance Lead), Vikram Rao (Safety Officer), Suresh Iyer (Plant Manager)
