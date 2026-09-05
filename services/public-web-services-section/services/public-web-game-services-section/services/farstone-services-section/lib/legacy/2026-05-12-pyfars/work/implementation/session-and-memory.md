---
title: "Session and Memory Implementation"
kind: implementation-guide
status: active
date: "2026-05-07"
milestone: M4
---


This document specifies the three-tier memory model, how sessions are opened and closed, and how observations flow from agent interactions into the substrate as durable records.
It bridges the FARS spec's session and memory sections to the implementation.

## The Three-Tier Model

From the FARS `three-tier-memory` concept:

| Tier | Scope | Lifetime | Substrate object |
|---|---|---|---|
| Session memory | One conversation or tick cycle | Session boundary | `session-record` + `observation-record`s |
| Cross-session memory | One agent, many sessions | Instinct creation → next refinement | `instinct-record` |
| Long-term memory | The corpus | Indefinite | Theory notes, concept definitions, skill records |

The long-term tier is already fully implemented — it is the corpus.
The session tier has scaffolding (`runtime/session.py`).
The cross-session tier (instinct records) and the flow from session → cross-session (consolidation) are not yet built.

## Session Lifecycle

### Opening a Session

A session is opened at the start of every interactive OpenClaw conversation and at the start of every lifecycle tick (the `tick_node` of `runtime/lifecycle.py`'s StateGraph).
Opening a session:

1. Creates a `session-record` in the substrate.
2. Records the session's scope (which agent, which corpus root, which task if applicable).
3. Returns the session slug, which is threaded through all subsequent observations.

```yaml
---
type: session-record
slug: session-<timestamp>-<agent-slug>
agent: <agent-slug>
opened-at: <iso-timestamp>
scope: <corpus-subtree or "global">
task: <task-slug>    # if opened in the context of a specific task; else absent
status: open
---
```

The `open-session` morphism in the FARS spec (`morphisms/open-session.md`) specifies this.
The implementation is `runtime/session.py`'s `open_session` — check that it writes a substrate record rather than just tracking in-memory state.

### Observations During a Session

Every significant event during a session is an `observation-record`.
Significant events are: - Tool calls (MCP tool invocations by an OpenClaw agent) - Task execution outcomes (completions, failures) - Rate-limit readings from endpoint responses - Cost readings - Any synthesis or insight the agent produces mid-session

```yaml
---
type: workitem
kind: observation
is-a: observation
session: <session-slug>
agent: <agent-slug>
observed-at: <iso-timestamp>
domain: <what domain this observation is about>
method: <how it was observed: tool-call | session-reflection | provider-header | self-count>
value:
  summary: <free text, one or two sentences>
  structured: <optional dict of structured data>
---
```

The `domain:` field is the key for cross-session retrieval.
When an instinct-consolidation task runs for an agent, it queries observations by `session:` (scoped to recent sessions) and by `domain:` (to retrieve relevant memories for a given area of work).

**Current state**: agent invocations through `runtime/dispatch_graph.invoke_agent_node` produce `agent_invoked` witnesses with the agent's response and endpoint-slug.
Rate-limit observations and cost observations need to be lifted out of the response (or out of provider headers) and written as substrate cells with `session:` and `domain:` set.
This is M4 work.

### Closing a Session

Closing a session:

1. Updates the `session-record` to `status: closed` with `closed-at:`.
2. Summarizes the session: how many observations were made, what domains were touched.
3. Queues a consolidation task if the session's observations cross a threshold (e.g., ≥ 3 non-trivial observations in a domain).

For OpenClaw sessions, close is triggered by a session-close hook (see `openclaw-as-interface.md`).
For lifecycle tick sessions, close is triggered at the end of the `tick_node` in `runtime/lifecycle.py` after the dispatch graph completes.

## Consolidation: Session → Instinct

Consolidation is the Park et al. reflection step, implemented as a substrate task.

A consolidation task has:
```yaml
---
type: task
status: open
work-type: learning
requires-skills: [consolidating-session-observations]
consolidation-scope:
  agent: <agent-slug>
  domain: <domain>
  sessions: [<session-slug>, ...]
---
```

The agent assigned to this task: 1.
Reads the `observation-record`s for the listed sessions and domain.
2.
Identifies patterns: repeated insights, recurring obstacles, confirmed techniques.
3.
Writes one or more `instinct-record`s.

```yaml
---
type: instinct-record
slug: instinct-<domain>-<date>
agent: <agent-slug>
domain: <domain>
derived-from: [<session-slug>, ...]
created-at: <iso-timestamp>
confidence: 0.7    # bilattice truth value; updated by later evidence
body: |
  <The instinct in plain language. One or two sentences stating what was
  learned, in a form that will directly inform future dispatch decisions
  or task execution.>
---
```

The `confidence:` field is the bilattice truth value (0.0–1.0).
It starts at the consolidating agent's assessment of how reliable the pattern is, and is updated by subsequent sessions that confirm or contradict it.
A contradiction raises the evidence value toward $\top$ (both evidence values high) rather than overwriting — contradictions are first-class.

## How Instincts Feed Back into Dispatch

The dispatch's selection step (`runtime/dispatch_graph.select_winners_node`) should read instinct cells when scoring `(workitem, dispatchable)` pairs.
Currently selection uses lexicographic slug-tiebreak; an instinct-aware selection rule is the M4 refinement:

1. For the task's `domain:` (or inferred domain from `work-type` + `touches`), retrieve instinct records for each candidate agent.
2. Agents with high-confidence positive instincts for that domain score higher.
3. Agents with high-confidence negative instincts (patterns of failure) score lower.

This is bilattice-valued scoring, not binary eligibility.
An agent with a mixed record ($\top$ instinct — both successes and failures) is not excluded, but ranked below agents with clean positive records.

**Implementation path**: author a substrate-authored selection closure rule (e.g. `objects/selection-by-instinct.md`) that walks recent instinct cells and emits a `(W, preferred-by-instinct, D)` cell whose value the runtime selection step reads.
Or, until selection moves into the substrate, modify `runtime/dispatch_graph.select_winners_node` to read instinct cells from the closed store and break ties by instinct-score.

## OpenClaw → PyFARS Memory Write-back

OpenClaw sessions produce a memory file (`.openclaw/memory/MEMORY.md`).
The write-back flow:

1. At session close, `pyfars receive --from-openclaw --session <slug>` is called (this verb needs to be written or extended from `cli/receive.py`).
2. The receive verb parses the OpenClaw memory file.
  Each memory entry is translated to an `observation-record`.
3. Domains are inferred from each entry's heading or content type (user facts, project facts, preferences, etc.).
4. A consolidation intent is queued.

The MCP server's `corpus_receive` tool already exists (`mcp__pyfars-substrate__corpus_receive` in the deferred tool list).
Its current behavior should be audited against this flow.

## Session Memory in MCP Context

When an agent calls MCP tools in an OpenClaw session, it needs to see its own session context.
The `pyfars context` MCP tool should accept a `session:` parameter that prepends the current session's observations to the returned context blob.

```
pyfars context <slug> --session <session-slug> --depth 2
```

This gives the agent its corpus context *plus* its session observations, without it having to call two tools.

## The `scratchpad-as-session-memory-projection` Concept

From the AOP theory concept of the same name: the LLM's "scratchpad" (the conversation context window in an OpenClaw session) is a projection of the substrate's session memory.
Information in the scratchpad that matters should be written to the substrate before the session ends — otherwise it is lost.

This is why the session-close hook matters: at close, anything the agent produced that is not already in the substrate (as an observation, a task result, a draft) gets written.
The harness's session-close mechanism is the invariant that keeps the substrate as the durable source of truth.

## Implementation Order (M4)

1. **Lift rate-limit and cost observations out of `agent_invoked` witnesses into substrate cells with `session:` and `domain:` fields** (the dispatch graph captures the response; a downstream observation-projection step writes the cells).
  Every execution event produces observations; those observations should carry session context.

2. **Ensure `runtime/session.py`'s `open_session` writes a substrate record**.
  Check: does `open_session` write a `session-record` markdown file, or just track state in memory?
  If only in-memory, add the write.

3. **Wire session open/close around the lifecycle's `tick_node`**.
  Open a session at the start of `run()`, pass the session slug to all observation-emitting sub-calls, close the session at the end.

4. **Write the consolidation task schema and the `consolidating-session-observations` skill record**.
  The skill record describes what the consolidation step does (per the two-sentence format).
  A consolidation task is queued automatically when `close_session` counts ≥ N observations.

5. **Write `instinct-record` writes in the consolidation agent's output**.
  The consolidation agent (an LLM endpoint task execution) is prompted to produce instinct records from its observations.
  `work/ingest.py` needs to recognize the `instinct-record` block type in the reply contract.

6. **Add instinct-aware selection** (substrate-authored closure rule preferred; runtime helper acceptable as a stop-gap).
  Query instinct records by domain and agent; return a float modifier for the ranking sort.

7. **OpenClaw session-close write-back**.
  Extend `cli/receive.py` or write a new `pyfars receive --from-openclaw` sub-verb that parses the OpenClaw memory file and emits observation records.

## Reference

- [`runtime/session.py`](../../../src/pyfars/runtime/session.py) — current session implementation
- [`runtime/dispatch_graph.py`](../../src/pyfars/runtime/dispatch_graph.py) — `invoke_agent_node` captures responses; observation lifting hooks here
- [FARS session-record object](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/session-record.md)
- [FARS observation-record object](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/observation-record.md)
- [FARS instinct-record object](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/instinct-record.md)
- [FARS three-tier-memory concept](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)
- [FARS consolidation morphism](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/morphisms/consolidate.md)
- [FARS scratchpad-as-session-memory-projection](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/scratchpad-as-session-memory-projection.md) — AOP concept grounding this design
- [OpenClaw as Interface](openclaw-as-interface.md) — the broader OpenClaw contract
