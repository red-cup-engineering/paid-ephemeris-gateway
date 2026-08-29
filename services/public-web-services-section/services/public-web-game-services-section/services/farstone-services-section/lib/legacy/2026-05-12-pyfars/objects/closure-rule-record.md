---
type: definition
class: system-entity
status: draft
realizes: [closure-rule-system, rule]
depends-on: [predication-cell, dispatch-closure-rule-system, jsonl-event-log, substrate]
implementation: pypredcalc.StoreRule
---

# Closure-rule record

The substrate-cell projection of a single closure rule.
Where [`dispatch-closure-rule-system`](dispatch-closure-rule-system.md) names the *system* that closure produces dispatch decisions, this entity names the *individual rule* whose serialized cells the closure-runner reads at iteration time.
A polity's active rule-set is the disjoint union of its closure-rule records.

The record carries the rule's antecedent/consequent shape and three pieces of metadata that govern *how* the closure-runner schedules and audits the rule: regime, purity classification, and capability profile.
These three fields are what make the rule system-resident at the algebra level — every scheduling decision the runner makes is derived from frontmatter, not from Python branching.

## Markdown shape

A closure-rule record lives at `objects/<slug>.md` (or under a polity-specific theory) and projects:

```markdown
---
type: closure-rule-record
slug: enforce-rate-limit
regime: strict                # strict | scott-continuous | transfinite-bounded | aperiodic
purity: pure                  # pure | system-state-only-context | impure
amplifies-capability: false   # true if the rule's consequent introduces a capability not in antecedent
antecedent:
  - (office, rate-limit-budget, ?b)
  - (?b, remaining, 0)
consequent:
  - (?w, eligible-office, office) = f
authorizes-aperiodic: []      # operators required if regime: aperiodic
implementation: pyfars.runtime.eligibility_rules._rate_limit_rule
---
```

## Cells

A closure-rule record's frontmatter projects to:

- `(slug, type, "closure-rule-record") = t`
- `(slug, regime, <regime>) = t` — read by per-regime scheduling rules.
- `(slug, purity, <classifier>) = t` — read by `enforce-purity-classification`.
- `(slug, amplifies-capability, <bool>) = t` — read by `enforce-capability-non-amplification`.
- `(slug, antecedent-cell, <cell-pattern>) = t` — one per antecedent.
- `(slug, consequent-cell, <cell-pattern>) = t` — one per consequent.
- `(slug, authorizes-aperiodic, <operator-slug>) = t` — one per authorizing operator (empty for non-aperiodic rules).

## The four regimes

The regime field carries the rule's classification under the [four-regime dichotomy](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) (predication-category theory).
Mechanical derivation is via [`classifying-regime`](../morphisms/classifying-regime.md):

- **`strict`** — closure converges in finitely many steps with bound expressible in the antecedent's data size.
  The default; eligible for tick-eager scheduling.
  Eligibility, disqualification, status-transition rules typically fall here.
- **`scott-continuous`** — closure is monotone and continuous over $\leq_k$; converges to a fixed point that may require unbounded but countable iteration in adversarial cases.
  Scheduled at tick-boundary rather than tick-eager.
- **`transfinite-bounded`** — closure terminates only after possibly transfinite ordinal iteration; the substrate carries an ordinal-bound.
  Scheduled at audit-export only; never inline in dispatch.
- **`aperiodic`** — closure may produce orbits of period $> 1$; convergence not guaranteed.
  Forbidden by default.
  Activation requires an explicit operator authorization recorded in `authorizes-aperiodic:`.

Per [`regime-determines-scheduling-discipline`](../claims/regime-determines-scheduling-discipline.md), the runner reads this cell at iteration time to decide *when* to fire the rule.

## Purity classification

The purity field carries one of three classifiers (with a fourth `system-state-only-context` variant introduced for LLM-bearing rules):

- **`pure`** — rule body is a deterministic function of its antecedent cells.
  Replay byte-identical without further conditions.
- **`system-state-only-context`** — rule body invokes an LLM whose context window is fully read from system cells (no external session state).
  Replay byte-identical at $T = 0$ on a deterministic LLM endpoint.
- **`impure`** — rule body reads or writes outside the substrate (network, hidden in-process state, time-of-day).
  Replay produces byte-identical *cells* only via boundary-only replay (the witness chain replays, the foreign computation does not re-execute).

Per [`enforce-purity-classification`](../morphisms/), an unclassified rule cannot fire; per [`enforce-capability-non-amplification`](../morphisms/), a rule whose consequent introduces a capability outside the antecedent's existing capability-graph is a substrate-purity violation.

## What this object commits to

1. **Regime is substrate-cell, not code-comment.** The closure-runner does not infer regime by inspecting Python; it reads the `regime:` cell.
  Regime drift between record and implementation is a $\top$-cell on `guard`.
2. **Purity is gating, not advisory.** A rule with `purity: impure` and no `boundary-only-replay-discipline` cell cannot be scheduled inside replay.
  The substrate refuses.
3. **Capability non-amplification is mechanical.** The consequent's capability-graph footprint is a cell; the antecedent's is a cell; the runner verifies $\text{consequent} \subseteq \text{antecedent}$ before firing.

## What this object does not specify

- The serialization grammar for cell-patterns with variables (`?w`, `?b`).
  Currently a thin syntactic layer over `pypredcalc.
  StoreRule`'s pattern format; a frontmatter-readable serialization is open work for [M3](../work/milestones/m3-continuous-loop.md).
- The discipline for *deactivating* a rule mid-tick.
  Currently rules are loaded at tick start; per-tick deactivation routes through removing the record file but the in-memory effect is deferred to the next tick.
- The relationship to *foreign* closure-rule fragments imported from upstream theories (predication-categories' Mayer–Vietoris cocycle as a closure rule, for instance).
  The four-regime classification is uniform across origins, but the import discipline is open.
