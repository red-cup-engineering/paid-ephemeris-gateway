---
name: "Authoring a narrative"
description: "Produces a narrative at `prose/narratives/<slug>.md` that walks a path through PyFARS self-theory material — linking objects, morphisms, concepts, and examples into a coherent story. Use after code for a slice exists and the theory↔practice fiber needs a through-line reading."
---


A narrative is a *reading* of existing self-theory material, not an authority over it.
The authoritative content lives in `objects/`, `morphisms/`, `concepts/`, `claims/`.
A narrative links those records into a story — answering the question "why are we doing all this?" from a particular angle.

Narratives are post-code.
They require that the objects, morphisms, and code they discuss already exist and have been tested.
A narrative about untested code is speculation; a narrative about an unimplemented spec is fiction.

## Requirements

- The `self-theory-author` office held.
- Existing `objects/`, `morphisms/`, `concepts/`, `claims/`, and `examples/` records for the material the narrative covers.
- Working code (passing tests) for the implementation the narrative describes.

## Steps

1. **Choose an angle.** A narrative covers one path through the material — one question it answers, one connection it makes, one reader it addresses.
  Examples: "How the closure cycle works end-to-end."
  "Why dispatch is composition."
  "What changes when authentication enters the web slice."
  The angle determines which records are load-bearing for this narrative.

2. **List the records the narrative walks through** in reading order.
  These become the `depends-on:` list.
  Also identify: records that should be *introduced before* the first listed item (`introduces:`), records *recapped after* the last listed item inline (`recaps:`), and records *discussed after* the last item in a grouped section (`discusses:`).

3. **Author the record** at `prose/narratives/<slug>.md`:
   ```yaml
   ---
   type: narrative
   title: "<angle as a short phrase>"
   status: draft
   depends-on: [<record-slugs in reading order>]
   introduces: [<slugs to introduce before the walk>]
   recaps: [<slugs to recap inline at the end>]
   discusses: [<slugs to discuss in a grouped section after>]
   ---
   ```
Body: 500–3000 words.
Write the walk.
Cite objects/morphisms/concepts by linking to their records; do not duplicate their content.
The narrative's value is the *path*, not the definitions — keep it moving.

4. **Check that every claim the narrative makes is grounded** in a cited record.
  A narrative that introduces new theoretical content is doing the wrong kind of work; that content belongs in an `objects/` or `claims/` record.

5. **Check the length.** If the narrative exceeds 3000 words, it is covering too many things — split it.
  If it is under 500 words, it is probably a remark (belongs in the relevant object or morphism record's body) rather than a narrative.

## Outcomes

- A `prose/narratives/<slug>.md` record at `status: draft`, providing a through-line reading of a self-theory slice.
- The narrative is indexed in `prose/narratives/_index.md`.

## Discipline notes

- **Narratives are not authoritative.** Multiple narratives can cover the same material from different angles without conflict.
  If a narrative and an object record disagree, the object record is right; update the narrative.
- **`draft` vs `current`.** A narrative at `draft` is in progress or awaiting review.
  Promote to `current` when it accurately reflects the current state of the records it cites.
  When a later narrative supersedes an earlier one for the same angle, delete the earlier one — keeping superseded narratives confuses readers.
- **Don't write narratives before code exists.** The implementation chain's post-code step (step 5) is when narratives are authored.
  A narrative about code that doesn't pass its tests yet is pre-emptive; wait for green.
