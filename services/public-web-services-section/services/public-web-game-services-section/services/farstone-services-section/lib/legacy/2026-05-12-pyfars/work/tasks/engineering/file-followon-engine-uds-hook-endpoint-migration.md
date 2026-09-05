---
title: "File follow-on for engine-UDS hook endpoint migration"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: [round-trip-claude-hook-witness-test]
requires-capabilities: [task-authoring]
theory-basis: [substrate-purity]
---


## Description

Per [`wiring-protocols`](../../../governance/specifications/wiring-protocols.md) §4.5: the inbound hook protocol's *target* shape is HTTP POST to the engine over UDS (`<polity-root>/.pyfars/run.sock`).
Today's `pyfars hook-dispatch` operates against the polity-image directly.
This is acknowledged in the spec as an in-progress migration: "today operates against the polity-image directly.
The migration path: hook-dispatch becomes an HTTP-POST to the running engine if one is up, falling back to direct image-modification if not."

The current goal accepts the direct-write fallback.
But this should not be lost.
File a follow-on engineering task (under M2 substrate-dispatch or M3 continuous-loop, whichever is closer to engine-runtime concerns) so the migration is explicit:

> **`migrate-hook-dispatch-to-engine-uds-post`** — when the engine is running and listening on `<polity-root>/.pyfars/run.sock`, `pyfars hook-dispatch` POSTs the payload to the engine's hook endpoint instead of writing the polity-image.
> Falls back to direct write when no engine is running.
> Witness lifecycle is unchanged at the substrate level.

This task is a *book-keeping* task: author the follow-on task record.
It does not migrate anything itself.

## Acceptance

- [ ] A new task record `migrate-hook-dispatch-to-engine-uds-post.md` exists under `work/tasks/engineering/` with an appropriate `goal:` linkage (likely under `engine-runs-as-supervised-service` or a new goal under M2/M3).
- [ ] The follow-on task cites `wiring-protocols.md` §4.5 explicitly.
- [ ] The follow-on task notes the fallback discipline (direct image write when engine is absent).

## Progress cells

*(empty — task not yet started)*
