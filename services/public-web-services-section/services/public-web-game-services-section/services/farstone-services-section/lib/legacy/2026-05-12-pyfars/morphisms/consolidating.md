---
type: morphism
class: settlement-pass
status: draft
realizes: [consolidation-as-settlement, settling]
depends-on: [observation-cell, instinct-cell, jsonl-event-log, settling, channels/learning]
implementation: pyfars.engine.consolidate
---

# Consolidating

The morphism that runs a settlement-pass over accumulated [observation-cells](../objects/observation-cell.md) on the [`learning`](../objects/channels/learning.md) channel and emits [instinct-cells](../objects/instinct-cell.md) where patterns have settled.
The PyFARS realization of upstream [consolidation-as-settlement](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/consolidation-as-settlement.md): instinct synthesis is *settling*, not authoring — the same closure-rule machinery that produces dispatch decisions produces learned patterns.

Consolidating is a [recurrent-practice](../../work/recurrent-practices/_index.md): it nests inside the engine's tick at every Nth boundary (default: every 100 ticks, configurable per [substrate-purity](../claims/substrate-purity.md)).
One consolidation pass = one cycle of this nested practice.

## Action

For a system state $S$ at consolidation moment $\tau$:

$$\mathrm{consolidating}(S, \tau) \;\longrightarrow\; S \cup \{\text{fresh instinct-cells}\} \cup \{\text{updated confidence-cells on existing instincts}\}$$

The pass: 1. **Reads** all observation-cells with `(obs, settled-into-instinct, _) = ⊥` — observations not yet absorbed into any instinct.
2. **Applies learning-channel closure rules** that match observation-pattern groups to candidate instinct shapes.
A typical rule: "if N observations share trigger-shape T and outcome-shape O, with $|\mathrm{matching}| / |\mathrm{N}| > \theta$, emit instinct cell."
3. **Updates existing instincts**: for each fresh observation matching an existing instinct's trigger, decide whether the observation supports (`observed-from`) or contradicts (`contradicting`) the outcome; update confidence per the instinct's confidence-as-closure-measure semantics.
4. **Emits a `consolidation-pass` event** to the JSONL log carrying the instinct-cells produced and the observation-cells absorbed.

The pass is *idempotent on a fixed observation-set* — re-running it without new observations produces no new cells.
This is the closure-fixpoint property that makes confidence-as-closure-measure well-defined.

## Source and target

- **Source:** the cell-set of unconsolidated observation-cells.
- **Target:** the cell-set of instinct-cells (fresh + updated).

The morphism's *side-channel* is the JSONL log: every observation→instinct binding produces a witness, so instinct provenance is fully reconstructible from the log.

## Functoriality (under settling)

Consolidating commutes with [settling](settling.md) in the precise sense: running consolidation, then settling, produces the same final system state as running settling then consolidating.
The closure-rules-on-learning-channel and the closure-rules-on-other-channels operate on disjoint cell-spaces (observation/instinct vs. dispatch/state), so the joins commute.

This commutation is what lets the engine fire consolidation as a *separate phase* of the tick (after dispatch, before witnessing-completion) without disturbing the dispatch-result determinism.

## Cadence

The default cadence is every 100 engine ticks; the cadence is itself a system cell `(consolidating, fires-every-n-ticks, 100) = t`.
Editing it changes consolidation frequency next tick.
A captain may also invoke consolidation explicitly via `pyfars consolidate`, which fires one off-cadence pass.

## Discussion

Consolidating is the system-resident realization of *learning*.
It does not call a separate ML system; it does not write to an external vector database; it does not require an LLM at consolidation time.
It is closure-rule application on system cells.
The quality of the resulting instincts depends on the closure rules authored on the learning channel — those rules ARE what the polity considers learnable patterns.

The progression observation → instinct → skill → tool happens through this morphism (for the first arrow), an authoring decision (for the second), and an implementation decision (for the third).
Only the first arrow is fully automated; the others remain captain-shaped, by design, until [`agential-self-generation`](../../work/milestones/m5-agential-self-generation.md) lands the machinery for system-resident skill promotion.
