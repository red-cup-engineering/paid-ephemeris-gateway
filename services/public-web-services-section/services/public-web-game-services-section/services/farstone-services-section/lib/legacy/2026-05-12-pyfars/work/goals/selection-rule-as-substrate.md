---
title: "Selection rule as substrate"
type: goal
milestone: m2-substrate-dispatch
status: open
horizon: doing
theory-basis: [dispatch-readiness, normative-operational-layering, charter-as-closure-system]
tasks:
  - author-selection-by-load-rule-record
  - implement-selection-by-load-instantiator
---


Move winner selection out of the lexicographic slug-tiebreak in `runtime/dispatch_graph.select_winners_node` and into a substrate-authored closure rule.
After this goal, a polity can change its dispatch tiebreak (e.g., "prefer the office with the lowest current-load," "prefer the endpoint with the highest provider-rank") by authoring a substrate record + an instantiator, with no code change to the dispatch graph itself.

## Why

This is the load-bearing closure of the dispatch-derives-from-governance commitment.
The eligibility and disqualification axes are already substrate-authorized; selection is the one axis that still lives in code.
Moving it makes dispatch policy fully substrate-readable end-to-end and lets polities author selection policies that match their work-routing preferences.

## Theory grounding

The work rests on three load-bearing results upstream.
Devs picking up this goal don't need to read them in full; the relevant content is summarized here.

**1.
Dispatch-readiness is bilattice-valued, not Boolean** ([`predicated-work/concepts/dispatch-readiness`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)).
The dispatch morphism produces a value $\delta(A, T) \in \{\bot, \mathbf{t}, \mathbf{f}, \top\}$, not a yes/no. Eligibility is the $\mathbf{t}$/$\mathbf{f}$ floor; selection is what happens when more than one $(A, T)$ pair has $\delta = \mathbf{t}$. **Selection is therefore another closure-rule layer over the eligible set, not a separate algorithm.** The current `select_winners_node` lex-tiebreak is a placeholder for this rule.

**2.
Dispatch-monotonicity in the knowledge order** ([`predicated-work/theorems/dispatch-monotonicity`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md)) gives the semantics for *combining* selection rules.
Recording new evidence on either capability or authority sections cannot retract a dispatch decision in $\leq_k$.
Applied to selection: when multiple selection rules emit `(W, preferred-by-X, D) = T` cells on different axes, their knowledge-meet gives the joint preference.
Conflicting preferences (`T` from one rule, `F` from another on the same `(W, preferred-by, D)`) knowledge-join to $\top$, surfacing the conflict as a paraconsistent cell — exactly the discipline disqualification axes already use.

**3.
Strict-regime termination** ([`predicated-work/theorems/dispatch-readiness-regime-is-strict`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-readiness-regime-is-strict.md)).
For finite carriers (workitems, dispatchables), the closure ordinal is bounded.
Selection rules are quantifier-free over the same finite carrier; they inherit strict-regime termination. **No selection rule we author here can introduce non-termination as long as it stays in the subset-cover or per-pair shape that `_subset_cover_rules` and `_disqualification_rules` already implement.**

### Design constraints from this grounding

- **Use a separate predicate per selection axis** (`preferred-by-load`, `preferred-by-provider-rank`, etc.).
  Don't write a single `selected = T` cell — that loses the knowledge-meet composition property.
- **Selection rules emit T-cells; only disqualification rules emit F-cells.** A "lower-load is better" rule that emits `F` on the higher-load dispatchable would conflate selection with disqualification, breaking the knowledge-meet composition.
  Instead, emit `T` on the lower-load and let absence of T on the higher-load be the signal.
- **The unique-most-preferred winner is the dispatchable that has the most `preferred-by-X = T` cells across active axes.** Ties broken lexicographically as the last fallback (this is the only place the lex-tiebreak should remain — at the floor of the selection lattice, not as the whole selection step).

## Acceptance

- [ ] A polity authors `objects/selection-by-load.md` (or any other selection rule record) and a registered instantiator, and the next tick's dispatch graph honors that rule's preference ordering without any code change.
- [ ] Removing the selection-rule record falls back to a documented default (likely the existing lexicographic tiebreak; the default itself can be a built-in closure rule).
- [ ] Multiple selection rules compose via knowledge-meet: when several rules emit `(W, preferred-by-X, D) = T` cells, the winner is the dispatchable preferred on the most axes, with ties broken lexicographically.
- [ ] Tests cover: no selection rule (default tiebreak), one selection rule firing, two rules with consistent preferences, two rules with conflicting preferences (`⊤` surfaces).
