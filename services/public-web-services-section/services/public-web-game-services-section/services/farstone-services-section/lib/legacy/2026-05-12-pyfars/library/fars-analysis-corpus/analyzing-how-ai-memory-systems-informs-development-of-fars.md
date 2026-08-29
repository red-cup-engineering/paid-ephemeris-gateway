---
title: "Analyzing how AI memory systems (Letta/MemGPT, Mem0) inform development of FARS"
specialization: analysis
subject: ai-memory-systems
subject-description: "Letta (MemGPT) — OS-inspired three-tier memory hierarchy. Mem0 — graph-based memory with entity extraction. Two approaches to persistent AI memory."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/ai-memory-systems-analysis.md
informs: [cl-pipeline, session-lifecycle-infrastructure, system-architecture-refactor]
---

# Analyzing How AI Memory Systems Inform Development of FARS

## What They Are

**Letta/MemGPT**: Context window IS RAM.
Three tiers: core memory (always in-context, editable blocks), recall memory (conversation history with hybrid search), archival memory (vector DB, unlimited, explicit tool calls to access).
Paging: when context overflows, older messages get summarized and compressed.

**Mem0**: Memory as facts in a knowledge graph.
Entity extraction from conversations.
Graph edges represent relationships between entities.
Temporal awareness — memories have timestamps and can be queried by recency.

## Principles for FARS Predication

### 1.
We already have what both systems are building toward Letta builds a memory hierarchy on top of vector DBs.
Mem0 builds a knowledge graph from conversations.
We already have a knowledge graph (11K+ entities, EAVT) that IS the memory.
`message(entity)` IS memory retrieval.
The entity's fiber IS the memory.
We don't need to build a memory system — we need to use the one we have.

### 2.
Three-tier memory maps to our existing structure Letta: core (always-loaded) / recall (searchable history) / archival (deep storage). **FARS equivalent:** office fiber (always-loaded at session start) / event log (searchable history via events.jsonl) / knowledge graph (deep storage via entity-index + value-index).
The tiers already exist — what's missing is the session-start loading that puts the right office fiber into context.

### 3.
Memory blocks are structured, not free-form Letta's core memory has named blocks (persona, human, task).
Not a text dump — structured sections. **FARS application:** Session context should be structured predicates loaded from the office entity, not a prose orientation dump.
The office's fiber IS the memory block.
Each predicate is a named field.

### 4.
Agent-editable memory = agent-enrichable fibers Letta lets the agent edit its own core memory blocks.
Mem0 lets the agent create graph edges. **FARS application:** The CL pipeline IS agent-editable memory.
Observations and instincts are entities the agent creates.
The office's fiber gets richer over time as the agent adds predicates through the settlement path.

### 5.
Consolidation between sessions Letta's summarizer compresses old messages.
Mem0 merges redundant memories. **FARS application:** The dreaming/self-settlement step: `respond(observations, observations)` produces consolidated instincts between sessions.
Compression IS settlement — reducing many observations to fewer, richer instincts.

## See also

- [AI memory systems analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/ai-memory-systems-analysis.md) — full source reading
