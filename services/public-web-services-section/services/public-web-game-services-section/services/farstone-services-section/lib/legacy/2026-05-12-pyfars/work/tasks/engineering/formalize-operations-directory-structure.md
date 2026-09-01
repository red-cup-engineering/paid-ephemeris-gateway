---
title: "Formalize operations directory structure"
type: task
area: engineering
status: open
horizon: doing
milestone: m1-operational-housekeeping
goal: operations-directory-structured
depends-on: []
requires-capability: [corpus-editing, filesystem-restructuring]
theory-basis: [normative-operational-layering, operations-loop]
---


## Description

The operations tree needs three consistent top-level domains (`engineering`, `command`, `science`) with standard sub-directories.
Currently operations are scattered or missing entirely.
Agents navigating the substrate to find their work can't reliably locate tasks, agents, or skills without this structure.

The target layout for each domain:
```
operations/<domain>/
├── agents/          # agent records (type: agent)
├── groups/          # group records (type: group)
├── skills/          # skill records (type: skill) — gerunding phrases
├── projects/        # project records
└── triage/          # unclassified intake
```

## Acceptance

- [ ] `operations/engineering/`, `operations/command/`, `operations/science/` directories exist.
- [ ] Each has at minimum `agents/`, `skills/`, and `triage/` sub-directories.
- [ ] Any existing agent/skill/group records are moved to the correct domain directory.
- [ ] The `operations/` root has an `_index.md` that describes the three-domain structure.
- [ ] The substrate validation suite (`closure/rule/compose_rules.run`) on `operations/` shows no broken links from this restructure.

## Progress cells

*(empty — task not yet started)*
