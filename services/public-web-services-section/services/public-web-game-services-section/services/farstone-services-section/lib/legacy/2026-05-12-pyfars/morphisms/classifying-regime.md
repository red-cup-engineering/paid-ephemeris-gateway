---
type: definition
class: system-process
status: draft
realizes: [derivation]
depends-on: [closure-rule-record, dispatch-closure-rule-system]
implementation: pypredcalc.regime_classify
---

# Classifying regime

The mechanical morphism that takes a closure rule's antecedent/consequent shape and emits its [four-regime classification](../objects/closure-rule-record.md): one of `strict`, `scott-continuous`, `transfinite-bounded`, `aperiodic`.
The classifier reads a closure-rule record, returns a regime cell, and the runner records the result.
Regime is *derived*, not *declared*.

This morphism is the system-resident realization of `pypredcalc.regime_classify(rule)` from the [substrate-algebra question](../questions/substrate-algebra-closure-and-replay.md).
It is the mechanical bridge between the predication-category theory's four-regime dichotomy and the engine's per-rule scheduling decisions.

## Inputs and outputs

**Input.** A closure-rule record (or its in-memory `pypredcalc.
StoreRule` projection) carrying:

- antecedent cell-patterns (with variables);
- consequent cell-patterns (with variables);
- the polity's bilattice value-domain (typically the Belnap-Fitting FOUR).

**Output.** A regime cell `(rule-slug, regime, <regime>) = t` recorded against the rule, plus optionally an ordinal-bound cell for transfinite-bounded rules and an authorization-required cell for aperiodic rules.

## Classification procedure

The classifier proceeds in stages, each stage falsifying or confirming a regime-class:

### Stage 1 — strict-monotone test

If every consequent cell-pattern's value field is in $\{t, f\}$ and every antecedent variable appears in the consequent (no free production), the rule is **strict**: each iteration adds finitely many cells whose count is bounded by the antecedent-pattern's groundings count, which is bounded by the system's finite cell-count.
Returns `regime: strict` with the bound expression.

### Stage 2 — Scott-continuity test

If the rule fails strict (because consequent variables exceed antecedent's grounding) but the rule is monotone in $\leq_k$ — every output cell's bilattice value $\geq_k$ the joined antecedent values — the rule is **scott-continuous**: closure converges to a fixed point but iteration count is not bounded by antecedent size.
Returns `regime: scott-continuous`.

The check uses pypredcalc's bilattice-value algebra; the rule is monotone iff for every operator in its consequent, the operator is monotone in $\leq_k$.
The Belnap-Fitting FOUR's $\vee_k$ and $\wedge_k$ are monotone; $\neg$ is not (it inverts $\leq_t$); $\odot$ (twist) requires per-operand inspection.

### Stage 3 — transfinite-bounded test

If Scott fails because the rule produces ordinal-bounded but non-finite iteration (e.g., the antecedent quantifies over a transfinite-indexable domain), the rule is **transfinite-bounded**: closure terminates after some ordinal $\alpha < \omega_1$, but not after any countable iteration.
Returns `regime: transfinite-bounded` with the ordinal-bound cell.

This regime is rare in operational rules; it appears for charter-tier rules over transfinite cell-domains (per the [seventh-generation-projection question](../questions/seventh-generation-projection-and-pyfars-regime.md)).

### Stage 4 — aperiodic default

If the rule fails all three above, it is **aperiodic**: closure may produce orbits of period $> 1$ and is not guaranteed to terminate.
The classifier emits `regime: aperiodic` and additionally emits a `requires-authorization` cell — the runner refuses to fire the rule unless an explicit operator-authorization cell is also present.

The aperiodic-default discipline is conservative: a rule the classifier cannot prove is in a tamer regime is treated as the most-restrictive case.

## Cells emitted

For an input rule with slug $r$:

- `(r, regime, <regime>) = t`
- `(r, regime-bound, <expression>) = t` (strict, scott-continuous, transfinite-bounded only; expression is the iteration-count bound or ordinal)
- `(r, requires-authorization, <bool>) = t` (true for aperiodic)
- `(r, classified-by, classifying-regime) = t` (provenance witness)
- `(r, classified-at, <ts>) = t`

## When this morphism fires

The classifier runs:

1. At rule-record load time (engine boot or hot-reload of a rule).
2. When a rule's antecedent or consequent fields are edited (re-classification fires from a substrate-cell change).
3. On audit-export to verify the recorded `regime:` cell still matches the classifier's output (drift detection).

Per [`regime-determines-scheduling-discipline`](../claims/regime-determines-scheduling-discipline.md), the classification's *output* is read by the runner's scheduling decisions.
Stale classifications produce wrong-regime scheduling, which is itself a $\top$-cell on `guard`.

## What this morphism commits to

1. **Mechanical, not negotiable.** The classifier reads frontmatter and emits a regime cell; no rule may declare its own regime overriding the classifier.
  A rule asserting `regime: strict` whose classifier returns `scott-continuous` is a $\top$-cell.
2. **Conservative.** When in doubt, the classifier emits the more-restrictive regime.
  False-aperiodic is operationally inconvenient; false-strict is operationally dangerous.
3. **Substrate-cell output.** The classification result is a cell, not an in-memory annotation.
  Other substrate consumers (audit, federation, materialized views) read regime through cells.

## What this morphism does not specify

- The exact decision procedure for monotonicity over Belnap-Fitting FOUR's twist operator.
  Currently a syntactic check; for operators built from primitives, a full proof obligation is open work.
- Re-classification cadence under substrate hot-reload.
  Currently per-edit; per-tick batched would be cheaper for noisy edit cycles.
- Composition: classifying a rule-system (set of rules) given each rule's regime.
  The system's regime is the strictest of its rules' regimes; whether the classifier should also emit a system-level cell is open.
