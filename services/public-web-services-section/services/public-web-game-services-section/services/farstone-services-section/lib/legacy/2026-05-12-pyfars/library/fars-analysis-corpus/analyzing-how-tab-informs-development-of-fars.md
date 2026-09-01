---
title: "How TAB informs FARS development"
specialization: research
subject: tab
subject-description: "Things with Attributes and Behaviors — emsenn's Fennel MUD engine. The captain's own prior art for entity-based world modeling."
source-code: operations/engineering/toys/tab/engine/
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/lpmud-architecture-for-agentic-systems.md
operational-analysis: operations/command/domains/rsc-quiescent/domains/work-orchestration/texts/plans/consume-tab-architecture.md
date-created: 2026-04-07
informs: [system-architecture-refactor, relational-mud, operations-loop]

# What TAB is
architecture: "Four base models (thing, container, dimension, object). Behaviors are separate files dispatched via __index metatable. Additive attributes accumulate down the base chain. The engine (dimension) is just another thing."

# Principles extracted for FARS predication
principles:
  - id: containment-is-generic
    principle: "A container holds things. receive-object, remove-object, search-contents work on anything."
    tab-source: "engine/models/container.fnl — {:base :thing, :contents []}; engine/behaviors/container.fnl"
    fars-application: "Use contents: for all containment — plans, departments, ships. Don't invent type-specific containment predicates."

  - id: engine-is-just-another-thing
    principle: "dimension → {:base :thing, :behaviors [:dimension]}. The game engine is a thing in the world."
    tab-source: "engine/models/dimension.fnl"
    fars-application: "The department/system that runs the operations loop is an entity in the graph, not a special administrative layer."

  - id: additive-attributes
    principle: "additive-attributes: [:additive-attributes :behaviors]. Listed predicates append on inheritance, not override."
    tab-source: "engine/models/thing.fnl"
    fars-application: "Mark which predicates accumulate through extends. Capabilities, behaviors, contents should all be additive."

  - id: behaviors-separate-from-models
    principle: "Models define what a thing IS (its predicates). Behaviors define what a thing DOES (its methods). They compose independently."
    tab-source: "engine/models/ vs engine/behaviors/ — parallel directories, linked by behaviors: predicate"
    fars-application: "An office's identity (its predicates) and its capabilities (its behaviors/duties) are separate concerns. The same duty can attach to multiple offices."

  - id: four-primitives-suffice
    principle: "thing, container, dimension, object. Everything else is instances or extensions."
    tab-source: "engine/models/ — only four base models"
    fars-application: "The foundational ontology (thing, container, vessel, object, quality, state, act, relation) is sufficient. Don't create new base types — extend existing ones."
---

How TAB — the captain's own Fennel MUD engine — informs FARS development.
TAB demonstrates that four base models with additive behavior composition can model any world.
The generic containment pattern (plans contain tasks the same way rooms contain objects) is the single highest-leverage principle for FARS entity design.

## Source-level observations (from tab-vs-qtops source read)

- `util.merge-models` (util.fnl:163): additive-attributes accumulate, grammar accumulates nouns/adjectives, everything else overwrites.
  This is THE merge primitive.
- `util.build-dispatch` (util.fnl:221): assembles method table from behaviors list, sets as `__index` metatable.
  Later behaviors override earlier.
- `util.responds-to?
  ` checks if a method exists in dispatch.
  Identity is deferred to behavior — no "type = X therefore capable of Y."
- `dimension.lsr` (load/start/run) orchestrates systems.
  The dimension is a thing whose behavior includes orchestration.
- No validation — method not in behaviors → raise.
  Validation IS dispatch failure.

## Design decisions for FARS (from source comparison)

- **Declaration model:** TAB-style — entity files declare `extends:` (base chain) and `behaviors:` (what they can do).
  A loader walks the chain, merges additively.
- **Dispatch:** The entity IS a function that dispatches over its fiber.
  `message(entity, {action: X})` looks up X in the entity's behaviors, same as `thing:method()` → `__index`.
- **Validation:** No SHACL schemas.
  The algebra IS the validator. ⊤ IS the rejection.
  Same as TAB: missing method → error.
- **Runtime vs file:** FARS entities live on disk.
  Runtime materializes from files on demand.
  Unlike TAB (in-memory) or qtOps (closures).

See the [TAB consumption plan](../../plans/consume-tab-architecture.md) for the integration roadmap.
