---
name: "Authoring a recurrent-practice record"
description: "Creates a recurrent-practice record in work/recurrent-practices/ encoding a closure-rule subsystem that fires at a regular ordinal pattern, with cycle-boundary semantics and aggregation structure. Use when the substrate carries a cadence-firing pattern that the engine fires autonomously, an officer fires on cadence, or other rules read as a substrate fact."
---


## Requirements

- The candidate practice fires on a recurring cadence (per-tick, per-session, daily, weekly, monthly, quarterly, or a custom-spec cadence).
- The constituent closure rules or skills that comprise the practice are namable.
- The aggregation structure is determined: cycle-independent, Markov, finite-history, or limit-aggregating per the [predwork recurrent-practice](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) object.

## Steps

1. Read [`work/recurrent-practices/_index.md`](../../work/recurrent-practices/_index.md) for the frontmatter schema, the body sections template, and the cadence-vs-synchronization distinction.
2. **Identify the slug** descriptively (e.g., `consolidation-cycle`, `tick`, `weekly-roadmap-review`, `quarterly-substrate-audit`).
3. Author frontmatter with `type: recurrent-practice`, `status: planning | active`, `cadence:`, `aggregation:`, `history-depth:` (if `aggregation: finite-history`), `constitutes:` (closure-rule or skill slugs), `fires-at:`, `formality-layer:` (F1 / F2 / F3), `phases:` (if PDCA-shaped or otherwise phased), `synchronizes-with:` (if applicable), `nested-in:` (outer practice slug, if applicable), `theory-basis:`.
4. Author body sections per the index template: *What this practice is*, *Cycle structure*, *Aggregation* (state the algebraic content of the choice), *Constituent rules*, *Fire condition*, *Theory grounding*.
5. **Reference the constitutent closure rules.** If the rules are skills, link their records.
  If they're substrate-internal closure rules, name them by their rule-slug.
6. Add to [`work/recurrent-practices/_index.md`](../../work/recurrent-practices/_index.md)'s active list.

## Outcomes

A new file in [`work/recurrent-practices/`](../../work/recurrent-practices/) with `type: recurrent-practice` and complete cadence/aggregation/constituent cells.
The runtime can bind cadence-emitters to this practice; observations and findings can reference the practice via `cycle-of:`.

## Discipline notes

- **Cadence is a modal frame, not a schedule.** Per [`cadence-as-modal-frame`](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/cadence-as-modal-frame.md), cadence is a modal operator on settled cells, not just a calendar entry.
  Don't conflate cadence with deadlines or due-dates — those are properties of *workitems*, not practices.
- **Aggregation choice is load-bearing.** A practice with `aggregation: cycle-independent` produces no novelty across cycles; one with `aggregation: limit-aggregating` accumulates all prior cycles.
  Choose deliberately; the choice changes the practice's cohomological signature per [`regime-of-recurrent-practice`](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/regime-of-recurrent-practice.md).
- **Per-cycle execution events are not authored here.** They're emitted by the runtime as observation/finding/adjustment records bound to the practice via `cycle-of:`.
  Authoring the practice is a one-time act; cycles fire automatically.
- **The roadmap-enrichment is itself a recurrent practice.** Per [roadmap-enrichment](../../concepts/roadmap-enrichment.md)'s "Position relative to the operations loop" section, cascade application at session-boundary cadence is a recurrent practice; the records officer is its cycling agent.
  Author the cascade as a recurrent-practice record once the engine implements session-boundary firing.
