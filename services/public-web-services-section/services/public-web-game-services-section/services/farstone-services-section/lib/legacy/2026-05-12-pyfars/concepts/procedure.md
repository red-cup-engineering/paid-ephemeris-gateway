---
type: concept
class: workitem-subtype
status: draft
depends-on: [workitem, work-status, work-record, skill]
---

# Procedure

A [workitem](workitem.md) subtype: scripted, deterministic, typically atomic.
Procedures are the workitem kind that an actor performs by *following a recipe* — read inputs, perform a transformation, verify, witness — without long-running state or substantive deliberation.

Procedures are to workitems what batch jobs and scripted system calls are to OS work: bounded, deterministic, often executable by a non-agentic actor (a workflow, a script, even a lightly-prompted LLM call).
Most of PyFARS's existing skills, when invoked, are procedures.

## What distinguishes a procedure

A procedure workitem has:

1. **Scripted execution** — the steps are predefined, typically as a [skill](skill.md) recipe (per the upstream agent-skill-recipe-system).
  The actor doesn't plan; the actor executes.
2. **Determinism, modulo IO** — given the same inputs and system state, repeated invocations produce the same result.
3. **Atomicity, typically** — the procedure either completes fully or doesn't; partial completion is treated as failure rather than as an intermediate state.
4. **Bounded duration** — completes within one heartbeat tick (or a small number).

A procedure may invoke other procedures (a runbook is a composed procedure), but at the leaf level each procedure is a single bounded operation.

## Procedure normal form

Per the upstream [agent-skill-recipe-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/agent-skill-recipe-system/), a procedure's recipe has four slots: orient → act → verify → witness.
A procedure that omits a slot must witness the omission elsewhere; missing the witness slot is an ill-formed procedure.

PyFARS's pre-existing skills should be migrated into recipe-normal-form over time; many currently aren't.

## Examples

- **Validate a corpus** — scripted, deterministic, atomic.
  Reads substrate, produces diagnostics, witnesses the audit.
- **Render a corpus note as markdown** — scripted, deterministic.
- **Install a harness** — scripted (loads templates, renders, writes), bounded.
- **Commit a system transition** — orient (read state), act (write the file/log), verify (validate), witness (record).

A long-running observation campaign is *not* a procedure — it's a process.
A research question is not a procedure — it's an inquiry.

## Why distinguish procedure from process

Procedures fit cleanly into a single heartbeat tick; processes don't.
A scheduler should treat procedures and processes differently: - Procedures: dispatch, execute, witness-completion, all in one tick.
No state-checkpointing needed. - Processes: dispatch, execute-piece, witness-checkpoint, return to ready, repeat across ticks.

Conflating them leads to scheduling errors (treating a process as if it should complete in a tick produces timeout failures; treating a procedure as if it should be checkpointed produces overhead).

## What this concept does not yet specify

- The boundary between procedure and process for medium-duration work.
  A 5-minute task — is it a procedure (longer than typical) or a process (shorter than typical)?
  The discipline is partly conventional.
- Procedure composition.
  A runbook is a composed procedure; the discipline for composition (sequence, parallel, fan-out, fan-in) parallels the upstream workflow-composition theorem but isn't yet PyFARS-side specified.
- Idempotency of procedures.
  Most procedures should be idempotent (re-runnable without effect divergence); the discipline for stating-and-verifying idempotency is partly settled.
