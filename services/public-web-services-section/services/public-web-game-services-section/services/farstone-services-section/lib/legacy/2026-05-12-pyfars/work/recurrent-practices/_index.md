---
title: "Recurrent practices"
type: index
status: active
realizes: [recurrent-practice, cadence, cycle]
---


Closure-rule subsystems whose rules fire at a regular ordinal pattern, producing one *cycle* per firing.
A recurrent practice is the substrate-algebraic content of "we do this on a cadence" — the engine's tick, the consolidation step, an audit run, a federation cycle.

A practice is *recurrent*, not just repeated: per Prigogine's novelty principle, recurrence ≠ repetition.
The aggregation structure (cycle-independent, Markov, finite-history, limit-aggregating) carries novelty across cycles via prior-cycle dependence in the closure rule's antecedent.

## When to author one

Author a recurrent-practice record when the substrate carries a cadence-firing pattern that any of these are true of:

- The engine fires it autonomously (the tick, the consolidation step, a budget-window reset).
- An officer or office is responsible for firing it on cadence (a weekly review, a quarterly audit).
- The cadence is itself a substrate fact other rules read (a workitem's `do-on-cadence:` field).

The practice's record carries the cadence, the aggregation structure, the rule subsystem that *constitutes* the practice, and the cycle-boundary semantics.
Per-cycle execution events are not authored here — they're emitted by the runtime as observation/finding/adjustment records bound to the practice via `cycle-of:`.

## Frontmatter

```yaml
---
title: "<the practice>"
type: recurrent-practice
slug: <kebab-case>
status: planning | active | suspended | retired
cadence: per-tick | per-session | daily | weekly | monthly | quarterly | <custom-spec>
aggregation: cycle-independent | markov | finite-history | limit-aggregating
history-depth: <integer>     # required if aggregation: finite-history
constitutes: [<closure-rule-slugs-or-skill-slugs>]    # the rules that comprise this practice
fires-at: <stage-or-event-spec>                       # what triggers a new cycle
formality-layer: F1 | F2 | F3                         # AOP formality progression
phases: [<phase-slug>, ...]                            # if PDCA-shaped or otherwise phased
---
```

## Body sections

```markdown
## What this practice is
One paragraph: the cadence-firing pattern this record names. What fires, when,
in response to what.

## Cycle structure
What constitutes one cycle. If phased (e.g., PDCA), name the phases and their
boundaries.

## Aggregation
Whether each cycle stands alone (cycle-independent), reads only the prior
cycle (Markov), reads the prior n cycles (finite-history), or reads all prior
cycles (limit-aggregating). State the algebraic content of the aggregation
choice — what novelty propagates across cycles.

## Constituent rules
The closure rules or skills that comprise the practice's S_R. Cite the rule
records.

## Fire condition
The substrate condition that opens a new cycle. May be a stage-boundary, an
external event, an upstream-cycle completion.

## Theory grounding
Cite predwork's `recurrent-practice` object; name the regime (strict if
constituent rules are strict and finitary; lifted otherwise).
```

## Cadence-vs-synchronization

A *cadence* is a single practice's firing pattern. *Synchronization* is the existence of a shared cycle-boundary across multiple practices — a stage at which all of them fire together.
Synchronized practices coordinate at the shared boundary; declare synchronization explicitly via `synchronizes-with: [<practice-slug>]` in the frontmatter.

## Multi-scale nesting

Cadences nest: turn ⊂ session ⊂ daily ⊂ weekly ⊂ monthly ⊂ quarterly.
A practice at scale s nested inside a practice at scale s' has $T_R \subset T_{R'}$ (the inner cycle-boundaries are a subset of the outer).
Express via `nested-in: <outer-practice-slug>`.

## Theory grounding

- [Predwork recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) — formal definition (closure-rule subsystem with cycle-boundary ordinals and aggregation structure).
- [Cadence-as-modal-frame](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/cadence-as-modal-frame.md) — cadence is a modal operator, not just a schedule.
- [Regime-of-recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/regime-of-recurrent-practice.md) — recurrent practice has a different cohomological signature than one-shot tasks.

## Related

- [Observations](../observations/_index.md) — recurrent practices emit observations on cadence
- [Workflows](../workflows/_index.md) — workflows nest inside practices' per-cycle content
- [M3 — Continuous Autonomous Loop](../milestones/m3-continuous-loop.md) — the milestone that transitions PyFARS into recurrent practice

## Current practices

- [`tick`](tick.md) — engine's per-second tick; F1 formality.
- [`consolidation-cycle`](consolidation-cycle.md) — promotes observations to instinct cells; nested inside tick at every Nth boundary; F2.
- [`roadmap-enrichment-cycle`](roadmap-enrichment-cycle.md) — runs the question → research → claim → objects/morphisms → integration cycle on the development roadmap; trigger-fired (captain prompt, ripe-question, or cadence); F2; held by [`pyfars-roadmap-enrichment-officer`](../../governance/offices/pyfars-roadmap-enrichment-officer.md).
