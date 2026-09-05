---
type: claim
status: draft
depends-on: [resource, log, record, jsonl-event-log, corpus-as-flatfile, jsonl-is-canonical-state, markdown-as-projection]
---

# Logs and records are distinct resource types in PyFARS

**Claim.** PyFARS's [resource](../concepts/resource.md) taxonomy commits to (at least) two distinct resource types — [log](../concepts/log.md) and [record](../concepts/record.md) — with distinct storage disciplines and distinct roles.
The split is load-bearing: conflating logs and records (storing transitions in markdown frontmatter, or carrying authored content in the JSONL log) defeats both substrate-purity and substrate-replayability.

## Statement

For any flatfile artifact $r$ in a PyFARS polity that is intended to be substrate-bearing:

$$r \in \text{Resources}(P) \;\Longrightarrow\; r \in \text{Logs}(P) \;\lor\; r \in \text{Records}(P)$$

— every substrate-bearing resource is either a log or a record (the union is exhaustive for the resource types PyFARS commits to).
Furthermore, the two sets are *distinguished by storage discipline and role*, not by file format alone:

- $r \in \text{Logs}(P)$ iff $r$ is append-only, EAVT-shaped, and its content is the source of substrate cells via closure (canonical events).
- $r \in \text{Records}(P)$ iff $r$ is self-contained, frontmatter-bearing, and its content is either a projection of substrate state or a determination of authored theory.

A given filesystem path is one or the other, not both.
A markdown file with prose-content-plus-frontmatter is a record; a JSONL file with one event per line is a log.
Mixed-content files are ill-formed.

## Sketch

### (1) Storage disciplines are inverse

A log's storage discipline is *append-only with monotonic time order*.
A record's storage discipline is *self-contained with content that may be revised*.
These are inverse: the log is forbidden from rewriting; the record is allowed to evolve.
They cannot share storage discipline.

### (2) Roles are inverse

A log is the source of substrate cells (events introduce cells; closure derives consequences).
A record is a projection or determination (its content is derived from cells, or asserted-authoritatively-by-author).
The two roles cannot be filled by the same discipline.

### (3) Conflation breaks audit

If transitions were stored in record frontmatter (i.e., manual edits to an `assignment-cell:` field directly in a task's frontmatter), there would be no event-log entry corresponding to the transition; the audit trail would be the git history of the record file (heavyweight, not designed for substrate auditing).
Replay of substrate state from logs alone would miss the manually-edited cells.

If authored theory content were stored in the event log (an event with body "this is the definition of substrate-purity..."), the log would carry vast amounts of human-readable content that's unrelated to closure; replaying the log would reconstruct theory content from log content rather than from author-assertion; the author's intent would be invisible to closure (which doesn't read body content).

Either conflation breaks essential properties.

[Gap: PyFARS's *current* realization has not fully migrated to the log/record split.
Many cells that should be log events live in record frontmatter (work-records carrying their own status field as if the field were source-of-truth).
The Phase C and D refactors include moving these cells into log events.]

## Discussion

### What this claim does

It commits PyFARS to a clean substrate architecture: events go in logs; authored content goes in records.
The two are different files with different conventions.
A polity reading its own substrate knows which to look at for which question:

- "What happened?" — read the log.
- "What does the polity think?" — read the records.
- "What's the substrate state right now?" — closure of log events under closure-rule-systems.
- "How does the polity define X?" — read X's record (a concept, an object, a theorem).

### What this claim does not say

- It does not say records cannot reference cells.
  Record frontmatter projects substrate cells (per [`governance-frontmatter-is-substrate`](governance-frontmatter-is-substrate.md)).
  The point is that those projections are *derived from log events*, not in-themselves the source of truth.
- It does not say PyFARS-the-package's current code respects the split.
  Currently it doesn't fully.
  The claim is a constraint on what the realization ought to satisfy; the migration is the work.
- It does not say only two resource types will exist forever.
  Future resource types may emerge (binary artifacts, signed certificates, structured event streams in non-JSONL formats).
  The claim is that *as of now*, log and record cover the FARS resource surface.

### What would have to change for this claim to fail

- If the realization adopted a single resource type (e.g., everything-as-records, where transitions are encoded as record-edits) and built audit/replay around git history rather than around logs, the claim would fail.
  Fix: keep logs as a distinct resource type; route transitions through them.
- If the realization grew a third resource type that didn't fit either discipline (e.g., a streaming-protocol resource), the "exhaustive" qualifier would weaken.
  The claim's "at least" already admits this: the *minimum* split is log + record.
- If logs and records turned out to be the same thing under closer examination (storage-equivalent or role-equivalent), the claim's distinction would vanish.
  The current reading of FARS theory and the substrate-purity discipline argues against this.

## What this claim makes possible

- **Replayability**: substrate at time $\tau$ is the closure of log events with timestamp $\leq \tau$.
  Records are derived from substrate; they're projections that can be regenerated.
- **Author-asserted theory**: theory records are determinations — the author's content.
  They live in records, not logs, because they're not events.
- **Lightweight runtime**: a PyFARS instance can rebuild its substrate from logs; the records are projections that may be cached and regenerated.
  This makes recovery, federation, and migration tractable.
- **Substrate-purity**: every cell traces to its log event.
  Records that carry cell-projections trace through their projection-source to log events; manually-edited records that diverge from the log are findings, not new truth.

## Migration discipline

Currently, many cells in pyfars-the-realization live in record frontmatter (e.g., a task's `status:` field is in its markdown record's frontmatter).
Per the captain's [`THINGS-I-WANT-DONE.md`](../../../../THINGS-I-WANT-DONE.md): "Markdown records are meant to be projections of truth from those logs, or determinations of theories."
The migration moves cell sources from record frontmatter to log events; record frontmatter then *projects* the cell, but does not *contain* it as source.

The migration is substantive (touching most of PyFARS's record-handling code).
Per the work-orchestration refactor plan, it is a multi-phase effort.
The first phase is naming the split (this claim and its supporting concepts).
Subsequent phases are moving specific cell-kinds (work-status, assignment-cells, etc.) from record frontmatter to log events.
