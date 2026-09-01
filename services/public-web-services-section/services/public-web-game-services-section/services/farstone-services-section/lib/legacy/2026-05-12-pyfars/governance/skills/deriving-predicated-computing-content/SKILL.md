---
name: "Deriving predicated computing content"
description: "Creates predicated-computing entities that realize predication-categories entities at the engineering level. Use when a triage note has requires-action: derive-into-predicated-computing."
---


## Requirements

- A triage note with at least one entry in `uncited-slugs:`
- Write access to `theories/.../predicated-computing/`

## Steps

1. Read each slug in `uncited-slugs:` using `pyfars context <slug>` to understand the entity.
2. Determine where its engineering realization belongs (concept in predicated-computing, morphism in AOP, object in FARS — choose the lowest concrete level).
3. Write the entity with `depends-on: [<predication-categories-slug>]` in frontmatter.
4. Update the triage note: add the new slug to `derived-entities:` and set `requires-action: lift-to-programmer-surface`.

## Outcomes

At least one new predicated-computing entity per uncited slug, each citing its mathematical source.
Triage note updated and ready for the lift phase.
