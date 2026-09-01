---
title: "Work-record conventions"
kind: conventions
status: active
authority: "specs/work-orchestration/"
---

# Conventions

Authoritative schema for all records in `records/`.
The full per-record spec lives in [`../work/specs/work-orchestration/`](../work/specs/work-orchestration/) when written; this file is the standing summary.

## Record hierarchy

```
objective → campaign → milestone → goal → task
```

| Dir | Kind | What it is |
|---|---|---|
| `objectives/` | `objective` | Multi-year outcomes. For PyFARS: "run a fully predicated agentic system." |
| `campaigns/` | `campaign` | Multi-month initiatives. Current: `ship-pyfars-autonomous-loop`. |
| `milestones/` | `milestone` | One per roadmap milestone, M1–M6. |
| `goals/` | `goal` | Outcomes under the active milestone. |
| `tasks/<area>/` | `task` | Leaf executable units. `<area>` ∈ {engineering, research, governance, operational}. |
| `backlog/<horizon>/` | `task` | Tasks not currently scheduled. |

## Status (lifecycle)

| Kind | Allowed values |
|---|---|
| `task` | `open \| dispatched \| in-progress \| blocked \| review \| done \| abandoned` |
| `goal` | `planning \| active \| partially-met \| met \| abandoned` |
| `milestone` | `planning \| active \| blocked \| completed \| cancelled` |
| `campaign` | `planning \| active \| paused \| completed \| cancelled` |
| `objective` | `planning \| active \| partially-met \| met \| abandoned` |

Supersession uses `superseded-by:` alongside a terminal status.
`superseded` is not a status value.

## Horizon (scheduling)

Orthogonal to status.
`status` = where in the lifecycle; `horizon` = when scheduled.

| Horizon | Meaning | Lives under |
|---|---|---|
| `doing` | committed and in-flight | `tasks/<area>/` |
| `soon` | next-milestone candidate | `backlog/soon/` |
| `later` | 3–9 months out | `backlog/later/` |
| `captured` | ≥9 months out or unscoped | `backlog/captured/` |
| `done` / `abandoned` | terminal | `backlog/done/` or `backlog/abandoned/` |

## Task body

Three required sections:

```markdown
## Description
What this task is and why it matters. Cite the owning implementation guide
or spec section and any decision it depends on.

## Acceptance
- [ ] Checklist of what "done" means for this task.
- [ ] Each item is specific and verifiable.

## Progress cells
Chronological observations in (s, p, o, v) form — or plain prose timestamped entries.
Each entry records what happened, not what was planned.
```

## Decision body

```markdown
## What
One clear statement of the committed position.

## Why
The engineering or theoretical reason. Cite math/engineering theory where applicable.

## Rules out
Concrete things this decision prohibits.

## Does not constrain
Things a reader might assume this constrains but doesn't.
```

## Frontmatter fields

### Field convention: `type` vs `kind`

Records use **`type:`** as the primary classifier the runtime reads — this aligns with the PyFARS substrate convention (`runtime.eligibility_rules.
WORKITEM_TYPES = frozenset({"task", "workitem"})` and the projector framework's `markdown_frontmatter` projector look for `type:` cells, not `kind:` cells).
The `kind:` field is reserved for sub-classification within a type.

Every record needs at minimum:

```yaml
---
title: "Human-readable title"
type: task | goal | milestone | campaign | objective | decision | convention
status: <see above>
---
```

Tasks additionally carry:
```yaml
horizon: doing | soon | later | captured | done | abandoned
area: engineering | research | governance | operational
milestone: <milestone-slug>       # which milestone this task belongs to
goal: <goal-slug>                 # which goal this task serves
depends-on: [<task-slug>]         # other tasks that must complete first
requires-capability: [<cap-slug>] # capabilities an agent must provide (drives dispatch)
requires-authority: [<power-slug>]# normative powers an agent must hold (drives auth check)
```

**Note on `assigned-to:`** — Per PredWork theory (`assignment.md`), task dispatch produces a first-class **Assignment entity** (a separate substrate record), not an `assigned-to:` cell on the task.
Do not add `assigned-to:` to task records.
Queries about "who is doing task T" walk reverse-edges from Assignment records, not a cell on T.
Assignment records are written by the dispatch machinery, not by hand.
