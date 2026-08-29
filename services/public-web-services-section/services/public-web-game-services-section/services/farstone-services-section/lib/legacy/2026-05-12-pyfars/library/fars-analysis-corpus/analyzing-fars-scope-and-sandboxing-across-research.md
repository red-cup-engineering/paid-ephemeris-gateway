---
title: "Analyzing FARS scope and sandboxing across research"
specialization: analysis
feature: scope-and-sandboxing
description: "How offices get their boundaries — what they can read, write, and compose with. Collected from all software research."
date-created: 2026-04-07
informs: [system-architecture-refactor, hooks-as-predication, constraint-design]
software-sources:
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-swe-agent-informs-development-of-fars
  - analyzing-how-mud-autonomous-worlds-informs-development-of-fars
  - analyzing-how-cline-informs-development-of-fars
  - analyzing-how-openhands-informs-development-of-fars
  - analyzing-how-tab-informs-development-of-fars
---

How should an office's boundaries be defined and enforced?
What every studied software says:

## What each software teaches

**Bussard:** The sandbox is a Lua table of what's available.
If it's not in the table, it doesn't exist.
The ship sandbox is permissive (you own it); the station sandbox is restrictive (you're a guest).
Permission = function wrappers: `if_readable(env.
USER, fs.read)`.

**SWE-agent:** The ACI (Agent-Computer Interface) constrains the action space to curated tools.
The constrained set lets the agent reason reliably.
Tool bundles compose — aggregate uniqueness enforced.

**MUD autonomous worlds:** Namespaces define which systems can write to which tables.
Each namespace has an owner who grants access.
Access control = table-level write permissions.

**Cline:** Hard modal split — Plan Mode literally removes write tools from availability.
Not advisory — the tools don't exist in that mode.

**OpenHands:** Per-session isolation via Docker containers.
Each session gets its own filesystem, network, process space.
Authentication at session start, not per action.

**TAB:** Behaviors are separate from models.
An entity has a list of behaviors; behaviors compose additively through the base chain.

## The consensus principle

**Scope is a list of entity references, loaded at investiture, not checked per action.** Every system agrees: the sandbox IS what's available, defined once, not re-evaluated on each operation.
The list is: - Entity references (not prose descriptions) - Loaded at session start / investiture (not checked per message) - Composable (child adds to parent, additive) - Different per office (not one global permission set)

## FARS predication pattern

An office entity should have:
```yaml
reads: [status, depends-on, assigned-to, part-of, serves]
writes: [status, event]
```

These are entity references (or controlled vocabulary) the algebra can traverse.
`respond(office, {action: write, target: entity, predicate: X})` produces t if X is in `writes`, ⊥ if not.
The constraint hook is one fiber composition, not fifteen JavaScript checks.

## Internal research: the 127 files are 7 channels of one algebra

The old agentic directory has 44 hooks and 83 tools.
They decompose into 7 concerns that are ALL respond() on different channels:

| Concern | What it does | Algebraic form |
|---|---|---|
| Observation | Record what happened | respond(session, {channel: observation}) |
| Guard | Check if action is allowed | respond(action, {channel: constraint}) → t or f |
| Accounting | Track resource flows | respond(event, {channel: σ/Δ}) — every event IS a transaction |
| Query | Read entity state | respond(entity, {}) — the basic query |
| Mutation | Change entity state | respond(entity, mutation-message) → settlement |
| Analysis | Batch inspect | respond(entity-set, {channel: analysis}) |
| Learning | Self-compose | respond(observations, observations) — dream-state |

After refactoring: ~40 thin adapters connecting the agent runtime to ONE algebra.

## Internal research: harness installation as kit assembly

The harness isn't a system prompt — it's a quartermaster assembling a kit for an office: - rules/ = constraint-fiber (standing orders) - skills/ = action-vocabulary fiber (training certs) - commands/ = pre-built respond() compositions (equipment) - hooks/ = observation/guard fibers (protocols) - session state = entangled pairs/history (intel briefing)

`respond(office, {channel: kit-assembly, payload: {mission: task-type}})` — the kit IS the fiber.

### Planning data for agentic-to-fars-refactor plan enrichment The hook-to-fars-classification analysis contains a detailed table mapping all 30 hooks to target entities with specific fiber predicates and refactoring priorities.
Should be folded into the agentic-to-fars-refactor plan's task ordering.

## What's NOT consensus

- Whether the sandbox should be mutable during a session (Bussard yes, Cline no, OpenHands no)
- Whether sub-office scoping exists (MUD namespaces vs flat lists)
- Whether the sandbox applies to reads as well as writes (MUD yes, Bussard partially, SWE-agent no)
