---
title: "Extend office-record schema with exposes-* fields"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: []
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [normative-operational-layering, eligibility-by-office]
---


## Description

The current office-record schema (under `tools/platform/pyfars/objects/office-record.md`) declares an office's standing, duties, powers, jurisdiction, but does not declare *what runtime-projection items the office's holder is authorized to use*.
Office-aware harness projection requires the schema to say so.
Add three fields:

- `exposes-skills:` — list of substrate skill slugs (under `governance/skills/`) the office's holder may invoke.
  Read by `pyfars install-harness claude-code-skills` (and any future skill-projecting harness) to filter the projected skill set.
- `exposes-agents:` — list of substrate agent slugs (under `governance/agents/`) the office's holder may dispatch to.
  Read by `pyfars install-harness claude-code` to filter the projected agent set.
- `exposes-commands:` — list of substrate-side command/verb slugs (typically PyFARS verbs from `pyfars.cli.__main__.
  VERB_MODULES`, possibly extended with substrate-defined commands) projected as slash commands when the office is the captain's.

Each is a list of slugs; `["*"]` may be used as a sentinel meaning "everything available" — appropriate for a captain's office, less so for a model's default office.

The schema additions go in two places:

1. The frontmatter shape block in `objects/office-record.md`'s body (the `# Office record / ## Markdown shape` example).
2. The corresponding `## Cells` section, listing the projection: `(slug, exposes-skill, <skill-slug>) = t`, `(slug, exposes-agent, <agent-slug>) = t`, `(slug, exposes-command, <command-slug>) = t`.

The schema does NOT yet enumerate which offices in 561 use which lists — that is per-polity content authored against this schema in tasks `author-claude-default-office-record` and `author-or-confirm-captain-office-record`.

## Acceptance

- [ ] `tools/platform/pyfars/objects/office-record.md` carries the three `exposes-*:` fields in its schema documentation.
- [ ] The `## Cells` section enumerates the three new cell projections.
- [ ] At least one upstream concept page (`concepts/office.md` or `concepts/governance.md`) is updated to reference office-as-authorization-projection-source if not already worded that way.

## Progress cells

*(empty — task not yet started)*
