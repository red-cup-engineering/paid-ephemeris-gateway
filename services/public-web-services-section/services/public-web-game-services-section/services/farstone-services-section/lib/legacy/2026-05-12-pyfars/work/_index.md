---
title: "PyFARS work"
type: index
status: open
---

# PyFARS — work

Work-tracking layer for [`pyfars`](../../README.md).
Source lives in `../../src/`.
Governance (decisions, charter, conventions) lives in [`../theory/`](../theory/).

## Right now

**In flight: M1 — Operational Housekeeping.** Structural cleanup before the autonomous loop can run reliably.
Hardcoded paths, scattered work-item writes, skill record format.
See [milestones/roadmap.md §M1](milestones/roadmap.md#m1--operational-housekeeping).

**Behind M1 in order:** M2 (substrate-driven dispatch) then M3 (continuous autonomous loop).
M2's design is fully specced at [implementation/substrate-driven-dispatch.md](implementation/substrate-driven-dispatch.md) — implement once M1 housekeeping is stable.

**Parallel-eligible at any time:** The [theory-derivation-loop](theory-derivation-loop.md) can run one cycle manually (Phases 1–3 through OpenClaw) without blocking on M1 completion.

## How to pick up a task

1. Read [`../theory/charter.md`](../theory/charter.md) — what counts as a real landing, what's anti-pattern.
  Once.
2. Read [`milestones/roadmap.md`](milestones/roadmap.md) — find the active milestone, check what's open.
3. Read the implementation guide for your work area:
   - Dispatch / heartbeat → [`implementation/substrate-driven-dispatch.md`](implementation/substrate-driven-dispatch.md)
   - OpenClaw interface → [`implementation/openclaw-as-interface.md`](implementation/openclaw-as-interface.md)
   - Session / memory → [`implementation/session-and-memory.md`](implementation/session-and-memory.md)
   - Python conventions → [`implementation/python.md`](implementation/python.md)
4. Open a task file under [`tasks/<area>/`](tasks/) and follow it.

## Where things are

| Path | What's in it |
|---|---|
| [`milestones/`](milestones/) | Release records (roadmap + per-release snapshots). |
| [`goals/`](goals/) | Outcomes under the active milestone. |
| [`tasks/<area>/`](tasks/) | Leaf work items. Areas: engineering, research, governance, operational. |
| [`backlog/<horizon>/`](backlog/) | Unscheduled work: soon, later, captured, done. |
| [`campaigns/`](campaigns/) | Multi-month initiatives. |
| [`objectives/`](objectives/) | Multi-year outcomes. |
| [`implementation/`](implementation/) | Technical guides (language, subsystem, workflow). |
| [`specs/`](specs/) | Subsystem specs (reply-contract, work-orchestration, etc.). |
| [`references/`](references/) | Theory-for-developers, vocabulary translation. |
| [`texts/`](texts/) | Charter-adjacent prose: vision, scope, roadmap narrative. |
| [`surveys/`](surveys/) | Periodic state-of-project audits. |
| [`questions/`](questions/) | Open items for the captain. |
| [`theory-derivation-loop.md`](theory-derivation-loop.md) | The meta-process: predication-categories → PyFARS code. |

## Source-of-truth ordering

1. Math theory: `theories/.../predication-categories/`
2. Engineering theory: `theories/.../predicated-computing/`
3. FARS spec: `theories/.../flatfile-agentic-resource-system/`
4. Governance: `../theory/`
5. These work records
6. Code: `../../src/`

When sources disagree, the lower-numbered one wins.
