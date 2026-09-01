---
title: "Analyzing FARS tick and execution across research"
specialization: analysis
feature: tick-and-execution
description: "How work actually happens — the tick cycle, execution monitoring, settlement, simple iteration. Collected from all software research."
date-created: 2026-04-07
informs: [system-architecture-refactor, operations-loop]
software-sources:
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-tab-informs-development-of-fars
  - analyzing-how-rimworld-informs-development-of-fars
  - analyzing-how-guix-guile-informs-development-of-fars
  - analyzing-how-dwarf-fortress-informs-development-of-fars
  - analyzing-how-openclaw-informs-development-of-fars
  - analyzing-how-lpmud-discworld-informs-development-of-fars
---

How should the system process work — the tick, the execution cycle, the settlement loop?

## What each software teaches

**Bussard:** Server update: iterate bodies, update orbits, gravity, autopilots, send positions.
One pass.
Client update: send state, receive positions, yield.
Dead simple.

**TAB:** The dimension (engine) is just another thing.
Its tick iterates its systems (child things).
Each system processes its contents.
No scheduling framework.

**RimWorld:** Mood computed from needs, not set directly.
Work priorities per colonist per work type.
The system assigns best-priority colonist with the skill.
Emergent behavior from simple per-entity systems interacting.

**Guix:** Services declare what they provide and depend on.
The system computes dependency order and starts services accordingly.
Declarative, not imperative.

**DF:** Properties generate behavior.
Don't code interactions — code properties and let interactions emerge from property composition.
20 years of depth-first development.

## The consensus principle

**The tick is simple iteration over contents.
Behavior emerges from properties.
Don't over-engineer the workflow.** Every system agrees: - The tick walks a container's contents and processes each one - Complex behavior emerges from simple per-entity rules interacting - Don't build a scheduling/workflow engine — iterate and let the algebra settle - The engine/department is a thing in the world, not above it - Properties (predicates) generate behavior, not hardcoded dispatch rules

## FARS predication pattern

The department tick: 1.
Walk `contents` (offices in the department) 2.
For each office, check `assigned-work` (entity references to tasks) 3.
For each assigned task, `respond(office, task)` — compose fibers 4.
If settlement produces changes, record events 5.
Repeat until no more changes (fixpoint)

This is exactly `grav.update` + `orbit.update` from Bussard.
One pass.
Simple iteration.
Settlement cascades handle the complexity.

The declaration pattern (from Guix): offices declare what they `reads` and `writes`.
The tick computes processing order from these declarations.
An office that reads `status` and writes `event` can process after any office that writes `status`.

**OpenClaw:** HEARTBEAT.md — periodic proactive monitoring checklist.
Three modes (core/deep/rem) at different intervals.
Checks run in isolated sessions.
State tracked between runs.
The system monitors itself without being asked.

**LPMud:** `set_heart_beat()` — per-object tick intervals.
Each object can have its own heartbeat frequency.
Not one global tick — granular per-entity.

## Heartbeat as proactive monitoring

The tick isn't just processing assigned work — it's also detecting problems: stale tasks, failed sessions, overdue items, capacity overruns.
OpenClaw's HEARTBEAT.md pattern: a checklist of checks at different intervals (6h/24h/weekly).
Each check is a `message()` that composes the department's contents against health predicates.
Anomalies surface as ⊤ (contradiction between expected and actual state).

## What's NOT consensus

- Whether the tick should run continuously (Bussard, RimWorld) or on-demand (TAB, Guix) — for us: MASH daemon tick is continuous; FARS is on-demand via message()
- Whether the tick should have a fixed timestep (Bussard 0.01s, RimWorld speed-dependent) — for us: session-bounded, not real-time
- Whether cross-entity effects should be synchronous (DF) or eventual (messaging systems) — for us: wavefront settlement is synchronous within a tick
