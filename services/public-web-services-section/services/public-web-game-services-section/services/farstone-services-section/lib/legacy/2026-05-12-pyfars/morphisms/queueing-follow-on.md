---
type: morphism
class: work-cycle-edge
status: draft
depends-on: [work-record, work-queue, witnessing-completion, jsonl-event-log, dispatch-closure-rule-system]
realizes: [witness-as-increment]
implementation: pyfars.engine.follow_on
---

# Queueing follow-on

The morphism that reads `on-complete:` edges from a settling [work-record](../concepts/work-record.md) and materializes the named follow-on workitems into the [work-queue](../objects/work-queue.md).
The dispatch closure-rule-system picks up the new workitems on the next tick.
Composes after [witnessing-completion](witnessing-completion.md) — same trigger event, but distinct action: witnessing closes the completed record, queueing-follow-on opens its successors.

This is the morphism that makes multi-step workflows system-resident.
Without it, a Phase-N → Phase-(N+1) hand-off requires a human (or an out-of-substrate orchestrator) to file the next workitem; with it, the workflow's edges live in the markdown of the originating work-record and the runtime walks them automatically.

## Action

For a work-record $W$ being settled with outcome $\omega$ (`settled`, `failed`, or `abandoned`) and `on-complete:` frontmatter cells:

$$\mathrm{queueing\text{-}follow\text{-}on}(W, \omega) \;\longrightarrow\; \{W'_1, W'_2, \ldots, W'_k\}$$

where each $W'_i$ is a fresh work-record materialized from the $i$-th matching `on-complete:` entry.
Matching is on $\omega$: a matrix-form `on-complete:` declares per-outcome successors:

```yaml
on-complete:
  settled: [phase-n-plus-1, archive-output]
  failed: [escalate-to-review-queue]
  abandoned: []
```

A scalar `on-complete:` (just a list of slugs) defaults to firing on `settled` only.

For each materialized $W'_i$, the morphism emits one `queue-workitem` event into the [JSONL event log](../objects/jsonl-event-log.md) carrying:

- The new workitem's slug (typically `<W>-followup-<phase-slug>` or as named by the template).
- The cells comprising the new workitem's frontmatter (kind, predicates, dispatchable, parent — pointing at $W$).
- A `derives-from:` cell `(W'_i, derives-from, W) = t` for provenance.

## Source and target

- **Source:** the completed work-record $W$ (its `on-complete:` cells provide the edge-set).
- **Target:** the work-queue (the cells the dispatch closure-rule-system reads to find next-tick eligible workitems).

The morphism is *closed under settling* — it only fires for records reaching a terminal outcome.
In-progress or scheduled records do not produce follow-ons.

## Naturality

Composition with [witnessing-completion](witnessing-completion.md): both morphisms read the same `(W, status, settled|failed|abandoned)` cell-transition.
They commute on order — witnessing first then queueing, or queueing first then witnessing, produce the same final system state.
PyFARS's tick fires witnessing first by convention, so the follow-on's `derives-from:` provenance points at a record whose settlement-witness already exists in the log.

If $W$ has no `on-complete:` cell, the morphism is the identity (no new workitems queued, no event emitted).

## Templating

The `on-complete:` entries may name a *template-slug* rather than an instance-slug, in which case queueing-follow-on instantiates the template with parameters from $W$.
Template instantiation is a separate morphism (`instantiating-template`, not yet authored) that this morphism calls.

## Discussion

`on-complete:` edges are how PyFARS encodes the directed-acyclic structure of a multi-phase plan inside the substrate without introducing a separate "workflow engine."
A plan's DAG is the union of its work-records' `on-complete:` edges; the engine's tick walks the DAG by repeatedly settling current records and queueing their successors.
The plan-record itself (per [`plan`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md)) is a *projection* over the union — useful for human planning views, but not load-bearing for runtime execution.
