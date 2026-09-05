---
type: definition
class: system-process
status: draft
realizes: [derivation, projection]
depends-on: [materialized-view-record, closure-state-hash, dispatch-closure-rule-system]
implementation: pyfars.runtime.views.refresh
---

# Refreshing materialized view

The system-resident closure rule that fires when a [materialized-view record](../objects/materialized-view-record.md)'s base-hash differs from the current closure-state-hash over its projected-from scope.
The morphism re-projects the scope, writes a new content-addressed backing file, updates the record's `base-hash` cell, and emits a refresh witness.

This is the morphism that keeps materialized views correct-by-construction: views cannot drift from the system state they project, because closure-driven refresh fires whenever drift is detected.

## Trigger

The refresh rule is itself a closure-rule record with regime `strict`.
Its antecedent:

```
(view-slug, type, "materialized-view-record") = t
(view-slug, projects-from-scope, ?scope) = t
(view-slug, base-hash, ?recorded) = t
(?scope, current-closure-state-hash, ?current) = t   ; computed by closure-state-hash morphism
?recorded != ?current
```

When the antecedent matches (recorded base-hash differs from current scope hash), the rule fires.

## Procedure

For an input view `view-slug`:

1. **Resolve scope.** Read `(view-slug, projects-from-scope, ?)
  ` cells; collect system cells in the scope (typically a filesystem-path prefix or a frontmatter-field-bearing set).
2. **Apply projection rule.** Read `(view-slug, projection-rule, ?rule)` and invoke the named projection (Python callable in `pyfars.views.<name>`, with future support for system-resident projection rules).
  Output is the projected representation (JSON, parquet, markdown table, etc. per the projection rule's output type).
3. **Compute new content-addressed path.** New backing path embeds the current closure-state-hash: `…/<slug>.<current-hash>.<ext>`.
4. **Atomic write.** Write the projection output to a temp file, fsync, atomically rename to the content-addressed path.
5. **Update record cells.** Emit cells:
   - `(view-slug, base-hash, <current-hash>) = t` — supersedes the previous value.
   - `(view-slug, backing-path, <new-path>) = t` — supersedes the previous value.
   - `(view-slug, last-refreshed-at, <ts>) = t`
6. **Emit refresh witness.** A `(view-slug, refreshed-by, refreshing-materialized-view) = t` cell on the `analysis` channel; the previous backing path becomes garbage-collection-eligible.

## Refresh-policy interaction

The morphism's *firing condition* — when it fires — depends on the view's `refresh-policy`:

- **`on-quiescence`** — the morphism fires from within the closure-runner's quiescence-check loop; it runs only after `dispatch-closure-rule-system` has reached a fixed point.
  This is the substrate-algebra-aligned default.
- **`per-tick`** — fires unconditionally each tick; antecedent's hash-mismatch check still gates whether actual re-projection runs.
- **`on-demand`** — fires only when a reader requests the view via `pyfars view <slug>`; the request is itself a system cell.

## Garbage collection

Old content-addressed paths persist until garbage collection runs.
The GC criterion: a backing path is eligible for removal iff its embedded base-hash does not appear in any active reader's `(reader, holds-view-hash, ?hash)` cell.
This is a strict-regime closure rule that runs at audit boundaries (per [M11](../work/milestones/m11-assurance-audit-chain-export.md)).

For deployments with no long-held reader hashes, GC may run per-tick; default is per-day.

## Witness chain

A view-refresh produces a witness chain readable for replay:

1. Closure-state-hash computation event for `?scope` (recorded by the per-pass hash computation).
2. Refresh trigger event (recorded when the antecedent matches).
3. Projection rule invocation event (with rule version cell).
4. Write event (atomic-rename completion).
5. Refresh witness emission event.

Per [`replay-determinism`](../claims/replay-determinism.md), replaying these events against the same closure-rule-system reproduces the same backing file byte-for-byte (assuming the projection rule is `pure`).

## What this morphism commits to

1. **Atomic.** A reader observing the view's `backing-path` cell at any moment sees a fully-written file; partial-write windows are invisible.
2. **Idempotent.** Firing twice with the same antecedent (same `?recorded`, same `?current`) produces the same output; the second firing is a no-op write because the path already contains the correct hash.
3. **Closure-rule-driven, not application-driven.** Application code does not call refresh; the runner does.
  This is the discipline that makes refresh schedule auditable.

## What this morphism does not specify

- The retry discipline for write failures (filesystem full, permission denied).
  Currently failure emits a `guard`-channel cell and the view is marked stale; the operations team handles via the [graceful-degradation policy](../questions/) referenced from M3.
- Per-cell incremental projection.
  Some projection rules (e.g., index-on-content) admit incremental update from old-state + cell-delta rather than full re-projection.
  Currently full re-projection only; incremental is open optimization.
- Federation-aware refresh.
  When the projected-from scope spans federation peers, refresh requires waiting for federation cycle completion before computing the closure-state-hash.
  Open for [M6](../work/milestones/m6-federation.md).
