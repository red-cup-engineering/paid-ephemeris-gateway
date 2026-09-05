---
title: "Analyzing how Aider informs development of FARS"
specialization: analysis
subject: aider
subject-description: "AI pair programming tool. Distinctive feature: repo map using PageRank over a definition-reference graph to determine what context matters most."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/aider-architecture-analysis.md
informs: [system-architecture-refactor, convergent-enrichment-plan]
---

## What Aider Is

Terminal-based AI pair programming.
Edits code, auto-commits, uses a "repo map" (PageRank over definition-reference graph) to give the LLM context about the full codebase without sending every file.
Model routing between architect (planning) and editor (implementation) models.

## Principles for FARS Predication

### 1.
Relevance via graph PageRank, not manual selection Aider doesn't manually pick relevant files — it builds a definition-reference graph and runs PageRank with personalization toward the current conversation.
Relevance propagates through the dependency structure. **FARS application:** Priority/relevance should propagate through the `depends-on` and `serves` edges in the graph.
The leverage ranking (count inbound depends-on edges) is a crude PageRank.
The full version: run the algebra through the graph, letting relevance propagate through predicate edges.

### 2.
Ranked context, not exhaustive context Aider's repo map is a RANKED summary — most relevant definitions first, constrained to a token budget.
Not everything, not nothing — the right amount. **FARS application:** Session-start context should be ranked by relevance to the office's action domain.
Don't load all 11K entities.
Don't load nothing.
Load the entities whose fiber composition with the office produces the most t-valued predicates, ranked, up to a token budget.

### 3.
Architect/editor model split Aider uses a more capable model for planning and a faster one for editing.
The architect proposes; the editor implements. **FARS application:** Same pattern as Cline's Plan/Act mode and our own office hierarchy.
The planner (opus) proposes; the writer/operations-officer (sonnet/haiku) implements.
Model tier IS a predicate on the office entity.

### 4.
Auto-commit as event recording Aider auto-commits every change with a descriptive message.
The git history IS the trajectory. **FARS application:** Every state change should be an event.
The event log IS the commit history for operational state. git tracks file changes; events.jsonl tracks predicate changes.
Both are append-only ground truth.

## See also

- [Aider architecture analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/aider-architecture-analysis.md) — full source reading
