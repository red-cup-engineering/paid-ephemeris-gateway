---
name: "Synthesizing into FARS spec"
description: "Creates or extends FARS spec entities that instantiate AOP entities at the flatfile substrate, making theory concrete enough to derive implementation tasks from. Use when a triage note has requires-action: synthesize-into-fars-spec."
---


## Requirements

- A triage note with `lifted-entities:` populated
- Write access to `theories/.../flatfile-agentic-resource-system/`

## Steps

1. For each lifted entity, check whether a FARS spec entity already instantiates it (`pyfars context <slug>` from the FARS `_index.md`).
2. If missing, write the FARS entity with `instantiates: <aop-slug>` and `depends-on:` set.
3. If the AOP counterpart doesn't yet exist, update the triage note's `requires-action` back to `lift-to-programmer-surface` and stop.
4. Update the triage note: add new slugs to `fars-entities:` and set `requires-action: write-implementation-guide`.

## Outcomes

A FARS spec entity for each lifted entity, each citing its AOP counterpart via `instantiates:`.
Triage note updated and ready for the implementation guide phase.
