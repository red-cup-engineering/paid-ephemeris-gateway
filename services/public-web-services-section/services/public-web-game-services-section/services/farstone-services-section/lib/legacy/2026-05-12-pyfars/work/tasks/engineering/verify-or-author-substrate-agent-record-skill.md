---
title: "Verify or author the authoring-a-substrate-agent-record skill"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: []
requires-capabilities: [skill-authoring, substrate-survey]
theory-basis: [agential-self-generation, substrate-purity]
---


## Description

The `claude-code` harness reads from `records/engineering/agents/<slug>.md` and projects each as a `.claude/agents/<slug>.md` Claude-Code-flavored agent file.
This means the substrate-side authoring-shape of an agent record is load-bearing: model tier, description, duties, powers, skills, jurisdiction, autonomous-vs-escalates boundary all need to be authored consistently or the projection drifts.

A skill record specifically covering "how to author a substrate agent record" likely already exists under another name (the `governance/skills/` index includes `authoring-an-incumbent-record.md`, `authoring-a-runbook-record.md`, etc., but the agent case is unclear).
This task is two-step:

1. **Verify** — search `governance/skills/` and `operations/engineering/skills/` for a skill that covers authoring agent records under `records/engineering/agents/`.
  If one exists with a different name, this task is a documentation update only.
2. **Author** — if no such skill exists, author `governance/skills/authoring-a-substrate-agent-record.md` in gerunding-recipe form documenting: when to write a new agent record vs. update an existing one; the canonical frontmatter (slug, description, model tier, duties, powers, skills, jurisdiction, autonomous-vs-escalates); how an agent record is read by the `claude-code` harness; how skills referenced in `skills:` must already exist under `governance/skills/` or the projection breaks.

## Acceptance

- [ ] A skill covering substrate-agent-record authoring is reachable from `governance/skills/`, either under its own slug or as a section of an existing skill.
- [ ] The `claude-code` harness's `_index.md` cites that skill in its "what it reads" or substrate-record-contract section.
- [ ] If newly authored: frontmatter `description:` is exactly two sentences; body follows Requirements / Steps / Outcomes.
- [ ] At least one example agent record (or pointer to an existing one in `records/engineering/agents/`) is referenced.

## Progress cells

*(empty — task not yet started)*
