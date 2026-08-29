---
type: concept
class: realization-property
status: draft
depends-on: [witness, jsonl-event-log, substrate]
realizes: [substrate-purity, log-and-record-are-distinct-resource-types]
derives-from-claim: witness-emission-is-surface-invariant
theory-basis: [closure-2-monad, settling-calm-corollary]
---

# Surface-invariant codepath

A *surface-invariant codepath* is a write codepath that has two properties jointly:

1. **Codepath uniqueness.** All callers of the codepath — regardless of which surface initiated the call (CLI, hook dispatcher, MCP tool, in-process Python, FastAPI, federation merge, future surfaces) — terminate at the same single library-level call site that performs the system write.
2. **Surface-blindness of the system effect.** The system's behavior under the new cell — closure-rule firings, audit query results, federation envelope content — depends only on the witness payload, not on which surface invoked the codepath.
  Surface-identity is *visible* in the witness payload (e.g. `channel`, `origin`, `agent` fields) and *invisible* to the closure-rule-system that derives consequence cells.

The concept is the realization-level analog of [`substrate-purity`](../claims/substrate-purity.md) at the codepath layer.
Where substrate-purity commits that *every transition* routes through a witness-emitting verb, surface-invariance commits that *every codepath emitting a witness* funnels through one library function whose effect on the substrate is not surface-dependent.

## Why the property has to be named

A realization may satisfy substrate-purity (every transition has a witness) without satisfying codepath-uniqueness (one verb's witnesses come via one library function, another verb's via a different open call).
Such a realization would not break audit *correctness*, but it would break audit *reducibility*: an auditor would have to know, for each verb, which open-call to inspect.
The single-codepath shape reduces audit to one inspection point.

A realization may satisfy codepath-uniqueness without satisfying surface-blindness: every write goes through one function, but the closure-rule-system reads the witness payload's `channel` field and branches its derivation differently per surface.
Such a realization would let surface-identity leak into system transitions, which would defeat federation portability (peer A's "hook" channel and peer B's "hook" channel might mean different things) and audit replayability (replaying the log after re-tagging the surfaces would yield a different substrate).

Both properties are needed; neither is enough alone.

## Where the property holds in PyFARS

Per [`witness-emission-is-surface-invariant`](../claims/witness-emission-is-surface-invariant.md) sketch, the current realization of `pyfars-the-package` satisfies both properties:

- The single library function is `pyfars.runtime.event_log.
  EventLog.append` per [`event_log.py`](../src/pyfars/runtime/event_log.py) lines 99–105.
- The closure-rule-system at [`runtime/dispatch_graph.py`](../src/pyfars/runtime/dispatch_graph.py) does not branch on `channel`/`origin`/`agent` (verifiable by a static survey of rule antecedents).

The concept names *what* the realization satisfies; the supporting [`object`](../objects/event-log-append-call-site.md) and [`morphism`](../morphisms/auditing-codepath-uniqueness.md) make the property system-readable so the audit can verify it without a human re-grepping the source on every commit.

## Generalization to future surfaces

The `claude-as-pyfars-runtime` Phase 1 plan introduces the MCP write tool surface; future plans will introduce sub-MCP-for-sub-sessions (Phase 5), autonomous engine spawn (Phase 3), federation-receiver surfaces (M6), and inbound MCP clients (M8).
Each new surface inherits the property *provided* it routes through `event_log.
EventLog.append` for cell-writes; the audit morphism extends to cover the new surface without modification, because the surface-invariance is structural rather than per-surface.

A surface that needs *not* to be surface-invariant — for example, a debug-only test surface that injects synthetic events — must be authored explicitly as an exception with its own audit waiver and witness.
No silent exceptions: a write outside the canonical codepath produces a finding.

## What this concept does not name

- It does not name *which* surfaces exist or are permitted.
  The concept is shape-of-write, not surface-taxonomy.
  Surface enumeration is operational; the concept governs codepath topology regardless of how many surfaces exist.
- It does not name the *witness payload schema*.
  The schema is fixed by [`witness`](witness.md) (or the entity definition at [`pyfars/entities/witness.py`](../src/pyfars/entities/witness.py)); the concept is about call-site uniqueness, not field set.
- It does not address *concurrency* across processes.
  The property is per-process; multi-process realizations that share an event-log require a coordination story explicitly out-of-scope for the v0.2 strict-regime polity.

## Connection to upstream

The property's necessity follows from the [`closure-2-monad`](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) being defined fiberwise on the predication algebra: $\mathrm{Cl}(\mathcal{E})_q := \mathrm{cl}_q(\mathcal{E}_q)$.
The closure operator at fiber $q$ has no surface-coordinate.
For the iteration to fixed point to be deterministic in $L$ (per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md)), the cell content fed into $\mathrm{Cl}$ must not depend on surface in a way the rules read.
This is exactly surface-blindness; codepath-uniqueness then ensures the *implementation* respects what the *theory* requires.
