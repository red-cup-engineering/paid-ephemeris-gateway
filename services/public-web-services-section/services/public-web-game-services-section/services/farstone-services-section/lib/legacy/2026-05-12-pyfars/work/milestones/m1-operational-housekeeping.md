---
title: "M1 — Operational Housekeeping"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: active
horizon: doing
goals:
  - work-records-visible-to-heartbeat
  - work-item-paths-from-profile
  - operations-directory-structured
  - pyfars-instance-directory-clean
  - claude-code-harness-properly-installed
  - orientation-files-derive-from-substrate
  - harness-claude-by-office-assignment
theory-basis: [task-cell-system, operations-loop, normative-operational-layering]
cites-objects:
  - pyfars/objects/corpus-as-flatfile.md
  - pyfars/objects/jsonl-event-log.md
cites-morphisms:
  - pyfars/morphisms/validating.md
cites-claims:
  - pyfars/claims/substrate-purity.md
  - pyfars/claims/work-records-are-processes.md
acceptance: "The substrate is clean enough that an autonomous loop can run on it without tripping over structural debt."
---


A clean substrate foundation that the autonomous loop can run on without tripping over structural debt.
Most M1 items either landed with the May 2026 refactor or were dissolved by it; the remaining items are the substantive structural work that's still in flight.

## Goals

| Slug | One-liner | Status | Backed by |
|---|---|---|---|
| `operations-directory-structured` | Operations tree has three-domain structure with consistent sub-layout | open | [`substrate-purity`](../../claims/substrate-purity.md) |
| `pyfars-instance-directory-clean` | `.pyfars/` holds only instance config, event log, and session state | open | [`corpus-as-flatfile`](../../objects/corpus-as-flatfile.md) |
| [`orientation-files-derive-from-substrate`](../goals/orientation-files-derive-from-substrate.md) | Orientation harnesses consume substrate `orientation-fragment` records instead of hardcoded prose | **doing** | [`harness`](../../concepts/harness.md) |
| [`harness-claude-by-office-assignment`](../goals/harness-claude-by-office-assignment.md) | What gets projected into a Claude Code session is determined by office assignment in substrate | **doing** | [`harness`](../../concepts/harness.md), `objects/office-record.md` |

## Acceptance

- [ ] `operations/engineering/`, `operations/command/`, `operations/science/` exist with consistent sub-layout (`agents/`, `groups/`, `skills/`, `projects/`, `triage/`).
- [ ] Skill records follow gerunding-verb-phrase format with exactly two-sentence descriptions.
- [ ] `.pyfars/` contains only: `config.toml`, `events.jsonl`, `harness-manifests/`, `sessions/`, `cache/`, runtime lock files.
  No task records, agent projections, or corpus notes.
