---
title: "Analyzing how OpenHands informs development of FARS"
specialization: analysis
subject: openhands
subject-description: "Open-source AI software development platform (formerly OpenDevin). Runtime isolation via Docker containers, event stream architecture, multi-agent delegation."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/openhands-architecture-analysis.md
informs: [system-architecture-refactor, session-lifecycle-infrastructure]
---

## What OpenHands Is

AI software development platform with sandboxed execution (Docker containers per session), event stream for all actions/observations, state management, and multi-agent delegation.
Host/container split with per-session API keys.

## Principles for FARS Predication

### 1.
Event stream as ground truth Every action and observation is an event in a stream.
State is derived from the event stream, not maintained separately. **FARS application:** events.jsonl IS the event stream.
Work entity status should be derivable from events, not maintained as a separate field that can drift.
The event stream IS the authoritative record.

### 2.
Per-session isolation Each agent session gets its own container — own filesystem, own network, own process space.
Sessions can't interfere with each other. **FARS application:** Each office session should have its own scope — its own set of accessible entities, its own event stream, its own sandbox.
Not separate processes (OOM), but separate scopes on the same graph.

### 3.
Multi-agent delegation with structured handoffs Agents can delegate subtasks to other agents.
Each delegation includes: the task, the allowed tools, the expected output format. **FARS application:** Dispatch IS delegation.
The assignment entity carries: the task predicates, the office scope (allowed tools), the expected output predicates.
Structured, not prose.

### 4.
Authentication per session, not per action OpenHands uses per-session API keys injected at container start.
Every request in the session is authenticated once.
Not per-action permission checks. **FARS application:** The office's sandbox is loaded at session start (investiture).
During the session, the sandbox IS what's available.
Don't re-check permissions on every message — the investiture already established what's in scope.

## See also

- [OpenHands architecture analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/openhands-architecture-analysis.md) — full source reading
