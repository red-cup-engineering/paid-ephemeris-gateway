---
title: "Author the runbook record type"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: runbooks-as-first-class-substrate
depends-on: []
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [workflow, four-layer-rule-architecture]
---


## Description

Add a `runbook` record type to the substrate.
The frontmatter shape per the goal record:

```yaml
---
title: "<runbook name>"
type: runbook
slug: <kebab-case>
status: active | retired
trigger: <cell-pattern>             # what workitem cells admit this runbook
office: <office-slug>               # whose authority dispatches it
capabilities: [<capability-slug>]
workflow: <workflow-slug>           # or inline workflow body
on-complete: { ... }                # learning outputs (M5 goal)
---
```

Add `governance/runbooks/` to [`governance/specifications/directories.md`](../../../governance/specifications/directories.md).
Add `governance/templates/runbook.md` with the canonical frontmatter and body sections.

## Acceptance

- [ ] [`governance/specifications/directories.md`](../../../governance/specifications/directories.md) includes `governance/runbooks/`.
- [ ] [`governance/conventions.md`](../../../governance/conventions.md) declares the runbook frontmatter shape.
- [ ] `governance/templates/runbook.md` exists with the template.
- [ ] At least one example runbook is authored under `governance/runbooks/` for end-to-end testing.

## Progress cells

*(empty — task not yet started)*
