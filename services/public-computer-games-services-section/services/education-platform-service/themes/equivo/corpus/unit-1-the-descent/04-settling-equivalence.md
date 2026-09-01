---
title: Settling Equivalence
type: lesson
requires:
  - 03-measuring-charge.md
teaches:
  - reading H0 (equivalence classes) off a relation's own connectivity
keywords: ["equivo", "descent", "settle"]
date-created: 2026-08-20
authors:
  - claude-fable-5
---

Every relation you've built so far has had one cell. This lesson is where things get genuinely
interesting: a **relation** is a whole list of cells — subject/predicate/object triples — and the
question "are these entities equivalent?" becomes a question about the *shape* of that list, not
about any single cell in isolation.

Read a relation's cells as a directed graph: each cell `(subject, predicate, object)` is an edge
`subject → object`. From that graph alone, `cohomologyOfRelation` builds the cellular cochain
complex

```
C⁰ = ℤ^entities  --δ⁰-->  C¹ = ℤ^cells
```

and reads its cohomology **combinatorially** — no linear algebra, no matrix rank, just
union–find over the entities:

- **H⁰** — the 0-cocycles, functions that stay constant on every edge. A function like this is
  exactly one that's constant on each connected component, so **H⁰'s rank equals the number of
  connected components**. Rank 1 means the whole relation collapses to one equivalence class —
  everything really is the same thing, by the relation's own evidence. Rank 2 or more means it
  splits into that many separate classes.
- **H¹** — the leftover. Its rank is `|cells| − |entities| + (number of components)`, the first
  Betti number. A tree-shaped relation (however large) always has H¹ = 0: every edge is exactly
  as needed to connect its component, nothing more. A relation with a genuine **cycle** — a path
  that returns to where it started through more than one route — has H¹ ≠ 0: an obstruction, a
  real leftover that no local patch removes, because it's a structural fact about the graph
  itself.

This is the headline computation of the whole course. "Equivalent" **is** H⁰ = 1. "Obstructed" is
H¹ ≠ 0. Neither is a metaphor — both are read off a real graph, by a real algorithm, every time.

**Worked example**: the relation `A —equivalent-to→ B`, `B —equivalent-to→ C` is a simple chain —
three entities, two edges, one component. H⁰ rank 1 (equivalent), H¹ rank 0 (no cycle, no
obstruction). Change the second edge to `C —equivalent-to→ D` instead of reusing `B`, and you get
two disjoint pairs — four entities split into two components. H⁰ rank 2: **not** equivalent, by
the relation's own structure, regardless of what anyone intended when writing it down.

```equivo-exercise
[
  {
    "kind": "settle",
    "prompt": "A relates to B, B relates to C (a chain). Does this settle to one equivalence class?",
    "cells": [
      { "subject": "A", "predicate": "equivalent-to", "object": "B" },
      { "subject": "B", "predicate": "equivalent-to", "object": "C" }
    ]
  },
  {
    "kind": "settle",
    "prompt": "A relates to B, and separately C relates to D. Does this settle to one equivalence class?",
    "cells": [
      { "subject": "A", "predicate": "equivalent-to", "object": "B" },
      { "subject": "C", "predicate": "equivalent-to", "object": "D" }
    ]
  },
  {
    "kind": "settle",
    "prompt": "Three separate pairs: A-B, C-D, E-F, none touching each other. Does this settle to one equivalence class?",
    "cells": [
      { "subject": "A", "predicate": "equivalent-to", "object": "B" },
      { "subject": "C", "predicate": "equivalent-to", "object": "D" },
      { "subject": "E", "predicate": "equivalent-to", "object": "F" }
    ]
  },
  {
    "kind": "settle",
    "prompt": "A hub relates to three separate leaves (a star). Does this settle to one equivalence class?",
    "cells": [
      { "subject": "hub", "predicate": "equivalent-to", "object": "leaf1" },
      { "subject": "hub", "predicate": "equivalent-to", "object": "leaf2" },
      { "subject": "hub", "predicate": "equivalent-to", "object": "leaf3" }
    ]
  },
  {
    "kind": "settle",
    "prompt": "A relates to B, B relates to C, and C relates back to A -- a genuine cycle. Does this settle to one equivalence class?",
    "cells": [
      { "subject": "A", "predicate": "equivalent-to", "object": "B" },
      { "subject": "B", "predicate": "equivalent-to", "object": "C" },
      { "subject": "C", "predicate": "equivalent-to", "object": "A" }
    ]
  }
]
```

A quick review of the previous stage before that last exercise settles in your memory --
measuring one more cell, freshly related:

```equivo-exercise
{
  "kind": "measure",
  "prompt": "Review: one lab result claims the compound is safe. What charge does this cell settle to?",
  "utterance": ["one lab result", "the compound is safe"]
}
```

Look closely at the last of the settle exercises once you've cleared it: the cycle **is** one equivalence class
(H⁰ rank 1 — every entity is still reachable from every other) *and* it carries a nonzero H¹. Being
equivalent and being obstructed are not opposites — a relation can settle to a single class while
still carrying a genuine leftover the class-count alone doesn't see. That distinction is exactly
what **Observing Regimes** makes central.
