---
title: "Koios as a publication game"
date: 2026-06-16
description: "A map from Koios.News content production into the repo's relating, agent, game, and computing stack."
---

# Koios as a publication game

Koios.
News should not grow a private theory of content production beside the repo's deeper computing work.
The useful direction is:

```text
relating -> agents -> games -> computing -> content-production -> Koios.News
```

Using `@emsenn/computing` from content-production is therefore not bypassing the game layer.
It is using the computing projection of the underlying game machinery.

## The current skeleton

The farm cycle already has a game-shaped form:

1. Demand assigns pressure: a term and beat want attention.
2. Intake witnesses the board state: source items exist, fail, or obstruct.
3. The support walk settles the playable assignment: demand must meet evidence.
4. Selection chooses the subject story through a lens.
5. Composition makes a move: draft plus deterministic copyedit closure.
6. Gates judge the move as charged editorial evidence.
7. Recording projects the settlement into a carrier: markdown candidate, run trace, work item, or newsroom assertion trace.
8. Compost preserves withheld and obstructed play as future evidence.

Named concept: **publication game**.
Demand is the pressure.
Intake is the board state.
The farm profile is a strategy over that state.
A draft is a move.
Gate judgment is the rule system.
Compost is the retained history.
Publication is a projection of play, not the only result.

## What changed today

The farm service had one bespoke bridge into computing.
It manually split cycle readings into `observedEvents` and `auditedCells`, then called computing's provenance constructor.

That worked, but it left content-production owning a small piece of computing's observation logic.
The replacement is `observeLabels()` in `@emsenn/computing/computer`.

`observeLabels()` takes finite labels with charge values, promotes them to settled memes, and runs the existing observation map:

```text
label + charge -> settled meme -> observed arena -> derivation provenance
```

Content-production now supplies only the farm policy:

- a property that committed a candidate is charged `potential`;
- a property that obstructed is charged `stable`, so it remains audit evidence rather than a polarized event.

Computing owns the carrier promotion and the charge-to-polarity observation map.
That is the desired replacement pattern: remove bespoke content-production machinery by parameterizing the already-existing game/computing forms.

The farm cycle now carries the full computing `Observation`, not only the provenance projection.
That matters for inspection surfaces.
A browser, MCP tool, or CLI can read the cycle as:

```text
FarmCycle
  readings: property-level demand/run judgments
  observation.arena: the polarized event structure of the cycle
  observation.provenance: the derivation chain and audit cells
  provenance: convenience projection of observation.provenance
```

This is a small but important shift: the farm is no longer merely stamped with a computing receipt.
It exposes the finite observation it just made.

## The invariant pressure

Relationality's recent carrier-identity change is the same lesson at a lower layer.
A cell is not "the same" because two strings compare equal.
A relational cycle exists only when the terms and predicates are the same carriers.

That matters for Koios because news production constantly wants to rebuild labels:

- the same beat name;
- the same property name;
- the same source URL;
- the same gate;
- the same claim subject.

At projection boundaries, values are useful.
In the core, the system needs the carrier.
Koios can publish strings, JSON, feeds, and pages, but the newsroom game underneath has to know which marks, tokens, claims, utterances, and settled readings those surfaces project from.

## Next replacement seams

The small `observeLabels()` refactor suggests a larger path.

### Demand as Opponent pressure

Demand entries are currently content-farm records.
They can likely become a parameterized form of game input: an Opponent pressure over a term space, with support judgment deciding which pressure is admitted.

Useful name: **assignment as admitted pressure**.

### Gates as strategy laws

The gate list is already close to a strategy well-formedness report: each gate returns a witness or obstruction with evidence.
The farm's "publishable" read is the conjunction of those gate witnesses.

Useful name: **editorial strategy report**.

### Compost as play history

Compost is not trash.
It is the retained history of moves that did not project to publication.
In game terms, it is still part of the play trace and should be queryable as such.

Useful name: **withheld play**.

### Newsroom fibers as strategies

The existing `select`, `compose`, and `record` seams make the newsroom a fiber over the base farm cycle.
That can be named more strongly: a farm profile is a strategy over the publication game.

Useful name: **farm profile as strategy**.

## Practical rule

Before adding new content-production machinery, ask:

1. Is this actually a labeled observation?
2. Is this a strategy law?
3. Is this a play transition?
4. Is this a projection of a settled carrier?
5. Is this only a transport surface?

If the answer is yes, prefer parameterizing the relating/agent/game/computing stack over adding another content-production-specific shape.
