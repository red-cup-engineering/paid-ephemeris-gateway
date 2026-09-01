---
name: "Lifting to programmer surface"
description: "Creates AOP or FARS theory content that surfaces what engineers need to know to implement new predicated-computing entities. Use when a triage note has requires-action: lift-to-programmer-surface."
---


## Requirements

- A triage note with `derived-entities:` populated
- Write access to `theories/.../agential-orchestration-platform/` and `theories/.../flatfile-agentic-resource-system/`

## Steps

1. For each derived entity, ask: what does a developer need to know to implement this?
2. Write the answer as an AOP or FARS concept, morphism, or example with `depends-on:` pointing back to the predicated-computing entity.
3. If the right answer is unclear, file a question in the FARS spec's `questions/` directory instead of guessing.
4. Update the triage note: add new slugs to `lifted-entities:` and set `requires-action: synthesize-into-fars-spec`.

## Outcomes

At least one AOP or FARS entity per derived entity that answers the developer's implementation question.
Triage note updated and ready for the synthesize phase.
