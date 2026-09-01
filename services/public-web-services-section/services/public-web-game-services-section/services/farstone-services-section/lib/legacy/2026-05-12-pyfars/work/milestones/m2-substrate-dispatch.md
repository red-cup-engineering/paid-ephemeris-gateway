---
title: "M2 — Substrate-Driven Dispatch"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: substantially-landed
horizon: soon
depends-on: [m1-operational-housekeeping]
goals:
  - dispatch-table-bootstrapped-from-substrate
  - task-readiness-policy-in-heartbeat
  - capability-closure-from-substrate
  - selection-rule-as-substrate
  - assignment-cells-written-back
theory-basis: [dispatch-readiness, assignment, normative-operational-layering, task-cell-system]
cites-objects:
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/closure-rule-record.md
  - pyfars/objects/eligibility-by-capabilities.md
  - pyfars/objects/eligibility-by-skills.md
  - pyfars/objects/eligibility-by-jurisdiction.md
  - pyfars/objects/eligibility-by-rate-limit.md
  - pyfars/objects/eligibility-by-charter-binding.md
  - pyfars/objects/eligibility-by-message.md
  - pyfars/objects/capacity-gate.md
  - pyfars/objects/ready-promotion.md
  - pyfars/objects/selection-by-load.md
  - pyfars/objects/assignment-cell.md
  - pyfars/objects/plan-record.md
  - pyfars/objects/skill-cost-record.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/dispatching-by-twist-product-fusion.md
  - pyfars/morphisms/settling.md
  - pyfars/morphisms/ticking.md
  - pyfars/morphisms/pulsing.md
  - pyfars/morphisms/inducing.md
cites-claims:
  - pyfars/claims/dispatch-derives-from-governance.md
  - pyfars/claims/twist-product-dispatch-respects-authorization.md
  - pyfars/claims/substrate-purity.md
acceptance: "Dispatch eligibility is computed from substrate-authorized closure rules over a typed PredicationStore; adding a new agent record, endpoint record, or rule record causes the next tick's dispatch_graph to pick it up without code change."
---


Selection and assignment are fully substrate-driven — no Python fallback in the dispatch path.
The dispatch scheduler (`programs/engine/dispatch.py`) reads `type: assignment` subjects from the closed store; closure rules in `kernel/closure.py` produce the eligibility and selection cells.
Two items remain.

## Goals

| Slug | One-liner | Status | Backed by |
|---|---|---|---|
| `selection-rule-as-substrate` | Default lex tiebreak authored as a `selection-by-default-lex` closure rule record, not code | **open** | [`selection-by-load`](../../objects/selection-by-load.md) named shape already in `kernel/closure.py` |
| `assignment-cells-written-back` | Closure rules produce `(slug, type, assignment) = T` cells so Assignment subjects emerge from the closed store | **open** | [`assignment-cell`](../../objects/assignment-cell.md), [`dispatching`](../../morphisms/dispatching.md) |

## Theoretical shape

- **Anti-pushdown is structural.** Per [forward-trajectory-via-galois-adjunction](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/forward-trajectory-via-galois-adjunction.md): two-stage dispatch (closure-then-select-in-Python) is structurally unsound; one-pass dispatch with selection-as-closure-rule is the only sound shape.
- **Quiescence IS Cl-algebra structure.** Per [quiescence-as-closure-algebra](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/quiescence-as-closure-algebra.md) + [closure-2-monad-lax-idempotence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md) Kelly-Lack (K2): the `nxt == current` fixpoint check in `kernel/closure.py:apply_active_rules` is structurally equivalent to a Cl-algebra check — no separate mechanism needed.

## Acceptance

- [ ] Authoring `objects/selection-by-default-lex.md` changes dispatch tiebreak without code modification.
- [ ] Assignment subjects (`type: assignment`) emerge from the closed store after closure, not from hand-authored markdown files.

## Done when

A polity authoring a custom selection rule at `objects/selection-by-load.md` changes the tiebreak without code modification, and assignment records are visible in the substrate after each tick. - [`four-regime-classification-as-rule-metadata`](../../questions/four-regime-classification-as-rule-metadata.md) — regime-classifying dispatch's eligibility rules so the runner can predict halting and prune unsound rules at load time.
