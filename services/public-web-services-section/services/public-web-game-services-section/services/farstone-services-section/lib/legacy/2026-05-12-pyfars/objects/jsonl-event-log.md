---
type: definition
class: canonical-state-store
status: draft
realizes: [log, resource]
depends-on: [witness, substrate, predication-cell, log, resource]
---

# JSONL event log

The append-only sequence of JSON-Lines records that constitutes PyFARS's *canonical* system state.
Every system transition is one or more lines in the event log; the substrate at any moment is the closure of all events with timestamp $\leq$ now, against the active closure-rule-system.

## Data

A JSONL event log $L$ is

$$L \;=\; (e_1, e_2, e_3, \ldots)$$

a finite or growing sequence of events $e_i$ each represented as a JSON object on one line.
Each event carries:

- **`ts`** — ISO-8601 timestamp of the event.
- **`actor`** — slug of the personnel/agent responsible (or external user-account slug for principal-mediated events).
- **`verb`** — the verb that produced the event.
- **`cells`** — one or more $(s, p, o, v)$ tuples being asserted (with $v$ the bilattice value, typically $t$).
- **`rationale`** — optional human-readable note about why the event was produced.
- **`witness-of`** — optional reference to a parent event or task being witnessed.
- **`verb-args`** — optional verb-specific argument record.

The schema is verb-extensible — verbs may add fields specific to their semantics — but the core five fields (`ts`, `actor`, `verb`, `cells`, `rationale`) are common to all events.

## Where the log lives

In a running PyFARS instance, the JSONL event log lives at a configured filesystem path under the polity-root — typically `.pyfars/events.jsonl` (per current realization).
Multiple log files may exist for time-sharded retention; the conceptual log is the concatenation of all shards in time order.

The log is *append-only at the discipline level*: PyFARS commits to never rewriting log entries in place.
(Compaction and archival are separate operations that produce *new* log files derived from old ones; the originals are retained or signed off as superseded.)

## Why the log is canonical

PyFARS's system state at any moment is *defined* as the closure of the JSONL events received so far, against the closure rules active at that moment.
This is the load-bearing relationship:

$$\mathrm{Substrate}(\tau) \;=\; \mathrm{Cl}_{R(\tau)}\big(\bigsqcup_{i: \mathrm{ts}(e_i) \leq \tau} \mathrm{cells}(e_i)\big)$$

— the closure (under the closure-rule-system $R(\tau)$ active at time $\tau$) of all cells from events with timestamp $\leq \tau$.

Other representations — the markdown corpus, in-memory indices, JSON-API caches, the predication graph — are *derived* from this canonical state.
Per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md), the substrate can be rebuilt from $L$ alone.

## What the log enables

- **Replay** — given $L$ and the closure-rule-system, the substrate can be reconstructed end-to-end.
- **Audit** — every cell can be traced to the witness that introduced it.
- **Time-travel reads** — system state at any past moment $\tau' < \tau$ is computable by replaying up to $\tau'$.
- **Conflict resolution** — paraconsistent ($\top$) cells can be traced to the contributing witnesses, which is the basis for adjudication.

## Log discipline

Two disciplines define the log's correctness:

1. **Total internal ordering** — within a single PyFARS instance, events are totally ordered by `ts`.
  Ties are broken deterministically (by the order of append); the log records the ordering at write-time, not just the timestamp.
2. **No retroactive insertion** — a new event always appends; events for past times are recorded as `ts: <now>` with optional `effective-at:` metadata if their consequence is meant to settle a past time.

When PyFARS-the-package is run in a multi-instance deployment, cross-instance log merge follows upstream [bilattice network-sheaf consensus](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/) — specifically, each instance's log is a fiber, and the merged log is the d-frame consensus across instances.

## What this object does not specify

- The retention policy.
  A growing log accumulates indefinitely; archival/compaction strategies are per-deployment and currently not standardized.
- Cryptographic signing.
  Whether log entries should be signed (by actor, by instance) for integrity verification is a program-shaping question.
- The exact precision of `ts`.
  Currently nanosecond-precision UTC; whether logical clocks (Lamport, vector) should also be carried is an open structural question for federated deployments.
- The relationship to external event stores (Kafka, EventStore, etc.) — PyFARS today maintains its own log; integrations are conceivable but not specified.
