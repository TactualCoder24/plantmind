import { DocType } from "@/lib/types";

export interface SeedDoc {
  title: string;
  type: DocType;
  filename: string;
  content: string;
}

/**
 * Synthetic demo corpus: 4 pieces of interconnected equipment (Process Gas
 * Compressor C-301, Cooling Tower Fan CT-02, Boiler Feed Pump P-105, Steam
 * Boiler B-201) with a deliberately traceable failure history — a deferred
 * CT-02 bearing replacement propagates into two C-301 vibration events, plus
 * two independent side-threads (a P-105 cavitation event, a B-201 statutory
 * compliance gap) for breadth. Regulatory excerpts are paraphrased, not
 * reproduced verbatim. See synthetic_docs/synthetic_docs/00_INDEX_and_demo_queries.md
 * for the full causal chain and suggested demo queries this corpus was built for.
 */
export const seedDocs: SeedDoc[] = [
  {
    title: "Equipment Spec - Process Gas Compressor C-301",
    type: "equipment_spec",
    filename: "spec_c301.md",
    content: `Document ID: SPEC-C301-REV3
Equipment Tag: C-301
Equipment Name: Process Gas Centrifugal Compressor
Location: Unit 3, Compressor House, Bay 2
Manufacturer: Kirloskar Pneumatic (OEM equivalent)
Commissioned: 14 March 2019
Last Revision: 02 January 2026

Design Parameters:
Rated capacity: 18,500 Nm3/hr
Discharge pressure: 12.4 bar(g)
Driver: 1,850 kW induction motor, 3-phase, 6.6 kV
Normal operating speed: 8,200 RPM
Maximum permissible vibration (per ISO 10816-3): 7.1 mm/s RMS
Maximum inlet gas temperature: 45C
Maximum discharge gas temperature: 165C

Cooling Dependency: C-301 process gas is cooled upstream by the Unit 3 cooling water loop, which is serviced by Cooling Tower Fan CT-02. Inlet gas temperature to C-301 is directly dependent on CT-02 cooling water supply temperature. Design basis assumes CT-02 supply water at or below 32C; sustained supply temperatures above 36C place C-301 inlet gas temperature outside design envelope and elevate vibration risk due to reduced gas density and altered rotor dynamics.

Maintenance Interval (per OEM manual): Vibration monitoring continuous (online sensors, 4 radial + 1 axial). Bearing inspection every 8,000 operating hours. Full teardown inspection every 24,000 operating hours or 3 years, whichever is sooner.

Associated Documents: WO-2025-0198 (vibration RCA, March 2025), WO-2025-0287 (unplanned shutdown, July 2025), SOP-C301-OPLIM (operating limits procedure).`,
  },
  {
    title: "Equipment Spec - Boiler Feed Water Pump P-105",
    type: "equipment_spec",
    filename: "spec_p105.md",
    content: `Document ID: SPEC-P105-REV2
Equipment Tag: P-105
Equipment Name: Boiler Feed Water Pump
Location: Boiler House, Ground Floor, Pump Bay A
Manufacturer: Kirloskar Brothers (OEM equivalent)
Commissioned: 09 August 2020
Last Revision: 11 June 2025

Design Parameters:
Rated flow: 145 m3/hr
Rated head: 620 m
Driver: 250 kW induction motor
Minimum NPSH required: 4.2 m
Feed water temperature (design): 105C
Feed water source: Deaerator tank DA-01, gravity-fed via suction header

Operating Notes: P-105 feeds Steam Boiler B-201. Feed water quality (hardness, dissolved oxygen, suspended solids) is governed by DA-01 deaerator performance and upstream water treatment. Cavitation risk increases significantly when suction header pressure drops below design NPSH margin, typically caused by low deaerator tank level or elevated feed water temperature during high-demand periods.

Maintenance Interval (per OEM manual): Vibration and bearing temperature check weekly. Mechanical seal inspection every 4,000 operating hours. Impeller and wear-ring inspection every 12,000 operating hours.

Associated Documents: WO-2025-0231 (cavitation event, June 2025), INS-2025-011 (feed water quality inspection).`,
  },
  {
    title: "Equipment Spec - Cooling Tower Fan CT-02",
    type: "equipment_spec",
    filename: "spec_ct02.md",
    content: `Document ID: SPEC-CT02-REV4
Equipment Tag: CT-02
Equipment Name: Induced Draft Cooling Tower Fan
Location: Cooling Tower Yard, Cell 2
Manufacturer: Paharpur Cooling Towers (OEM equivalent)
Commissioned: 22 November 2017
Last Revision: 15 September 2025

Design Parameters:
Fan diameter: 3.6 m
Rated airflow: 285,000 m3/hr
Driver: 75 kW induction motor via gearbox, 1:8.5 reduction
Design cooling water outlet temperature: 32C (at 35C ambient wet bulb)
Bearing type: spherical roller, grease-lubricated

Downstream Dependency: CT-02 supplies cooled water to the Unit 3 process cooling loop, which services Process Gas Compressor C-301 among other equipment. Reduced fan performance (fouled fill media, bearing degradation, blade pitch drift) raises cooling water outlet temperature, which propagates directly to C-301 inlet gas temperature (see SPEC-C301-REV3).

Maintenance Interval (per OEM manual): Bearing grease replenishment every 2,000 operating hours. Bearing vibration check monthly. Gearbox oil analysis every 6 months. Full bearing replacement every 5 years or on vibration trend exceedance, whichever is sooner.

Known Issues: Bearing wear was first flagged in INS-2025-004 (January 2025). Replacement was scoped in WO-2025-0142 but deferred twice due to spare part lead time, contributing to degraded cooling performance through mid-2025.

Associated Documents: INS-2025-004 (bearing wear inspection), WO-2025-0142 (bearing replacement work order), NM-2025-07 (near-miss report).`,
  },
  {
    title: "Equipment Spec - Steam Boiler B-201",
    type: "equipment_spec",
    filename: "spec_b201.md",
    content: `Document ID: SPEC-B201-REV5
Equipment Tag: B-201
Equipment Name: Water Tube Steam Boiler
Location: Boiler House, Bay 1
Manufacturer: Thermax (OEM equivalent)
Commissioned: 03 February 2016
Last Revision: 20 February 2026

Design Parameters:
Rated steam output: 22 TPH
Design pressure: 17.5 bar(g)
Fuel: natural gas, LDO standby
Feed water source: P-105 (Boiler Feed Water Pump)

Statutory Compliance: B-201 is classified as a statutory boiler under the Indian Boilers Act and is subject to periodic inspection by a certified boiler inspector. Pressure relief valve (PRV) testing is required every 12 months per the boiler operating certificate; hydrostatic testing is required every 24 months. See REG-FACT-001 for general Factory Act compliance obligations applicable to this unit.

Maintenance Interval: PRV function test every 12 months (statutory). Hydrostatic test every 24 months (statutory). Water side chemical cleaning annually. Feed water quality check continuous, tied to P-105 suction conditions.

Associated Documents: WO-2026-0019 (relief valve test overdue), INS-2026-002 (boiler inspection, February 2026), SPEC-P105-REV2 (feed water source).`,
  },
  {
    title: "Work Order WO-2025-0142 - CT-02 Bearing Replacement",
    type: "work_order",
    filename: "wo_2025_0142.md",
    content: `Work Order ID: WO-2025-0142
Equipment Tag: CT-02
Raised Date: 18 January 2025
Raised By: Anita Sharma, Maintenance Lead
Priority: Medium
Status: Deferred (twice)

Description: Bearing vibration trend on CT-02 has exceeded the alert threshold (4.5 mm/s RMS, up from a baseline of 2.1 mm/s RMS) per findings in INS-2025-004. Recommend bearing replacement during next planned shutdown window.

Action History:
18 Jan 2025: Work order raised, spare bearing ordered (lead time quoted at 6 weeks).
12 Feb 2025: Deferred - spare part delayed at customs, revised ETA 15 March 2025.
20 Mar 2025: Deferred again - no shutdown window available before Q2; plant running at full load ahead of a contractual delivery commitment.
28 Jul 2025: Bearing finally replaced during unplanned outage (see WO-2025-0287, which forced a shutdown window that was used to complete this work concurrently).

Notes: Anita Sharma flagged in the 20 March deferral note that continued operation with degraded CT-02 cooling performance "will elevate downstream thermal load on Unit 3 process equipment, particularly C-301, and should not be deferred beyond one further cycle." This concern was escalated verbally to the Plant Manager but not formally logged until the September near-miss (NM-2025-07).`,
  },
  {
    title: "Work Order WO-2025-0198 - C-301 Vibration RCA",
    type: "work_order",
    filename: "wo_2025_0198.md",
    content: `Work Order ID: WO-2025-0198 (Root Cause Analysis)
Equipment Tag: C-301
Raised Date: 11 March 2025
Raised By: Rajesh Kumar, Shift Engineer
Priority: High
Status: Closed

Description: C-301 vibration alarm triggered at 03:40 on 11 March 2025 (radial sensor RV-2, reading 6.8 mm/s RMS against an alert threshold of 6.0 mm/s RMS). Unit was de-loaded but not tripped. Shift Engineer initiated investigation per SOP-C301-OPLIM.

Root Cause Analysis: Investigation traced the vibration excursion to elevated compressor inlet gas temperature (41C, against a design target of 32-35C). Cooling water supply temperature from CT-02 was logged at 35.5C at the time of the event, above the 32C design basis specified in SPEC-CT02-REV4. This is consistent with the bearing-related fan performance degradation already flagged in INS-2025-004 and pending resolution under WO-2025-0142.

Corrective Action Taken: Temporary - reduced C-301 load by 15% to bring vibration back within acceptable range while inlet temperature remained elevated. Permanent - none implemented at this time; permanent fix is dependent on CT-02 bearing replacement (WO-2025-0142), which remained deferred as of this RCA's closure date.

Recommendation: Anita Sharma's RCA note states: "This is a repeat risk until CT-02 cooling performance is restored. Recommend prioritizing WO-2025-0142 for the next available shutdown window to avoid a repeat trip."`,
  },
  {
    title: "Work Order WO-2025-0231 - P-105 Cavitation Event",
    type: "work_order",
    filename: "wo_2025_0231.md",
    content: `Work Order ID: WO-2025-0231
Equipment Tag: P-105
Raised Date: 05 June 2025
Raised By: Rajesh Kumar, Shift Engineer
Priority: High
Status: Closed

Description: Audible cavitation noise and abnormal vibration reported on P-105 during morning shift, 05 June 2025. Pump remained running; discharge flow dropped approximately 12% below normal for the operating point.

Investigation: Deaerator tank DA-01 level was found to be running low (38% against a normal operating band of 60-80%) due to a delayed condensate return from an unrelated process upset the previous night. Low tank level reduced suction head available to P-105 below the 4.2 m NPSH margin specified in SPEC-P105-REV2, inducing cavitation.

Corrective Action: DA-01 level restored to normal band within 40 minutes by adjusting makeup water valve. Cavitation ceased once suction conditions normalized. No immediate mechanical damage detected on follow-up vibration check.

Follow-Up: Recommended in this work order - add a low-level alarm interlock on DA-01 tied to P-105 load shedding, to prevent recurrence. See INS-2025-011 for the subsequent feed water quality inspection that reviewed this event.`,
  },
  {
    title: "Work Order WO-2025-0287 - C-301 Unplanned Shutdown",
    type: "work_order",
    filename: "wo_2025_0287.md",
    content: `Work Order ID: WO-2025-0287 (Unplanned Shutdown)
Equipment Tag: C-301
Raised Date: 14 July 2025
Raised By: Rajesh Kumar, Shift Engineer
Priority: Critical
Status: Closed

Description: C-301 tripped automatically at 21:12 on 14 July 2025 on high vibration (radial sensor RV-2, 7.4 mm/s RMS, exceeding the 7.1 mm/s RMS trip setpoint per SPEC-C301-REV3). Unplanned shutdown duration: 6 hours 20 minutes.

Root Cause Analysis: This is a repeat of the mechanism identified in WO-2025-0198 (March 2025). CT-02 cooling water supply temperature was logged at 36.8C at the time of trip, further degraded from the March event, consistent with continued deferral of CT-02 bearing replacement under WO-2025-0142. The corrective action recommended in WO-2025-0198 (prioritizing CT-02 bearing replacement) had not been implemented at the time of this trip.

Corrective Action Taken: Compressor restarted after cooldown and manual verification of vibration levels. CT-02 bearing replacement (WO-2025-0142) was performed during this unplanned outage window, since the plant was already down. Post-replacement, CT-02 cooling water outlet temperature returned to 31-33C range, within design basis.

Lessons Learned: See shift log SL-2025-0714 for the full operator timeline of this event. Plant Manager Suresh Iyer requested this RCA be cross-referenced against NM-2025-07, the near-miss report raised in September referencing the same deferred maintenance pattern, for the quarterly reliability review.`,
  },
  {
    title: "Work Order WO-2026-0019 - B-201 Relief Valve Test Overdue",
    type: "work_order",
    filename: "wo_2026_0019.md",
    content: `Work Order ID: WO-2026-0019
Equipment Tag: B-201
Raised Date: 08 February 2026
Raised By: Vikram Rao, Safety Officer
Priority: High (statutory compliance)
Status: Open

Description: Annual pressure relief valve (PRV) function test on B-201 was due 15 January 2026 per the statutory schedule referenced in SPEC-B201-REV5 and REG-FACT-001. As of this work order's raise date, the test has not been completed - 24 days overdue.

Cause of Delay: Certified boiler inspector availability was constrained in January due to a backlog across multiple client sites. Internal scheduling did not flag the approaching deadline with sufficient lead time; no automated tracking exists linking statutory test dates to work order generation.

Risk Note: Vikram Rao's note: "Operating a statutory boiler beyond its certified inspection window is a Factory Act compliance breach and exposes the plant to regulatory action in the event of an audit or incident. This should be treated as a same-week priority, not routine maintenance backlog."

Status: Boiler inspector booked for 14 February 2026. B-201 remains in service pending test completion; no operational anomalies reported to date. See INS-2026-002 for the related inspection findings.`,
  },
  {
    title: "Inspection Report INS-2025-004 - CT-02 Bearing Vibration Check",
    type: "inspection_report",
    filename: "ins_2025_004.md",
    content: `Report ID: INS-2025-004
Equipment Tag: CT-02
Inspection Date: 16 January 2025
Inspector: Anita Sharma, Maintenance Lead
Type: Routine monthly bearing vibration check

Findings: Bearing vibration reading on the CT-02 fan drive-end bearing measured 4.5 mm/s RMS, up from a 2.1 mm/s RMS baseline recorded in the previous quarterly trend. This exceeds the internal alert threshold of 4.0 mm/s RMS but remains below the OEM-specified alarm threshold of 7.0 mm/s RMS.

Assessment: Trend suggests early-stage bearing wear consistent with grease degradation beyond the normal 2,000-hour replenishment interval - records show the last grease service was performed at approximately 2,400 operating hours, slightly beyond schedule. Recommend bearing replacement rather than continued grease servicing, given the vibration trend.

Recommendation: Raise work order for bearing replacement at next available shutdown window. Do not defer beyond one quarterly cycle given the downstream cooling dependency of Unit 3 process equipment (see SPEC-CT02-REV4, SPEC-C301-REV3).

Follow-Up: Work order WO-2025-0142 was raised the same day this report was filed.`,
  },
  {
    title: "Inspection Report INS-2025-011 - P-105 Feed Water Follow-Up",
    type: "inspection_report",
    filename: "ins_2025_011.md",
    content: `Report ID: INS-2025-011
Equipment Tag: P-105 / DA-01
Inspection Date: 10 June 2025
Inspector: Rajesh Kumar, Shift Engineer
Type: Follow-up inspection after cavitation event (WO-2025-0231)

Findings: Deaerator tank DA-01 level instrumentation was found to be functioning correctly; the low-level condition on 05 June was caused by an operational delay in condensate return, not an instrument fault. No physical damage found on P-105 impeller or wear rings during visual borescope check.

Water Quality: Feed water hardness and dissolved oxygen levels were within acceptable limits at time of inspection. No evidence that the cavitation event caused a water treatment excursion.

Assessment: Root cause remains as identified in WO-2025-0231: transient low suction head due to DA-01 level drop, not a chronic water quality or equipment condition issue. However, the absence of an automated low-level interlock remains a gap.

Recommendation: Reiterates the recommendation from WO-2025-0231: implement a DA-01 low-level alarm interlocked to P-105 protective action. This had not been actioned as of this report's filing.`,
  },
  {
    title: "Inspection Report INS-2026-002 - B-201 Statutory PRV Test",
    type: "inspection_report",
    filename: "ins_2026_002.md",
    content: `Report ID: INS-2026-002
Equipment Tag: B-201
Inspection Date: 14 February 2026
Inspector: Certified Boiler Inspector (third-party, empanelled under state boiler regulations), witnessed by Vikram Rao
Type: Statutory pressure relief valve function test (overdue - see WO-2026-0019)

Findings: PRV function test completed satisfactorily. Both relief valves lifted within the certified set-pressure tolerance band (17.5 bar(g) +/- 3%). No leakage, seat damage, or set-point drift detected.

Compliance Note: Test was completed 30 days beyond the statutory due date of 15 January 2026. Inspector noted this delay in the statutory register and recommended the plant implement a tracking mechanism to prevent recurrence, referencing general Factory Act obligations around timely statutory testing (see REG-FACT-001).

Feed Water Cross-Check: Inspector also reviewed feed water quality logs from P-105/DA-01 as part of the standard boiler inspection scope. No anomalies noted; the June 2025 cavitation event (WO-2025-0231) was confirmed to have had no lasting impact on boiler feed water chemistry.

Next Due Date: Next PRV function test due 15 January 2027. Next hydrostatic test due 15 January 2028 (24-month cycle, unchanged by this inspection).`,
  },
  {
    title: "SOP - C-301 Operating Limits and Vibration Response",
    type: "sop",
    filename: "sop_c301_oplim.md",
    content: `Document ID: SOP-C301-OPLIM
Title: C-301 Process Gas Compressor - Operating Limits and Vibration Response
Effective Date: 05 January 2026 (Revision 2 - updated post WO-2025-0287)
Owner: Anita Sharma, Maintenance Lead

Purpose: Defines operator response to vibration and temperature excursions on C-301, incorporating lessons from the March 2025 and July 2025 vibration events.

Operating Limits: Normal vibration band 0-4.5 mm/s RMS. Alert threshold 6.0 mm/s RMS - reduce load by 10-15%, notify Shift Engineer, log inlet gas temperature and CT-02 cooling water supply temperature. Trip setpoint 7.1 mm/s RMS - automatic trip, no operator override permitted.

Revision 2 Change: Following the July 2025 unplanned trip (WO-2025-0287), this SOP was updated to require operators to cross-check CT-02 cooling water supply temperature immediately upon any vibration alert on C-301, given the confirmed causal link between CT-02 cooling performance and C-301 inlet gas temperature (see SPEC-C301-REV3, WO-2025-0198, WO-2025-0287).

Operator Action on Alert: (1) Log current vibration reading and cooling water supply temperature. (2) If cooling water supply temperature exceeds 34C, escalate to Maintenance immediately regardless of vibration trend - do not wait for the 6.0 mm/s RMS threshold. (3) Reduce compressor load per the step-down table in Appendix A (not reproduced here). (4) Raise a work order if the condition persists beyond one operating shift.`,
  },
  {
    title: "SOP - Permit-to-Work for Hot Work Activities",
    type: "sop",
    filename: "sop_ptw_hotwork.md",
    content: `Document ID: SOP-PTW-HOTWORK
Title: Permit-to-Work Procedure for Hot Work Activities
Effective Date: 01 April 2024 (Revision 4)
Owner: Vikram Rao, Safety Officer

Purpose: Establishes the authorization sequence for any hot work (welding, grinding, cutting) conducted within process areas, including the Compressor House and Boiler House.

Scope: Applies to all maintenance activities involving open flame, sparks, or temperatures capable of igniting flammable atmospheres, including work associated with equipment tags C-301, P-105, CT-02, and B-201.

Permit Sequence: (1) Requesting technician completes a gas test of the work area (combustible gas, oxygen level) within 30 minutes of work start. (2) Shift Engineer reviews active work orders and equipment status for the area to confirm no conflicting activity (e.g. no hot work authorized within 15 meters of an active high-temperature process line without additional controls). (3) Safety Officer or delegated authority co-signs the permit, valid for the duration of a single shift only. (4) Permit is re-validated if work extends beyond the original shift or if area conditions change materially.

Cross-Reference: Any hot work permit request in the Compressor House during a period when C-301 is operating above its normal inlet temperature band (see SOP-C301-OPLIM) requires additional review, since elevated process temperatures reduce the safety margin for nearby hot work activity.`,
  },
  {
    title: "Near-Miss Report NM-2025-07 - Recurring CT-02/C-301 Pattern",
    type: "incident_report",
    filename: "nm_2025_07.md",
    content: `Report ID: NM-2025-07
Date: 03 September 2025
Reported By: Anita Sharma, Maintenance Lead
Area: Unit 3 Compressor House / Cooling Tower Yard
Severity Classification: Near-miss, no injury, no equipment damage

Description: During a routine walk-down, it was observed that CT-02 cooling water outlet temperature had again drifted toward 34C under high ambient load, approaching the escalation threshold defined in SOP-C301-OPLIM Revision 2. While the bearing replacement from WO-2025-0142 had been completed in July following the unplanned shutdown (WO-2025-0287), fill media fouling - a separate degradation mode not addressed by the bearing work - was identified as a contributing factor.

Why This Is Reportable: This is flagged as a near-miss rather than a routine observation because it represents a recurrence of the same causal chain (CT-02 cooling degradation, elevated C-301 inlet temperature, vibration risk) that had already caused one unplanned shutdown in July 2025, despite the specific bearing issue having been resolved. The underlying pattern - deferred or incomplete maintenance on CT-02 propagating risk to C-301 - was not fully addressed by treating the bearing replacement as a one-time fix.

Recommendation: Anita Sharma's note: "We treated the July shutdown as resolved once the bearing was replaced, but the RCA chain shows CT-02 has multiple degradation modes that all affect C-301. Recommend a standing quarterly cross-check between CT-02 condition and C-301 vibration trends, not just reactive maintenance after each individual fault type."

Management Response: Plant Manager Suresh Iyer requested this near-miss be reviewed alongside WO-2025-0287 in the Q3 reliability review and referenced in any RCA-pattern tooling under evaluation.`,
  },
  {
    title: "Regulatory Excerpt - OISD Inspection Intervals (Paraphrased)",
    type: "regulation",
    filename: "reg_oisd_intervals.md",
    content: `Document ID: REG-OISD-001
Subject: Periodic inspection intervals for rotating and static process equipment
Source basis: General OISD-style guidance on inspection and maintenance intervals for hazardous process industries (paraphrased summary for internal reference, not a verbatim reproduction of any specific OISD standard; consult the current published standard for compliance purposes)

Summary of General Principles: Industry inspection guidance of this type typically establishes that critical rotating equipment associated with hazardous process streams - compressors, pumps handling flammable or high-temperature fluids, and their supporting utility systems (such as cooling systems) - should be subject to documented, risk-based inspection intervals rather than purely reactive maintenance.

Key principles commonly reflected in this category of guidance: Condition-monitoring data (vibration, temperature trends) should trigger inspection escalation independent of the fixed calendar interval when trends indicate degradation. Deferral of a scheduled inspection or maintenance action on safety-relevant equipment should be documented with a formal risk assessment, not an informal operational note. Utility systems supporting hazardous process equipment (e.g. cooling water systems supporting a process gas compressor) fall within the same inspection rigor as the primary equipment they support, given the potential for cascading failure.

Internal Application Note: This summary is referenced by SPEC-CT02-REV4 and the CT-02/C-301 maintenance history (WO-2025-0142, WO-2025-0198, WO-2025-0287, NM-2025-07) as the basis for treating cooling tower fan maintenance deferrals with the same urgency as compressor-specific maintenance items.`,
  },
  {
    title: "Regulatory Excerpt - Factory Act Boiler Compliance (Paraphrased)",
    type: "regulation",
    filename: "reg_factact_compliance.md",
    content: `Document ID: REG-FACT-001
Subject: General statutory obligations for boiler and pressure equipment inspection
Source basis: General paraphrased summary of statutory obligations typically imposed under Indian factory and boiler safety legislation on statutory pressure equipment, not a verbatim reproduction of any specific act or section; consult current legislation for compliance purposes.

Summary of General Principles: Statutory boilers and pressure vessels operating in Indian industrial facilities are typically required to undergo periodic inspection and certification by an authorized or empanelled inspector. Common obligations reflected in this category of legislation include: annual (or otherwise legislatively defined) functional testing of safety-critical components such as pressure relief valves; periodic hydrostatic or equivalent structural integrity testing on a longer cycle (commonly 24 months for many boiler classes); a requirement that the facility maintain the equipment's operating certificate current, with statutory test records available for regulatory inspection. Consequences for operating equipment beyond a lapsed statutory test window may include regulatory penalty, forced shutdown, or invalidation of the operating certificate, depending on jurisdiction and severity.

Internal Application Note: This summary is referenced by SPEC-B201-REV5 and WO-2026-0019, which document a 24-day overdue statutory PRV test on B-201 completed in February 2026 (see INS-2026-002). Vikram Rao's note in WO-2026-0019 characterizes this delay as a compliance breach requiring same-week priority.`,
  },
  {
    title: "Shift Log SL-2025-0714 - C-301 Unplanned Shutdown Timeline",
    type: "shift_log",
    filename: "shift_log_2025-07-14.md",
    content: `Log ID: SL-2025-0714
Date: 14 July 2025
Shift: Night (20:00-06:00)
Logged By: Rajesh Kumar, Shift Engineer
Area: Unit 3 Compressor House

Timeline:
20:15 - Shift handover. CT-02 cooling water supply logged at 35.2C, noted as "elevated, watching trend" per SOP-C301-OPLIM.
20:40 - C-301 vibration reading 6.3 mm/s RMS, within alert band. Load reduced 10% per procedure.
21:05 - Cooling water supply temperature climbed to 36.8C. Maintenance on-call notified per Revision 2 escalation rule.
21:12 - C-301 vibration reached 7.4 mm/s RMS, automatic trip on sensor RV-2.
21:20 - Compressor confirmed stopped, area secured, no injuries, no gas release detected.
21:45 - Plant Manager Suresh Iyer and Maintenance Lead Anita Sharma arrived on site.
22:30 - Decision made to use the unplanned outage window to complete the deferred CT-02 bearing replacement (WO-2025-0142) rather than restart immediately and defer again.
03:15 (15 Jul) - CT-02 bearing replacement completed, cooling water supply temperature verified at 30.8C.
03:32 - C-301 restarted, vibration verified stable at 3.1 mm/s RMS.

End-of-Shift Note: "This is the second vibration trip traced to the same CT-02 cooling issue this year. Recommend this be raised at the next reliability review as a pattern, not treated as two unrelated events." - R. Kumar

Related Documents: WO-2025-0287, WO-2025-0142, WO-2025-0198`,
  },
];
