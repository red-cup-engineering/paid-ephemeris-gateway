---
title: "Migrate existing endpoint records to FARS-spec-conformant LLMEndpointRecord"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: llm-endpoint-record-fully-spec-conformant
depends-on: [author-llm-endpoint-record-template]
requires-capabilities: [substrate-authoring, fars-spec-conformance, code-migration]
theory-basis: [llm-endpoint-record]
---


## Description

[M2](../../milestones/m2-substrate-dispatch.md) introduced endpoint records at `governance/assets/computing/endpoints/<slug>.md`.
M7 moves them to `governance/endpoints/<provider>--<model>.md` per the updated [directory schema](../../../governance/specifications/directories.md), and conforms each to the full [FARS LLMEndpointRecord spec](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md).

For each existing endpoint record: 1.
Move file to new path.
2.
Add missing required fields (handedness=outbound-only, all four cost cells, all four rate-limit cells, provenance fields).
3.
Remove forbidden fields (any signing-key cell).
4.
Update slug naming convention to `<provider>--<model>`.
5.
Update any code that reads the old path/slug pattern.

Per the [`561 — no legacy shims`](https://example.invalid) discipline: do NOT keep both old and new locations.
Move; update references; don't retain the old path "for compat."

## Acceptance

- [ ] All endpoints under `governance/assets/computing/endpoints/` are migrated to `governance/endpoints/`.
- [ ] Each migrated record passes the M7 invariant validation (no signing-key, handedness=outbound-only, all required fields present).
- [ ] The `EndpointRouter` (from [M2](../../milestones/m2-substrate-dispatch.md)) reads from the new path; old path is empty.
- [ ] No regression in dispatch — existing endpoint dispatches continue working.
- [ ] Migration is recorded in a single commit with a descriptive message; pre-existing tests pass post-migration.

## Progress cells

*(empty — task not yet started)*
