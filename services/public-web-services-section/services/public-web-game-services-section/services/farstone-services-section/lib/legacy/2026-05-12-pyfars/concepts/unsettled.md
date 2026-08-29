---
type: concept
class: cell-state
status: draft
depends-on: [predication-cell, closure, settling, settled]
---

# Unsettled

The state of a [predication-cell](predication-cell.md) whose closure-consequences have not yet fully propagated.
An unsettled cell may still change as [settling](../morphisms/settling.md) runs — its current value is partial, its closure-supports may still grow, the cells it derives may not yet exist.

Unsettled is the complement of [settled](settled.md): a cell is one or the other at any given moment.
The transition unsettled → settled happens during settling; the transition settled → unsettled happens when a new witness arrives that re-opens closure work for the cell.

## When cells become unsettled

A cell becomes unsettled at three kinds of moments:

1. **A witness arrives** that introduces or modifies the cell.
  The witness's content is the seed; closure rules that depend on the cell will fire and produce more cells; until those fire, the original cell is unsettled-at-the-derived-level.

2. **A witness arrives upstream** of the cell — a witness modifying a cell that the focal cell's closure-supports depend on.
  The change propagates through closure; until propagation completes, the focal cell is unsettled.

3. **A closure rule changes** — governance amends $R$, adding new closure rules.
  The cells that the new rules' antecedents match become unsettled until the new rules fire over them.

In all three cases, settling is what restores settled-status.

## Unsettled and projections

A projection (markdown corpus, HTTP response, dispatch decision) computed against unsettled substrate is a *partial* projection.
PyFARS's discipline:

- **Strict/Scott-continuous regimes**: the runtime defers projection until settling reaches quiescence.
  Projections see only settled state.
  (This is why the JSONL log is canonical and the markdown corpus is derived: the corpus is materialized from settled state.)
- **Higher regimes**: full settling may not converge; projections must operate on partial state.
  PyFARS marks these projections with freshness/partiality indicators (frontmatter `partial:`, validation diagnostics, render-time "trajectory-state" annotations).

A reader of the corpus should never need to know whether the substrate is currently unsettled — by the time the corpus is materialized, settling has either converged (strict/Scott) or hit a checkpoint (higher regimes) and the partiality is marked.

## Unsettled and audit

An audit run on substrate with unsettled cells *can* run, but its findings inherit the partiality.
An auditor reading "missing relations" on substrate-with-unsettled-relations may report false-positives (the relations may be derived but not yet propagated).
PyFARS's audit verbs may either:

- Wait for quiescence before running (default for strict/Scott audits).
- Run over unsettled substrate with partiality-aware logic (default for trajectory audits).

The choice is per-audit, configured in the audit's skill-definition.

## Unsettled and trigger-firing

A trigger cannot fire on a cell that is unsettled — this would propagate non-quiescent state across coupling boundaries.
PyFARS's discipline: triggers fire on settled cells.
If a trigger's source-event is in unsettled substrate, the trigger is deferred until settling completes for the relevant cells.

This is part of what makes the polity coherent: agents do not pulse on partial substrate.

## Unsettled vs. unwitnessed

Distinct concepts:

- **Unwitnessed** — no witness exists for the cell; the cell does not exist in the system at all.
  The cell's value is $\bot$ by absence.
- **Unsettled** — witnesses exist, the cell exists, but closure has not finished propagating its consequences.
  The cell's value is set but possibly transient.

A cell can be unwitnessed but settled (the absence is the closure-fixed-point of having no witnesses); a cell can be witnessed and unsettled (witnesses exist but closure is still running).
The two distinctions don't compose simply.

## What this concept does not specify

- The duration of unsettled-status.
  Per regime: strict (one tick or less), Scott-continuous (at most $\omega$-step), higher (potentially indefinite-as-trajectory).
- The detection of "stuck" unsettled cells — cells whose closure should have completed but hasn't.
  Diagnostic discipline open.
- Per-cell vs. per-region settling.
  Settling can fire over a single dirty cell or over a region; the granularity is implementation-side.
