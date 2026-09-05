---
type: definition
class: system-cell
status: draft
realizes: [instinct-record, consolidation-as-settlement]
depends-on: [predication-cell, observation-cell, jsonl-event-log, channels/learning]
implementation: pyfars.engine.instinct
---

# Instinct cell

The substrate-cell PyFARS produces when [consolidating](../morphisms/consolidating.md) settles a pattern across [observation-cells](observation-cell.md): a recognized trigger → outcome regularity, with confidence-as-closure-measure.
PyFARS realizes upstream [instinct-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/instinct-record.md) as a cell-set on the [`learning`](channels/learning.md) channel for the same reason observation-cells are cells (per [observation-cell](observation-cell.md)#discussion).

An instinct cell is *not* a skill — skills are deterministic, callable, F3-formality entities.
Instincts are F2: structured patterns that the dispatch graph reads when scoring `(workitem, dispatchable)` pairs but does not yet treat as authoritative.

## Cell shape

For an instinct synthesized from observations $O_1, \ldots, O_k$ over subject $X$:

```
(<inst-slug>, type, "instinct") = t
(<inst-slug>, trigger, <trigger-pattern-slug>) = t
(<inst-slug>, outcome, <outcome-pattern-slug>) = t
(<inst-slug>, why, <diagnosis-text-hash>) = t
(<inst-slug>, confidence, <bilattice-or-scalar>) = t
(<inst-slug>, observed-from, <O_i-slug>) = t      # one cell per source observation
(<inst-slug>, contradicting, <O_j-slug>) = t      # one cell per contradicting observation
(<inst-slug>, settled-at, <iso-timestamp>) = t
(<inst-slug>, channel, "learning") = t
```

Trigger and outcome patterns may themselves be substrate entities (named pattern records) or inline cell-sets; the choice depends on whether the pattern is reused across instincts.

## Confidence-as-closure-measure

The `confidence` cell's value is the bilattice-projection of "applying further consolidation passes does not change this instinct's outcome."
Operationally, the consolidating morphism re-runs after each new observation arrival; when N consecutive runs produce the same instinct cells unchanged, confidence advances toward $t$.
New contradicting observations can demote confidence:

- All-concordant observations: confidence advances toward $t$.
- New observation matches trigger but not outcome: contradicting cell added; if `|contradicting| / |observed-from| > threshold`, confidence becomes $\top$ (contested).
- No observations match the trigger anymore (e.g., the underlying pattern stopped occurring): confidence stays $t$ but the instinct becomes *dormant* — still in the substrate, no longer firing.

The threshold is itself a substrate-cell on the consolidating morphism's configuration; editing it changes consolidation behavior next tick per [substrate-purity](../claims/substrate-purity.md).

## Read by selection

The dispatch's selection step reads instinct cells when scoring `(workitem, dispatchable)` pairs:

$$\mathrm{score}(W, D) = \mathrm{base}(W, D) \;+\; \sum_{I : \mathrm{matches}(I.\mathrm{trigger}, W) \;\wedge\; I.\mathrm{outcome\text{-}target} = D} \; \mathrm{confidence}(I)$$

— the dispatchable that previous instincts predict will produce a higher-quality outcome scores higher this tick.
M4's `selection-reads-instinct-cells` goal is the wiring that makes this read happen during `select_winners_node`.

## Discussion

The progression *observation → instinct → skill → tool* per [formality-progression](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/formality-progression.md) is the system's learning ladder.
Instinct cells are the second rung: settled enough to influence dispatch, not yet settled enough to become a callable skill.
Promotion to skill happens when an instinct's confidence holds at $t$ over many cycles AND a captain (or an automated promotion rule) authors the skill record citing the instinct.

The cell-set realization keeps instincts in the substrate without requiring per-instinct file authoring at consolidation time — which would produce file churn at every consolidation cycle.
When an instinct stabilizes and gets promoted to a skill, *that's* when a markdown file gets authored.
