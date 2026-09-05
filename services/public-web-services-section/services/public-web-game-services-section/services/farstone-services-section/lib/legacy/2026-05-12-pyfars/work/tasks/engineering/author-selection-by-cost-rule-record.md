---
title: "Author the selection-by-cost rule record"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: dispatch-chooses-endpoint-by-cost-quantale
depends-on: [implement-cost-ledger-as-substrate-projection]
requires-capabilities: [substrate-authoring, closure-rule-design]
theory-basis: [cost-discipline, dispatch-readiness]
---


## Description

Author `objects/selection-by-cost.md` — a substrate-authorized closure rule that reads cost cells per `(W, D)` and emits the `selection-by-cost` axis cell.

Per [predwork dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md) bilattice four-state reading:

- Quantale-min candidate (across the eligible set) → `(W, selection-by-cost, D) = T`
- Strictly-higher-cost candidates → `(W, selection-by-cost, D) = F`
- `tokens_against_budget = 0` (rate-limit-exhausted) → `(W, selection-by-cost, D) = F` (disqualification axis)
- No cost cells available → `(W, selection-by-cost, D) = ⊥` (axis abstains; other axes determine)

The rule's frontmatter declares thresholds and weighting (lex-min default; weighted-min configurable via [adjustment](../../adjustments/_index.md)).

```yaml
---
title: "Selection by cost"
type: closure-rule
slug: selection-by-cost
status: active
predicate: selection-by-cost
choose-strategy: lex-min                  # over (tokens_against_budget, dollars, fuel)
disqualify-on-budget-exhaustion: true
reads-cells:
  - "(cost-witness, of-action, ?A) = T"
  - "(cost-witness, costs, ?C) = T"
authority-grounding: dispatch-derives-from-governance
---
```

## Acceptance

- [ ] `objects/selection-by-cost.md` exists with the canonical frontmatter.
- [ ] The rule's authority-grounding cites [`dispatch-derives-from-governance`](../../../claims/dispatch-derives-from-governance.md).
- [ ] The rule documents its bilattice-four-state semantics (T, F, $\bot$ are all possible outputs).
- [ ] Threshold/weighting adjustability is documented (not code-resident).

## Progress cells

*(empty — task not yet started)*
