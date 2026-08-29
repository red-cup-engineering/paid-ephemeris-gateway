---
type: concept
class: cell-state
status: draft
depends-on: [predication-cell, closure, settling, four-regime-classification]
---

# Settled

The state of a [predication-cell](predication-cell.md) whose value has reached its closure-fixed-point under the active closure-rule-system.
A settled cell will not change further unless new witnesses arrive or closure rules change.
Settled is the cell-level companion to [quiescent](quiescent.md), which describes the substrate-as-a-whole.

A cell is settled when:

- Every closure rule whose antecedent the cell participates in has fired, and
- The cell's value is the meet of all its witness-supplied and closure-derived values, with no pending consequence cells that would re-update it.

Settled is the *cell-local* property; quiescent is the *substrate-global* property.
A substrate is quiescent iff all its cells are settled.

## Settled vs. unsettled

A cell is [unsettled](unsettled.md) when [settling](../morphisms/settling.md) has not yet finished propagating consequences for it — its value may still change as closure runs.
The transition unsettled → settled is what each settling step accomplishes for some subset of cells.

The boundary is sharp at any moment: a cell is either settled (no pending closure work for it) or unsettled (pending closure work).
What's *interesting* is what cells are in which state when projection runs — projecting from a substrate with unsettled cells produces a partial view, which the corpus marks as such.

## Settled and bilattice values

Per upstream [bilattice values](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), a settled cell's value sits on the bilattice $\{\bot, \top, \mathbf{f}, \mathbf{t}\}$ (or its meet-semilattice extension).
The four primary values:

- $\bot$ — no information; the cell has been *settled to absence* (nothing has been said about it).
- $\mathbf{t}$ — true; settled-positive.
- $\mathbf{f}$ — false; settled-negative.
- $\top$ — paraconsistent; both true and false witnesses; settled-conflicting.

A $\top$-valued cell IS settled — it has reached its closure-fixed-point, which happens to be a contradiction.
The substrate does not collapse on $\top$; it surfaces the contradiction to validation, which flags it for adjudication. *Settled* and *consistent* are distinct properties.

## Settled and audit

A settled cell is auditable — the witnesses that contributed to it, the closure rules that fired over it, the moment it reached settled-state are all reconstructible from the JSONL log.
An unsettled cell is also auditable in principle (its current pending-state is system content), but reading from it without recognizing its unsettled status produces partial conclusions.

Audit verbs (validate, audit-citation-graph, etc.) check both substantive properties and settled-status; an audit run on non-quiescent substrate may report freshness markers in addition to substantive findings.

## Settled vs. final / static / immutable

Settled does not mean *final* in the strong sense:

- A settled cell can become *unsettled* again if a new witness arrives (new evidence, new actor's claim) or if a closure rule changes (governance amendment).
- A settled cell can be *retracted* if its supporting witnesses are themselves retracted.
- Settled is therefore *current-fixed-point*, not *eternal-fixed-point*.
  The cell's history is a sequence of (settled-value, moment) pairs.

This matches the system's substrate-purity discipline: nothing is hidden, nothing is final-by-fiat, everything is reconstructible.

## What this concept does not specify

- The detection-mechanism for settled-status.
  Currently per-cell dirty-bit tracking in the runtime; making settled-status itself system content (so projections can read it) is partly settled.
- The notion of "deeply settled" — settled across all sub-domains the cell touches, including aperiodic-regime ones.
  In aperiodic regimes, "settled" is approximated by "settled-as-of-trajectory-checkpoint."
- The relation to *certified* — a [certified](certify.md) cell has had a particular agent's certification-witness; this is orthogonal to settled-status.
