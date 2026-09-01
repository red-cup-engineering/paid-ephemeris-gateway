---
type: concept
class: flatfile-storable-entity
status: draft
depends-on: [entity, substrate, corpus, predication-cell]
realizes: [resource]
---

# Resource

An [entity](entity.md) that is *flatfile-stored* — represented by a flatfile artifact (a file in the polity's filesystem tree) whose content carries the entity's substrate-pertinent state.
Realizes the **R** in *Flatfile Agentic Resource System*: resources are what the system stores; agents act on them; the system's predication cells are derived from them or projected to them.

Resources are how PyFARS makes system state durable.
The substrate is abstract; the corpus is concrete; resources are the concrete files that bridge the two.

## The resource subtypes

PyFARS commits at minimum to two resource kinds, distinguished by their storage discipline:

| Resource kind | Storage discipline | Role | Realization |
|---|---|---|---|
| [log](log.md) | append-only EAVT (entity-attribute-value-time) | canonical event source | JSONL files (one event per line) |
| [record](record.md) | self-contained content with frontmatter | derivative projection / theory determination | Markdown files with YAML frontmatter |

Both are resources; both are flatfile-stored; both contribute to system state.
They differ in storage discipline and role:

- **Logs are canonical**.
  A log entry is *new truth*: a witnessed event introducing cells.
  Logs are append-only — each event is added to the end; existing entries are not modified.
- **Records are derived**.
  A record's content is derivable from the log + closure-rule-system + the record's authoring intent (for theory records).
  Records are *projections* of system state and *determinations* of theory.

This split is what the captain's [`THINGS-I-WANT-DONE.md`](../../../../THINGS-I-WANT-DONE.md) names: "PyFARS writes a bunch of files as Markdown note files when they should be appended to a JSONL EAVT append-only log.
Markdown records are meant to be projections of truth from those logs, or determinations of theories."

## Why resources need this distinction

If everything were a record (the current realization, mostly): every state change requires re-writing a note; concurrent edits conflict at the file level; the system's audit trail is the union of git commits rather than a clean event sequence; replay is git-replay (heavyweight, not designed for this).

If everything were a log (a hypothetical alternative): there are no human-readable artifacts; the substrate is opaque without a render layer; theory is unwriteable in the corpus-as-source-of-truth sense (theory is *authored content*, not derived event sequence).

The clean split: - **Logs hold the canonical event stream.** Every system transition is an event in the log.
Replay of the log + closure produces system state. - **Records hold derivative content.** Theory entries (concepts, objects, morphisms, claims) are *determinations* — author-asserted content.
Operational records (tasks, decisions, witnesses-as-summary) are *projections* of system state.
Both are resources; both are markdown; both have frontmatter.

A given entity may have both.
A polity has a *record* (`polity:561-group.md`) projecting its identity facts, AND its history is a sequence of *log* events (founding witness, populace-changes, charter-amendments, etc.).

## What this concept commits to

1. **Flatfile representation**.
  Resources are filesystem artifacts.
  Reading the polity's filesystem reads the polity's resources.
  No database mediates.
2. **Substrate-bearing**.
  Cells about a resource exist (its kind, its dependencies, its status).
  The resource and its cells are tightly coupled but distinct: the cell is the substrate truth; the resource is the projection or the source.
3. **Resource-as-projection vs. resource-as-source**.
  Records are typically projections (their content derives from system state).
  Logs are typically sources (their content produces system state via closure).
  Some resources play both roles in different cells.

## What this concept does not yet specify

- The complete resource taxonomy beyond log + record.
  Future resource kinds (signed certificates? binary artifacts? media? protocol-buffer-shaped event streams?) may emerge as the polity's needs grow.
- The migration discipline from "everything-is-a-record" (current realization) to "log + record split."
  Many cells currently live in markdown frontmatter that should live in JSONL events; the migration is the substantive work referenced in the refactor plan.
- The interaction with version control.
  Resources live in git; logs are append-only and play poorly with merge conflicts; records merge as text.
  The version-control discipline for the split is partly conventional.
