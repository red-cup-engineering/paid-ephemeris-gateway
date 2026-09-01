---
type: morphism
class: work-cycle-spoke
status: draft
depends-on: [work-record, work-status, witness, decompose-task, lift-task-to-plan]
realizes: [decompose-task, lift-task-to-plan]
---

# Plan

The morphism that takes a [work-record](../concepts/work-record.md) at status `pending` and produces a refined record (or a tree of sub-records) ready for dispatch — declaring requirements, blockers, sub-decomposition, and the closure conditions under which `status: pending` becomes `status: ready`.
The second spoke of the work cycle.

Realizes the upstream [decompose-task](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/decompose-task.md) and [lift-task-to-plan](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/lift-task-to-plan.md) morphisms in PyFARS-realization terms.

## Action

For a pending work-record $W$:

$$\mathrm{plan}(W) \;\longrightarrow\; \big(W', [W_1', W_2', \ldots, W_n']\big)$$

where: - $W'$ is $W$ with refined frontmatter (added `requires-skills:`, `requires-capabilities:`, `requires-jurisdiction:`, `blockers:`, `priority:`, etc., as appropriate). - $[W_1', \ldots, W_n']$ are sub-records created when $W$ is too coarse-grained to dispatch as a single work item (decomposition into multiple smaller work-records).

The result is recorded via witnesses: one witness per refined or new work-record.
Closure rules then determine which records are ready (blockers settled, requirements specified) and promote them to `status: ready`.

## Composition

Plan composes after intake and before dispatch:

$$\mathrm{intake} \to \mathrm{plan} \to \mathrm{dispatch\text{-}decision}$$

Plan may also fire mid-cycle: a record blocked because a dependency was found (newly-discovered) gets re-planned to add the dependency as a blocker.

## What this morphism commits to

1. **Substrate-tracked refinement.** The refinement is via witnessed cell additions to the work-record.
  The plan's structure is derivable from the witnesses; replay of intake + plan produces the same refined record.
2. **Decomposition is finite-and-bounded.** A planned decomposition produces a finite number of sub-records (no recursion-unrolling at plan-time).
  If a sub-record needs further decomposition, that's a separate plan invocation on the sub-record.
3. **No out-of-substrate planning state.** The plan's working state (intermediate decisions, tentative decompositions) is either system-witnessed or ephemeral — not stored as parallel out-of-substrate planning state.
4. **Plans are themselves work-records.** A "plan" in the noun sense — a structured set of tasks-toward-a-goal — is realized as a goal work-record with sub-task work-records linked via `parent-goal:` cells.
  The plan-as-noun is system content.

## What this morphism does not do

- It does not assign the records.
  That's dispatch.
- It does not execute.
  That's execute.
- It does not commit to the *correctness* of its planning — a poorly-planned record may need re-planning.
  The morphism produces a plan; the plan's quality is judged by downstream success.

## Implementation pointer

PyFARS realization should provide a `plan` operation that takes a pending work-record and refines it (and decomposes where needed).
The current `plan.py` and `_resolve.py` work spokes provide rough functionality; the refactor consolidates them into a system-driven morphism whose closure rules determine what counts as "sufficiently planned to promote."

## Open structural questions

- The boundary between automated planning (closure rules deriving requirements from work-record kind alone) and human-in-the-loop planning (captain or office manually adding requirements).
  Both are admissible; the discipline for the mix is partly settled.
- Cross-record planning.
  When multiple intents arrive that should be planned together (a coordinated sprint), planning may need to consider them jointly.
  The discipline for joint planning is open.
- Plan revision.
  When a plan turns out to be wrong (mid-execution discovery that the work needs different requirements), re-planning fires.
  The history of plan revisions is system-tracked but the discipline for adjudicating "did the original plan err?" vs. "did circumstances change?" is open.
