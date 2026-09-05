---
title: "Analyzing how MUD framework (Lattice) autonomous worlds inform development of FARS"
specialization: analysis
subject: mud-framework-autonomous-worlds
subject-description: "The MUD framework by Lattice — on-chain ECS (Entity Component System) for 'autonomous worlds' on Ethereum. Not a text MUD — a smart contract framework that shares the ECS architecture."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/mud-framework-autonomous-worlds-analysis.md
informs: [system-architecture-refactor, distributed-system, relational-mud]
---

# Analyzing How MUD Framework Autonomous Worlds Inform Development of FARS

## What MUD Framework Is

On-chain ECS by Lattice.
Entities are bare IDs.
Components are typed data (Tables) attached to entities.
Systems are functions that operate on entities with specific component combinations.
Namespaces provide access control.
State replication synchronizes on-chain and off-chain representations.

NOT a text MUD — named MUD because it builds persistent, multi-user worlds.
The architecture parallels EAVT closely.

## Principles for FARS Predication

### 1.
ECS IS EAVT MUD's ECS: entities are IDs, components are typed data on entities, systems query by component pattern.
Our EAVT: entities are IDs, attributes are typed predicates on entities, operations query by attribute pattern.
Same architecture.
The difference: MUD's components are typed schemas; our attributes are untyped strings that gain typing through term definitions.
Their types are declared; ours are earned through the settlement path.

### 2.
Namespaces for access control MUD uses namespaces to control which systems can write to which tables.
Each namespace has an owner who grants access. **FARS application:** An office's `writes` predicates define its namespace.
The office can only write predicates in its namespace.
Access control IS predicate scope, not a separate permission layer.

### 3.
Systems operate on component patterns, not entity types MUD systems don't know about entity types — they operate on any entity that has the required components.
A "movement system" processes anything with Position + Velocity. **FARS application:** The operations loop stages (dispatch, tracking, etc.) don't operate on entity types — they operate on any entity with the required predicates.
A dispatch behavior processes anything with `status: open` + `work-type` + `assigned-to: none`.
The predicates ARE the query, not the type.

### 4.
State replication for off-chain views MUD replicates on-chain state to off-chain databases for fast querying.
The on-chain state is authoritative; the off-chain replica is a read-optimized view. **FARS application:** The flatfile is authoritative (the .md files).
The EAVT graph (knowledge-graph.json) is the read-optimized replica.
The entity-index and value-index are further optimized views.
Same pattern: authoritative store + derived indexes.

### 5.
Modules as composable extensions MUD modules add systems and tables to a world without modifying existing code. **FARS application:** New offices, new duties, new behaviors are entities added to the graph.
They extend the world without modifying existing entities.
Additive composition from TAB — new capabilities accumulate, they don't require changes to existing structure.

## See also

- [MUD autonomous worlds analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/mud-framework-autonomous-worlds-analysis.md) — full source reading
