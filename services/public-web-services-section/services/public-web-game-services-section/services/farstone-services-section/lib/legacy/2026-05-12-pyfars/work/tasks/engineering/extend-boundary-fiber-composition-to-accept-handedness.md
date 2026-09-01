---
title: "Extend the boundary fiber composition to accept handedness"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: boundary-records-with-handedness-coordinate
depends-on: [author-boundary-record-type]
requires-capabilities: [python-editing, fiber-algebra]
theory-basis: [boundary-as-fiber, swarm-participation-handedness]
---


## Description

Update `runtime/boundary.py` (or equivalent) so the boundary fiber composes from `identity + office + location + mode + scope-policy + handedness` — six coordinates instead of five.
The handedness coordinate is read from the boundary record's frontmatter at load time; closure rules over the boundary's fiber project this coordinate as `(boundary, has-handedness, <value>) = T`.

Per-handedness operation typing (extract / apply / compose) is keyed off this coordinate: code paths that previously assumed bidirectional now branch on `handedness:` to call the right interfacer machinery.
The fiber-algebra functions remain the same shape; what changes is the composition's domain (one extra coordinate) and the projection of handedness onto the closure-rule-readable cell.

## Acceptance

- [ ] `runtime/boundary.py` (or the boundary fiber module) accepts and propagates `handedness:` through the fiber composition.
- [ ] A boundary instance with each of the three handedness values produces well-typed fibers (no $\top$ on construction).
- [ ] The closure-rule-readable cell `(boundary, has-handedness, <value>) = T` is emitted on boundary load.
- [ ] Tests cover: bidirectional fiber, inbound-only fiber, outbound-only fiber, attempted boundary with missing handedness produces $\top$.

## Progress cells

*(empty — task not yet started)*
