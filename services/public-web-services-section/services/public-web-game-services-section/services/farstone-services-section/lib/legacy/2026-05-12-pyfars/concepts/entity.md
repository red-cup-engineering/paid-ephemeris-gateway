---
type: concept
class: system-bearing-thing
status: draft
depends-on: [predication-cell, substrate]
---

# Entity

Anything that can be a subject or object of a [predication-cell](predication-cell.md).
The most generic substrate-bearing thing: polities, ships, offices, personnel, agents, work records, logs, harnesses, files, processes, time-points, scalar values, abstract concepts — every $s$ and $o$ in $(s, p, o)$ ranges over entities.

The notion is upstream — predication-categories' `class: entity` classifier names this — but PyFARS makes the role explicit so subsequent concepts (resource, log, record) can position themselves precisely.

## What ranges over entity

In PyFARS, every cell's subject is an entity, and every object is either an entity or a literal value (timestamp, count, free-text string).
The set of entities a polity recognizes is itself system content — recognized by being the subject or object of at least one cell with $\mathbf{t}$ value.

Entities are not all *kinds*.
The kind taxonomy classifies entities by their substrate role:

| Entity kind | Examples |
|---|---|
| Substrate-storage | log, record (see below) |
| Polity-jural | polity, office, duty, power, charter |
| Polity-personnel | personnel, agent, principal, user-account |
| Operational | task, intent, goal, milestone, witness, audit |
| Theoretical | concept, object, morphism, claim, question |
| Physical | computer-system, ship, asset |
| Temporal | time-point, cycle, watch, shift |

A single system cell asserts a relation between any two of these.
The system's expressive power comes from the fact that the predication relation `p` ranges over a controlled but extensible vocabulary; entities range freely; and the bilattice value carries the system's epistemic stance.

## Entity vs. resource

Many entities are *not* resources — they don't have a flatfile representation in their own right.
An *abstract concept* like `truth` or `dispatch` is an entity (cells about it exist); but the concept's flatfile presence is via a [record](record.md) about it (a concept note in `theory/concepts/`).
The concept is the entity; the note is the resource projecting it.

This distinction is essential for the [resource](resource.md) taxonomy: not every entity has a 1-to-1 resource representation.
Many entities live in system cells without dedicated resource files; a few (the major ones — polities, offices, personnel, etc.) typically have dedicated records.

## What this concept commits to

1. **Universal substrate participation**.
  Every entity is cell-bearing — it can appear as $s$ or $o$ in some cell.
  An entity that's never the subject or object of any cell is, in the system terms, not yet recognized.
2. **No special entity types**.
  Entity is not a type in the programming-language sense; there's no Python class hierarchy for entities.
  Entities are distinguished by the cells about them, not by structural inheritance.
3. **Identity by slug**.
  An entity has a stable identifier — typically a slug like `polity:561-group` or `task-42`.
  Slugs are unique within a polity; an entity persists across renames if witnessed via the rename-slug verb.

## What this concept does not yet specify

- The complete entity-kind taxonomy.
  The table above is illustrative; the full taxonomy emerges as the polity grows.
- The handling of cross-polity entities.
  When two polities reference the same entity (a shared user-account, a federated asset), the entity has identity in both polities; the discipline for cross-polity entity reconciliation is upstream and partly settled.
- The handling of literal values that *might* be entities.
  A timestamp is a literal value most of the time; it could become an entity if the polity starts asserting cells about it (`(2026-05-07, marks, equinox)`).
  The boundary between literal-value and entity is contextual.
