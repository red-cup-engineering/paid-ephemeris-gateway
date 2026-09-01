---
title: "Service specifications"
type: index
status: open
---

# Farstone — service specifications

Records describing the long-running services that make up a running farstone instance.
Each entry is `type: service-spec`; the [systemd-user harness](../../../../../../src/pyfars/harnesses/systemd-user/_index.md) reads `status: active` and `status: draft` records and projects one `<slug>.service` unit per record into `~/.config/systemd/user/` (or wherever the operator's harness config points).

## Records

| Slug | Status | Purpose |
|---|---|---|
| [`farstone-engine`](farstone-engine.md) | active | Deployable default: a single supervised PyFARS engine bound to the farstone polity. Use this when running farstone standalone on a personal box. A polity hosting farstone elsewhere (e.g., the 561 Group on cold-red-gate) authors its own deployment-context spec and does not project this one. |
| [`pyfars-engine-farston`](pyfars-engine-farston.md) | sketch | **In-fiction** — describes how Farston's city hall would run the engine in the polity's fictional setting. Not a deployable spec; the harness skips `status: sketch`. |

## Schema

See `tools/platform/pyfars/src/pyfars/harnesses/systemd-user/_index.md` for the canonical service-spec schema.
