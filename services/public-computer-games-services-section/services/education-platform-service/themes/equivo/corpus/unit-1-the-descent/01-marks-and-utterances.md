---
title: Marks and Utterances
type: lesson
requires:
  - 00-welcome.md
teaches:
  - distinguishing token from claim
keywords: ["equivo", "descent", "distinguish"]
date-created: 2026-08-20
authors:
  - claude-fable-5
---

The descent's first move is the smallest one: take a raw scenario and pull two things out of it
without deciding anything else yet. Something is *there* — a token, a mark, a thing pointed at.
Something is *said about it* — a claim, a predicate-in-waiting. Keeping those two apart, cleanly,
is what `articulate` does.

```
articulate([token, claim])  →  { potential: [token, claim] }
```

It is deliberately not doing anything clever. It witnesses the pair — that's the whole operation.
The reason this deserves its own stage, rather than being folded into "relating" (next lesson), is
that conflating a token with the claim made about it is the single most common way an
equivalence judgment goes wrong later on: you cannot ask "are these the same?" honestly until you
know which part of what you're looking at is the thing, and which part is the assertion about the
thing.

**A scenario**: a 3-3 stone is played directly in a corner. The *token* is the stone itself — a
concrete move, on the board, right now. The *claim* is what that move asserts: a corner invasion,
territory not yet settled. Distinguish them, and you can go on to ask whether the claim is
warranted. Conflate them, and every later question about whether the position "is" a corner
invasion becomes unanswerable, because you never separated the move from the assertion in the
first place.

Every exercise below runs the real `articulate` function on the scenario's utterance and checks
your answer against what it actually returns — not against a pre-written key.

```equivo-exercise
[
  {
    "kind": "distinguish",
    "prompt": "A 3-3 stone is played, asserting a corner-invasion. What are the token and the claim, in order?",
    "utterance": ["3-3 stone", "corner-invasion"]
  },
  {
    "kind": "distinguish",
    "prompt": "A witness takes the stand and asserts the defendant was present. What are the token and the claim, in order?",
    "utterance": ["a witness statement", "the defendant was present"]
  },
  {
    "kind": "distinguish",
    "prompt": "An unreviewed manuscript is submitted, asserting it has reached peer consensus. What are the token and the claim, in order?",
    "utterance": ["an unreviewed manuscript", "peer-consensus"]
  }
]
```

Notice the pattern: in every case, `articulate` hands back exactly the pair you gave it, in order
— it never reorders, never infers which side is "really" the subject. That's intentional. Deciding
which atom plays which role in a relation is the *next* stage's job, not this one's. Getting this
stage right is entirely about resisting the urge to skip ahead — do not try to judge whether the
claim is true yet. That question doesn't even make sense until **Relating Cells**
gives the claim somewhere to land.

One preview, before you move on — the next stage in one bite, so you've already seen its shape
before the next lesson names it formally:

```equivo-exercise
{
  "kind": "relate",
  "prompt": "Preview: a photograph is taken, asserting the bridge was still standing yesterday. Relate this scenario into its cell -- what are the resulting entities and predicates?",
  "utterance": ["a photograph", "the bridge was still standing yesterday"]
}
```
