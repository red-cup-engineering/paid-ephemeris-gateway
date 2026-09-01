---
title: "Analyzing FARS dispatch and matching across research"
specialization: analysis
feature: dispatch-and-matching
description: "How work meets worker — matching tasks to offices by capability, priority, and context. Collected from all software research."
date-created: 2026-04-07
informs: [system-architecture-refactor, operations-loop]
software-sources:
  - analyzing-how-voyager-informs-development-of-fars
  - analyzing-how-aider-informs-development-of-fars
  - analyzing-how-rimworld-informs-development-of-fars
  - analyzing-how-dwarf-fortress-informs-development-of-fars
  - analyzing-how-everything-claude-code-informs-development-of-fars
  - analyzing-how-swe-agent-informs-development-of-fars
---

How should the system decide which office handles which task?

## What each software teaches

**Voyager:** Retrieval by semantic similarity of descriptions, not by category.
Query is task context; results are skills whose descriptions match.
Re-retrieval on failure with enriched error context.

**Aider:** PageRank over a definition-reference graph.
Relevance propagates through dependency structure.
Personalization biases toward current conversation context.
Ranked results, not exhaustive.

**RimWorld:** Per-colonist priority (1-4) per work type.
System assigns available work to best-priority colonist with the skill.
Skills improve by doing; unused skills decay.

**Dwarf Fortress:** Properties generate behavior.
Don't code "copper cuts leather" — code material hardness and tissue resistance.
The interaction EMERGES from properties.
Depth over breadth.

**ECC:** Agent dispatch by description keyword matching.
Each agent has tools and description.
Match by keywords in task vs description.

**SWE-agent:** Curated tool sets constrain what the agent can do.
The constraint IS the dispatch — you don't dispatch to the wrong agent because the wrong agent can't do the action.

## The consensus principle

**Dispatch should compute from predicates, not from categories or keywords.** Every system that does dispatch well does it from properties, not from labels: - Voyager: descriptions, not categories - Aider: graph structure, not manual selection - RimWorld: numeric priorities per work type, not "this colonist is a builder" - DF: material properties, not coded interactions - SWE-agent: tool constraints, not agent types

## FARS predication pattern

`respond(office, task)` via ⊙ composes the office's fiber with the task's fiber.
The t-valued predicates in the result are capabilities that match.
The ⊥-valued predicates are where the office has no opinion.
The office with the most t and least f on task-relevant predicates is the best match.

For priority: Aider's PageRank insight applies.
Relevance propagates through `depends-on` and `serves` edges.
The entity with the most inbound dependency edges is highest-leverage.
This is computable NOW with the existing graph.

For re-dispatch on failure: Voyager's pattern.
If the first office produces ⊤ or ⊥ on critical predicates, re-compose with a different office, enriching the query with the failure context.

## Internal research: ⊙ vs ⇒ for dispatch (critical insight)

`respond()` returns the RESTRICTION (⇒) — what the entity concludes from its perspective.
But dispatch needs the COMPOSITION (⊙) — what's true of the combination.
These are different:

- ⊙ at shared predicate (both t): t ⊙ t = t.
  Agreement visible.
- ⊙ at mismatch (one t, one ⊥): t ⊙ ⊥ = ⊥.
  Mismatch visible.
- After ⇒ restriction: ⊥ ⇒ ⊥ = t.
  Mismatch signal washes out.

Dispatch ranking should use ⊙ (composeFibers), not ⇒ (restrict).
The restrict step normalizes mismatches to t ("consistent with 'I don't know'"), which hides the information dispatch needs.

## Internal research: the three-category agentic lift

Every old hook/tool falls into one of three categories:

1. **Query tools → respond() compositions.** plan-status, tracking-status, check-record — these load the graph and format.
  The respond() part works; the formatting stays as code but gets thinner (interfacer compose operation).

2. **Governance hooks → fiber overlap checks.** drift-detector, specialty-check, enforce-commands — these compare action properties against office constraints.
  This IS fiber composition: respond(action, office-constraints) producing t = allowed, ⊤ = blocked.
  The hardcoded constants (COORDINATION_MARKERS etc.) should be predicates on the office entity.

3. **Mutation tools → settle().** record-event, propagate-dependencies, create-record — these modify the graph.
  They are settle() operations: message enters, entities update, universe settles.

The lift process: move hardcoded knowledge to frontmatter → make hooks read from graph → use shared vocabulary → hooks become thin `respond(action, constraints)` calls.

## What's NOT consensus

- Whether dispatch should be push (coordinator assigns) or pull (agents select from queue) — Mintzberg says both, context-dependent
- Whether skill/capability decay should exist (RimWorld yes, others no) — maps to our settlement regression question
- Whether re-dispatch should be automatic or require escalation
