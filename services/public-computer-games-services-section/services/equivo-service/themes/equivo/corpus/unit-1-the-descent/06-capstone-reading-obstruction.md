---
title: Reading Obstruction
type: lesson
requires:
  - 05-observing-regimes.md
teaches:
  - putting all five stages of the descent together on new scenarios
keywords: ["equivo", "descent", "capstone"]
date-created: 2026-08-20
authors:
  - claude-fable-5
---

You've now run every stage of the descent by hand at least once: articulate a scenario into a
potential, relate it into a cell, measure the cell's charge, settle a relation and read H⁰ off its
components, and observe a settling's regime and H¹ off its firing structure. This lesson doesn't
teach anything new — it asks you to recognize which reading a fresh scenario calls for, and run it
correctly, without the lesson telling you in advance which stage you're in.

That recognition is the actual skill "observing equivalence by measuring obstruction" names. It
isn't one computation — it's knowing, from a scenario alone, whether the honest next move is to
measure a charge, settle a relation, or classify a regime, and then actually running that
computation rather than guessing at its shape.

**A charge to measure**: a single eyewitness claims the light was red. One witness, one claim —
you've seen this shape three times now.

**A relation to settle**: four entities in a straight chain, A through D, each equivalent to the
next. No branching, no cycle back.

**A relation to settle, with a twist**: two separate triangles — A/B/C cycling back to A, and,
independently, D/E/F cycling back to D. Two disjoint components, each one carrying its own cycle.

**A settling to observe, plain**: four ordinary successor stages, no limit anywhere.

**A settling to observe, with real structure**: a settling that reaches a limit stage where
nothing fires (a Scott closure — don't be fooled into calling this transfinite just because it
touched a limit stage at all), grows one more ordinary step, and *then* fires something new at a
second limit stage.

```equivo-exercise
[
  {
    "kind": "measure",
    "prompt": "A single eyewitness claims the light was red. What charge does this cell settle to?",
    "utterance": ["a single eyewitness", "the light was red"]
  },
  {
    "kind": "settle",
    "prompt": "A-B-C-D in a straight chain, each equivalent to the next. Does this settle to one equivalence class?",
    "cells": [
      { "subject": "A", "predicate": "equivalent-to", "object": "B" },
      { "subject": "B", "predicate": "equivalent-to", "object": "C" },
      { "subject": "C", "predicate": "equivalent-to", "object": "D" }
    ]
  },
  {
    "kind": "settle",
    "prompt": "Two separate triangles: A-B-C cycling back to A, and independently D-E-F cycling back to D. Does this settle to one equivalence class?",
    "cells": [
      { "subject": "A", "predicate": "equivalent-to", "object": "B" },
      { "subject": "B", "predicate": "equivalent-to", "object": "C" },
      { "subject": "C", "predicate": "equivalent-to", "object": "A" },
      { "subject": "D", "predicate": "equivalent-to", "object": "E" },
      { "subject": "E", "predicate": "equivalent-to", "object": "F" },
      { "subject": "F", "predicate": "equivalent-to", "object": "D" }
    ]
  },
  {
    "kind": "observe",
    "prompt": "Four ordinary successor stages, no limit anywhere: {a}, {a,b}, {a,b,c}, {a,b,c,d}. What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "b"] },
      { "designated": ["a", "b", "c"] },
      { "designated": ["a", "b", "c", "d"] }
    ]
  },
  {
    "kind": "observe",
    "prompt": "A settling reaches a limit stage where nothing fires, takes one more ordinary step, then fires something new at a SECOND limit stage: {a}, {a,b}, {a,b} (limit, nothing new), {a,b,c}, {a,b,c,d} (limit, d is new). What regime, and does H1 vanish?",
    "stages": [
      { "designated": ["a"] },
      { "designated": ["a", "b"] },
      { "designated": ["a", "b"], "limit": true },
      { "designated": ["a", "b", "c"] },
      { "designated": ["a", "b", "c", "d"], "limit": true }
    ]
  }
]
```

That last exercise is the whole course in one scenario: touching a limit stage is not, by itself,
an obstruction — the settling passes clean through its first limit with nothing new, exactly as
the "scott" regime describes, and only the *second* limit, where a genuinely new cell fires, earns
the transfinite classification and a nonzero H¹. Equivalence and obstruction are both read off
what actually happened in the structure, never off which stage merely *touched* a limit ordinal.

If you cleared all five, you've completed a real pass through Equivo's core loop — not once, but
across three progressively harder readings of it. The obstruction you measured in the two-triangle
exercise and the transfinite settling above aren't different phenomena wearing the same name by
coincidence: both are genuine leftovers, read off real structure, that no amount of local patching
resolves. That's what "obstruction" means here, every time.
