# Maintenance Work Order — Root Cause Analysis

**Work Order ID:** WO-2025-0198
**Equipment Tag:** C-301
**Raised Date:** 11 March 2025
**Raised By:** Rajesh Kumar, Shift Engineer
**Priority:** High
**Status:** Closed

## Description
C-301 vibration alarm triggered at 03:40 on 11 March 2025 (radial sensor RV-2, reading 6.8 mm/s RMS against an alert threshold of 6.0 mm/s RMS). Unit was de-loaded but not tripped. Shift Engineer initiated investigation per SOP-C301-OPLIM.

## Root Cause Analysis
Investigation traced the vibration excursion to elevated compressor inlet gas temperature (41°C, against a design target of 32–35°C). Cooling water supply temperature from CT-02 was logged at 35.5°C at the time of the event, above the 32°C design basis specified in SPEC-CT02-REV4. This is consistent with the bearing-related fan performance degradation already flagged in INS-2025-004 and pending resolution under WO-2025-0142.

## Corrective Action Taken
Temporary: reduced C-301 load by 15% to bring vibration back within acceptable range while inlet temperature remained elevated.
Permanent: none implemented at this time — permanent fix is dependent on CT-02 bearing replacement (WO-2025-0142), which remained deferred as of this RCA's closure date.

## Recommendation
Anita Sharma's RCA note states: "This is a repeat risk until CT-02 cooling performance is restored. Recommend prioritizing WO-2025-0142 for the next available shutdown window to avoid a repeat trip."
