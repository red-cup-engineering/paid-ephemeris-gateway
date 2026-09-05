---
title: "Bind observations to session and dispatchable via reverse-edge cells"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: observation-cells-from-invocations
depends-on: [emit-observation-cells-on-invoke-completion]
requires-capabilities: [substrate-querying, predication-cell-graphs]
theory-basis: [observation-fiber-isolation, three-tier-memory]
---


## Description

The projector emits the cells `(observation, observes, <dispatchable>)` and `(observation, in-session, <session-id>)` on each observation.
This task implements the **reverse-edge query path**: walking from a dispatchable or session to its observations.

Per the [observation-fiber-isolation](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/observation-fiber-isolation.md) discipline, the cells live on observations, not on dispatchables or sessions.
So "all observations of D" is not "read D's frontmatter for an `observations:` list"; it's "scan observations whose `observes:` cell points to D".
The runtime needs an efficient query path for this.

Implementation: extend `substrate/index.py` (or equivalent) to maintain a reverse-edge index of `observes:` and `in-session:` predicates so a query takes constant time per result rather than scanning all observations.

## Acceptance

- [ ] `substrate/index.py` includes a reverse-edge index for `observes:` and `in-session:`.
- [ ] A query API: `substrate.query_observations_of(dispatchable_slug)` and `substrate.query_observations_in(session_id)`.
- [ ] The index is rebuilt on substrate-load (boot) and incrementally updated on observation emission.
- [ ] Query performance is $O(\text{matched results})$, not $O(\text{all observations})$.
- [ ] Tests cover: query D with no observations (empty result), query D with N observations across M sessions, query session S with all of D's observations from one tick.

## Progress cells

*(empty — task not yet started)*
