---
name: "Conducting water-quality inspection"
description: "Samples a public hydrant or sampling point, tests against Farston's water-quality thresholds, and files the result. Use as part of the quarterly-inspection duty or in response to a contamination report."
---


## Requirements

- A target sampling point (hydrant slug or treatment-plant tap)
- Calibrated field test kit
- Authorization from the public-works-director office

## Steps

1. Sample the target point per the standard collection procedure.
2. Test against the thresholds in `specifications/water-quality-thresholds.md` (chlorine, coliform, turbidity, pH).
3. Write the inspection record to `operations/water-quality-reports/<inspection-slug>.md` with `(target, water-quality-status, ok)` set to T (pass) or F (fail).
4. If failed, immediately notify the director and queue a re-test workitem; queue a boil-water-advisory dispatch intent if the failure is on a serviceable line.
5. File the result to the public registry through the records clerk per Charter Article III §4.

## Outcomes

An inspection record exists.
The target point's `water-quality-status` cell is T (pass) or F (fail).
On failure, a re-test workitem and (where applicable) a boil-water-advisory intent are queued.
The result appears in the public registry.

## Anomaly note

Two inspectors filing conflicting status cells on the same target produces a TOP cell on `(target, water-quality-status, ok)`.
Resolution is the director's responsibility; until resolved, the `eligibility-by-charter-binding` rule treats the target as out-of-compliance.
