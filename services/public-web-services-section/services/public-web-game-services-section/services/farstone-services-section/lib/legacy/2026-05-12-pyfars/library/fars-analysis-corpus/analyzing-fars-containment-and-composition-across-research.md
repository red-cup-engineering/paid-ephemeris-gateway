---
title: "Analyzing FARS containment and composition across research"
specialization: analysis
feature: containment-and-composition
description: "How entities relate structurally — generic containment, additive inheritance, record composition, the primitives that everything else builds on. Collected from all software research."
date-created: 2026-04-07
informs: [system-architecture-refactor, operations-loop]
software-sources:
  - analyzing-how-tab-informs-development-of-fars
  - analyzing-how-mud-autonomous-worlds-informs-development-of-fars
  - analyzing-how-guix-guile-informs-development-of-fars
  - analyzing-how-dwarf-fortress-informs-development-of-fars
  - analyzing-how-lpmud-discworld-informs-development-of-fars
---

How should entities relate structurally — containment, inheritance, composition?

## What each software teaches

**TAB:** Four base models (thing, container, dimension, object).
`contents: []` on container.
`receive-object`, `remove-object`, `search-contents` work on any container.
`additive-attributes` accumulate down the base chain.
The engine IS a thing.

**MUD autonomous worlds (Lattice):** ECS — entities are IDs, components are data, systems query by component pattern.
Modules add systems without modifying existing code.
Same thing + different components = different behavior.

**Guix:** System configuration is a Scheme record.
`inherit` takes a record and produces a new one with modified fields.
No mutation — the old record still exists.
Services declare provides/depends; system computes order.

**DF:** Properties generate behavior.
One material system that works for everything.
Depth over breadth.
Don't build special cases — build deep primitives.

**LPMud/Discworld:** object → container → room.
Standard API at every level.
Commands are objects loaded at runtime.
Everything inherits from object.

## The consensus principle

**Containment is generic.
Use one predicate (`contents`) for all containment.
Capabilities accumulate additively through inheritance.
Don't build per-type APIs — build deep primitives that compose.**

Every system: - Has a small set of base types (TAB: 4, LPMud: 3, our ontology: ~8) - Uses generic containment (not per-type containers) - Composes through additive inheritance (not override) - Treats the engine/system as a thing in the world, not above it

## FARS predication pattern

Use `contents:` for ALL containment: - Plan contains tasks: `contents: [task-a, task-b]` - Department contains offices: `contents: [first-officer, operations-officer]` - Ship contains departments: `contents: [command, science, engineering]`

Moving a task between plans: remove from one `contents`, add to another.
Same operation regardless of what the container or the contained thing is.

Use `extends:` for additive inheritance.
An office that extends another gets the parent's capabilities PLUS its own.
Don't restate parent predicates on children.

Use `type:` as a label, not a mechanism.
The predicates ARE the entity.
A plan IS a container with a `goal` and `definition-of-done` predicate.
Adding `type: plan` helps humans and findByType() — it doesn't activate special behavior.

## Entity lifecycle (create/destruct)

**LPMud:** `create()` on `clone_object()`, `init()` on `move_object()`, `destruct()` on `destruct_object()`.
The entire Discworld world behavior builds on these three callbacks.
Creation validates, movement triggers room effects, destruction cleans up references.

**Mem0:** On memory creation, automatically compare against existing memories — classify as ADD/UPDATE/DELETE.
Conflict resolution at creation time, not after.

When an entity enters a container (task added to plan, office added to department), the container's receive behavior fires — validate, check duplicates, update indexes.
When an entity leaves, the container's remove behavior fires — clean references, archive.
These are the LPMud lifecycle callbacks expressed as container behaviors, not as hooks.

## Internal research: mereology of work

Part-whole relations must handle both spatial containment (task IN plan — synchronic) and temporal succession (task AFTER task — diachronic).
`part-of` handles containment (restricts-natured).
`depends-on` handles succession (extends-natured — the dependency flows forward when met).
Both are predicate compositions of the two primitives (extends/restricts).

## What's NOT consensus

- Whether inheritance should be single (LPMud) or multiple (TAB's `base: [:notable :massive]`) — for us: `extends:` accepts arrays, so multiple
- Whether containment should be ordered (plans yes, rooms no) — the `ordering:` predicate on the plan handles this separately from `contents:`
- Whether nested containment should be bounded (rooms have fixed exits) or unbounded (containers nest arbitrarily) — for us: unbounded, the graph handles depth naturally
