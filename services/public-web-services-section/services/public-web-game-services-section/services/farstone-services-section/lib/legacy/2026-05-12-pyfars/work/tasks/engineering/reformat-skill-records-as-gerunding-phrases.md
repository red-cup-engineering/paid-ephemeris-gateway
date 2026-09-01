---
title: "Reformat skill records as gerunding verb phrases"
type: task
area: engineering
status: open
horizon: doing
milestone: m1-operational-housekeeping
goal: operations-directory-structured
depends-on: [formalize-operations-directory-structure]
requires-capability: [corpus-editing]
theory-basis: [normative-operational-layering, dispatch-readiness]
---


## Description

Skill records must have a `name:` field that is a gerunding verb phrase (e.g., "Running Python tests", "Auditing citation graph") and a `description:` field of exactly two sentences: what changes when the skill runs, and when an agent should use it.

Currently, skill records vary widely in format — some have prose descriptions, some have multi-field YAML blocks, some have names that are nouns rather than verb phrases.
This makes `requires-capability:` matching unreliable: if dispatch can't parse skill names into capability predicates, the N→O authorization rules that gate task assignment break down.

## Acceptance

- [ ] Every skill record under `operations/` has `name:` as a gerunding verb phrase.
- [ ] Every skill record has `description:` as exactly two sentences.
- [ ] The slug of each skill record is the lower-kebab-case of the gerunding name (e.g., `running-python-tests`).
- [ ] No skill record has orchestration metadata (trigger conditions, required tools) in the body — that goes in runbook records.
- [ ] The substrate validation suite (`closure/rule/compose_rules.run`) on skill records shows no format violations.

## Progress cells

*(empty — task not yet started)*
