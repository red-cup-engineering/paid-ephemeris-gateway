---
title: "Water Quality Thresholds (Farston)"
type: specification
status: active
adopted: "2019-03-04"
last-amended: "2024-02-12"
authority: city-council
basis: state-public-health-code-§7-2
---

# Water Quality Thresholds

The thresholds Farston's public water must meet at every public sampling point.
These thresholds are at or above the state public-health code minimums.

## Test parameters

| Parameter | Pass threshold | Fail threshold | Action on fail |
|---|---|---|---|
| Total coliform | <1 CFU/100mL | ≥1 CFU/100mL | re-test within 24h; boil-water advisory if confirmed |
| Free chlorine residual | 0.2-4.0 mg/L | <0.2 or >4.0 | adjust treatment; re-test within 4h |
| Turbidity | <0.3 NTU | ≥1.0 NTU | identify cause; re-test within 12h |
| pH | 6.5-8.5 | <6.5 or >8.5 | adjust treatment; re-test within 12h |
| Nitrate | <10 mg/L | ≥10 mg/L | issue do-not-drink advisory; investigate source |

## Sampling frequency

- Treatment plant taps: daily.
- Distribution sampling points: weekly.
- Public hydrants: quarterly per Charter Article III §4.
- After-event samples: required after any main break, hydrant flushing event, or contamination report.

## Inspection record format

Each inspection produces a record at `operations/water-quality-reports/<inspection-slug>.md` with:

```yaml
---
type: water-quality-report
slug: <inspection-slug>
target: <sampling-point-slug>
inspector: <agent-slug>
inspected-at: <iso-timestamp>
parameters:
  total-coliform: <value-or-pass-fail>
  free-chlorine-residual: <value>
  turbidity: <value>
  ph: <value>
  nitrate: <value>
status: pass | fail | inconclusive
---
```

## Anomaly handling

If two inspectors file conflicting status cells on the same target within 24 hours, the substrate produces `(target, water-quality-status, ok) = ⊤` (TOP).
The director has 24 hours to resolve via re-inspection; until resolved, the target is treated as `fail` for charter-binding purposes (precautionary principle).
