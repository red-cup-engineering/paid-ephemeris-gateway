---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: selection-by-load
common-knowledge-grade: knowledge
consequent-predicate: selection-by-load
realizes: [scheduling-policy, dispatch-closure-rule-system, selection-rule]
depends-on: [dispatch-closure-rule-system, eligibility-by-capabilities, assignment-cell]
---

# Selection by load

A *selection* closure rule (distinct from eligibility): among the dispatchables `D` for which a workitem `W` is T-eligible-by-capabilities, the one currently carrying the fewest assignments wins.
Selection-as-substrate-rule is what closes M2's [`m2-dispatch-correctness-double-loop`](../work/findings/m2-dispatch-correctness-double-loop.md) finding — the lex-tiebreak in `dispatch_graph.select_winners_node` was a code-resident decision; this rule moves the criterion into substrate.

## Eligibility vs. selection

The dispatch closure-rule system distinguishes two layers:

- **Eligibility** (T- or F-emitting): predicates whether a `(W, D)` pair is *admissible* — capability subset cover, skill subset cover, jurisdiction cover, no rate-limit/charter-binding violation.
  The five existing rules (`eligibility-by-{capabilities, skills, jurisdiction, rate-limit, charter-binding}`) operate at this layer.
- **Selection** (T-emitting on the eligible set): chooses *which one* of the eligible dispatchables receives the work.
  Selection-by-load is the first authored rule at this layer.

The dispatch graph reads `(W, selection-by-load, D) = T` exactly once per workitem — the rule's instantiator picks the unique winner per W and emits T only on that pair.

## Rule statement

For each workitem $W$ that has at least one eligible-by-capabilities dispatchable, let $L(D)$ be the number of cells $(\_, \texttt{assigned-to}, D) = \mathbf{t}$ currently in the store (D's load).
Define the candidate set:

$$\mathrm{Cand}(W) = \{ D \,:\, (W, \texttt{eligible-by-capabilities}, D) = \mathbf{t} \}$$

The selected dispatchable is:

$$D^*(W) = \mathop{\arg\min}_{D \in \mathrm{Cand}(W)} L(D)$$

with lexicographic tiebreak on dispatchable slug when multiple $D$ are at minimum load.
The rule emits:

$$(W, \texttt{selection-by-load}, D^*(W)) = \mathbf{t}$$

## Antecedent and consequent cells

For the chosen `(W, D*)`:

- Antecedent: `(W, eligible-by-capabilities, D*) = T` (rule fires conditionally on the system's eligibility cell)
- Consequent: `(W, selection-by-load, D*) = T`

The load $L(D)$ and the lex-tiebreak are computed at instantiator time (substrate-walk side), not in the closure runner.
The runner sees a finite set of grounded rules in the strict regime.

## Composition with other selection rules

Future selection rules (selection-by-instinct, selection-by-priority, selection-by-recency) compose with this one through knowledge-meet on the `(W, ?, D)` axis: a dispatchable wins when *every* selection axis emits T.
Two selection rules emitting T on different `D` produce ⊤ on whichever was chosen by both, signaling unresolved selection that the runtime then has to triage.

## Polity-extension

A polity that wants a different criterion (e.g., load-balanced subject to a fairness constraint) authors a distinct `selection-by-X.md` rule and disables `selection-by-load` by removing this record.
The rule-system version hash captures the choice for replay determinism.

## Open structural questions

- **Stale assignment cells.** The rule reads `(*, assigned-to, D) = T` cells without any age/completion check.
  A workitem assigned three ticks ago that completed but didn't retract its assigned-to cell still counts toward D's load.
  The retraction discipline is a follow-on concern (Arc E memory-feedback partly addresses).
- **Cross-tick replay.** Because load is computed from system state at instantiation time, the rule is replay-deterministic given the same store — but the store evolves tick-by-tick as new assignments are written.
  Replay must replay tick-by-tick, not whole-history-at-once.
