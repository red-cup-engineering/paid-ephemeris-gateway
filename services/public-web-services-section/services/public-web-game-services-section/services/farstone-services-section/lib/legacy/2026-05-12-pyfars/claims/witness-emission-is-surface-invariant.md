---
type: claim
status: sketch
depends-on:
  - substrate-purity
  - log-and-record-are-distinct-resource-types
  - jsonl-is-canonical-state
  - witness
  - jsonl-event-log
  - closure-2-monad
  - closure-2-monad-lax-idempotence
  - settling-calm-corollary
derives-from-question: witness-emission-codepath-uniformity
---

# Witness emission is surface-invariant

**Claim.** For every cell-write operation in a running PyFARS instance that produces a `Witness`, the call site that opens the event-log file for append is the *single* library function `pyfars.runtime.event_log.
EventLog.append`; the substrate's downstream behavior under the new cell — closure-rule firings, audit query results, federation envelope content — depends only on the witness payload, not on the surface (hook dispatcher, MCP tool, in-process Python, FastAPI, federation merge) that invoked `append`.

## Statement

For any PyFARS instance with event log $L$ and closure-rule-system $R$, let $\sigma$ range over the surfaces $\{\text{hook}, \text{mcp}, \text{python}, \text{http}, \text{federation}\}$, and let $w_\sigma$ be a witness emitted from surface $\sigma$.

**Codepath uniqueness.** There is exactly one function `event_log.
EventLog.append` whose body opens the path `<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl` in append mode.
For every $\sigma$ and every witness $w_\sigma$ emitted from $\sigma$, the file write that adds $w_\sigma$ to $L$ executes the body of this function.

**Surface-invariance of substrate effect.** Let $w_1$ and $w_2$ be two witnesses with byte-equivalent serialized payloads modulo `timestamp` and the hash fields (`before_hash`, `after_hash`).
Let $L \cup w_1$ and $L \cup w_2$ be the event logs after appending $w_1$ and $w_2$ respectively.
Then for every $\tau' > \mathrm{ts}(w_1) = \mathrm{ts}(w_2)$:

$$\mathrm{Cl}_{R(\tau')}(L \cup w_1) \;=\; \mathrm{Cl}_{R(\tau')}(L \cup w_2)$$

— substrate at time $\tau'$ is identical regardless of which surface authored an otherwise-equivalent witness.
Surface-identity is carried by the witness payload's `channel`, `origin`, and `agent` fields; it is *visible* to consumers that filter on those fields, and it is *invisible* to closure-rule firings that operate on cell-content.

## Sketch

The proof factors through three established commitments.

### (1) Codepath uniqueness follows from log-as-single-writer-resource discipline

Per [`log-and-record-are-distinct-resource-types`](log-and-record-are-distinct-resource-types.md) sketch §1: "A log's storage discipline is *append-only with monotonic time order*."
The realization of this discipline in PyFARS commits to one function opening the log for append (per [`event_log.py`](../src/pyfars/runtime/event_log.py) module docstring lines 14–18: *"This module is intentionally minimal: `EventLog.append(w)` writes one witness."*).
A second call site that opened the log directly would either (a) interleave writes within the same process, breaking monotonic ordering under concurrent emission, or (b) require coordination machinery, which contradicts the *intentionally minimal* commitment and degrades the CALM-friendliness per [`settling-calm-corollary`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md).

The claim of *uniqueness* is therefore: the realization commits to the minimal shape, so any pyfars patch that opens `<date>.jsonl` for append outside `EventLog.append` is a violation.
An audit verifying codepath-uniqueness reduces to a static check: `grep` for `path.open(..., "a")` (or equivalent) targeting the event-log directory across `pyfars/` returns exactly one match.

### (2) Surface-invariance of substrate effect follows from closure-2-monad fiberwise definition

The [`closure-2-monad`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) is defined fiberwise on the predication algebra: $\mathrm{Cl}(\mathcal{E})_q := \mathrm{cl}_q(\mathcal{E}_q)$.
The closure operator at fiber $q$ takes a cell-set in $\mathcal{E}_q$ and produces another cell-set in $\mathcal{E}_q$; its definition is determined by the rule-system $R$ and the cell-set, not by any "surface" coordinate (because there is no such coordinate in the predication-fibration's base or fibers).

The witness payload's `channel`, `origin`, and `agent` fields are part of the cell-content of the event-log entry — they are ride-along metadata that downstream readers can filter on (per [`event_log.py`](../src/pyfars/runtime/event_log.py) `_matches`, the read-side filter at lines 54–71).
For the claim to hold, the closure-rule-system $R$ must not contain rules whose firing branches on `channel`/`origin`/`agent` in ways that change which cells are derived.
This is consistent with the current realization (the dispatch graph at [`runtime/dispatch_graph.py`](../src/pyfars/runtime/dispatch_graph.py) does not branch on these fields) but is *not currently audited*; making it auditable is a stage-4 substrate-side morphism (an audit closure rule).

Given the rule-system constraint, two witnesses with byte-equivalent payloads modulo timestamp/hash differ only in fields the closure-rule-system does not read.
Therefore $\mathrm{Cl}_{R(\tau')}(L \cup w_1) = \mathrm{Cl}_{R(\tau')}(L \cup w_2)$.

### (3) The two combine into substrate-purity at codepath granularity

Per [`substrate-purity`](substrate-purity.md): "PyFARS does not modify substrate state outside of explicit substrate-transitioning verbs whose modifications are recorded as witness events in the JSONL log."
This is the *transition-level* commitment.
Codepath uniqueness (1) is the *codepath-level* analog: every witness-recording transition reaches the log via one codepath.
Surface-invariance (2) is the *closure-level* expression: the codepath does not leak surface into the substrate's transition semantics.
Together they say:

> Substrate transitions are surface-blind: the substrate's behavior under a sequence of transitions depends only on the witness payloads in $L$, not on which surface caused each.

[Gap: the *closure-rule-system constraint* in (2) — that rules do not branch on `channel`/`origin`/`agent` in ways that change derived cells — is currently *not* enforced at write time; the audit closure rule that would enforce it is a stage-4 deliverable.
Until that rule lands, the claim is `status: sketch` rather than `status: proved`.]

[Gap: the multi-process case is not addressed.
The single-writer property holds within one PyFARS process; a polity running multiple `pyfars` processes (e.g., engine + sub-MCP-server-for-sub-session) would need a coordination story.
Per [`event_log.py`](../src/pyfars/runtime/event_log.py) line 21: "Multi-writer setups would need a more careful implementation."
The single-process strict-regime polity is the present scope; multi-process is out-of-scope until the cycle that introduces it.]

## Discussion

### What this claim makes possible

- **Audit reducibility.** A codepath audit of "is witness emission uniform?" reduces to a static check: exactly one `path.open` call site opens the event-log directory for append.
  The audit does not need to instrument runtime; reading the source suffices.
- **Federation portability.** Two PyFARS polities federating exchange logs; if both hold this claim, neither needs to know which surface authored the other's events.
  The merge consumes payload, not provenance topology.
- **Sub-MCP boundary clarity.** When [`claude-as-pyfars-runtime`](../work/goals/claude-as-pyfars-runtime.md) Phase 5 introduces sub-MCP servers for sub-sessions, the claim guarantees that sub-emissions reach the same library function — provided the sub-MCP runs in the same process.
  (Cross-process is an explicit gap; see above.)
- **MCP write-tool extension.** Adding new MCP write tools (`author_record`, `claim_workitem`, etc., per [`ship-mcp-write-tool-surface`](../work/plans/ship-mcp-write-tool-surface.md) and successor plans) is a typed extension of the same library function's call set; no new codepath topology is introduced per tool.

### What would refute the claim

- A pyfars commit adds a `with path.open(<event-log-dir-path>, "a")` outside `EventLog.append` and merges.
  Codepath uniqueness fails.
- A closure rule fires on `channel == "hook"` differently from `channel == "mcp"` such that two witnesses with otherwise-equivalent payloads but different `channel` values produce different derived cells.
  Surface-invariance of substrate effect fails.
- An audit query (e.g., `pyfars ledger tally`) returns answers that depend on the surface-mix of writes, holding payload-content fixed.
  Surface-invariance of substrate effect fails on the audit side.
- A federation merge produces a different merged substrate when peer A's writes are tagged `channel="mcp"` versus `channel="hook"` (with payloads otherwise byte-equivalent).
  Surface-invariance of substrate effect fails on the federation side.

If any of these is observed, the claim is refuted in that aspect; the resolving move is either to fix the violation or to weaken the claim with named exceptions.

### What this claim does NOT say

- It does not say the surface-fields are *forbidden* in the witness payload.
  They are present, and they are useful for downstream filtering.
  The claim says only that they do not feed back into closure-rule firings.
- It does not say all event-log writes go through *one process*.
  The single-writer property is per-process; multi-process federation requires the cross-process story (gap).
- It does not say MCP, hook, in-process Python, etc. are the *only* surfaces that will ever exist.
  New surfaces (autonomous-engine spawn, sub-MCP, gRPC ingress, signed federation envelope receivers) join the same `EventLog.append` library function; the claim's scope extends as new surfaces are added, and the claim's truth carries through provided each new surface routes through `EventLog.append`.
- It does not address the *order* of writes from concurrent surfaces within one process.
  Per [`event_log.py`](../src/pyfars/runtime/event_log.py) line 20, "the JSONL append-line semantics are atomic enough on POSIX for single-writer use" — concurrency within one Python process is bounded by the GIL plus the single-call-site discipline; the claim defers concurrent-process and concurrent-NUMA cases to the multi-process gap.

### Where this claim is used

- [`ship-mcp-write-tool-surface`](../work/plans/ship-mcp-write-tool-surface.md) milestone-cell `(witness-event-log, single-codepath, true) = T` is the realization commitment under this claim.
- The two task records under that plan ([`author-mcp-append-witness-tool`](../work/tasks/engineering/author-mcp-append-witness-tool.md), [`route-hook-dispatch-through-mcp-append-witness`](../work/tasks/engineering/route-hook-dispatch-through-mcp-append-witness.md)) reconcile to derive their acceptance criteria from this claim's statement.
- Specification `governance/specifications/event-log-append.md` (cycle stage 6 deliverable) will name the claim's invariant in MUST language.

## Connection to upstream

The claim's discharge factors through the upstream predication-category theorems noted above: closure-2-monad's fiberwise definition entails surface-invariance of substrate effect at the closure layer; lax-idempotence (Kock-Zöberlein) entails that re-iterating closure at a fixed point is identity, so any surface-tagged "duplicate" appended after settling produces no further state change beyond the audit record; settling-CALM-corollary entails that the active-frontier read is coordination-free, which is consistent with the single-writer single-codepath shape.

The PyFARS-side strengthening relative to substrate-purity is *codepath singularity* — substrate-purity commits to verbs as the only transitions; this claim commits to one library function as the only event-log-append call site within a verb's chain of effect.
The two together lift substrate-purity from a *transition-discipline* claim to a *transition-discipline-and-codepath-discipline* claim.
