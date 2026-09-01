---
name: "Auditing theory derivation coverage"
description: "Produces a triage note listing predication-categories entities not yet cited by any predicated-computing entity, creating the input the derive phase needs. Use at the start of a theory-derivation loop cycle."
---


## Requirements

- `git log` access to `theories/.../predication-categories/`
- `pyfars search` available

## Steps

1. Find new or modified predication-categories entities since the last audit (`git log --since=<date> -- theories/.../predication-categories/`).
2. For each, check whether any predicated-computing entity has `depends-on:` or `instantiates:` pointing to it (`pyfars search <slug>`).
3. Collect the slugs with no downstream citations.
4. Write a triage note to `operations/engineering/triage/` listing the uncited slugs and setting `requires-action: derive-into-predicated-computing`.

## Outcomes

A triage note in `operations/engineering/triage/` with `uncited-slugs:` populated.
An empty audit produces a note with `uncited-slugs: []` — absence of gaps is worth recording too.
