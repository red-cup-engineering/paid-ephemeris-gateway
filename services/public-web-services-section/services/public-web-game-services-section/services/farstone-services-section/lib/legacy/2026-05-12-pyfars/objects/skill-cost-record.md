---
type: definition
class: system-entity
status: draft
realizes: [skill, resource]
depends-on: [skill-record, plan-record, predication-cell]
implementation: pyfars.skill.cost
---

# Skill-cost record

The substrate-cell projection of a skill's *cost coordinates* — the multi-dimensional cost (tokens, wall-clock, substrate-ops, energy) the skill incurs per invocation, expressed as an element of the polity's [Lawvere quantale](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) over its chosen cost-coordinate axes.
Realizes the upstream cost-quantale discipline at the per-skill granularity.

A skill-cost record is what makes [plan composition cost bounds](plan-record.md) computable.
Without per-skill costs, plan-level cost is opaque; with them, the plan's `composition-cost-bound` is the Lawvere-quantale aggregate of constituents.

## Markdown shape

A skill-cost record lives at `governance/skills/<slug>/cost.md` (sibling to the skill's main record) and projects:

```markdown
---
type: skill-cost-record
slug: validate-frontmatter
skill-of: validate-frontmatter
cost-coordinates:
  tokens: { min: 0, p50: 200, p99: 1500, max: 4000 }
  wall-clock-ms: { min: 50, p50: 200, p99: 800, max: 5000 }
  substrate-ops: { min: 1, p50: 5, p99: 20, max: 100 }
  energy-mj: { min: 0.001, p50: 0.05, p99: 0.3, max: 1.5 }
quantale-aggregator: max-per-axis
empirical-since: 2026-04-01
sample-count: 1247
---
```

The `cost-coordinates` carry per-axis distribution stats (min/p50/p99/max) derived from observed invocations.
`quantale-aggregator` names how multiple axes combine — `max-per-axis` (default; pessimistic per-coordinate) or `weighted-sum` (when the polity has a system-resident weight vector).

## Cells

A skill-cost record's frontmatter projects:

- `(skill, type, "skill-cost-record") = t`
- `(skill, cost-axis, <axis-name>) = t` — one cell per axis.
- `(skill, cost-axis-stat, <axis>, <stat>, <value>) = t` — one cell per (axis, stat) pair.
- `(skill, quantale-aggregator, <name>) = t`
- `(skill, empirical-since, <ts>) = t`
- `(skill, sample-count, <n>) = t`

## Lawvere-quantale composition

For a plan composed of skills $s_1, \ldots, s_k$ along the dependency poset $\preceq$, the plan's composition cost on each axis is computed via the quantale's monoid operation:

$$\mathrm{cost}_{\mathrm{axis}}(P) \;=\; \bigotimes_{i \in \mathrm{constituents}(P)} \mathrm{cost}_{\mathrm{axis}}(s_i)$$

For sequential composition, $\bigotimes$ is sum (wall-clock adds).
For parallel composition, $\bigotimes$ is max (wall-clock is the slowest branch).
The product Lawvere quantale composes per-axis disciplines simultaneously.

The aggregator field selects which axis-statistic feeds composition: - **`p50`** — expected cost; useful for routine planning. - **`p99`** — pessimistic cost; useful for budget-bounded planning. - **`max`** — worst case observed; useful for hard-real-time planning.

## Empirical refresh

A skill-cost record is *empirical*, not asserted.
The `empirical-since` and `sample-count` cells track the observation window.
As [`witnessing-completion`](../morphisms/witnessing-completion.md) emits cost cells per invocation (per [`witnessing-physical-cost`](../morphisms/), an M9 backing-gap), the skill-cost record's distribution stats are recomputed at audit-export boundaries.

A skill with `sample-count < 30` carries a `(skill, cost-confidence, low) = t` cell; downstream cost composition treats the cost as $\top$ (unknown) for low-confidence axes rather than using stale point estimates.

## What this object commits to

1. **Costs are per-axis distributions, not point estimates.** Single-number costs collapse the variance and underestimate planning risk; the per-axis distribution captures the true uncertainty for budget-aware dispatch.
2. **Composition is quantale-correct.** Cost aggregation respects the Lawvere quantale's monoid law; sequential cost adds, parallel cost maxes.
  Naive multiplication is wrong and produces over-budgeted plans.
3. **Empirical, not asserted.** The cost record is computed from observation, not authored.
  Authoring a cost record without observation produces a `cost-confidence: low` cell; the substrate refuses to use unconfirmed costs in budget-gated dispatch.

## Pipeline interaction

- [`plan-record`](plan-record.md) reads constituent skills' cost records to compute its `composition-cost-bound`.
- [`budget-record`](budget-record.md) compares accumulated invocation costs against budgeted bound; the skill-cost record provides the per-invocation cost contribution.
- [`compute-composition-cost-bound`](../morphisms/) (backing-gap on M2) is the closure rule that aggregates per-skill costs into per-plan bounds.
- [`record-invocation-cost`](../morphisms/) (backing-gap on M2) is the closure rule that emits per-invocation cost cells, feeding the empirical refresh.

## What this object does not specify

- The discipline for skills whose cost depends on system state at invocation time (e.g., a skill whose cost scales with system cell-count).
  Currently treated as constant per the empirical distribution; per-invocation cost-prediction is open work.
- Cross-skill cost dependencies (skill A's invocation reduces the cost of subsequent skill B by warming a cache).
  Currently independent; modeling cost-discount edges is open.
- Cost decay over time.
  As infrastructure changes (new model versions, faster hardware), historical costs become stale; whether to weight recent samples more heavily or reset on infrastructure changes is open.
- Federation-portable cost records.
  Two peers may observe different costs for the same skill (different hardware, different LLM endpoints); whether to merge per-peer cost distributions or carry them separately is open for [M6](../work/milestones/m6-federation.md).
