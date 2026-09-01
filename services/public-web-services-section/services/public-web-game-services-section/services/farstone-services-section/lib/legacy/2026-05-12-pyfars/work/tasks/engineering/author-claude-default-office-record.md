---
title: "Author the claude-default office record in 561"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: [extend-office-record-with-exposes-fields]
requires-capabilities: [substrate-authoring, governance-curation]
theory-basis: [normative-operational-layering, eligibility-by-office]
---


## Description

Author `561/governance/offices/claude-default.md` declaring the office Claude holds in this polity by default.
The record's `exposes-skills:`, `exposes-agents:`, `exposes-commands:` fields determine what `pyfars install-harness claude-code` (and the new `claude-code-skills`) will project into a Claude session.

This is a **curation choice**, not a default — every entry is the captain's deliberate decision that *this* skill / agent / command should be available to a Claude session.
Start narrow:

- **`exposes-skills:`** — the skills Claude routinely needs in a development session.
  Likely starting set: `committing-a-change-with-git`, `authoring-a-substrate-agent-record`, `authoring-an-orientation-fragment`, `authoring-an-observation-record`, `installing-a-harness`, plus a small set of audit/triage skills the captain wants Claude to be able to invoke.
  Avoid blanket inclusion of every skill record.
- **`exposes-agents:`** — agents Claude can dispatch to as subagents.
  The current substrate has ~35 agent records under `governance/agents/`; not all of them belong in front of Claude.
  Curate to the set that's actually been useful.
- **`exposes-commands:`** — usually empty for a model's default office, since slash commands are projected from the captain's office.
  But if there are read-only commands a Claude session should always have (e.g. a substrate-show command, a help command), they go here.

Frontmatter:

```yaml
---
type: office
slug: claude-default
title: "Claude (default development office)"
held-by: model:claude
status: active
exposes-skills:
  - committing-a-change-with-git
  - authoring-a-substrate-agent-record
  - ...
exposes-agents:
  - ...
exposes-commands: []
---
```

Body:

- A paragraph naming what this office is for (the default authorization envelope for any Claude model session in this polity).
- The rationale behind each `exposes-*:` choice, briefly — why this skill belongs in front of Claude, why this agent does, why this command does.
- The relationship to the captain's office (which holds the broader command set and is the slash-command source).
- Pointers to the harness manifests that consume this record.

This task does NOT enumerate the full skill/agent set in advance — it is curation work that needs the captain's input.
File the office with a starter set; iterate.

## Acceptance

- [ ] `561/governance/offices/claude-default.md` exists with `type: office`, `slug: claude-default`, populated `exposes-*:` lists.
- [ ] Each entry in `exposes-skills:` resolves to a real `governance/skills/<slug>/` (or `<slug>.md`) record.
- [ ] Each entry in `exposes-agents:` resolves to a real `governance/agents/<slug>.md` record.
- [ ] The body's rationale is concrete enough that a future captain reviewing the curation can decide whether to extend or trim it.

## Progress cells

*(empty — task not yet started)*
