---
type: concept
class: system-projection
status: draft
depends-on: [substrate, projection, predication-cell]
realizes: [corpus]
---

# Corpus

The flatfile [projection](projection.md) of [substrate](substrate.md) state into a tree of YAML-frontmatter markdown notes.
Realizes the [flatfile-agentic-resource-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/) notion of *the corpus* as the primary human-readable surface of system state.

The corpus is what humans (captain, agents) directly read and edit.
It is *not* the canonical state — that is the [JSONL event log](../objects/jsonl-event-log.md).
The corpus is the reading projection PyFARS commits to producing, and re-reading, as system state evolves.

## The corpus is structured by slug

Every corpus note has a stable, lower-kebab-case *slug* — the filename minus the `.md` extension.
The slug is the substrate identity of the note: cells about that entity reference the slug in their subject (or object) position.
A note's filesystem path is metadata about *where* the note lives in the tree, not what entity it is about.

This decoupling matters because PyFARS allows notes to *move* between directories without changing identity.
A task-record's slug is its identity; whether it lives in `triage/` or `done/` is a settling state, recorded by predication-cells, projected into the filesystem.

## The corpus is structured by relations, not foreign keys

Notes refer to each other through frontmatter relations: `depends-on:`, `realizes:`, `see-also:`, `assigned-to:`, etc. These relations project predication-cells: the cell $(\text{this-note}, \text{depends-on}, \text{other-note}) = t$ projects as a frontmatter line `depends-on: [other-note]`.
Relations are *projections of system cells*, not foreign keys.

The [predication-graph](../objects/predication-graph.md) is the graph PyFARS derives from the union of all frontmatter relations across the corpus.
It is a partial projection — only those system cells that are projection-expressible in frontmatter relations make it into the graph; cells about other matters (e.g., free-text notes, speculative status, paraconsistent values) live elsewhere.

## The corpus is partitioned by directory, but not authoritatively

The directory tree provides navigation: notes about predication-categories live under `theories/.../predication-categories/`; PyFARS's own theory lives under `pyfars/theory/`.
The directory boundaries are a convenience for human reading and a hint to PyFARS's verbs about *kind* (a note in `theorems/` is presumed `type: theorem` unless its frontmatter declares otherwise).

But the directory is not authority.
Frontmatter declares the type, the kind, the relations.
A note misfiled in the wrong directory still reports its true type via frontmatter.
The captain may also invoke a `move` verb to relocate notes; the relocation is itself a substrate event, witnessed.

## The corpus admits being regenerated from the event log

Because the corpus is a projection, it can in principle be regenerated from the JSONL event log alone.
PyFARS does not currently regenerate the corpus from scratch on every operation (that would be prohibitive); but the regeneration *is* the canonical relationship.
When the corpus diverges from the event log (e.g., manual filesystem edits without corresponding events), PyFARS treats the divergence as a finding to surface, not as new truth — the event log wins.

## What this concept does not specify

- The directory taxonomy of any specific polity's corpus.
  PyFARS-the-package commits only to the corpus *shape* (markdown + YAML frontmatter + slug); the *organization* into directories is per-polity.
- The exact contracts for in-place edits (manual markdown edits) vs. verb-driven edits.
  The current realization tolerates both; the substrate-purity claim names how event correspondence is maintained.
