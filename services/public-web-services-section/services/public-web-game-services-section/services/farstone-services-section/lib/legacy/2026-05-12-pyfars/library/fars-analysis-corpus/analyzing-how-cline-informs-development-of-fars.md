---
title: "Analyzing how Cline informs development of FARS"
specialization: analysis
subject: cline
subject-description: "VS Code extension giving AI agent access to IDE tools. Memory Bank for persistence, Plan Mode/Act Mode split, .clinerules, MCP integration."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/cline-architecture-analysis.md
informs: [system-architecture-refactor, cl-pipeline, session-lifecycle-infrastructure]
---

## What Cline Is

VS Code AI agent extension with three-layer architecture: WebviewProvider → Controller → Task.
Hard modal split between Plan Mode (exploration + plan output) and Act Mode (full tool access).
Memory Bank for cross-session persistence. .clinerules for per-project conventions.

## Principles for FARS Predication

### 1.
Hard modal split between planning and execution Cline enforces Plan Mode (read-only tools + plan output) vs Act Mode (all tools).
Not advisory — tool availability changes. **FARS application:** The planner office's sandbox should ACTUALLY restrict to read predicates.
An office in planning mode literally cannot write.
The restriction IS the sandbox, not a suggestion in the prompt.

### 2.
Memory Bank as structured persistent state Cline's Memory Bank stores: productContext, activeContext, progress, decisionLog, systemPatterns.
Each is a named section, not free-form. **FARS application:** Session state should be structured predicates on a session entity, not a memory dump.
Each predicate (active-context, progress, decisions-this-session) is a named field the graph can compose with.

### 3. .clinerules as per-project conventions Each project can have a `.clinerules` file that modifies agent behavior. **FARS application:** The ship's charter IS the .clinerules equivalent.
But where .clinerules is prose instructions, the charter's rules should be predicates that the constraint system can compose against.

### 4.
Context-aware mode switching Plan Mode can use different (cheaper) models than Act Mode.
Mode switching preserves configuration. **FARS application:** Different offices can use different model tiers.
The model tier IS a predicate on the office entity, not a runtime configuration.

## See also

- [Cline architecture analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/cline-architecture-analysis.md) — full source reading
