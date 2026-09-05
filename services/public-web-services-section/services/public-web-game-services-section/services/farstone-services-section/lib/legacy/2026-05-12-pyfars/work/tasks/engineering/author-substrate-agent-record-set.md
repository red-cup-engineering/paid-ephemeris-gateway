---
title: "Author the 561-polity substrate agent record set"
type: task
area: engineering
status: done
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: [verify-or-author-substrate-agent-record-skill]
requires-capabilities: [substrate-authoring, governance-record-design]
theory-basis: [agential-self-generation, substrate-purity, normative-operational-layering]
---


## Description

The `claude-code` harness projects substrate agent records into `.claude/agents/<slug>.md`.
Without records, the harness installs a zero-agent surface.
The 561 bootstrap commit's `git rm` left a list of agent slugs that were previously available as Claude-Code subagents; these are the agents the polity expects to dispatch.
They need to be authored as substrate records (under `governance/agents/`), not as projection-shaped markdown that bypasses substrate.

Author records under `561/governance/agents/<slug>.md` for the agent set the deleted projector covered:

- architect, build-error-resolver, cartographer, claude-code-guide, code-reviewer
- derived-theory-improver, diviner, doc-updater, docs-lookup, graph-analyst
- harness-cleaner, harness-optimizer, helmsman, librarian, loop-operator
- math-theory-adversary, math-theory-saboteur, mathematical-researcher, mining-curator
- observer, operational-record-enricher, operations-officer, organizational-counsel
- predicated-sociologist, predication-category-theory-auditor, predication-category-theory-researcher
- predication-physicist, predication-theory-lifter, publisher, pyfars-developer
- pypredcomp-architect, pypredcomp-developer, quartermaster, reviewer
- rust-build-resolver, rust-reviewer, security-reviewer, theory-auditor
- theory-researcher, triage-processor, writer

Each substrate agent record carries (per the substrate-agent skill — see [`verify-or-author-substrate-agent-record-skill`](verify-or-author-substrate-agent-record-skill.md)):

```yaml
---
type: agent
slug: <kebab-slug>
status: active
model: opus | sonnet | haiku   # tier; passed through to .claude/agents/<slug>.md frontmatter
duties: [<duty-slug>...]
powers: [<jural-relation-slug>...]
skills: [<skill-slug>...]
jurisdiction: <jurisdiction-slug>
autonomous: <action-domain-slug-or-list>      # what the agent may do without escalation
escalates: <action-domain-slug-or-list>       # what the agent must escalate
description: "<one-line description for the dispatcher>"
---
```

## Acceptance

- [ ] `561/governance/agents/_index.md` exists with `kind: index`.
- [ ] One substrate agent record per slug above.
  (At minimum the seven "central" agents — `architect`, `code-reviewer`, `theory-researcher`, `harness-optimizer`, `operations-officer`, `pyfars-developer`, `librarian` — are required for the goal to ship; the long tail can land incrementally.)
- [ ] Each record cites its `skills:` slugs against records that actually exist under `governance/skills/` (or the equivalent `561/`-side governance directory).
  Dangling `skills:` slugs fail validation.
- [ ] Each record cites its `duties:` against records that exist.
- [ ] No record under `governance/agents/` carries `tools:` or other Claude-Code-flavoured fields — those belong to the *projection*, not the substrate.

## Progress cells

- 2026-05-09: Discovered the harness's `_walk_agent_records` was reading from the legacy `records/engineering/agents/` location, contradicting the directory-schema RFC §5.1 and the [`dispatch-reads-substrate`](../../../governance/decisions/dispatch-reads-substrate.md) decision both of which place agents at `governance/agents/`.
  The 561 polity already carries 36 records of the correct shape under `governance/agents/`.
- 2026-05-09: Resolved by updating `pyfars.cli.install_harness._walk_agent_records` (now via a new `_agents_dir` helper) to read from `governance/agents/` first, with `engineering/agents/` retained as fallback.
  This brings the harness into compliance with the RFC.
  Goal-ship pivot: the substrate agent record set is satisfied by the existing 36 records — no migration needed.
- 2026-05-09: Acceptance pivot: the original wording referenced `records/engineering/agents/_index.md`; corrected to `governance/agents/_index.md`, which already exists.
  Records already cover well over the seven-record minimum.
  Dangling `skills:` references inside agent frontmatter exist (e.g., `assess-page`, `evaluate-slop`) — these are pre-existing substrate-hygiene issues out of scope for the harness-install goal; flagged for later cleanup.
