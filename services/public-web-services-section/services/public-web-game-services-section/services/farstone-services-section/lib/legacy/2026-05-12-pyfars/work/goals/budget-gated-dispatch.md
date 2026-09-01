---
title: "Budget-gated dispatch"
type: goal
milestone: m3-continuous-loop
status: open
horizon: soon
theory-basis: [dispatch-readiness, normative-operational-layering]
tasks:
  - author-eligibility-by-budget-rule-record
  - implement-eligibility-by-budget-instantiator
---


After this goal, a substrate-authored budget record caps total agent-invocation spend per time window.
When the budget is exhausted, the existing `eligibility-by-budget` closure rule disqualifies all dispatchables until the window resets, and the dispatch graph emits a witness explaining the skip rather than silently failing or wedging.

## Why

Without budget gating, an unattended engine could exhaust a captain's API credits in a single misbehaving session.
M3 makes the engine trustworthy enough to leave running; a budget gate is what makes "leave it running" survivable.

The budget belongs in the substrate (a `governance/budgets/<slug>.md` record carrying `budget-window`, `budget-total`, `budget-spent`, `budget-remaining`) so polities can declare their own spend limits without code change.
The gate fires through the same closure-rule pathway as rate-limit and charter-binding — those are existing disqualification rules; budget is a new sibling.

## Theory grounding

**1.
Disqualification rules emit F, not "absence of T"** (per the bilattice four-state reading in [`predicated-work/concepts/dispatch-readiness`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)).
The bilattice distinguishes `not-yet-known-eligible` ($\bot$) from `known-ineligible` ($\mathbf{f}$).
A budget gate that simply withholds eligibility-T leaves the cell at $\bot$ — the substrate doesn't know whether the dispatchable is budget-blocked or just hasn't been evaluated.
A budget gate that emits $\mathbf{f}$ on the eligibility cell makes the negative state visible: the substrate carries a positive record of "this dispatchable is budget-ineligible."
Audit, federation, and downstream selection all depend on this distinction.

**2.
Knowledge-meet of T (positive) and F (disqualification) produces $\top$, not "F wins"** ([`predication-categories/concepts/knowledge-order`](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/knowledge-order.md)).
When the eligibility-by-capabilities rule emits `(W, eligible-by-X, D) = T` and the eligibility-by-budget rule emits `(W, eligible-by-budget, D) = F` on the same workitem-dispatchable pair, the cells live on **separate axes** (`eligible-by-X` vs `eligible-by-budget`).
They don't collide on the same predicate; selection composes them per-axis via `_is_disqualified_on_any_axis`. **This is exactly why the project uses one predicate per axis — the knowledge-meet/join algebra would otherwise produce $\top$ on every gated dispatchable, drowning real contradictions in noise.**

**3.
Budgets belong in the substrate, not in `.pyfars/config.toml`** (per [`claims/governance-frontmatter-is-substrate`](../../claims/governance-frontmatter-is-substrate.md) and the C3 hard-core commitment).
A budget is an operative element; per agential-self-generation (charter C3), every operative element is a substrate entity.
Hardcoded budget limits in instance config are structural debt; budget records under `governance/budgets/<slug>.md` (or wherever the substrate locates them) are the correct expression.
This also makes budgets editable mid-tick — adjusting the budget edits a substrate cell; the next tick's eligibility-by-budget rule reads the updated cell.

### Design constraints from this grounding

- **The flag is on the budget record, not on the dispatchable.** `(B, budget-exhausted, true) = T` lives on the budget; the relation `(D, draws-on-budget, B) = T` connects the dispatchable.
  This factoring lets one budget gate many dispatchables and lets one dispatchable participate in multiple budgets (per-provider, per-deployment, per-tenant) without the eligibility rule hardcoding the relationship.
- **Use a derived `budget-exhausted` cell, not direct `budget-remaining ≤ 0` matching in the closure rule.** The closure-rule language is quantifier-free; arithmetic comparisons aren't part of `pypredcalc.
  StoreRule`.
  Compute `budget-exhausted` via a sibling rule (or in the projector that emits budget cells) so the `eligibility-by-budget` rule reads a clean predicate.
- **Don't treat budget-exhaustion as terminal.** When the budget window resets (a periodic projection step or a sibling closure rule), `budget-exhausted` flips back to `f`/$\bot$; the disqualification axis stops firing on the next tick.
  The engine resumes dispatch automatically.

## Acceptance

- [ ] `objects/eligibility-by-budget.md` exists and authorizes the rule.
- [ ] `runtime.eligibility_rules.instantiate_eligibility_by_budget` walks substrate budget records, identifies exhausted budgets, and emits `(W, eligible-by-budget, D) = F` cells for every workitem-dispatchable pair where the dispatchable draws on an exhausted budget.
- [ ] The runtime's `_DISQUALIFICATION_PREDICATES` tuple in `runtime/dispatch_graph.py` includes `eligible-by-budget`.
- [ ] When the budget is exhausted, `select_winners_node` produces no winners drawing on that budget; the lifecycle's tick witnesses the skip with reason.
- [ ] Tests cover: budget intact (no disqualification), budget exhausted (all draws disqualified), budget intact for endpoint A and exhausted for endpoint B (only B disqualified).
