---
type: concept
class: work-flow
status: draft
depends-on: [substrate, verb, capability-matching, jural-relation]
realizes: [dispatch]
---

# Dispatch

The morphism family that moves system state forward by pairing ready workitems with capable agents.
Realizes the [predicated-work dispatch morphism](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md) and instantiates the [predicated-governance authority-gate](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/concepts/authority-gate.md) discipline at runtime.

## What dispatch does

Dispatch reads system cells representing pending workitems — intents, tasks, requests, queries — and produces typed [Assignment](../src/pyfars/sdk/entities/assignment.py) records, each one the minimal `(workitem, agent)` pairing the polity-authored closure rules have chosen.
The actor may be a human (the captain, an external user) or an agent (Claude-Code, OpenClaw, a unix-tool wrapper).

The Assignment entity carries *only* `workitem` and `agent`.
The richer state classical dispatch literature wedges onto an "assignment" — status state machine, priority, routing provenance, deadlines — lives as cells around the workitem, not on the assignment.

## The dispatch tick is a scheduler, not an enactor

The engine's dispatch tick (`programs/engine/dispatch.py`) is a pure scheduler:

```
  load → read_assignments → spawn
```

Each tick:

1. Reads every `type: assignment` subject from the closed store.
2. Diffs against the previous tick's set → emits `assignment_birth` / `assignment_death` witnesses on channel `dispatch`.
3. For each new Assignment with workitem-status `open` (or unset): loads the agent record, routes by `Agent.type`:
   - `automated-process` → spawn a [ScriptProgram](../src/pyfars/programs/script.py)
   - `ai-model` / `hybrid` / unset → spawn a [HarnessProgram](../src/pyfars/programs/harness.py)
   - `human` → emit a `human_assignment` witness; no spawn
4. Emits one `program_spawned` witness per child; tracks the asyncio task in `EngineProgram.active_programs`.
5. Reaps completed children each tick; cancels all on halt.

The dispatch tick *never* calls `pydantic_ai` directly.
LLM-driven work runs inside HarnessProgram where every tool call passes through `check_authorization` (FOUR-residuation against the agent's working fiber).

## Closure-rule contracts polities must author

Because the Assignment entity is minimal, polities own all the routing and lifecycle math as closure rules.
The substrate expects polity-authored cells in this shape:

### Office routing (produces eligibility)

The polity authors a closure rule that walks from a workitem's office-target to the eligible agents:

```
(workitem, to-office,    O)        ∧
(personnel, holds-office, O)       ∧
(personnel, runs-as,      agent)
  → (workitem, eligible-agent, agent) = T
```

`(workitem, eligible-agent, A)` cells are the inputs to selection.
A workitem with no eligible agents stays unpaired (no Assignment is authored).

### Assignment authorship (produces pairings)

A second closure rule walks eligible-agent cells and produces Assignment records.
The polity chooses the selection discipline — greedy lowest-load, round-robin, priority-weighted, captain-curated.
The pyfars-shipped `instantiate_selection_by_load` shape (`kernel/closure.py`) gives a working default: among agents eligible for `W`, the one currently named in the fewest `(_, agent, A) = T` cells wins, lex tiebreak on slug.

The closure rule's output writes both halves of the Assignment as cells:

```
(<new-slug>, type,     assignment) = T
(<new-slug>, workitem, W)          = T
(<new-slug>, agent,    A)          = T
```

The dispatch tick sees the birth on its next pass and spawns the right program-class.

### Workitem status state machine (cells around the workitem)

```
(workitem, status, open|active|settled|escalated|abandoned) = T
```

Single-T axis; the most recent witness wins.
Who writes which transition:

- `open` — closure rule on workitem birth, or the workitem's frontmatter
- `active` — written by dispatch when it spawns a child program (optional; for visibility)
- `settled` — written by HarnessProgram on `mark_done`, or by a closure rule when settling criteria are met
- `escalated` — written by HarnessProgram on `escalate`
- `abandoned` — written by a polity-authored rule (timeout, deauthorization, etc.)

The HarnessProgram's termination check polls `(workitem, status, settled|escalated)` via UDS — substrate-readable termination, no Python-side state to keep in sync.

### Priority and provenance (optional cells)

Polities author what they need:

```
(workitem, priority,    N)      = T   # integer-as-string; dispatch may sort
(workitem, from-sender, S)      = T   # provenance for read_assignments tool
(workitem, sent-at,     <iso>)  = T   # timestamp
(workitem, title,       <str>)  = T   # display
```

The HarnessProgram's `read_assignments` tool reads these cells alongside the Assignment's `workitem` pointer to compose the agent's context.

## Dispatch hierarchy and offices

Layered dispatch composes the office hierarchy: the captain dispatches at campaign/objective level; the XO (per `dispatch-task-to-office` power) dispatches tasks to functional offices; the functional office dispatches sub-tasks to its members.
Each layer is one closure rule emitting Assignment records.
Composition is monotonic per [dispatch-monotonicity](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-monotonicity.md): a workitem dispatched at one layer cannot lose its Assignment under re-dispatch at a lower layer; it can only refine.

## What dispatch does not do

- It does not execute the work.
  The dispatch tick spawns a child program; the program's run is its own system transition.
- It does not adjudicate failure.
  If a child program errors or its agent escalates, the failure is witnessed; the Assignment is unchanged — the failure produces new cells, not a retroactive un-dispatch.
- It does not compute capability or authority from scratch each tick.
  The capability-fiber and authority-chain are system cells; dispatch (via closure rules) reads them.

## What this concept does not yet specify

- The handling of contended assignments — when two agents are equally eligible and equally loaded, the closure rule picks one; the discipline (round-robin, freshness, custom selector) is polity-authored.
- Cross-polity dispatch — when a workitem is assigned to an agent in another polity.
  Federation envelopes carry the cells; the receiving polity decides whether to act.
  Open.
