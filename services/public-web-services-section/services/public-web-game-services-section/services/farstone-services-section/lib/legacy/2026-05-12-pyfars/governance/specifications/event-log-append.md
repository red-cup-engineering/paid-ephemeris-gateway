---
title: "Event-log append"
type: specification
status: draft
version: "2026.05.09+event-log-append"
date: 2026-05-09
authors: [emsenn, claude-opus-4-7]
derives-from:
  - witness-emission-is-surface-invariant
  - event-log-append-call-site
  - auditing-codepath-uniqueness
  - surface-invariant-codepath
supersedes: []
---


> **Status: draft.** Names the normative discipline for appending Witness records to the JSONL event log.
> Realizes the [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md) claim by fixing requirements that, jointly satisfied, render the realization conformant.

## 1. Abstract

PyFARS appends `Witness` records to a single JSONL event log per UTC date.
Many surfaces — the hook dispatcher (`pyfars hook-dispatch`), MCP tools served by `pyfars-substrate`, in-process Python calls from the engine, the FastAPI web app, the federation merge, and surfaces yet to be added — all need to author witnesses.
This specification fixes the codepath topology and witness payload discipline these surfaces must respect, so that the substrate's state is determined by the log's payload alone (regardless of which surface authored each entry) and the audit can verify codepath uniqueness statically.

## 2. Status

`draft`.
Implementors of pyfars internals SHOULD treat the requirements below as the target shape; deviations require a finding and a resolving cycle.
Implementations of *consumers* of the event log (auditors, federation peers, ledger queries) MAY assume conformance; non-conforming logs produce findings rather than runtime failures.

When this specification reaches `candidate` status, changes will require versioned supersession with `supersedes:` provenance.
When it reaches `normative`, conformance becomes binding on every PyFARS instance in the 561 polity and on federated peers.

## 3. Conformance

This specification uses normative language per RFC 2119 / RFC 8174.
The keywords MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in those RFCs.

A **conformant pyfars instance** is one for which:

1. Every cell-write that produces a `Witness` reaches the event log via the implementations declared by this specification.
2. The audit morphism declared by this specification fires on a posted code-survey result and produces no `codepath-uniqueness-violation` finding.
3. The witness payload schema fixed by this specification is respected on every append.

## 4. Terminology

**Event log.** The append-only JSONL resource at `<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl`.
Realizes [`jsonl-event-log`](../../concepts/jsonl-event-log.md).
Per [`jsonl-is-canonical-state`](../../claims/jsonl-is-canonical-state.md), the event log is the canonical substrate state.

**Witness.** A record produced by a substrate-transitioning operator, carrying operator name, target, before/after content hashes, payload details, timestamp, agent identity, surface-identity fields (`channel`, `origin`), and bilattice axes (`truth`, `evidence`).
Realizes [`witness`](../../concepts/witness.md).
Schema fixed at [`pyfars/entities/witness.py`](../../src/pyfars/entities/witness.py).

**Surface.** A category-of-caller into the event-log append codepath.
Current surfaces: hook dispatcher, MCP tool, in-process Python (engine, federation, promote, session), FastAPI web app. New surfaces are admitted by routing through the canonical call site.

**Canonical call site.** The single library-level function that opens the event-log file for append.
Realizes [`event-log-append-call-site`](../../objects/event-log-append-call-site.md).

**Codepath uniqueness.** The property that all surfaces' appends terminate at the canonical call site.
Realizes the codepath-uniqueness clause of [`surface-invariant-codepath`](../../concepts/surface-invariant-codepath.md).

**Surface-blindness.** The property that the closure-rule-system does not branch on the witness payload's `channel`/`origin`/`agent` fields in ways that change derived cells.
Realizes the surface-blindness clause of [`surface-invariant-codepath`](../../concepts/surface-invariant-codepath.md).

## 5. Requirements

### 5.1. Canonical call site

**R1.** A conformant pyfars instance MUST hold exactly one canonical event-log-append call site.
The call site MUST be implemented by the function `pyfars.runtime.event_log.
EventLog.append`.
(Realizes [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md) codepath-uniqueness clause.)

**R2.** The call site MUST be the only function in the `pyfars/` package that opens a path matching `<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl` in append mode (`"a"`).
(Derived from [`event-log-append-call-site`](../../objects/event-log-append-call-site.md).)

**R3.** The substrate MUST carry a singleton record of kind `event-log-append-call-site` per polity per event-log resource, with frontmatter cells naming the canonical call site.
(Realizes the singleton constraint in [`event-log-append-call-site`](../../objects/event-log-append-call-site.md).)

### 5.2. Witness payload schema

**R4.** Every witness appended to the log MUST be a `Witness` instance per the schema at [`pyfars/entities/witness.py`](../../src/pyfars/entities/witness.py).
(Derived from [`witness`](../../concepts/witness.md) realization.)

**R5.** Every witness MUST carry `truth` and `evidence` axes valued in $[0, 1]$.
The schema's Pydantic validators enforce this; appends that bypass the validator MUST NOT be accepted.
(Derived from `Witness._validate_bilattice_axis` and the bilattice value-domain commitment in [`regime-classification-is-load-bearing`](../../../pypredcomp/docs/dev/decisions/regime-classification-is-load-bearing.md).)

**R6.** A witness MAY carry `channel`, `origin`, and `agent` fields naming the surface that emitted it.
When present, these fields MUST be filterable by the read-side `event_log._matches` predicate.
When absent, the witness is surface-anonymous (consumers cannot filter on these fields for that witness).

### 5.3. Surface-blindness

**R7.** The closure-rule-system MUST NOT contain rules whose firing branches on the values of `channel`, `origin`, or `agent` in ways that change the set of cells derived.
(Realizes the surface-blindness clause; see §8 deferred audit.)

**R8.** Filter operations on surface-fields (e.g., `event_log.read_all(channel="hook")`) MUST be read-side operations.
They MUST NOT be lifted into the closure-rule-system as a way of selectively firing rules.

### 5.4. Append atomicity

**R9.** A single call to the canonical call site MUST result in either (a) one complete JSONL line being added to today's log file, or (b) no change to the log file.
Partial writes MUST NOT be observable to subsequent readers.

**R10.** The canonical call site MAY rely on POSIX append-atomicity for single-writer use within one process.
Multi-writer or multi-process appends are out of scope for this version of the specification (see §8).

### 5.5. Audit

**R11.** A conformant pyfars instance MUST provide an audit operation that produces a code-survey result cell-set asserting which source-code locations open the event-log path pattern in append mode.
The audit operation MAY be a CLI verb (`pyfars audit-codepaths`) or a CI integration; it MUST publish its result as substrate cells via [`append_witness`](../../work/tasks/engineering/author-mcp-append-witness-tool.md) (or equivalent), not as a standalone artifact.

**R12.** The closure-rule-system MUST contain an audit closure rule realizing [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) that fires on a posted code-survey result cell-set and produces either an `audit-state: ok` assertion (pass) or a `codepath-uniqueness-violation` finding (fail).

## 6. Acceptance criteria

A pyfars instance is conformant to this specification when all of the following hold:

### 6.1. Canonical-call-site uniqueness

A grep over `pyfars/` source for `path.open(<event-log-path>, "a")` (or the language-equivalent file-open-for-append targeting the event-log directory) returns *exactly one* match.
The match's enclosing function is `pyfars.runtime.event_log.
EventLog.append`.

### 6.2. Substrate singleton

The substrate contains exactly one entity of kind `event-log-append-call-site` per event-log resource, and its frontmatter cells equal:

- `implementation-module: "pyfars.runtime.event_log"`
- `implementation-class: "EventLog"`
- `implementation-method: "append"`
- `opens-path-pattern: "<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl"`
- `open-mode: "a"`

### 6.3. Witness payload validation

Constructing a `Witness` with `truth=2.0` (or any value outside $[0, 1]$) raises a Pydantic validation error.
Constructing one within range succeeds.
The append codepath does not accept already-constructed `Witness` instances that bypass the validator (e.g., via `model_construct` shortcuts).

### 6.4. Audit firing

When the substrate carries a posted code-survey result with `match-locations` of length one equal to `pyfars.runtime.event_log.
EventLog.append`, [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) fires and produces `audit-state: ok` cells.
When the survey result has length two or more, the rule fires and produces a `codepath-uniqueness-violation` finding.

### 6.5. End-to-end equivalence

A test suite operating over the [`auditing-codepath-uniqueness--pass`](../../examples/auditing-codepath-uniqueness--pass.md) and [`auditing-codepath-uniqueness--violation-multiple`](../../examples/auditing-codepath-uniqueness--violation-multiple.md) math examples (lifted to code fixtures per the implementation chain) passes.

## 7. Non-normative examples

Math examples (cycle stage 5):

- [`event-log-append-call-site--singleton-instance`](../../examples/event-log-append-call-site--singleton-instance.md) — concrete cell trace for the singleton call-site record.
- [`auditing-codepath-uniqueness--pass`](../../examples/auditing-codepath-uniqueness--pass.md) — pass-regime audit firing.
- [`auditing-codepath-uniqueness--violation-multiple`](../../examples/auditing-codepath-uniqueness--violation-multiple.md) — violation-regime audit firing with $\top$-cell repair trace.

Code examples (implementation chain step 2; authored as part of the [`ship-mcp-write-tool-surface`](../../work/plans/ship-mcp-write-tool-surface.md) reconciliation):

- `examples/event-log-append/canonical-call-site-grep.txt` *(pending)*
- `examples/event-log-append/witness-payload-validation.py` *(pending)*
- `examples/event-log-append/audit-fixture-pass.json` *(pending)*
- `examples/event-log-append/audit-fixture-violation.json` *(pending)*

## 8. What this specification does not decide

- **Surface-blindness audit (R7).** The static audit verifying that no closure rule branches on `channel`/`origin`/`agent` is *not* authored in this version; the requirement is stated, but the corresponding audit morphism is deferred to a follow-on cycle.
  Implementations that introduce a closure rule branching on a surface-field are non-conformant under R7, but the violation is not yet audit-detectable in substrate.
- **Multi-writer / multi-process appends.** R10 explicitly defers this.
  A polity running multiple `pyfars` processes that share an event-log resource requires a coordination story this specification does not provide.
- **Compaction and archival.** Daily file rotation is implied by the path pattern but archival cadence and compaction strategies are not specified here.
- **Cross-polity log merge.** Federation merge consumes payloads of remote logs into local substrate (per [`jsonl-is-canonical-state`](../../claims/jsonl-is-canonical-state.md)) but the merge protocol itself is M6-tier and out of scope.
- **Cryptographic signing of witnesses.** Per [`claude-as-pyfars-runtime`](../../work/goals/claude-as-pyfars-runtime.md) §"Out of scope," signing is M11.
- **Default vs explicit office authority on append.** R6 says fields MAY name surface; whether a surface MUST authenticate to a specific office to append is the subject of [`delegable-powers-distinct-from-full-powers`](../../questions/delegable-powers-distinct-from-full-powers.md) and a future authority-binding specification.

## 9. References

### 9.1. Normative references

- [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md) — the claim this specification realizes.
- [`event-log-append-call-site`](../../objects/event-log-append-call-site.md) — the substrate object whose cells the specification fixes.
- [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) — the closure rule R12 commits to.
- [`surface-invariant-codepath`](../../concepts/surface-invariant-codepath.md) — the realization-property the specification operationalizes.
- [`witness`](../../concepts/witness.md), implemented at [`pyfars/entities/witness.py`](../../src/pyfars/entities/witness.py) — the payload schema.
- [`jsonl-event-log`](../../concepts/jsonl-event-log.md), realized at [`pyfars/runtime/event_log.py`](../../src/pyfars/runtime/event_log.py) — the resource and call-site.

### 9.2. Informative references

- [`substrate-purity`](../../claims/substrate-purity.md) — the parent transition-discipline claim.
- [`log-and-record-are-distinct-resource-types`](../../claims/log-and-record-are-distinct-resource-types.md) — log-as-single-writer-resource discipline.
- [`jsonl-is-canonical-state`](../../claims/jsonl-is-canonical-state.md) — substrate as closure of log.
- [`closure-2-monad`](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) — fiberwise definition entailing surface-invariance of substrate effect.
- [`regime-classification-is-load-bearing`](../../../pypredcomp/docs/dev/decisions/regime-classification-is-load-bearing.md) — strict regime; bounds on bilattice axes.
- [`cost-is-lawvere-quantale`](../../../pypredcomp/docs/dev/decisions/cost-is-lawvere-quantale.md) — cost quantale; informs future R-extensions if cost-grading is admitted.
- [`run-full-cycle-not-just-integration`](../duties/run-full-cycle-not-just-integration.md) — the cycle discipline this specification was authored under.
- [`work/cycles/2026-05-09-witness-emission-codepath-uniformity.md`](../../work/cycles/2026-05-09-witness-emission-codepath-uniformity.md) — the cycle record.
