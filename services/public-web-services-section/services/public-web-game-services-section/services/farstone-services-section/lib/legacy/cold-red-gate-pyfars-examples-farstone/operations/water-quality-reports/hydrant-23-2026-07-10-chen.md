---
type: water-quality-report
target: hydrant-23
inspector: public-works-chen
inspected-at: "2026-07-10T11:30:00Z"
parameters:
  total-coliform: "<1 CFU/100mL"
  free-chlorine-residual: "0.6 mg/L"
  turbidity: "0.18 NTU"
  ph: "7.4"
  nitrate: "2.1 mg/L"
status: pass
predication-cells:
  - "(hydrant-23, water-quality-status, ok) = T"
---

# Hydrant-23 inspection — 2026-07-10 — Inspector Chen

Public Works Inspector Chen sampled Hydrant-23 (corner of 5th and Walnut) on the regular Q3 round.
All parameters within thresholds; recorded as **pass**.

## Predication cells

`(hydrant-23, water-quality-status, ok) = T`

## Conflict note

Less than 12 hours later, Contracted Lab Inspector Patel filed a conflicting report (`hydrant-23-2026-07-10-patel.md`) with `status: fail`.
Knowledge-meet of T and F produces ⊤ (TOP) on the same cell.
See workitem `inspect-hydrant-23-resolve-conflict` for the resolution path.
