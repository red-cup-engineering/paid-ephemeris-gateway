---
title: Relating Cells
type: lesson
requires:
  - 01-marks-and-utterances.md
teaches:
  - building a subject/predicate/object cell from a token and a claim
keywords: ["equivo", "descent", "relate"]
date-created: 2026-08-20
authors:
  - claude-fable-5
---

Now that a scenario is distinguished into a token and a claim, the second stage gives that pair
somewhere to *live*: a **cell**. A cell is a subject/predicate/object triple — the shape every
relation in this course is ultimately built from. `predicate` reads the potential you articulated
and produces the cell-set Φ = E × Π × E: an **entity set** (drawn from the token) and a
**predicate set** (drawn from the claim).

```
predicate({ potential: [token, claim] })
  →  { "cell-set": { entity-set: { entities: [token] }, predicate-set: { predicates: [claim] } }, ... }
```

For a single bare utterance, this produces exactly one entity and one predicate — the token
becomes the entity set's sole member, the claim becomes the predicate set's sole member. That's
not a simplification for teaching purposes; it's what the real function does with a single
scenario. Richer relations (several entities, several claims tying them together) are what the
**next lesson** starts to measure, and what
**Settling Equivalence** reads whole graphs of.

**Continuing the corner-invasion scenario**: the 3-3 stone (token) and the corner-invasion claim
distinguished last lesson relate into a cell whose entity set is `["3-3 stone"]` and whose
predicate set is `["corner-invasion"]`. Nothing has been measured yet — you don't yet know whether
the claim holds. You've only given it a structural home to be measured *in*.

```equivo-exercise
[
  {
    "kind": "relate",
    "prompt": "Relate the 3-3-stone scenario into its cell. What are the resulting entities and predicates?",
    "utterance": ["3-3 stone", "corner-invasion"]
  },
  {
    "kind": "relate",
    "prompt": "A fossil layer is found, asserting the site predates the eruption. Relate it into its cell: entities and predicates?",
    "utterance": ["a fossil layer", "the site predates the eruption"]
  },
  {
    "kind": "relate",
    "prompt": "An unrepeated experiment asserts its effect is real. Relate it into its cell: entities and predicates?",
    "utterance": ["an unrepeated experiment", "the effect is real"]
  }
]
```

A useful check on your own understanding, not graded here: notice that `predicate` never
evaluates whether the claim is *warranted* — it only builds the structure a later stage will
measure. A cell can hold a claim that turns out false just as readily as one that turns out true;
relating is purely about shape, not verdict. The verdict is next.

A quick review before you go on — the stage before this one, on a fresh scenario, to keep it warm:

```equivo-exercise
{
  "kind": "distinguish",
  "prompt": "Review: a sworn affidavit asserts the signature is authentic. What are the token and the claim, in order?",
  "utterance": ["a sworn affidavit", "the signature is authentic"]
}
```
