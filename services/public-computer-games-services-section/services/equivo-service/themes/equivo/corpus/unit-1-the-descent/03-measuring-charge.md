---
title: Measuring Charge
type: lesson
requires:
  - 02-relating-cells.md
teaches:
  - assigning a FOUR-value bilattice charge from evidence
keywords: ["equivo", "descent", "measure"]
date-created: 2026-08-20
authors:
  - claude-fable-5
---

A cell exists; now it gets **measured**. `posit` reads the evidence a cell has actually been
given and assigns it a **charge** — one of four values, the bilattice's own vocabulary:

| Charge | Knowledge bit | Truth bit | Meaning |
|---|---|---|---|
| **absurd** | false | false | nothing asserted either way |
| **potential** | true | false | asserted, not yet confirmed |
| **active** | false | true | confirmed, not yet asserted with a positive witness |
| **stable** | true | true | asserted *and* confirmed — both bits lit |

The key discipline here, and the reason this stage is called *measuring* rather than *deciding*:
`posit` never lets you stamp a value for free. It reads the charge off the evidence the cell
actually carries — for a single freshly-related cell with exactly one witness (the token itself),
that evidence supports **potential**, and nothing more. The claim has been made — that's real, and
it's what the knowledge bit records. But nothing yet confirms it — no second, independent witness
has weighed in — so the truth bit stays unlit. This isn't a limitation of the exercise; it's what
one piece of evidence, honestly measured, actually earns. A single sensor reading, one favorable
review, one rumor, one data point — each of these makes a real claim (potential), but none of them
alone is enough to call the claim confirmed (stable). Confirming a claim takes a second,
independent source settling into agreement with the first — which is exactly what
**Settling Equivalence** starts to measure across *multiple* related
cells at once, not just one.

`settle` then runs this charge to its fixed point. For a single cell with no other cell to join or
meet against, the fixed point is the charge it started at — there's nothing yet for it to settle
*into*. This is worth predicting correctly precisely because it's tempting to overclaim: seeing
"the bridge is structurally sound" asserted feels like it should count for something stronger than
potential. The measurement says otherwise, honestly, every time — and the checker below runs the
real computation, not a lesson author's intuition about how confident the scenario "sounds."

```equivo-exercise
[
  {
    "kind": "measure",
    "prompt": "A single sensor reading claims the bridge is structurally sound. What charge does this cell settle to — as a [knowledge, truth] pair?",
    "utterance": ["a single sensor reading", "the bridge is structurally sound"]
  },
  {
    "kind": "measure",
    "prompt": "One favorable review claims the paper is correct. What charge does this cell settle to?",
    "utterance": ["one favorable review", "the paper is correct"]
  },
  {
    "kind": "measure",
    "prompt": "A rumor claims the merger is happening. What charge does this cell settle to?",
    "utterance": ["a rumor", "the merger is happening"]
  },
  {
    "kind": "measure",
    "prompt": "A single data point claims the trend is real. What charge does this cell settle to?",
    "utterance": ["a single data point", "the trend is real"]
  }
]
```

If you predicted **stable** for any of these, look again at what evidence the cell was actually
given: one witness, asserting, with nothing yet confirming it independently. That gap — between
what feels confirmed and what the measurement actually supports — is the entire reason a
Duolingo-for-mathematics course exists at all: the discipline is learnable, and it's learnable
specifically because the checker never grades on vibes.

A quick review of the previous stage before you move on, relating one more scenario into its cell:

```equivo-exercise
{
  "kind": "relate",
  "prompt": "Review: a soil sample is taken, asserting the field was flooded last spring. Relate it into its cell -- entities and predicates?",
  "utterance": ["a soil sample", "the field was flooded last spring"]
}
```
