---
type: workitem
subtype: inquiry
title: "Resolve Hydrant-23 water-quality conflict"
status: pending
priority: high
anomaly-of:
  - "(hydrant-23, water-quality-status, ok) = ⊤"
requires-capabilities:
  - water-quality-inspection
requires-skills:
  - conducting-water-quality-inspection
touches:
  - examples/farston/operations/water-quality-reports/
target-resolution: "within-24-hours-of-detection"
acceptance:
  - re-inspection-conducted
  - top-cell-resolved
  - finding-recorded-with-explanation
---


Two inspection reports filed within 12 hours of each other on Hydrant-23 disagree:

- Public Works Inspector Chen: `(hydrant-23, water-quality-status, ok) = T` (pass)
- Contracted Lab Inspector Patel: `(hydrant-23, water-quality-status, ok) = F` (fail)

Knowledge-meet of T and F produces ⊤ (TOP).
Per `specifications/water-quality-thresholds.md`, this is a designed-in anomaly path: the director has 24 hours to resolve via re-inspection; until resolved, the hydrant is treated as `fail` (precautionary principle).

## Inquiry

1. Director Chen reviews both inspection reports for procedural correctness.
2. Re-inspect Hydrant-23 with both inspectors present; observe sample collection.
3. Send sample to a third-party lab if procedure was correct on both sides.
4. Resolve the ⊤ cell by writing a director's-finding record with explanation.
5. If hydrant fails on re-inspection: queue boil-water-advisory for the affected service area.

## Acceptance

- [ ] Re-inspection conducted with documented chain-of-custody.
- [ ] Director's finding written; ⊤ cell on `(hydrant-23, water-quality-status, ok)` resolved.
- [ ] If failure confirmed: boil-water-advisory queued.
- [ ] Anomaly witness chain references both original reports + the finding.

## Why this is a useful test scenario

This workitem is a deliberate testbed for Arc F (anomaly surfacing): the substrate carries a real ⊤ cell, the dispatch graph produces a real anomaly witness on the next tick, and the resolution path exercises both the inquiry workitem subtype and the eligibility-by-charter-binding interaction.
