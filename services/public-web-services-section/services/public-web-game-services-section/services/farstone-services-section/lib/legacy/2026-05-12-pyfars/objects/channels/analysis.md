---
type: object
class: channel
status: draft
name: Analysis
kind: operation-typology
emit-policy: any
read-policy: any
retention: ephemeral
ordering: total
depends-on: [channel, witness]
---

# Analysis channel

Composed query producing aggregate output.
Like the [query](query.md) channel, well-disciplined analyses are typically witness-free; analyses that emit witnesses do so as observations, not analysis-tagged.

Closure-rule firings (per `RuleFiring.to_witness`) are analysis-channel events: they derive new cells from existing ones without mutating substrate files.
The closure runner emits one analysis witness per rule firing, recording the rule slug, antecedents, and consequent value transition.

The channel sees most of its traffic from dispatch-graph closure runs.
