---
title: "Plans"
type: index
status: active
realizes: [plan]
---


Closure-rule-driven coordinations of multiple [task cell systems](../tasks/) under a dependency partial order.
A plan is a quadruple $P = (T_P, \preceq_P, M_P, \mathcal{S}_P)$ — a finite set of task cell systems, an acyclic dependency order, a milestone-cell set whose joint settlement constitutes plan-level completion, and the closure-rule subsystem coordinating the tasks.

## Plan vs. goal

PyFARS's existing hierarchy is `objective → campaign → milestone → goal → task`.
Plans **sit between goals and tasks** when a goal's tasks need explicit coordination structure beyond a flat list:

| Record | What it carries | When |
|---|---|---|
| `goal` | A specific outcome under a milestone; a set of tasks that, when met, satisfy it | Always — every milestone's outcomes decompose into goals |
| `plan` | An *ordered* coordination of tasks (and possibly sub-plans) with explicit dependency-order, gate cells, and a normative profile | When the work has dependency structure that doesn't fit a flat task list |
| `task` | An atomic unit of work | Always — the leaves |

Most goals don't need a plan; their tasks compose flatly.
Author a plan when:

- Tasks have **dependency-DAG** structure (T_j blocks on T_i's goal cells settling).
- The work has **normative-handoff** structure (one task's completion grants authority for the next).
- The goal-level completion requires **joint settlement** of multiple non-trivial milestones.
- The work is **defeasible** in a way that wants explicit revision/abandonment witnesses.

## Plan vs. workflow

A plan has a name, completion condition, and lifecycle (open/active/completed).
A [workflow](../workflows/_index.md) is just the type-bounded composition; it has no name or completion condition without being attached to a task or plan. **Plans contain workflows as their internal task-graph; workflows are content within plans.**

## Frontmatter

```yaml
---
title: "<plan name>"
type: plan
slug: <kebab-case>
status: planning | active | suspended | completed | abandoned
goal: <goal-slug>                              # the goal this plan serves (if any)
milestone: <milestone-slug>                    # or the milestone directly
tasks: [<task-slug>, ...]                      # T_P: tasks comprising the plan
dependency-order:                              # ≼_P: each entry asserts T_i ≼ T_j
  - [<predecessor-task>, <successor-task>]
milestone-cells: [<cell-spec>, ...]            # M_P: cells whose joint settlement = plan completion
normative-cleanup: required | tracked | none   # whether duty-discharge is part of completion
---
```

## Body sections

```markdown
## What this plan does
One paragraph: the coordinated outcome the plan produces, distinct from any
single task's outcome.

## Dependency structure
The dependency-DAG, drawn or stated. Why each ordering exists — what cell
on the predecessor task must settle before the successor's antecedents are
admissible.

## Milestone cells
What cells, when jointly settled, constitute plan completion. May be the union
of all subtasks' goal cells; may be additional plan-level goals.

## Defeasibility
What plan-revision or plan-abandonment looks like for this plan, and what
justifies them. Per Bratman (1987) defeasible stability, plans can be revised
or abandoned but not silently dropped.

## Normative profile
What duty cells the plan generates on agents who get tasks dispatched to them.
At completion, what residual duties remain (the normative residue), if any.
```

## Plan abandonment and revision

- **Plan abandonment** is an increment $(P, \texttt{abandoned-by}, A) = \mathbf{t}$ that propagates to abandonment of all tasks in $T_P$ that have not yet settled.
- **Plan revision** is the addition or removal of a task in $T_P$: an increment that either adds $(P, \texttt{contains}, T_{n+1}) = \mathbf{t}$ for a new task or $(P, \texttt{contains}, T_i) = \mathbf{f}$ for a removal.
  Revision produces witnesses; **silent revision is forbidden** — a revision-without-witness leaves the substrate in an inconsistent state.

Both are encoded as edits to the plan record's frontmatter combined with witness emissions.
The "reconsideration requires reasons" principle is a closure rule: revision-witnesses must cite a justification cell.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — completion is the meet of milestone cells; normative residue is the unmet-duties side.
- [Workflow-composition](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/workflow-composition.md) — the algebra of composing the workflow content.

## Related

- [Goals](../goals/_index.md) — plans serve goals
- [Tasks](../tasks/) — plans coordinate tasks
- [Workflows](../workflows/_index.md) — workflows are plans' internal task-graph content
