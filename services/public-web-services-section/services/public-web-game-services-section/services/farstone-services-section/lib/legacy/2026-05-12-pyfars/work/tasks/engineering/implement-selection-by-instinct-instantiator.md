---
title: "Implement the selection-by-instinct rule instantiator"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: selection-reads-instinct-cells
depends-on: [author-selection-by-instinct-rule-record, extend-selection-rule-system-to-read-instinct-cells]
requires-capabilities: [python-editing, closure-rule-instantiation]
theory-basis: [dispatch-monotonicity]
---


## Description

Implement `runtime.eligibility_rules.instantiate_selection_by_instinct` (or extend the existing selection-rule-system instantiator family) to read the rule record's frontmatter and produce the per-`(W, D)` cells.

The instantiator:

1. For each pending workitem `W`, identify its `workitem-class`.
2. For each eligible dispatchable `D`, query the most recent instinct record for `(D, workitem-class)`.
3. Read the instinct's `value` and `confidence`.
4. If `confidence < confidence-threshold`: emit `(W, selection-by-instinct, D) = ⊥`.
5. Else if `value > positive-value-threshold`: emit `(W, selection-by-instinct, D) = T`.
6. Else if `value < negative-value-threshold`: emit `(W, selection-by-instinct, D) = F`.
7. Else: emit `(W, selection-by-instinct, D) = ⊥` (between thresholds; abstain).

The instantiator integrates with the existing dispatch graph's `select_winners_node` per [`extend-selection-rule-system-to-read-instinct-cells`](extend-selection-rule-system-to-read-instinct-cells.md).

## Acceptance

- [ ] `instantiate_selection_by_instinct` exists in `runtime/eligibility_rules.py` (or the rule-instantiator module).
- [ ] The instantiator reads the rule record's thresholds at runtime (not hardcoded).
- [ ] Selection composition includes the new axis correctly: F-emission disqualifies; T-emission ranks above $\bot$-emitting alternatives; lex-tiebreak survives at the floor.
- [ ] No instinct cells available → instantiator emits $\bot$ on every `(W, D)` and selection falls through to other axes; existing M3 selection behavior unchanged when M4 hasn't run yet.
- [ ] Tests cover: positive instinct wins, negative instinct disqualifies, equal positive instincts of differing confidence rank by confidence, no instincts → existing M3 behavior.

## Progress cells

*(empty — task not yet started)*
