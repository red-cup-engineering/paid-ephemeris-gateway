---
title: "Selection reads instinct cells"
type: goal
milestone: m4-memory-feedback
status: open
horizon: later
theory-basis: [dispatch-readiness, dispatch-monotonicity, three-tier-memory]
tasks:
  - extend-selection-rule-system-to-read-instinct-cells
  - author-selection-by-instinct-rule-record
  - implement-selection-by-instinct-instantiator
---


After this goal, the [dispatch graph](../workflows/dispatch-graph.md)'s selection step consults [instinct cells](instinct-cells-via-consolidation.md) when scoring `(W, D)` pairs.
An endpoint that produced high-quality completions on similar workitems scores higher than one that produced low-quality completions — and the score is a substrate-derived cell, not a Python heuristic.

This is the goal that makes [M4](../milestones/m4-memory-feedback.md) actually close the feedback loop: observations from prior sessions become instincts via [consolidation](instinct-cells-via-consolidation.md), and instincts become selection inputs.
Without this goal, the instinct cells exist but no one reads them; the loop is open.

## Why

By the time this goal is reachable, [`selection-rule-as-substrate`](selection-rule-as-substrate.md) has landed (an [M2](../milestones/m2-substrate-dispatch.md) alignment goal).
Selection criteria are substrate-authored closure rules.
Adding `selection-by-instinct` is **another rule in the same system** — it doesn't require rewriting selection; it requires authoring one more rule and one more instantiator.

This is structurally important: M4's biggest implementation work is the consolidation cycle (the prior goal).
Selection consumption is small *because* the dispatch substrate is already correctly factored.

## Theory grounding

**1.
Dispatch-readiness's bilattice four-state** ([`predicated-work/concepts/dispatch-readiness`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)).
The selection axis already distinguishes T (positively known good), F (positively known bad), $\bot$ (unknown), $\top$ (contradiction). **Adding `selection-by-instinct` extends the axis with a new predicate, not a new state space.** Each `(W, D)` pair gets a `selection-by-instinct` cell; high-confidence-positive instincts produce T, high-confidence-negative produce F, low-confidence or absent produce $\bot$.
Existing eligibility composition rules combine this axis with `selection-by-load`, `eligibility-by-capabilities`, etc., per their existing per-axis semantics.

**2.
Dispatch-monotonicity** ([`predicated-work/theorems/dispatch-monotonicity`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md)).
Adding more eligibility axes (instinct included) is $\leq_k$-monotone: more knowledge can only refine selection, never reverse a confirmed disqualification.
This is what guarantees that introducing `selection-by-instinct` cannot break the existing dispatch correctness — adding the rule narrows the eligibility set or shifts ranking within the eligible set; it doesn't admit new ineligible dispatchables.

**3.
Three-tier memory at the consumption boundary** ([`flatfile-agentic-resource-system/concepts/three-tier-memory`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)).
The middle tier (instincts) is consumed at tick cadence; the bottom tier (per-session observations) is *not* consumed at tick cadence. **The selection rule reads instinct cells, not observation cells directly** — that's how the practical-bounded-cost discipline applies at the dispatch boundary.
Selection that walked observations would re-do consolidation work every tick, defeating the tier separation.

### Design constraints from this grounding

- **Selection-by-instinct is one more closure rule, not a special case.** The rule's instantiator walks dispatchables, reads each one's most recent instinct cell for the workitem's class (or for a generic class if no per-class instinct exists), emits T on `selection-by-instinct` for positive instincts, F for negative.
  Lex-tiebreak survives at the floor when no instincts are available.
- **Confidence-thresholded.** An instinct cell carries a `confidence` value (per the prior goal).
  Selection-by-instinct fires *only* when confidence exceeds a substrate-authored threshold.
  Below threshold, selection-by-instinct stays at $\bot$ and other axes determine the winner.
  The threshold lives in the rule record's frontmatter; tuning it is an [adjustment](../adjustments/_index.md), not a code change.
- **No mid-tick instinct write-backs.** Selection reads instincts; selection does not modify them.
  Modifications come only from the consolidation cycle.
  This preserves the cycle's ownership of the middle tier and keeps replay determinism intact.

## Acceptance

- [ ] An `objects/selection-by-instinct.md` record exists, authorizing the closure rule.
- [ ] `runtime.eligibility_rules.instantiate_selection_by_instinct` (or equivalently the selection-rule-system's instantiator family) reads instinct cells per `(W, D)` and emits the per-axis cell.
- [ ] The runtime's selection composition includes `selection-by-instinct` alongside `selection-by-load` and lex-tiebreak.
- [ ] When two dispatchables have equal eligibility-T-cells but different instinct cells, the one with the positive instinct wins (and the witness records the determining axis).
- [ ] Tests cover: no instincts (lex-tiebreak fires), one positive instinct (it wins), two positive instincts of different confidence (higher-confidence wins), one positive and one negative (positive wins, negative is disqualified).
- [ ] No selection logic written in Python beyond the instantiator; the rule is substrate-authored.
