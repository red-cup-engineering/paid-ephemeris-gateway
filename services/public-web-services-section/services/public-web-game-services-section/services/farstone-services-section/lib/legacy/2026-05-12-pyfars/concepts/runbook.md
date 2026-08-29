---
type: concept
class: tool-subtype
status: draft
depends-on: [tool, script, action, skill]
---

# Runbook

A [tool](tool.md) subtype: a *composed* procedure invoking multiple [scripts](script.md) (and possibly other runbooks, other verbs, other tools), with branching, bound state, and recovery.
Runbooks are how PyFARS realizes complex multi-step operations as system-tracked tools.
A runbook is itself invokable as a single tool from the perspective of an agent that uses it.

Realizes the upstream notion of *runbook* from the agential-orchestration-platform's [skill](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/) and skill-recipe theory.
Per the agent-skill-recipe-system convention: "A runbook is a composed procedure: a sequence of skill invocations with branching and bound state."

## What distinguishes a runbook from a script

A runbook:

1. **Composes multiple invocations** — sequences and/or parallels several tool calls.
  A single-tool wrapper is a script; a multi-tool composition is a runbook.
2. **Has branching** — conditional execution paths based on prior tool results.
3. **Maintains bound state during invocation** — variables threaded through the composition (results of earlier steps used as inputs to later ones).
4. **Has recovery / fallback paths** — explicit handling of partial failures (one tool call fails; the runbook may retry, fall back, or partially-complete).

These properties are what scripts typically lack.
A runbook is a tool whose body is itself system-tracked (the runbook is a record specifying its steps); a script is a tool whose body is opaque executable code.

## Runbook as a tool

From the invoker's perspective, a runbook IS a tool: it has a schema (input arguments), it produces an output, it can be invoked.
The invoker doesn't need to look inside the runbook to use it.
This recursion — tool composes tools, runbook is a tool — is admissible and useful: it lets agents use complex procedures as if they were simple tools.

The runbook IS the orchestration.
When a runbook is invoked, the runbook's body runs the composition; each constituent tool fires in turn, with state threaded through.

## Examples in PyFARS

- A `bootstrap-pyfars` runbook that: validates the corpus → installs harnesses → registers offices → starts heartbeat.
  Each step is a separate tool invocation; the runbook composes them.
- A `commit-and-push` runbook that: stages files → commits → pushes → verifies.
  Multiple `git` script invocations composed.
- A `decompose-task` runbook that: reads the task's requirements → asks the planner to decompose → produces sub-tasks → witnesses the decomposition.

These are workflows in the operational sense.
Each is a single tool from the agent's perspective.

## Composition algebra

Runbooks compose via:

- **Sequence**: step A then step B; B uses A's output.
- **Parallel**: A and B together; results merged.
- **Branch**: A; depending on A's result, run B or C.
- **Fan-out / fan-in**: A produces multiple outputs; B₁, B₂, B₃ each handle one; fan-in merges.
- **Loop**: A repeats while condition holds.

These match the four canonical workflow patterns from the upstream [predicated-work workflow-composition](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/workflow-composition.md) theorem.
The runbook's compositional algebra IS workflow algebra at the tool scope.

## Substrate-tracking

A runbook is system-tracked: it's a record (kind: runbook or kind: workflow) carrying:

- **Frontmatter**: the runbook's name, description, input schema, output schema, dependencies.
- **Body**: the composed steps, in a structured form (typically markdown with step headings, or YAML/TOML for structured composition).
- **Witness chain**: each invocation produces witness events naming which steps fired in which order with what results.

This makes runbooks first-class substrate: a polity can audit "what runbooks does this polity define?" by reading the substrate; runbooks evolve via witnessed system transitions; the runbook's history is auditable.

## What this concept does not yet specify

- The standard format for runbook body.
  The realization may use markdown with conventions, structured TOML/YAML steps, or a runbook-specific DSL.
  The discipline is partly settled.
- The boundary between runbook and skill-runbook (a skill whose body IS a runbook).
  When a skill's recipe is "execute this runbook," is the skill the same as the runbook?
  Practically yes; conceptually they're distinct (skill is the agent-knowable procedure; runbook is the specific composed instance).
- Cross-polity runbooks.
  A runbook defined in one polity invoked from another.
  The federation discipline is open.
- Recovery / rollback.
  When a runbook partially completes and needs rollback, what's the discipline?
  Currently per-runbook; a uniform rollback discipline is partly settled.
