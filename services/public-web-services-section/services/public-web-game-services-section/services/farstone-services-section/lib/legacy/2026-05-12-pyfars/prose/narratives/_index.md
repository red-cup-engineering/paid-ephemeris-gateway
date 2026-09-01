# narratives/

Short rhetorical documents that walk a path through PyFARS-self-theory material, linking objects, morphisms, theorems, concepts, and examples into a story.
One path per file.

Narratives are not authoritative for the theory.
The authoritative content lives in `objects/`, `morphisms/`, `theorems/`.
A narrative is a *reading* of that material.
Multiple narratives can cover the same content from different angles without conflict.

This is where the through-line work happens.
Atomization makes definitions precise but loses the question "why are we doing all this."
Narratives answer that question, repeatedly, from different angles, without forcing a single canonical story.

## Frontmatter

```yaml
---
type: narrative
status: draft | current
depends-on: [...]                # the notes the narrative walks through
introduces: [...]                # placed before the first listed item
recaps: [...]                    # placed after the last listed item, inline
discusses: [...]                 # placed after the last listed item, grouped
---
```

`current` is the working state.
When a later narrative replaces an earlier one for its angle, the earlier file is *deleted* — keeping a superseded narrative confuses readers about which is live.

## Length

Aim for 500–3000 words.
A narrative longer than that is doing too many things; split it.
A narrative shorter than that is probably a discussion paragraph that belongs inside an object or theorem note.

## Examples of narrative angles

- "How PyFARS realizes the closure 2-monad: from substrate to settling."
- "The verb-as-morphism reading: why dispatch is composition."
- "The web app as a public projection: what changes when authentication enters."
- "Where PyFARS chooses contingently and where it commits."
- "From flatfile to predication graph: the substrate's two faces."

A narrative does not need to be exhaustive.
It should be a *good walk*, not a survey.

## When narratives become papers, posts, or docs

Eventually some narratives will become external-facing writing — public posts, package documentation, monograph chapters.
That is an output, not a goal that should pull narratives toward output-shape.
A narrative that reads like a paper introduction is fine; one that reads like a paper section is probably trying to do work that an `objects/`, `morphisms/`, or `theorems/` note should be doing.
