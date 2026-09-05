---
type: definition
class: system-process
status: draft
realizes: [derivation, validation]
depends-on: [goal-cell-system, work-record, work-status, dispatch-closure-rule-system, witnessing-completion]
implementation: pyfars.workitem.verify_completion
---

# Verifying completion quiescence

The system-resident closure rule that reads a workitem's [goal-cell system](../objects/goal-cell-system.md), checks current cell values against the workitem's target valuation, and fires the completion witness when the target is reached.
Replaces the older "agent asserts done" pattern with a mechanical "substrate verifies done" pattern.

This morphism is the realization of completion-as-quiescence at the workitem level: a workitem is complete iff its goal-cell predicate has reached quiescence (every goal-cell holds its target value, with no pending closure firings that would change it).
Per the [substrate-algebra question](../questions/substrate-algebra-closure-and-replay.md), this is the right shape for completion in a closure-driven engine.

## Trigger

The verification rule is a closure-rule record with regime `strict`.
Its antecedent (parameterized by workitem slug):

```
(?w, type, "workitem") = t
(?w, goal-cell, ?g) = t           ; one or more goal cells
(?w, target-valuation, ?disc) = t  ; forall | exists | weighted-threshold
(?w, status, ?s) = t              ; current status
?s != "settled"                    ; only verify in-flight workitems
```

When the antecedent matches and the verify-policy says fire, the rule runs the verification procedure.

## Procedure

For an input workitem `?w`:

1. **Read goal-cell set.** Collect all `(?w, goal-cell, ?g) = t` cells; each `?g` is itself a cell pattern with a target value.
2. **Evaluate each goal cell.** For each goal cell pattern, query the substrate for its current value:
   - `t` — the cell holds the target value (positive contribution).
   - `f` — the cell holds the opposite (negative contribution; for `forall` discipline, this completes the workitem as failed).
   - `bot` — the cell is not yet asserted (incomplete contribution).
   - `top` — the cell is contradictory (anomaly; emits to `guard`).
3. **Aggregate per discipline.**
   - **`forall`** — workitem completes (status: settled) iff every goal cell holds its target value.
     If any goal cell holds $f$, workitem completes as failed.
     If any holds $\bot$, verification defers.
   - **`exists`** — workitem completes iff some goal cell holds its target.
     If none do but at least one is in motion ($\bot$), defer.
   - **`weighted-threshold`** — sum of bilattice-weighted goal valuations exceeds the recorded threshold.
     Each $\bot$ contributes the configured "uncertain" weight (default 0); each $\top$ contributes negative weight (penalty for contradiction).
4. **Emit completion witness or defer.** On completion, emit `(?w, status, "settled") = t` and trigger [`witnessing-completion`](witnessing-completion.md).
  On failure, emit `(?w, status, "failed") = t` plus a per-failed-goal-cell witness.
  On defer, no cells emitted.

## Verify-policy interaction

The verify-policy field on the workitem determines *when* the rule fires:

- **`on-quiescence`** — fires at substrate quiescence (default for closure-firing-relevant workitems).
  Aligns with substrate-algebra: completion is checked when no further closure firings will change goal-cell values.
- **`per-tick`** — fires every tick boundary regardless of quiescence.
  Used for time-bounded workitems where partial-completion is meaningful.
- **`on-witness-arrival`** — fires when an event is recorded against any of the goal-cells' subjects.
  Lazy; reduces verification cost for workitems with infrequent goal-cell updates.

## Anomaly emission

When verification finds a goal cell at $\top$ (contradictory: both $t$ and $f$ asserted by different witnesses), the morphism emits an [`anomaly-witness`](../objects/anomaly-witness.md) on the `guard` channel rather than completing or failing the workitem.
The workitem stays in `verifying` status until adjudication resolves the contradiction.

This is the workitem-level realization of anomaly-as-contradiction: completion contradiction is a polity-level event requiring human or escalated-agent adjudication, not silent resolution.

## Witness chain

A successful verification produces:

1. Per-goal-cell evaluation event (with the cell's current value at evaluation time).
2. Aggregation event (per the discipline's aggregation procedure).
3. Status transition event (settled / failed / deferred).
4. Completion witness event (if settled).

These compose into the workitem's `caused-by` chain per [`causal-event-record`](../objects/causal-event-record.md), giving the audit-export full provenance for every completed workitem.

## What this morphism commits to

1. **Mechanical completion.** No agent assertion of "done" can complete a workitem; only the system's verification of goal-cell values can.
  This is the discipline that prevents premature completion and makes self-correcting dispatch possible.
2. **Bilattice values throughout.** Goal-cell evaluation uses the full bilattice ($t$/$f$/$\bot$/$\top$); $\bot$ is "not yet" rather than "no", $\top$ is anomaly rather than override.
3. **Quantifier-discipline-aware.** The aggregation respects the workitem's quantifier choice; $\forall$-completion vs $\exists$-completion vs threshold-completion is a workitem decision.

## What this morphism does not specify

- The discipline for *partial-credit* in `weighted-threshold` mode beyond the default per-goal weight.
  Per-goal weight cells (`(?w, goal-weight, ?g, <real>) = t`) are the candidate; not yet authored.
- Verification cost for workitems with very large goal-cell sets (thousands of cells).
  Currently O(goal-cells) per fire; whether to use a materialized view over goal-cell aggregates is open optimization.
- Cross-workitem completion cascades.
  When workitem A's goal-cell holds the value `(?b, status, "settled") = t` and verification of A reads workitem B's status, the verify ordering may cascade.
  Currently strict ordering by workitem slug; explicit cross-workitem dependency edges are open.
