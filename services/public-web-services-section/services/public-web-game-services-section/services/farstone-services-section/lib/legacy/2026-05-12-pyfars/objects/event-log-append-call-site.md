---
type: definition
class: system-entity
status: draft
realizes: [surface-invariant-codepath]
depends-on: [jsonl-event-log, witness, substrate]
derives-from-claim: witness-emission-is-surface-invariant
implementation: pyfars.runtime.event_log.EventLog.append
theory-basis: [closure-2-monad, log-and-record-are-distinct-resource-types]
---

# Event-log-append call site

The system-resident record naming the canonical call site at which witnesses are appended to the JSONL event log.
The record makes the call site *system-readable* — a closure rule (see [`auditing-codepath-uniqueness`](../morphisms/auditing-codepath-uniqueness.md)) can read the record's frontmatter and verify, without re-grepping source code on each audit, that the realization's actual file-write site is the one named here.

Where the [`closure-rule-record`](closure-rule-record.md) entity stores closure rules as system cells so the runner reads from the system not from Python branches, this entity stores the canonical event-log-append call site as a system cell so the audit reads from the system not from filesystem grep.
Both are instances of the same discipline: system-readable engineering invariants.

## Markdown shape

The call-site record lives at `objects/event-log-append-call-site.md` (singleton — at most one per polity per event-log resource) and projects:

```markdown
---
type: event-log-append-call-site
slug: event-log-append-call-site
implementation-module: pyfars.runtime.event_log
implementation-class: EventLog
implementation-method: append
opens-path-pattern: <root>/<event-log-dir>/<YYYY-MM-DD>.jsonl
open-mode: a
realizes: [surface-invariant-codepath]
audited-by: auditing-codepath-uniqueness
---
```

## Cells

The record's frontmatter projects to the following cells under the bilattice value-domain $\mathbf{L} = \{\bot, \mathbf{t}, \mathbf{f}, \top\}$:

- `(event-log-append-call-site, implementation-module, "pyfars.runtime.event_log") = `$\mathbf{t}$
- `(event-log-append-call-site, implementation-class, "EventLog") = `$\mathbf{t}$
- `(event-log-append-call-site, implementation-method, "append") = `$\mathbf{t}$
- `(event-log-append-call-site, opens-path-pattern, "<root>/<event-log-dir>/<YYYY-MM-DD>.jsonl") = `$\mathbf{t}$
- `(event-log-append-call-site, open-mode, "a") = `$\mathbf{t}$
- `(event-log-append-call-site, audited-by, auditing-codepath-uniqueness) = `$\mathbf{t}$

## Singleton constraint

There is at most one `event-log-append-call-site` record per polity per event-log resource.
If a future PyFARS commit added a *second* such record (e.g., for a hypothetical second event log), the substrate would carry two singleton-typed cells of the same kind, which is a $\top$-cell condition under [`witness-emission-is-surface-invariant`](../claims/witness-emission-is-surface-invariant.md)'s codepath-uniqueness clause; the [`auditing-codepath-uniqueness`](../morphisms/auditing-codepath-uniqueness.md) morphism produces a finding on this state.

Multiple event-log resources within one polity (an event-log per purpose: audit, federation, debug) would each have their *own* singleton call-site record, by the same shape; the singleton-per-resource pattern remains.

## What this object does not specify

- It does not specify the *Witness payload schema*.
  The schema is owned by [`witness`](../concepts/witness.md) and the implementation entity at [`pyfars/entities/witness.py`](../src/pyfars/entities/witness.py).
- It does not specify *which* surfaces are permitted to call `EventLog.append`.
  The set of permitted surfaces is open; the call-site object only constrains *where the file open occurs*.
- It does not specify *concurrency semantics* of the call.
  Per [`event_log.py`](../src/pyfars/runtime/event_log.py) line 20–22, "the JSONL append-line semantics are atomic enough on POSIX for single-writer use.
  Multi-writer setups would need a more careful implementation."
  Multi-writer cases lie outside the singleton constraint and would require a separate decision.
- It does not specify *file rotation* policy.
  The `<YYYY-MM-DD>.jsonl` pattern is per-day rotation; archival and compaction are operational concerns the call-site object does not bind.

## Use in audit

When [`auditing-codepath-uniqueness`](../morphisms/auditing-codepath-uniqueness.md) fires, it reads:

- This record's `implementation-module`, `-class`, `-method`, `opens-path-pattern`, `open-mode` cells.
- A code-survey result (a list of source-code locations that match the pattern `*.open(path-matching-opens-path-pattern, "a")` or equivalent) provided as input cells.

The morphism produces a finding when (a) the code-survey returns more than one match, (b) the code-survey returns zero matches (the named call site has been removed), or (c) the named call site's source location does not match the expected module/class/method.

The audit is *static* (does not require running pyfars); the closure rule consumes the survey result as input cells, rather than performing IO itself.
