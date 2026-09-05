---
title: "Analyzing how Voyager informs development of FARS"
specialization: analysis
subject: voyager
subject-description: "Open-ended embodied agent for Minecraft. Learns skills without human intervention via semantic skill library, self-verification critic, and automatic curriculum. Wang et al. 2023."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/voyager-skill-library-analysis.md
informs: [cl-pipeline, sunday-funday-sprint, progressive-automation-plan]
---

## What Voyager Is

An LLM-powered agent for Minecraft that learns an open-ended repertoire of skills: semantic skill library (57+ skills indexed by description), self-verification critic (state-based, not trace-based), automatic curriculum (proposes next task from current state + completed + failed).
Main loop runs indefinitely — true open-ended learning with no predefined goal list.

## Principles for FARS Predication

### 1.
Retrieval by semantic similarity, not category Voyager indexes skills by natural-language description, not by name or type.
Query is task context; results are skills whose descriptions match. **FARS application:** When dispatching work to offices, compose the task's fiber with office fibers via ⊙.
The highest-overlap composition wins.
Don't categorize tasks into work types and then match — let the algebra compute the similarity directly from predicates.

### 2.
Self-verification from state, not trace The critic judges success from resulting game state, not from watching execution.
Robust: doesn't matter HOW the result was achieved. **FARS application:** Review should check whether the entity's predicates match the goal's predicates (state comparison via ⇒), not whether the specific steps were followed.
`respond(completed-task, goal)` producing t = success.

### 3.
Automatic curriculum from current state The curriculum agent proposes next tasks based on: what you have, what you've done, what you've failed at.
Not a static todo list. **FARS application:** `/whats-next` should compute from the graph: what entities are thin (⊥-heavy), what tasks have failed, what capabilities are untested.
The curriculum IS the convergent enrichment strategy — enrich where the fibers are thinnest.

### 4.
Skills are code + description pairs Each skill has executable code AND a natural-language description.
The description is what's indexed; the code is what's executed. **FARS application:** Each action entity has predicates (what it does, what it consumes) AND a behavior (what happens when you message it).
The predicates are what dispatch indexes; the behavior is what executes.
Same dual structure.

### 5.
Failed tasks feed back into curriculum On failure, the curriculum records it and proposes something different.
Failures are informative, not waste. **FARS application:** Failed tasks and stale plans are entities with predicates.
The curriculum (dispatch/planning stage) should read them.
DF's "losing is fun" principle: failures are content, not garbage.

### 6.
Re-retrieval within a single task attempt If initial skills don't work, Voyager re-queries with error context, surfacing different skills. **FARS application:** If respond(office, task) produces ⊤ or ⊥ on critical predicates, try composing with a different office.
Don't fail on first mismatch — re-dispatch with error context enriching the query.

## See also

- [Voyager skill library analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/voyager-skill-library-analysis.md) — full source reading
- [CL pipeline](../plans/cl-pipeline.md) — our learning system competing with Voyager's open-ended approach
