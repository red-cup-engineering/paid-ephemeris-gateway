---
name: "Writing implementation guides"
description: "Updates work/implementation/ guides with the module paths, function signatures, and schemas a developer needs to implement new FARS spec entities. Use when a triage note has requires-action: write-implementation-guide."
---


## Requirements

- A triage note with `fars-entities:` populated
- The relevant implementation guide exists in `work/implementation/`

## Steps

1. For each FARS entity, find the implementation guide that covers its subsystem (dispatch → `substrate-driven-dispatch.md`, sessions → `session-and-memory.md`, etc.).
2. Add or update the section for that entity: what Python module/class realizes it, what fields the record schema needs.
3. Create a task record in `work/tasks/engineering/` for the implementation work.
4. Update the triage note: add task slugs to `implementation-tasks:` and set `requires-action: implement`.

## Outcomes

Updated implementation guide sections with concrete module and schema information.
At least one new task record per FARS entity.
Triage note updated and ready for the implement phase.
