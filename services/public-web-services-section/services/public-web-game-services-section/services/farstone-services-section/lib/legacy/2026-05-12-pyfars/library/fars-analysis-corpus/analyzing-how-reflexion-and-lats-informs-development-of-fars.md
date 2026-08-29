---
title: "Analyzing how Reflexion and LATS inform development of FARS"
specialization: analysis
subject: reflexion-and-lats
subject-description: "Two Princeton systems for learning from failure without gradient updates. Reflexion: verbal self-reflection across trials. LATS: Monte Carlo tree search over action spaces."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/reflexion-and-lats-analysis.md
informs: [cl-pipeline, operations-loop, sunday-funday-sprint]
---

## What They Are

**Reflexion** (Shinn et al. 2023): agent attempts task, fails, generates natural-language diagnosis of WHY it failed, stores diagnosis as episodic memory, uses it on next attempt.
91% pass@1 on HumanEval via verbal self-reflection alone.

**LATS** (Zhou et al. 2024): extends Reflexion with tree search.
Multiple candidate action sequences evaluated in parallel.
Monte Carlo rollouts estimate value.
Best-first expansion with backpropagation.
Combines planning and reflection.

## Principles for FARS Predication

### 1.
Failure diagnosis is more valuable than failure recording Reflexion doesn't just record "this failed" — it generates WHY and WHAT TO DO DIFFERENTLY.
The reflection is stored alongside the instinct. **FARS application:** Failed tasks should carry `failure-diagnosis` predicates, not just `status: failed`.
The diagnosis is a predicate the next dispatch can compose against.
`respond(office, failed-task)` should surface the diagnosis.

### 2.
Reflections are episodic memory, not parameters Reflexion stores reflections as natural-language strings in a list, injected into prompts.
Not fine-tuning, not parameter updates. **FARS application:** Instincts are entities with predicates, not model weights.
The CL pipeline stores instincts as files with frontmatter.
The "learning" IS adding entities to the graph, not changing the model.

### 3.
Self-reflection is a separate step, not inline Reflexion uses a dedicated self-reflection prompt, separate from the action generation.
The reflection sees the failed trace and generates the diagnosis. **FARS application:** Review is a separate stage from execution.
The review office sees the completed work and generates findings.
Don't combine execution and review in one office — separate them for the same reason Reflexion separates action from reflection.

### 4.
Tree search for planning (LATS) LATS evaluates multiple candidate plans in parallel, using value estimation to prune bad branches early. **FARS application:** When the planner produces multiple possible approaches, dispatch can evaluate each by fiber composition with the goal.
The approach whose composition produces the most t-valued predicates against the goal is the best branch.

### 5.
Verbal reinforcement is cheaper than gradient updates Reflexion achieves 91% on HumanEval with zero parameter changes.
The "learning" is entirely in prompt context. **FARS application:** The CL pipeline doesn't need fine-tuning to be effective.
Enriching entity predicates (the graph) changes future behavior without changing the model.
The graph IS the reinforcement signal.

## See also

- [Reflexion and LATS analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/reflexion-and-lats-analysis.md) — full source reading
- [CL pipeline](../plans/cl-pipeline.md) — our learning system informed by Reflexion's approach
