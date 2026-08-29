---
title: "Analyzing FARS learning and feedback across research"
specialization: analysis
feature: learning-and-feedback
description: "How the system improves from its own work — observations, instincts, reflections, skill creation, progressive automation. Collected from all software research."
date-created: 2026-04-07
informs: [cl-pipeline, sunday-funday-sprint, progressive-automation-plan, operations-loop]
software-sources:
  - analyzing-how-reflexion-and-lats-informs-development-of-fars
  - analyzing-how-voyager-informs-development-of-fars
  - analyzing-how-openclaw-informs-development-of-fars
  - analyzing-how-everything-claude-code-informs-development-of-fars
  - analyzing-how-rimworld-informs-development-of-fars
  - analyzing-how-dwarf-fortress-informs-development-of-fars
---

How should the system learn from its own work?

## What each software teaches

**Reflexion:** Failure → natural-language diagnosis of WHY → stored as episodic memory → injected into next attempt.
91% pass@1 from verbal self-reflection alone, no gradient updates.
The reflection is more valuable than the observation.

**LATS:** Tree search over candidate action sequences.
Multiple approaches evaluated in parallel.
Best-first expansion.
Combines planning and reflection.

**Voyager:** Open-ended skill library.
Skills are code + description pairs.
Semantic indexing by description.
Critic judges from resulting state, not execution trace.
Automatic curriculum proposes next task from current capabilities.

**OpenClaw:** Dreaming — memory consolidation between sessions.
Mutable identity that evolves as the agent learns.
Self-modification through normal tool use.

**ECC:** Observation → confidence (0.3-0.9 by count) → promotion to skill/command/agent via /evolve.
Background observer (Haiku).
Export/import instincts.

**RimWorld:** Skills improve by doing.
Unused skills decay.
Passion (minor/major) doubles learning rate.
XP from performing work of that type.

**DF:** Losing is fun.
Failed fortresses become ruins with history.
Failure produces artifacts future players encounter.

## The consensus principle

**Learning is verbal (not gradient), failure is diagnostic (not just recorded), and the learning artifacts ARE entities.** Every system agrees: - Learning happens through natural language, not parameter updates - Failure diagnosis is more valuable than failure recording - Learning artifacts persist as first-class objects (skills, instincts, reflections) - Learning improves with practice (skills by doing, not by instruction) - The system can learn without human intervention

## FARS predication pattern

The CL pipeline settlement path: 1. **Observation** (inquiry) → entity with what-happened predicates 2. **Instinct** (derivation) → entity with pattern + trigger + WHY predicates (Reflexion's diagnosis) 3. **Skill** (procedure) → entity with when-to-apply + how-to-apply predicates 4. **Tool** (process) → deterministic script, zero inference

Each step IS the settlement path.
Each step produces an entity.
The entity's predicates get richer at each step.
The settlement IS the learning.

Gamification renders this as: XP = closure convergence, level = formality tier, passion = bilattice affinity, achievement = crossing a settlement threshold.

Failure handling: failed tasks carry `failure-diagnosis` predicates (Reflexion pattern), not just `status: failed`.
The diagnosis is a predicate the next dispatch can compose against.
`respond(office, failed-task)` surfaces the diagnosis and avoids repeating the same failure.

## Internal CL research: the algebraic learning calculus

Our CL pipeline design goes beyond what any external software offers.
Key internal research findings:

### Confidence as closure measure, not count ECC uses float confidence (0.3-0.9) by observation count.
Our approach: confidence is proximity to a fixed point under a closure operator.
An instinct is "learned" when applying the training operator produces no further change — idempotence, not a threshold.
This is mathematically richer: it distinguishes "seen many times but still changing" from "seen few times but stable."

### Relevance via bilattice composition An instinct has content-value (what it claims) and context-value (where it applies).
Relevance is their composition via ⊙, not a scalar.
This lets dispatch match instincts to situations by fiber overlap rather than keyword tags.

### The Zork cascade pattern for sequence detection Single respond() can detect "this observation IS X" but not "X happened before Y."
The Zork solution: cascade settlement.
A detector entity accumulates state across observations: observation(Grep) → detector's `seen-first: ⊥→t`; observation(Edit) → `seen-second: ⊥→t`; both seen → `pattern-matched: ⊥→t` (gated).
This requires writable settle() (the detector must persist its accumulated state).

### Six dimensions of CL The full CL pipeline must satisfy six dimensions simultaneously: (1) feedback stage of the operations loop, (2) messaging channel with M0-M9 compliance, (3) transactional process with double-entry balance checks, (4) work ontology settlement path (inquiry→derivation→procedure→process), (5) grounded in learning theory (Kolb, Vygotsky, Lave & Wenger), (6) competitive with ECC v2.1.

### The 5 actual blockers (MVP analysis) For a working learning loop TODAY: (1) settle() persists events, (2) events enter the graph, (3) pattern detection uses respond(), (4) detected patterns become instinct files, (5) instincts load into session context.
The other 12+ tasks make the system better but aren't what stops CL from working.

### Planning data for cl-pipeline plan enrichment The algebraic redesign analysis (cl-pipeline-algebraic-redesign) contains detailed task decomposition across 6 dimensions (~15 tasks).
The MVP analysis (cl-mvp-what-actually-blocks) contains a 5-step implementation sequence.
Both should be folded into the cl-pipeline plan's task list and ordering.

## What's NOT consensus

- Whether learning should be background (ECC observer) or foreground (Reflexion explicit reflection step)
- Whether skill decay exists (RimWorld yes, others no) — maps to our question about settlement regression
- Whether the agent should modify its own identity (OpenClaw yes, ECC no) — maps to office fiber mutability
- How to measure learning quality beyond observation count (our quartet-position proposal is novel)
