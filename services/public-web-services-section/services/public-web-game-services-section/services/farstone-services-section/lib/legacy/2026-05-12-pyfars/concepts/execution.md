---
type: concept
class: act-specialization
status: draft
depends-on: [act, workitem, agent, executing, witness]
---

# Execution

The substrate-recordable *unit of work being done* — an [act](act.md) of an agent applying their skill (and possibly their tools) to a [workitem](workitem.md), producing the workitem's intended system effects.
Execution is the noun-form act-specialization that the [executing](../morphisms/executing.md) morphism produces.

Execution is the *act of doing the work* — distinguished from intaking (receiving the work-request), planning (deciding how to do it), dispatching (assigning it), and witnessing-completion (recording it as done).
Execution is the *substantive work*; the others are the surrounding lifecycle.

## What an execution has

An execution has:

1. **A workitem** — the workitem being executed.
  Always exactly one per execution-event (a single execution covers a single workitem; complex multi-workitem executions decompose into multiple per-workitem executions).
2. **An executing agent** — the agent performing the work.
  Bound by their skill-set and capability-table.
3. **A skill-invocation** — which skill the agent applied during the execution.
4. **Tools used** — the tools (scripts, runbooks, external systems) the agent invoked during execution.
5. **A duration / closure-ordinal** — execution may be one-pulse (strict-regime execution) or multi-pulse (interval-shaped, executed over several pulses with pulse-spanning persistent-state).
6. **Outputs** — the system cells the execution produced (results, derived-cells, witness updates).
7. **A witness** — the JSONL log entry recording the execution-event.

## Execution vs. process vs. running

These are distinct lifecycle-shapes:

- **Execution** — point-shaped or short-interval-shaped: one act of doing-the-work.
  Discrete.
- **[Process](process.md)** — interval-shaped workitem-subtype: long-running work that produces multiple events.
  Encompasses many executions.
- **[Running](../morphisms/running.md)** — the morphism by which a process is alive.
  Each running interval may include many executions.

A process *runs*; during its running, it *executes* multiple workitems (or the same workitem repeatedly per cadence).
A simple workitem (a single derivation) is *executed* once and the execution is the work.

## Execution and authority

An execution requires that the executing agent has been [dispatched](../morphisms/dispatching.md) the workitem (or holds standing-authority to execute it without per-instance dispatch).
Authority is checked at execution-start; mid-execution authority changes typically don't retroactively invalidate the execution but may bound subsequent executions.

## Execution and substrate-purity

Execution preserves substrate-purity: every substantive system-effect during the execution is a witnessed transition; the execution-witness records the shape of the work done; replay reproduces the execution given the same workitem, the same agent's skill-state, the same tool-state, and the same starting substrate.

For executions that consume external state (tool-invocations against external APIs, observations of external metrics), the external interactions are bridged via [ports](port.md) and recorded as observations or witnessing-acts; replay reproduces the recorded interactions, not the external state.

## Execution failure

An execution may complete successfully (workitem-cells set, witnessing-completion fires) or fail (system cells unchanged or partial-changed, failure-witness recorded).
Failure modes:

- **Skill-failure** — the agent's skill encountered an unrecoverable state.
- **Tool-failure** — an invoked tool errored.
- **Authority-failure** — the agent attempted an act outside their authority.
- **Resource-failure** — capability-table capacity exhausted; rate-limit exhausted.

Each failure mode produces a specific failure-witness; the workitem's status reflects the failure; remediation may incite a new execution by a different agent or with adjusted parameters.

## What this concept does not specify

- The schema of execution-witnesses (per-skill currently).
- Execution checkpointing.
  For long executions spanning many pulses, the discipline for recording intermediate state vs. only end-state is partly settled.
- Execution rollback.
  When an execution must be undone (a captain determines the work was wrong), the rollback discipline is partly settled.
