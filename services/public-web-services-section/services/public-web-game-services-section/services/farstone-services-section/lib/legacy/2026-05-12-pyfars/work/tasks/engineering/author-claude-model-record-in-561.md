---
title: "Author claude model record in 561 substrate"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: [extend-office-record-with-exposes-fields, author-claude-default-office-record]
requires-capabilities: [substrate-authoring, model-provenance-research]
theory-basis: [normative-operational-layering]
---


## Description

Author `561/governance/assets/computing/models/claude.md` declaring Claude as a substrate-side model entity that holds an office.
The record gives the office-resolver something to look up at install time: when `pyfars install-harness claude-code` runs, it asks "what office does the Claude model hold?" and reads this record's `holds-office:` cell.

Frontmatter shape (subject to alignment with whatever other model records exist or the schema for `governance/assets/computing/models/`):

```yaml
---
type: model
slug: claude
title: "Claude (Anthropic)"
provider: anthropic
holds-office: claude-default
families:
  - claude-opus
  - claude-sonnet
  - claude-haiku
status: active
---
```

Body:

- One paragraph naming what Claude is in the polity's vocabulary (a frontier-tier LLM, primary model for development sessions in this polity, accessed via Claude Code).
- A short list of the model families the polity has used (Opus, Sonnet, Haiku) and the current default tier per relevant policy.
- A pointer to the `claude-default` office record naming what this model is authorized for.
- A pointer to the harness manifests that consume this record.

Before authoring, check whether `561/governance/assets/computing/models/` already exists or whether this is the first model record.
If first, also author the directory's `_index.md`.
If models live elsewhere in the captain's intended layout, follow the captain's preferred path (the `governance/assets/computing/<kind>/<slug>.md` shape mirrors how `pyfars-mcp` was filed under `governance/assets/computing/web/`, so this is consistent).

## Acceptance

- [ ] `561/governance/assets/computing/models/claude.md` exists with `type: model`, `slug: claude`, `holds-office: claude-default`.
- [ ] Frontmatter validates against any existing model-record schema or, if none, sets the precedent for one.
- [ ] If first model in 561, the parent `_index.md` exists.
- [ ] The `claude-default` office record (authored in the sister task) is reachable from the model record.

## Progress cells

*(empty — task not yet started)*
