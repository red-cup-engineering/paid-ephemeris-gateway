---
title: "Observations"
type: index
status: active
realizes: [observation]
---


Derived readings of the work substrate's state at a point in time.
Observations live in their own fiber, separate from the entities they observe — the substrate-algebraic implementation of Goodhart's law (the metric is not part of the fiber being measured).

This is the **work-substrate** sense of observation (a tracking-stage cell-system).
It is distinct from PyFARS's runtime [observation-record](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/observation-record.md) which is the agent-noticing-during-session input to the consolidation→instinct pipeline.
Both senses live in the substrate; they exhibit the same separate-fiber discipline at different scales.

## When to author one

Observations are **emitted by tracking morphisms**, not authored by hand in the routine case.
Hand-authored observation records exist for two reasons:

1. **Anchors for runtime emission** — an authored observation record can declare the cadence and method of an observation that the runtime will subsequently emit.
  Example: `observation-of-tick-cadence.md` declares the tracking method and scale; the engine's tick-cadence projector emits per-tick observation cells against this anchor.
2. **Manual readings of substrate state** — an officer notices something during work that wants to be a substrate fact (the API rate-limit was breached at 10:37; the engine wedged for 4 minutes around a budget-window flip).
  Hand-authoring is acceptable here; the fiber-isolation discipline still applies.

## Frontmatter

```yaml
---
title: "<observed-thing> at <time-or-cadence>"
type: observation
slug: <kebab-case>
observes: <slug-of-observed-entity>            # the task, plan, office, endpoint being read
observed-at: <ISO-timestamp or cadence-window>
method: <tracking-method-slug>                 # the composition or query that produced the value
value: <scalar-or-sub-fiber-reference>
baseline: <expected-value-or-bot>              # may be ⊥ for measurements with no baseline
scale: nominal | ordinal | interval | ratio   # Stevens' scale; load-bearing for composition
status: settled | open
---
```

## Body sections

```markdown
## What was read
The actual content the read produced. Numbers, text, structured data.

## Method
How the read was produced — which tracking morphism, which composition, which
query. If the runtime emitted this observation, cite the projector/rule.

## Baseline
What was expected at this read, and where the expectation came from.

## Variance from baseline
If applicable, the structured gap; this is what a finding will work over.
```

## Why observations live in their own fiber

If tracking wrote back into the observed entity's fiber — e.g., asserting `(T, velocity, 3)` as a cell on the task — then the metric becomes part of the fiber being measured.
Every subsequent composition involving `T` would carry the metric; pressure to change the metric becomes pressure on the task itself. **The fiber-isolation discipline cuts this loop.** Observations reference `T` via `(O, observes, T)` but do *not* write any cell on `T`.

This is why authored observation records have `observes:` (a reference) but never write back to the observed entity's frontmatter.

## No permanent fixpoint

Observations don't converge.
The observation fiber is cyclically rebuilt: each cadence tick fires a tracking-query that emits new observations whose `observed-at` cells supersede the prior ones in the most-recent-first fold.
Older observations remain in the log for audit; newer ones drive the working-model projection.

## Stevens scales as composition guards

The `scale` cell on an observation is not metadata; it is a load-bearing predicate that composition rules consult.
Aggregation operations (mean, median, sum, mode) carry `requires-scale:` constraints.
Composing an aggregation with an observation whose scale doesn't satisfy the constraint produces a $\top$ on the result cell — averaging ordinals doesn't silently misbehave; it visibly settles to contradiction.

## Theory grounding

- [Predwork observation](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/observation.md) — the formal definition.
- [FARS observation-fiber-isolation](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/observation-fiber-isolation.md) — the substrate-side commitment.
- [FARS observation-record](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/observation-record.md) — the consolidation-pipeline counterpart (different scale, same discipline).

## Related

- [Findings](../findings/_index.md) — observations are findings' inputs
- [Recurrent practices](../recurrent-practices/_index.md) — many observations are emitted by recurrent tracking
