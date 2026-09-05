---
title: "Realize PyFARS-self ToolSpecs for the nineteen chartered skills"
type: task
area: engineering
status: open
horizon: later
milestone: m19-self-developing-pyfars
goal: self-development-workflow
depends-on: [implement-skill-to-tool-spec-projector, format-pyfars-self-workitems-as-workitem-subtypes]
requires-capabilities: [corpus-editing, skill-authoring]
theory-basis: [skill-as-gerund, agential-self-generation]
---


## Description

Author `governance/skills/<gerunding-phrase>/SKILL.md` records for each of the nineteen chartered skills PyFARS-self needs.
Each skill record declares `body_kind: command | runbook | composite`, the skill's command body or runbook step-sequence, and the activation-trigger (when the skill is offered to dispatch).

Pairs with [`implement-skill-to-tool-spec-projector`](implement-skill-to-tool-spec-projector.md) — that task ships the projector; this task ships the source skill records the projector consumes.
Together they close the loop: substrate skill records project to dispatch-graph tool specs; agents invoke skills via tools; new skill records authored mid-tick dispatch on the next tick.

The nineteen skills are charter-derived (per the chartered-offices duty descriptions).
Each carries a gerunding-phrase title per the conventional form ("validating-a-frontmatter-record", "committing-a-change-with-git", etc.).

## Acceptance

- [ ] Nineteen skill records exist under `governance/skills/<slug>/SKILL.md`, one per chartered skill.
- [ ] Each carries gerunding-phrase title and frontmatter declaring `body_kind` and activation-trigger.
- [ ] Each body follows the gerunding-recipe shape (situation → ingredients → steps → end-state).
- [ ] The skill→tool-spec projector consumes each successfully and registers a corresponding tool in the dispatch graph.
- [ ] `pyfars list-tools` shows the nineteen skill-derived tools after boot.

## Progress cells

*(empty — task not yet started)*
