---
title: "Extend the selection rule system to compose selection-by-instinct"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: selection-reads-instinct-cells
depends-on: [author-selection-by-instinct-rule-record]
requires-capabilities: [python-editing, dispatch-graph]
theory-basis: [dispatch-monotonicity, normative-operational-layering]
---


## Description

Modify `runtime/dispatch_graph.py`'s `select_winners_node` to include the `selection-by-instinct` axis in its composition.
Today's `select_winners_node` (post-[`selection-rule-as-substrate`](../../goals/selection-rule-as-substrate.md)) composes `selection-by-load`, lex-tiebreak, and any other selection axes the rule system declares.
Adding `selection-by-instinct` is a **rule-system extension**, not a selection-logic rewrite.

The composition order, per [predwork dispatch-monotonicity](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md):

1. **Disqualification axes fire first.** F on any disqualification axis (rate-limit, charter-binding, budget, eligibility-by-rate-limit, **negative-instinct**) → not eligible.
  F-emitting axes are $\leq_k$-monotone in adding to disqualification.
2. **Positive selection axes compose.** Among non-disqualified dispatchables, score each one by counting T cells across selection axes — `selection-by-load`, **`selection-by-instinct`**, future axes.
3. **Lex-tiebreak at the floor.** Equal-T-score dispatchables resolve by lex-order on slug.

Adding `selection-by-instinct` does not break dispatch-monotonicity because additional positive axes can only refine ranking within the eligible set; they can't admit new dispatchables to the eligible set.

## Acceptance

- [ ] `select_winners_node` composes `selection-by-instinct` alongside existing selection axes.
- [ ] Composition is **rule-system-driven** — the node reads the active selection rules from the substrate, not from a hardcoded list.
  Adding a future selection axis means authoring a new rule record + instantiator, not modifying `select_winners_node`.
- [ ] When `selection-by-instinct` instantiator emits no cells (no instincts available), the node's behavior is identical to its M3 behavior; tests verify regression-free.
- [ ] When `selection-by-instinct` emits T on one dispatchable and ⊥ on another, the T-emitting wins.
- [ ] When two dispatchables have T on `selection-by-instinct` but different confidence, the rule's instantiator produces a single T per dispatchable; ranking by confidence happens via a separate axis (e.g., `selection-by-confidence-tiebreak`) authored as needed.

## Progress cells

*(empty — task not yet started)*
