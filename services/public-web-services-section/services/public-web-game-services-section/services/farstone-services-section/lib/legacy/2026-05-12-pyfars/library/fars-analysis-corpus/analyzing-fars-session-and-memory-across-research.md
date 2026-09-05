---
title: "Analyzing FARS session and memory across research"
specialization: analysis
feature: session-and-memory
description: "How state persists across sessions — memory tiers, structured context, consolidation, session save/resume. Collected from all software research."
date-created: 2026-04-07
informs: [session-lifecycle-infrastructure, cl-pipeline, system-architecture-refactor]
software-sources:
  - analyzing-how-ai-memory-systems-informs-development-of-fars
  - analyzing-how-cline-informs-development-of-fars
  - analyzing-how-openclaw-informs-development-of-fars
  - analyzing-how-everything-claude-code-informs-development-of-fars
  - analyzing-how-bussard-informs-development-of-fars
---

How should state survive across sessions?

## What each software teaches

**Letta/MemGPT:** Three-tier memory: core (always in-context, structured blocks), recall (conversation history, hybrid search), archival (vector DB, explicit access).
Agent can edit its own core memory.
Context overflow triggers summarization.

**Mem0:** Memory as facts in a knowledge graph.
Entity extraction from conversations.
Temporal awareness — memories have timestamps and recency.

**Cline:** Memory Bank with structured sections: productContext, activeContext, progress, decisionLog, systemPatterns.
Named sections, not free-form.

**OpenClaw:** Dreaming — between sessions, memory consolidates (merge, summarize, prioritize).
SOUL.md is mutable identity that evolves.

**ECC:** Session save/resume preserves editorial judgments.
Structured compaction template prevents lossy context compression.

**Bussard:** Ship config persists on filesystem.
Session state restored on reconnect.
Custom modes, keybindings, scripts survive disconnection.

## The consensus principle

**Session context is structured predicates, loaded at start, enriched during session, consolidated between sessions.** Every system agrees: - Memory is structured (named sections/blocks/fields), not free-form text - Three tiers exist: always-loaded / searchable / deep storage - The agent can enrich its own memory - Consolidation between sessions prevents unbounded growth - Session save/resume is explicit, not implicit

## FARS predication pattern

The three tiers already exist: 1. **Always-loaded:** office entity fiber (loaded at investiture) 2. **Searchable:** event log (events.jsonl) + entity-index + value-index 3. **Deep storage:** knowledge graph (49K entities)

What's missing: - Session-start that loads the RIGHT office fiber (not generic orientation) - Structured session state as an entity with named predicates (not a memory dump) - Consolidation between sessions: `respond(observations, observations)` → instincts - Explicit session save/resume as entity creation/loading

## Internal research: why the first officer fails (infrastructure diagnosis, 2026-04-05)

Ten infrastructure gaps identified that cause the first officer to fail despite 80+ commands and 30+ skills:

1. Session-start loads context not identity — no office definition, no character sheet, no bridge view
2. No character sheet exists — no identity-with-history
3. No session-start procedure enforced — /bridge is advisory
4. MCP tools invisible — Bash/Read wins over MCP by default
5. Directives not tracked — fire-and-forget context
6. No drift detector — non-coordination work goes unflagged
7. Procedures distributed, not composed — no first-officer workflow
8. Chat-response is default — prose over tool invocation
9. No directive-recording procedure — Policy 008 as honor system
10. Powers not constrained by specialty — CAN produce content, so DOES

Cheapest fix: session-start loads office definition + runs /bridge + surfaces outstanding directives.
One hook, composing existing components.

### Planning data for session-lifecycle and sunday-funday-sprint plan enrichment These 10 gaps map to tasks across session-lifecycle-infrastructure and sunday-funday-sprint.
The character sheet (gap 2) is the sunday-funday-sprint deliverable.
The session-start procedure (gaps 1, 3) is the session-lifecycle plan's core work.

## What's NOT consensus

- Whether memory should be agent-editable in real-time (Letta yes, Cline structured-only, ECC file-based)
- How much to consolidate (Letta compresses aggressively, OpenClaw curates carefully)
- Whether the agent's identity should be mutable (OpenClaw yes, ECC no)
