---
title: "Analyzing how Everything Claude Code informs development of FARS"
specialization: analysis
subject: everything-claude-code
subject-description: "The reference implementation for Claude Code agent harnesses. 163 skills, 58 commands, 30 agents, manifest-driven installation. By anthropics community."
date-created: 2026-04-07
source-code: operations/engineering/src/everything-claude-code/
library-analyses:
  - library/theories/engineering/theories/tech/theories/computing/texts/ecc-hook-architecture-analysis.md
  - library/theories/engineering/theories/tech/theories/computing/texts/ecc-agents-and-commands-analysis.md
  - library/theories/engineering/theories/tech/theories/computing/texts/ecc-skill-system-analysis.md
  - library/theories/engineering/theories/tech/theories/computing/texts/continuous-learning-in-agentic-harnesses.md
referenced-by: cross-system-adoption-priorities
informs: [system-architecture-refactor, cl-pipeline, operations-loop, progressive-automation-plan]
---

## What ECC Is

Everything Claude Code is the reference implementation for Claude Code agent harnesses: 163 skills, 58 commands, 30 agents, manifest-driven installation.
It demonstrates production-grade harness infrastructure that we are explicitly trying to exceed by grounding agent behavior in the predication algebra instead of keyword matching.

## Principles for FARS Predication

### 1.
In-process hook execution ECC's `run-with-flags.js` calls `require()` on hooks that export `run(rawInput)`, executing in-process (~50-100ms faster than spawning).
The OOM incident (30 hooks × node spawn = server death) proved this matters critically for us.
FOAH constraint checking must be in-process.

### 2.
Progressive skill disclosure Skills load in three tiers: always-loaded (small), triggered (medium), on-demand (large).
Entity predicates loaded at session-start should be tiered by relevance — don't load all 11K entities, load what the office needs.

### 3.
CL observation → confidence → promotion pipeline Observations → instincts (confidence 0.3-0.9 by observation count) → skills/commands/agents via /evolve.
Our CL pipeline settlement path: observation (inquiry) → instinct (derivation) → skill (procedure) → tool (process).
Replace float confidence with quartet position.

### 4.
Agent specialization by tool set Each ECC agent has a specific tool set and description.
Dispatch matches by description keywords.
Our replacement: office scope IS the tool set (reads/writes predicates).
Dispatch matches by fiber composition, not keywords.

### 5.
Manifest-driven installation A manifest lists what to install.
Installation copies files to .claude/.
FOAH installs .claude/ from entity fibers — the harness IS a projection of the graph.

### 6.
Session save/resume Sessions can save editorial judgments for later resumption.
Session state is an entity whose fiber IS the save file.

## Feature Parity Checklist

### Agents — 38 total

**Have (14):** architect, build-error-resolver, chief-of-staff, code-reviewer, doc-updater, docs-lookup, harness-optimizer, loop-operator, planner, rust-build-resolver, rust-reviewer, security-reviewer, bookkeeper (561-only), and more.

**Missing (4):** database-reviewer (low), e2e-runner (low), performance-optimizer (medium), tdd-guide (medium).

**Not needed (20):** Language-specific agents (C#, C++, Dart, Flutter, Go, Java, Kotlin, Python, Swift) and domain-specific (healthcare, GAN, OSS pipeline).

**561-only (14):** bookkeeper, cartographer, graph-analyst, harness-cleaner, helmsman, librarian, observer, operations-officer, publisher, quartermaster, researcher, reviewer, triage-processor, writer.

### Skills — 156 total

**Have (33):** All core engineering skills (agent-harness-construction, continuous-learning-v2, context-budget, etc.) plus domain skills (writing-terms, writing-surveys, decision-records, etc.).

**Missing at medium+ priority:** security-scan (high), cost-aware-llm-pipeline (medium), tdd-workflow (medium).

**561-only (16):** concept-lookup, decision-records, duty-dispatch, interpret-directives, writing-botanical-terms, writing-frontmatter, writing-gardening-texts, writing-markdown, writing-operations-surveys, writing-philosophy-surveys, writing-surveys, writing-terms, writing-texts, and more.

### Commands — 72 total

**Have (27):** aside, build-fix, checkpoint, code-review, evolve, harness-audit, instinct-status, learn, learn-eval, loop-start, loop-status, model-route, orchestrate, plan, projects, promote, prune, quality-gate, rules-distill, skill-create, verify, and more.

**Missing at high priority:** session save/resume (high — no explicit session state persistence command).

**561-only (35):** balance, bridge, briefing, crew, critical-path, decisions, dispatch, dispatch-batch, dispatch-work, duty-officer, duty-status, fleet, flow-metrics, library-graph, monthly-review, partition, plan-status, plan-variance, publish, record-event, repo-help, review, standup, tag-computer-specs, tracking-status, validate, week-plan, weekly-review, workflows, write-term, write-text.

### Hooks — 29 total

**Have (16):** Most pre/post hooks for bash, edit, observe, compact, session lifecycle.

**Missing:** AI security monitor, PR creation notification, batch edit accumulation.

### Infrastructure — 16 features

**High priority gaps:** 1.
Automated test suite (no tests for harness components) 2.
CI validation pipeline 3.
Skill evolution tracking (skills can't self-improve) 4.
Session save/resume

### Summary

| Category | Have | Partial | Missing | Not Needed | Total |
|----------|------|---------|---------|------------|-------|
| Agents | 14 | 0 | 4 | 20 | 38 |
| Skills | 33 | 11 | 14 | 98 | 156 |
| Commands | 27 | 7 | 11 | 27 | 72 |
| Rules | 3 | 5 | 2 | 13 | 23 |
| Hooks | 16 | 2 | 5 | 6 | 29 |
| Infrastructure | 4 | 4 | 6 | 2 | 16 |
| **Total** | **97** | **29** | **42** | **166** | **334** |

## What We Exceed ECC On

ECC is a harness — it orchestrates Claude Code sessions.
We are building a computer — the harness is one interfacer among many.
Specific advantages:

- **Algebraic dispatch** instead of keyword matching — respond(office, task) via ⊙
- **Grounded governance** — Hohfeldian deontic profiles, not just tool allowlists
- **Domain knowledge** — 3000+ library terms grounding every concept
- **Double-entry accounting** — operational finance tracking authority, tokens, work as real commodities
- **Mathematical foundation** — the adjoint paper proves the algebra is sound
- **Multi-application** — same substrate runs ERP, MUD, CL, research publishing

## See also

- [Cross-system adoption priorities](./cross-system-adoption-priorities.md) — synthesis ranking 10 patterns from ECC and others
- [CL pipeline](../plans/cl-pipeline.md) — our CL competing directly with ECC v2.1
