---
title: "Workflows"
type: index
status: active
realizes: [workflow]
---


Directed-graph compositions of work units with one algebraic constraint: **the input cell-pattern type equals the output cell-pattern type**.
A workflow is a quadruple $W = (T_W, E_W, \tau_{\mathrm{in}}, \tau_{\mathrm{out}})$ with $\tau_{\mathrm{in}} = \tau_{\mathrm{out}}$ — the boundary type that makes workflows compose.

## When to author one

Workflows make the **edge structure** of work explicit:

- **Dependency edges** — $T_i$'s output cells gate $T_j$'s antecedents.
- **Information-flow edges** — an output cell of $T_i$ is read by an antecedent in $\mathcal{S}_{T_j}$.
- **Normative-handoff edges** — $T_i$'s completion produces a jural-relation cell ([approval-handoff](../../governance/jural-relations/_index.md)) or transfers a duty ([accountability-handoff](../../governance/jural-relations/_index.md)) to the agent of $T_j$.

Author a workflow when the substrate carries non-trivial edge structure that's currently buried in prose or implicit in task ordering.
The workflow record makes the edges first-class so dispatch, audit, and federation can read them.

## Workflow vs. plan

A workflow is just the type-bounded composition; it has no name or completion condition without being attached to a task or [plan](../plans/_index.md). **Plans contain workflows as their internal task-graph; workflows are content within plans.**

A workflow can also exist standalone — e.g., the dispatch graph itself is a workflow whose tasks are graph nodes (load_store, apply_eligibility_rules, select_winners, invoke_agent) and whose edges are dependency-edges between them.
Standalone workflows have no plan; they're the algebraic shape of a recurring computation.

## Frontmatter

```yaml
---
title: "<workflow name>"
type: workflow
slug: <kebab-case>
status: planning | active | retired
input-type: <cell-pattern-type>                # τ_in
output-type: <cell-pattern-type>               # τ_out (must equal τ_in)
work-units: [<task-or-subworkflow-slugs>]      # T_W
edges:                                          # E_W
  - from: <task-slug>
    to: <task-slug>
    kind: dependency | information-flow | normative-handoff
    cell: <cell-spec>                          # for normative-handoff: the jural-relation cell
composition-pattern: sequence | branch | parallel | mixed
---
```

## Body sections

```markdown
## What this workflow produces
What composition of work this names, and what the τ_in = τ_out type is.

## Edges
Each edge: from → to, kind, what cell or condition it carries. Normative-handoff
edges name the jural-relation cell explicitly.

## Composition pattern
Sequence, branch (with branching condition), parallel, or mixed. Diagram if
helpful.

## Regime
Strict (all subtasks strict, edges finitary), Scott-continuous (dynamic
task-addition), or transfinite (limit-aggregating handoffs). The workflow's
regime is the supremum of constituent regimes.
```

## Three composition patterns

- **Sequence.** $W_1$ then $W_2$: $W_2$'s closure rules begin firing only after $W_1$'s output cells settle.
- **Branch.** After $W_1$, do $W_2$ if condition $C$ at $\mathbf{t}$, else $W_3$: gating closure rules whose antecedents include $C$'s value.
- **Parallel.** $W_2$ and $W_3$ run concurrently after $W_1$: no edge between them, both depend on $W_1$.

## CALM-stable boundary admissibility

The dependency-gate cells in $E_W$ are $\leq_k$-monotone.
By the CALM corollary: confirming "is the gate from $T_i$ to $T_j$ open?" is **coordination-free** — any replica with a local snapshot of $T_i$'s completion cells can confirm $T_j$ is admissible.
Distributed workflow execution is CALM-stable for positive admissibility queries; confirming "still blocked" requires coordination.

## Theory grounding

- [Predwork workflow](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/workflow.md) — formal definition.
- [Workflow-composition theorem](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/workflow-composition.md) — the algebra.
- [Settling-CALM-corollary](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md) — the coordination-free boundary-admissibility property.

## Related

- [Plans](../plans/_index.md) — plans contain workflows
- [Tasks](../tasks/) — workflow nodes
- [Jural relations](../../governance/jural-relations/_index.md) — normative-handoff edges carry these
