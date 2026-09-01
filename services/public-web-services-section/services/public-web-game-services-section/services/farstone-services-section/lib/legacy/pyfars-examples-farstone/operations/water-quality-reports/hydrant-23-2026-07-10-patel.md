---
type: water-quality-report
target: hydrant-23
inspector: contracted-lab-patel
inspected-at: "2026-07-10T22:45:00Z"
parameters:
  total-coliform: "3 CFU/100mL"
  free-chlorine-residual: "0.5 mg/L"
  turbidity: "0.22 NTU"
  ph: "7.4"
  nitrate: "2.2 mg/L"
status: fail
fail-reason: total-coliform-detected
predication-cells:
  - "(hydrant-23, water-quality-status, ok) = F"
---

# Hydrant-23 inspection — 2026-07-10 — Contracted Lab (Patel)

Contracted Lab Inspector Patel sampled Hydrant-23 (corner of 5th and Walnut) the same day, evening shift.
Total coliform detected at 3 CFU/100mL — above the pass threshold.
Recorded as **fail**.

## Predication cells

`(hydrant-23, water-quality-status, ok) = F`

## Conflict note

Inspector Chen's report from the same morning (`hydrant-23-2026-07-10-chen.md`) has `status: pass`.
The substrate's knowledge-join produces ⊤ on `(hydrant-23, water-quality-status, ok)`.

## Designed-in anomaly

This conflict is intentional: it gives Arc F (anomaly surfacing) and Arc A (selection-as-substrate, which must refuse ⊤) a real anomaly to exercise against on the first run.
Under the precautionary principle declared in `specifications/water-quality-thresholds.md`, the hydrant is treated as `fail` until resolved through the workitem `inspect-hydrant-23-resolve-conflict`.
