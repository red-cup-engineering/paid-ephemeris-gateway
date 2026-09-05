---
title: "Analyzing how SWE-agent informs development of FARS"
specialization: analysis
subject: swe-agent
subject-description: "Princeton NLP's autonomous software engineering agent. Core contribution: the Agent-Computer Interface (ACI) — curated tool sets that constrain the action space to what the agent can reason about reliably."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/swe-agent-architecture-analysis.md
informs: [system-architecture-refactor, progressive-automation-plan]
---

## What SWE-agent Is

Autonomous software engineering agent that solves GitHub issues in containerized environments.
Core idea: the Agent-Computer Interface (ACI) — how you expose the environment to an agent matters as much as the model.
Tool bundles define curated command sets.
Trajectory recording captures every action for replay and analysis.

## Principles for FARS Predication

### 1.
The interface constrains the action space SWE-agent doesn't give raw shell access — it gives curated tools (view, edit, search, submit).
The constrained set lets the agent reason reliably. **FARS application:** An office's `reads` and `writes` predicates ARE the ACI.
The office can only compose with entities in its scope.
The scope IS the constraint.
Don't give all offices all tools — give each office the tools that match its action domain.

### 2.
Tool bundles are composable configurations SWE-agent's bundles are directories with config + executables.
Bundles aggregate; uniqueness is enforced. **FARS application:** An office's capabilities come from its extends chain (additive inheritance from TAB principle).
Each parent adds capabilities.
No duplicate predicates.
The office's capability set IS a bundle.

### 3.
Self-review before submission SWE-agent's submit tool triggers a self-review step before finalizing.
The agent checks its own work. **FARS application:** Before a task's status moves to `completed`, compose the result fiber with the task's `definition-of-done` predicates.
If they don't agree (⊤ or ⊥), the task isn't done.
Self-review IS fiber composition.

### 4.
Trajectory recording for replay and analysis Every SWE-agent run records the full action trajectory.
Useful for debugging, evaluation, and learning. **FARS application:** events.jsonl IS the trajectory.
Every act during execution should be an event with timestamp, actor, action, subject.
The event stream IS the replay log.

## See also

- [SWE-agent architecture analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/swe-agent-architecture-analysis.md) — full source reading
