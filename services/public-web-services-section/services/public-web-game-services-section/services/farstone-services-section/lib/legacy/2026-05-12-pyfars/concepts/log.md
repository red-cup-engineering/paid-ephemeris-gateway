---
type: concept
class: append-only-resource
status: draft
depends-on: [resource, entity, witness, predication-cell, jsonl-event-log]
---

# Log

A [resource](resource.md) of the *append-only EAVT* discipline: a sequence of entries, each an entity-attribute-value-time tuple (sometimes written as an event with subject/predicate/object/timestamp + auxiliary metadata), where new entries are added to the end and existing entries are never rewritten.
Realizes the canonical-state surface of the system: the log is what *produces* system cells via closure.

Logs are how the substrate stays auditable, replayable, and recoverable.
Per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md), the substrate at any time $\tau$ is the closure of all log entries with timestamp $\leq \tau$.

## EAVT — what's in a log entry

Each entry asserts cells.
The minimum information is

$$\text{entry} \;=\; (E,\; A,\; V,\; T)$$

— **entity** (subject), **attribute** (predicate), **value** (object), **time** (timestamp).
Most logs carry additional metadata (the actor, the verb that produced the entry, a rationale, a rationale-hash for integrity, etc.), but EAVT is the minimum.

A single entry may assert multiple cells (a witness for a dispatch decision asserts the assignment cell, the status cell, possibly the load-counter cell).
The entry serializes as one line of JSONL with all the cells in a `cells:` field plus the metadata.

## What a log commits to

1. **Append-only**.
  New entries go at the end.
  Existing entries are not modified.
  (Compaction or archival may produce *new* logs derived from old; the original is not rewritten.)
2. **Total internal ordering**.
  Within a single log, entries are totally ordered by `T`.
  Ties are broken deterministically (typically by append order).
  The log records the ordering at write-time, not just the timestamp.
3. **No retroactive insertion**.
  Entries arrive at the end; an entry's `T` may name a past time (with `effective-at:` metadata) but the entry itself is appended now.
4. **Closure-friendliness**.
  The log's entries are designed to feed a closure-rule-system; a log whose entries can't be closed against a rule-system is an ill-formed log (or signals that the rule-system is incomplete).

## What kinds of cells go in logs

Cells whose authority comes from *the act of witnessing* — system transitions, observations, decisions made at a particular time.
Examples:

- A dispatch decision: the assignment cell.
- A task settling: the settling-cell.
- A captain's amendment to charter: the novation cells.
- An external request arriving: the intent cell.
- An agent's execution-event: the witness cells of what was done.

Cells whose value would *change* over time — a process's current load, a service's most-recent ping — are derivable cells; they may be implied by the log's recent entries but aren't typically logged each tick.
Logs hold *transitions*, not *running state*.

## What this concept does not yet specify

- The exact entry schema.
  Per-verb, currently; a uniform schema is partly settled.
- Compaction and archival.
  A long-running polity accumulates entries; compaction strategies (garbage-collect superseded cells, archive old shards) are open.
- Cross-polity log composition.
  When polities federate, their logs merge; the merge produces a single time-ordered sequence (or a partial order with tie-breaking) per upstream bilattice-network-sheaf-consensus.
- Cryptographic signing of entries for integrity.
  The realization currently does not sign; whether to sign by actor, by polity, or with a chain-hash is a program-shaping question.

## Distinguishing from related entries

- **Log vs. record**.
  A log entry is one tuple in an append-only sequence; a record is a self-contained markdown note.
  Records project; logs source.
- **Log vs. event log**. *The* event log is the principal log of a PyFARS instance; *a* log is any append-only EAVT resource.
  Future polities may have multiple logs (per-domain, per-deployment).
  Currently PyFARS has one; the concept admits more.
