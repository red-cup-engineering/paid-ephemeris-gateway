---
title: "How Guix/Guile informs FARS development"
specialization: research
subject: guix-guile
subject-description: "GNU Guix — a functional package manager and OS where the entire system configuration is a Scheme value. Guile Scheme is the composition language. 'The whole system is a value.'"
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/guix-guile-composition-layer.md
operational-analysis: operations/command/domains/rsc-quiescent/domains/decision-making/texts/research/guix-guile-system-composition-research.md
date-created: 2026-04-07
informs: [system-architecture-refactor, relational-os, operations-loop]

# What Guix/Guile is
architecture: "System configuration as Scheme records. operating-system record contains services, services contain packages, packages contain files. inherit lets you take an existing record and modify fields. The system IS a value you can inspect, compose, and transform."

# Principles extracted for FARS predication
principles:
  - id: configuration-is-value
    principle: "The operating-system record IS the system. Not a config file that describes the system — the config IS the system."
    guix-source: "operating-system records in GNU Guix, declared in Scheme"
    fars-application: "The entity's frontmatter IS the entity. Not documentation about the entity — the predicates ARE the thing. The ship entity IS the ship."

  - id: composition-through-records
    principle: "inherit takes a record and produces a new one with modified fields. No mutation. The old record still exists."
    guix-source: "Guix inherit keyword, package transformations"
    fars-application: "Entity enrichment is additive (Guideline 3: accrete, don't replace). A new version of an entity references the old one via extends. The old fiber persists."

  - id: services-are-declarative
    principle: "A service declares what it provides and what it depends on. The system computes the dependency graph and starts services in order."
    guix-source: "Guix service system — service-type with extensions and dependencies"
    fars-application: "An office declares what it reads and writes (provides/depends). The tick computes the processing order from the dependency graph. Don't hardcode workflow sequences."

  - id: the-repl-is-the-interface
    principle: "guix repl gives you a Scheme REPL with the full system available as values. You can inspect any package, any service, any derivation interactively."
    guix-source: "guix repl, Guile REPL"
    fars-application: "message() IS the REPL. message(entity) gives you the entity's full fiber interactively. The MCP tool IS the Guile REPL equivalent."

  - id: no-layer-for-custom-tooling
    principle: "In Guix, there's no 'plugin API' or 'extension system' — you write Scheme. The language IS the extension mechanism. Custom packages are Scheme values like any other."
    guix-source: "Guix package definitions are just Scheme"
    fars-application: "Don't build an extension system for FARS. Entities ARE the extension mechanism. Adding a capability = adding an entity with predicates. The algebra IS the API."
---

How Guix/Guile — the system where configuration IS a value — informs FARS development.
The core lesson: eliminate the gap between "what describes the system" and "what the system is."
In Guix, the operating-system record IS the system.
In FARS, the entity's predicates ARE the entity.
There is no separate layer of configuration, documentation, or description that needs to be kept in sync with the real thing — because the description IS the real thing.

The aspiration (from the Guix research): Guile Scheme as the composition layer for FARS.
RES (Relation Expression Syntax) is already S-expressions.
The long-term path: RES evaluates inside a Guile sandbox, user scripts are Guile programs that call message(), the system configuration is a Guile value.

See the [Guix/Guile composition research](../guix-guile-system-composition-research.md) for the operational notes.
