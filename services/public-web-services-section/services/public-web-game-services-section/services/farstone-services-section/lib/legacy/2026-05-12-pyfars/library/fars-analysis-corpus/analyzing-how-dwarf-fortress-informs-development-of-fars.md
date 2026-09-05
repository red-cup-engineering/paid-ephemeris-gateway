---
title: "How Dwarf Fortress informs FARS development"
specialization: research
subject: dwarf-fortress
subject-description: "The deepest simulation game ever made. Toady One's 20-year project. Every material has properties, every creature has a body with parts, every social structure has rules. 'Losing is fun.'"
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/dwarf-fortress-simulation-for-agentic-systems.md
date-created: 2026-04-07
informs: [sunday-funday-sprint, operations-loop, paradigm-applications]

# What Dwarf Fortress is
architecture: "Simulation from materials up. Rocks have hardness. Metals have melting points. Bodies have parts with tissues with materials. Social structures have positions with responsibilities. Everything emerges from the material properties interacting."

# Principles extracted for FARS predication
principles:
  - id: properties-generate-behavior
    principle: "DF doesn't code 'a copper sword cuts through leather.' It codes material hardness and tissue resistance. The cutting behavior EMERGES from the properties."
    df-source: "Material system — raw files define properties, interactions are computed"
    fars-application: "Don't code 'the planner can handle derivation work.' Code the planner's capability signature and the task's work-type. The dispatch match EMERGES from the fiber composition."

  - id: losing-is-fun
    principle: "DF embraces failure as content. A failed fortress generates a ruin with history that future players encounter. Failure produces artifacts."
    df-source: "World generation, legends mode, fortress abandonment"
    fars-application: "Failed sessions, abandoned plans, stale tasks are not waste — they're the archaeological record. Every failure is an entity with predicates the system can learn from. Charter Rule 3: no invisible labor includes invisible failure."

  - id: positions-have-responsibilities
    principle: "DF's noble system: positions (mayor, sheriff, broker) have mandates, requirements, and moods that affect the fortress."
    df-source: "Noble system — positions with demands, mandates, rooms"
    fars-application: "Offices have duties, scope, and mood (closure distance). An unfulfilled duty affects the office's mood, which affects the department, which affects the ship. The same cascading-needs pattern."

  - id: depth-over-breadth
    principle: "DF models fewer things deeply rather than many things shallowly. One material system that works for everything rather than special cases for each."
    df-source: "20 years of depth-first development"
    fars-application: "Get the primitives right (thing, container, predicate composition) and depth follows. Don't build special-case infrastructure for each department — build deep primitives that every department uses."
---

How Dwarf Fortress — the deepest simulation ever — informs FARS development.
DF demonstrates that behavior should emerge from properties, not be coded per-case.
The material system principle maps directly: don't code dispatch rules, code capability predicates and let the algebra compute the match.
DF's embrace of failure as content maps to our treatment of failed sessions and stale plans as learnable entities.

See the [Dwarf Fortress analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/dwarf-fortress-simulation-for-agentic-systems.md) for the full reading.
