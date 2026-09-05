---
title: "M4 — Memory and Session Feedback"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: later
depends-on: [m3-continuous-loop]
goals:
  - sessions-wrap-each-tick
  - observation-cells-from-invocations
  - instinct-cells-via-consolidation
  - selection-reads-instinct-cells
  - openclaw-session-close-syncs-to-substrate
theory-basis: [three-tier-memory, session-as-entity, consolidation-as-settlement]
cites-objects:
  - pyfars/objects/session-record.md
  - pyfars/objects/observation-cell.md
  - pyfars/objects/instinct-cell.md
  - pyfars/objects/instinct-aware-selection.md
  - pyfars/objects/channels/observation.md
  - pyfars/objects/channels/learning.md
  - pyfars/objects/jsonl-event-log.md
cites-morphisms:
  - pyfars/morphisms/opening-session.md
  - pyfars/morphisms/closing-session.md
  - pyfars/morphisms/consolidating.md
  - pyfars/morphisms/observing.md
  - pyfars/morphisms/settling.md
  - pyfars/morphisms/witnessing-completion.md
  - pyfars/morphisms/syncing-openclaw-session.md
cites-claims:
  - pyfars/claims/jsonl-is-canonical-state.md
  - pyfars/claims/substrate-purity.md
acceptance: "Running the same class of workitem twice shows measurably different (improved) selection based on the first run's observations; the substrate carries a chain of instinct cells linking past sessions to current dispatch decisions."
---


Agents remember across sessions; agent completions write back to the substrate as observation cells and instinct cells; the system improves over time rather than repeating the same mistakes.

After M3 the loop produces witnesses, but those witnesses don't yet feed back into what the system does next.
M4 closes that loop: the dispatch graph's selection step starts reading what previous ticks observed about each dispatchable's performance, and the agent compiler's prompt-building starts including the instinct cells relevant to the current workitem.

## Goals

| Slug | One-liner | Status | Backed by |
|---|---|---|---|
| `sessions-wrap-each-tick` | A `session-record` opens at the start of each tick and closes at the end | open | [`session-record`](../../objects/session-record.md), [`opening-session`](../../morphisms/opening-session.md), [`closing-session`](../../morphisms/closing-session.md) |
| `observation-cells-from-invocations` | Agent-invocation responses are projected into substrate observation cells | open | [`observation-cell`](../../objects/observation-cell.md), [`observing`](../../morphisms/observing.md), [`observation` channel](../../objects/channels/observation.md) |
| `instinct-cells-via-consolidation` | A periodic consolidation step reads recent observations and synthesizes instinct cells | open | [`consolidating`](../../morphisms/consolidating.md), [`instinct-cell`](../../objects/instinct-cell.md), [`learning` channel](../../objects/channels/learning.md) |
| `selection-reads-instinct-cells` | Dispatch's selection step reads instinct cells when scoring `(W, D)` pairs | open | [`instinct-aware-selection`](../../objects/instinct-aware-selection.md), [`instinct-cell`](../../objects/instinct-cell.md) |
| `openclaw-session-close-syncs-to-substrate` | Closing an OpenClaw session translates its memory file into substrate observation cells | open | [`syncing-openclaw-session`](../../morphisms/syncing-openclaw-session.md) |

## What lands together

- Every tick has session boundaries; the event log can be sliced by session.
- Agent responses stop being just witnessed — they're projected into substrate cells that subsequent ticks query.
- A consolidation closure rule wired into a periodic tick settles `observation → instinct` cells.
- Selection becomes instinct-aware: an endpoint that produced high-quality completions on similar workitems scores higher than one that produced low-quality ones.
- The OpenClaw → PyFARS direction of the memory loop closes; what's learned in a session survives the session.

## Done when

A workitem of class X dispatched twice — separated by enough ticks for consolidation to fire — shows measurably different selection on the second run based on the first run's observations.
The substrate carries a visible chain of `(observation → instinct → selection-input)` cells.

## Theoretical shape

M4 collectively realizes the substrate-shaped form of memory and learning:

**1.
Three-tier memory** ([`flatfile-agentic-resource-system/concepts/three-tier-memory`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)) — session memory (one tick or conversation), cross-session memory (one agent, many sessions), long-term memory (the corpus).
M4 wires the bottom two tiers; the long-term tier is already the corpus itself.

**2.
Consolidation-as-settlement** ([`flatfile-agentic-resource-system/concepts/consolidation-as-settlement`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/consolidation-as-settlement.md)) — instinct cells aren't authored, they're *settled* from observation cells via the same closure-rule machinery the dispatch graph uses.
A consolidation closure rule is the realization mechanism.

**3.
Session-as-entity** ([`flatfile-agentic-resource-system/concepts/session-as-entity`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/session-as-entity.md)) — sessions are first-class substrate entities with their own fibers, not ambient runtime context.
This makes session-bounded queries and per-session audit trails possible — both depend on the session having a substrate identity that persists past process restart.

## Predication-categories grounding (cycle-1/2 bindings)

Three theorems sharpen M4's design from prose-level into structural commitments:

**A.
Decay window is closure-ordinal-windowed, bounded.** Per [aperiodicity-characterization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodicity-characterization.md): aperiodic regime requires non-Scott-continuous closure AND state-space cofinality $\geq \omega_1$ — neither holds for current PyFARS scale (finite cell stores, quantifier-free rules).
Consolidation is structurally in the strict or Scott-continuous regime; closure converges in finitely-many or $\omega$-many steps.
The `decay` closure rule's window must be **closure-ordinal-windowed**, not wall-clock or count-windowed: wall-clock is observational, count-windowed is operational, ordinal-windowed is structural and matches the algebra's own clock $\kappa$.
For the standard polity scale, the bound is small (single-digit ticks of fixpoint iteration).

**B.
Handoffs admit dual presentations** — sheaf and cosheaf, equivalent under Verdier duality.
Per [verdier-duality-bitopological-site](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) + [aperiodic-co-classification](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-co-classification.md): the same MLD-class data has two computational primitives:

- **Sheaf cohomology ($H^1$ presentation):** *equality testing* via cocycle witnesses; refinement under sub-site inclusion.
  Natural for "did this handoff produce the expected MLD-class?" — fits LangGraph-style checkpoint replay.
- **Cosheaf homology ($H_1$ presentation):** *local-generator construction*; coarsening under sub-site projection.
  Natural for "build the handoff state from per-event firing data" — fits OpenHands-style event-log replay.

The substrate's existing witness format already supports both: `firings` (per-event = cosheaf-natural) plus `rsv_hash` (cocycle-witness = sheaf-natural).
M4's session-record schema should preserve both presentations — choosing one structurally rules out the other primitive.

Per [mutually-locally-derivable](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md): two handoffs differing only in *settling-shift* (same content, different ordinal index) are MLD-equivalent.
The substrate's `aggregate-handoffs-by-mld-class` closure rule (referenced by [`handoff-cobordism-and-cross-session-continuity`](../../questions/handoff-cobordism-and-cross-session-continuity.md)) can collapse MLD-equivalent handoffs *losslessly* — aggregation is structurally lossless when the handoffs are MLD-equivalent, lossy otherwise (and the loss is the $H^1$-class distinction the audit captures).

**C.
Failure-mode classification emits a Klein-four 4-vector.** Per [equivariant-cohomology-decomposition](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md): $H^1$ splits into four isotypic sectors per $\widehat{K_4}$ characters:

- $H^1_\mathrm{id}$: symmetric truth-plus-falsity content (rare; structurally distinct).
- $H^1_{\chi_\sim}$: epistemic-frame disagreements — MASFT FC2.1 (information misalignment), FC2.4 (role violation under different interpretive frames).
  Resolvable by frame clarification.
- $H^1_{\chi_-}$: $\top$-firings — MASFT FC1.1 (specification ambiguity producing inconsistent interpretations), FC2.2 (reasoning-action mismatch resolved as $\top$), FC3.x (verification failure detecting inconsistency).
  Require fact resolution.
- $H^1_{\chi_{\sim\circ-}}$: double-curvature — MASFT FC2.3 (cascade misinterpretation that ALSO produces inconsistency).
  Worst-case multi-mode failure; require both frame clarification AND fact resolution.

M4's `anomaly-surfacing-via-contradiction-cells` (M3 goal) and the MASFT-failure-mode-taxonomy substrate-anomaly classification ([`masft-failure-mode-taxonomy-as-substrate-anomaly-classes`](../../questions/masft-failure-mode-taxonomy-as-substrate-anomaly-classes.md)) emit the **4-vector** $(|H^1_\mathrm{id}|, |H^1_{\chi_\sim}|, |H^1_{\chi_-}|, |H^1_{\chi_{\sim\circ-}}|)$, not a scalar count.
The 14 MASFT modes distribute across the 4 sectors; the sector decomposition is finer than FC1/FC2/FC3 but coarser than the 14 modes. **Restorative-handler task-class is sector-derivable**: $\chi_\sim$ violations need interpretive-alignment handling, $\chi_-$ violations need fact-correction handling.

**D.
Per cycle-1 finding:** observation-cell schema inherits from the existing witness format (`kernel/witness.py`).
Each observation carries a `rsv_hash` anchor and step index.
The schema does not need invention.

## Imminent vagueness — resolved by theory research

The `instinct-cells-via-consolidation` goal names a `consolidating` morphism but leaves the *consolidation closure rule's antecedent and firing cadence* unspecified.
The observation-cell and instinct-cell schemas are well-defined at [`objects/observation-cell.md`](../../objects/observation-cell.md) and [`objects/instinct-cell.md`](../../objects/instinct-cell.md); what's vague is the rule that takes a stream of observation-cells and emits instinct-cells.

Per [temporal-accumulation](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/temporal-accumulation.md), consolidation is the substrate's realization of the *temporal accumulation* role:

> The state at a moment depends only on the *set* of evidence received so far, growing as more arrives and never shrinking.

Three sub-pressures decompose into substrate primitives already in pyfars:

- **Order-of-arrival irrelevance** = cellwise $\vee_k$ on observation-cells (the substrate's bilattice join).
- **Monotonicity along the index** = settling-monotonicity on the resulting instinct-cell's confidence (the bilattice $\leq_k$ ordering on the cell's value).
- **Cross-observer reachability** = CRDT convergence (per [crdt-convergence-via-mayer-vietoris](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence-via-mayer-vietoris.md), $\delta^0 = 0$ identically; consolidation merges across federation peers without coordination).

**The consolidation closure rule's body (in bare-$\Pi_1+<$, the proved fragment):**

```
For each (subject X, predicate P) appearing in observation-cells:
  Antecedent:
    ∀ obs : (obs, type, "observation") = T
       ∧ (obs, subject, X) = T
       ∧ (obs, predicate, P) = T
       ∧ (obs, ts, t_obs) = T
       ∧ t_obs > previous-consolidation-ts
  Consequent:
    (instinct-slug, type, "instinct") = T
    (instinct-slug, trigger, P) = T
    (instinct-slug, subject, X) = T
    (instinct-slug, confidence, ⋁_k {(obs, predicate-value, _) : matching obs}) = T
    (instinct-slug, observed-from, obs) = T  ∀ matching obs
```

The confidence is the **bilattice $\vee_k$-join over the matching observations' `predicate-value` cells**.
By the temporal-accumulation realization: this is associative, commutative, and idempotent — duplicate or reordered observations produce the same instinct.

**Firing cadence:** per-tick is structurally correct because:

- Per [closure-2-monad-lax-idempotence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md): consolidation is a closure-algebra operation; running it idempotently is a property, not a bug.
- Per [aperiodicity-characterization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodicity-characterization.md): finite stores stay in strict regime; consolidation quiesces in finite steps.
- Per [no-non-trivial-periodic-orbits](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md): consolidation cannot oscillate; the instinct-cell's $\vee_k$-join is monotone-ascending only.

**Per cycle-2 Verdier duality:** observation-cells are the *cosheaf-side local generators* (per-event fine-grained data); instinct-cells are the *sheaf-side cocycle witnesses* (consolidated $H^1$-class).
Both are computed by the consolidation rule simultaneously — the rule writes both per-observation cosheaf-side cells (which it already does) AND the consolidated sheaf-side instinct cells (the new content).
M4's M-data shape is the dual presentation under Verdier; choosing one structurally rules out the other primitive.

**No new schemas needed** — the existing `observation-cell` and `instinct-cell` schemas at [`objects/observation-cell.md`](../../objects/observation-cell.md) and [`objects/instinct-cell.md`](../../objects/instinct-cell.md) are sufficient.
The work is the closure-rule body above and a new `objects/consolidate-observations-into-instincts.md` substrate record registering the rule's instantiator in `RULE_INSTANTIATORS`.

## Related self-questions

The following open questions in [`questions/`](../../questions/) explore axes whose framing may sharpen M4's goals when the next enrichment-cycle advances M4 from `later` to `soon`.
They are exploration material — not commitments — that the next enrichment-cycle can promote into goals if the captain confirms:

- [`stigmergy-as-substrate-feedback-channel`](../../questions/stigmergy-as-substrate-feedback-channel.md) — whether the memory-feedback loop should be modeled as a stigmergic cell-update layer beneath the orchestrated dispatch, distinct from the orchestration layer per [`swarm-vs-orchestration-dichotomy`](../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md).
  Sharpens the shape of `instinct-cells-via-consolidation`.
- [`conduct-teachings-as-instinct-evaluation`](../../questions/conduct-teachings-as-instinct-evaluation.md) — whether selection should incorporate conduct-teaching predicates as a pre-tally eligibility gate rather than purely as tally-based scoring.
  Bears on `selection-reads-instinct-cells`.
- [`handoff-cobordism-and-cross-session-continuity`](../../questions/handoff-cobordism-and-cross-session-continuity.md) — modeling cross-session and cross-tick agent continuity as a handoff-cobordism rather than file-translation.
  Bears on `sessions-wrap-each-tick` and `openclaw-session-close-syncs-to-substrate`.
- [`saturation-threshold-and-bounded-entropy-as-runtime-caps`](../../questions/saturation-threshold-and-bounded-entropy-as-runtime-caps.md) — the ~4-agent saturation threshold as a substrate-resident runtime cap.
  Bears on M4's selection-quality discipline (instinct cells should reflect that adding more agents past saturation does not improve outcomes).
- [`ctde-as-substrate-snapshot-training-pattern`](../../questions/ctde-as-substrate-snapshot-training-pattern.md) — Centralized Training, Decentralized Execution with substrate as global critic and per-agent contexts as local actors.
  Bears on M4's consolidation step (substrate-as-critic supplies the *training signal* for agents whose execution remains decentralized).

See [`questions/_themes.md`](../../questions/_themes.md) for the full theme map.

## Related

- [Session and Memory implementation guide](../implementation/session-and-memory.md)
- [OpenClaw as Interface implementation guide](../implementation/openclaw-as-interface.md)
- [Roadmap](roadmap.md)
