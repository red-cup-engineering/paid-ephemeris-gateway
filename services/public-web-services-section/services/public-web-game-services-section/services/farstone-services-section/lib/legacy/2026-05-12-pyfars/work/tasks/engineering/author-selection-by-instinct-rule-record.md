---
title: "Author the selection-by-instinct rule record"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: selection-reads-instinct-cells
depends-on: [emit-instinct-cells-with-provenance-back-to-observations]
requires-capabilities: [substrate-authoring, closure-rule-design]
theory-basis: [dispatch-readiness, dispatch-monotonicity]
---


## Description

Author `objects/selection-by-instinct.md` — a substrate-authorized closure rule that reads instinct cells per `(W, D)` and emits the `selection-by-instinct` axis cell.
The rule fires only when the instinct's confidence cell exceeds the rule's threshold (declared in the rule record's frontmatter, tunable via [adjustment](../../adjustments/_index.md)).

Per the [predwork dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md) bilattice four-state reading:

- High-confidence positive instinct (e.g., success-rate > 0.9) → `(W, selection-by-instinct, D) = T`
- High-confidence negative instinct (e.g., success-rate < 0.3) → `(W, selection-by-instinct, D) = F` (disqualification)
- Low confidence or no instinct → `(W, selection-by-instinct, D) = ⊥` (axis abstains; other axes determine winner)

The rule record carries:

```yaml
---
title: "Selection by instinct"
type: closure-rule
slug: selection-by-instinct
status: active
predicate: selection-by-instinct
emits-on-positive-confidence: T
emits-on-negative-confidence: F
confidence-threshold: 0.7        # tunable via adjustment
positive-value-threshold: 0.9    # tunable
negative-value-threshold: 0.3    # tunable
reads-cells:
  - "(instinct, of-dispatchable, ?D) = T"
  - "(instinct, for-workitem-class, ?C) = T"
  - "(instinct, value, ?V) = T"
  - "(instinct, confidence, ?K) = T"
authority-grounding: dispatch-derives-from-governance
---
```

## Acceptance

- [ ] `objects/selection-by-instinct.md` exists and declares the rule per the frontmatter shape above.
- [ ] The rule's authority-grounding cites [`dispatch-derives-from-governance`](../../../claims/dispatch-derives-from-governance.md).
- [ ] The thresholds are documented as adjustable (not code-resident).
- [ ] The record explains the four-state bilattice reading: T, F, $\bot$ are all possible outputs depending on observed confidence and value.

## Progress cells

*(empty — task not yet started)*
