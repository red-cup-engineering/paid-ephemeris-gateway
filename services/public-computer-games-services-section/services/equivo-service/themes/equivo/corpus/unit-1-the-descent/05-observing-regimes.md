---
title: Observing Regimes
type: lesson
requires:
  - 04-settling-equivalence.md
teaches:
  - classifying a settling's regime and reading whether its H1 vanishes
keywords: ["equivo", "descent", "observe"]
date-created: 2026-08-20
authors:
  - claude-fable-5
---

Settling Equivalence read H⁰/H¹ off a *static* relation — a finished graph, all at once. This
lesson reads a different, complementary structure: a **settling** — a relation as it accumulates
*over time*, stage by stage, where each stage designates a cumulative set of cells and knowledge
only ever grows, never shrinks.

Some stages are ordinary **successor** stages — the next tick after the last one. Some are
**limit** stages — a stage reached only by taking the union of everything before it, not by a
single predecessor. This distinction is the entire content of this lesson: a cell that first
appears at a limit stage was not obtainable from *any* finite sub-stage on its own. That's a
genuinely different way for something to become true than "it followed from the previous step,"
and the settling's own cohomology tracks the difference exactly.

**The four regimes**, read directly off a settling's firing structure:

- **finite** — no limit stage at all. Everything accumulates by ordinary successor steps. H¹ = 0,
  always — there's nothing a finite process can leave obstructed in this sense.
- **scott** — there is a limit stage, but nothing new fires exactly at it (everything the limit
  stage "contains" was already reachable from stages before it — a Scott-continuous closure). Still
  H¹ = 0: the limit didn't contribute anything the finite stages hadn't already earned.
  \[Named for the same limit-preserving\-functions-are-what-matter idea as domain theory's
  Scott-continuity — the closure behaves as if the limit were redundant, because here it is.\]
- **transfinite** — something genuinely new fires *at* the limit stage itself — a cell reachable
  from no finite sub-stage. H¹ ≠ 0: each such cell is its own generator of the obstruction, a
  leftover no successor step could have produced on its own.
- **aperiodic** — a settling explicitly declared to keep firing cofinally through an *uncountable*
  sequence of limit stages, never actually stabilizing. H¹ ≠ 0 and never vanishes, by
  construction — this is the deepest regime the classifier recognizes, one only a declared
  (not merely observed) cofinal firing pattern reaches.

`classify` reads a settling's **depth** (the last stage anything fires, its closure ordinal) and
its **regime** (which of the four above). `h1` reads the count of cells that fired *exactly* at a
limit stage — the settling's own obstruction, read off its temporal firing structure rather than a
static graph's connectivity (Settling Equivalence's reading and this lesson's reading are two
different, complementary cohomologies of two different objects — a static relation versus a
temporal accumulation — and it's a genuinely interesting fact, not a coincidence, that both are
called H¹).

```equivo-exercise
[
  {
    "kind": "observe",
    "prompt": "A settling adds one cell per stage with no limit stage at all: {a}, {a,b}, {a,b,c}. What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "b"] },
      { "designated": ["a", "b", "c"] }
    ]
  },
  {
    "kind": "observe",
    "prompt": "A settling reaches a limit stage where nothing new fires (everything was already there), then one more successor stage adds a cell: {a}, {a,b}, {a,b} (limit), {a,b,c}. What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "b"] },
      { "designated": ["a", "b"], "limit": true },
      { "designated": ["a", "b", "c"] }
    ]
  },
  {
    "kind": "observe",
    "prompt": "A settling's very next stage is a limit stage, and a new cell fires exactly there: {a}, then {a,c} (limit). What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "c"], "limit": true }
    ]
  },
  {
    "kind": "observe",
    "prompt": "A settling grows normally, then TWO new cells fire simultaneously at a limit stage: {a}, {a,b}, {a,b,c,d} (limit, c and d both first appear here). What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "b"] },
      { "designated": ["a", "b", "c", "d"], "limit": true }
    ]
  },
  {
    "kind": "observe",
    "prompt": "A settling is explicitly declared to keep firing cofinally through an uncountable sequence of limit stages -- {a}, then {a,z} (limit), never stabilizing. What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "z"], "limit": true }
    ],
    "opts": { "cofinal": "uncountable" }
  }
]
```

A quick review of the previous, static reading before you move on -- one more relation to settle,
to keep the H⁰ question sharp alongside this lesson's temporal H¹ question:

```equivo-exercise
{
  "kind": "settle",
  "prompt": "Review: P relates to Q, and separately R relates to S. Does this settle to one equivalence class?",
  "cells": [
    { "subject": "P", "predicate": "equivalent-to", "object": "Q" },
    { "subject": "R", "predicate": "equivalent-to", "object": "S" }
  ]
}
```

Pay particular attention to observe exercise 4 once you've cleared it: two cells firing at the *same*
limit stage each count as their own generator — H¹ rank comes out **2**, not 1, even though it's
tempting to think of "one limit stage" as "one obstruction." That's not a rounding quirk; it's the
free abelian group on the newly-designated cells, counted exactly. A computation that surprises a
naive expectation like this is exactly the kind of evidence that the classifier is really running,
not narrating a pre-decided story.
