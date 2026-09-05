---
title: "OpenClaw as Interface Layer"
kind: implementation-guide
status: active
date: "2026-05-08"
milestone: M2–M4
---


OpenClaw is PyFARS's primary human-facing interface.
This document defines the bidirectional contract between the two systems, what each is responsible for, what is currently working, and what needs to be built.
The framing has settled with the May 2026 PyPredCalc + LangGraph + PydanticAI refactor: PyFARS is the substrate runtime; OpenClaw is one of several harnesses that consume it (the human-facing one).

## Division of Responsibility

| Concern | PyFARS | OpenClaw |
|---|---|---|
| Substrate storage | Owns the predication graph (cells over arbitrary unix flatfiles via the projector framework) | Reads/writes via the engine API (MCP per `wiring-protocols.md` §4.4) |
| Agent definitions | Source of truth (`governance/agents/<slug>.md`) | Projected destination via the `openclaw` harness |
| Tool definitions | Skills as substrate records, surfaced via the engine API | Discovers tools via MCP |
| Session memory | Receives and stores as substrate records (witnesses, observations, instincts) | Holds during the live session |
| Long-term memory | Instinct cells in the substrate; `runtime/belief.py` cellwise fold | Reads via the engine API |
| Autonomous dispatch | The lifecycle StateGraph's tick + dispatch graph | Out of scope — human-interactive only |
| Human interaction | Out of scope | Owns the conversation |
| Workitem creation | Owns the workitem record schema (`type: task` / `type: workitem`) | Authors workitem records into the substrate via the engine API |

The clean framing: **PyFARS is the substrate; OpenClaw is the interactive shell on top of it.** An OpenClaw session is a bounded sublocale of the substrate — a scope-restricted view that expires at session close.
What survives the session is whatever the session wrote back to the substrate.

## PyFARS → OpenClaw (Projection)

### What works

The OpenClaw harness (`pyfars install openclaw`) writes:

```
.openclaw/agents/<slug>.md
```

for each `type: agent` record under `governance/agents/`.
The projection includes name, description, model (inferred via endpoint capability matching at agent-compile time), skills, jurisdiction, duties, and the autonomous-vs-escalate boundary.

A manifest at `.pyfars/harness-manifests/openclaw.json` records every projected file.
Re-running the harness after editing a substrate agent record updates the projection exactly.

### Open work

**Skills as MCP tools**: the engine's MCP surface (`wiring-protocols.md` §4.4) exposes substrate operations.
What still needs wiring is exposing skill *records* as MCP tools — domain-specific skills like `orient-to-project`, `session-start`, `build-emsenn-net` should be registered as MCP tools whose description is the skill's two-sentence description.

Implementation path: when the engine's MCP service starts, it walks skill records under `governance/skills/` (and theory-adjacent skill directories).
Each skill record with a `command:` field or a `runbook:` field becomes an MCP tool.

**System prompt injection**: an OpenClaw agent's system prompt should include the substrate context relevant to its scope.
When the harness writes `.openclaw/agents/<slug>.md`, the body should contain (or reference via `include:`) a bounded subgraph from the agent's own record.
This gives the agent its own definition, its skills, and its immediate context without overwhelming the context window.

**Workspace mapping**: OpenClaw's `.openclaw/workspace/` should be mapped to the substrate root so agents working via OpenClaw operate directly on the substrate, not on a copy.
This is configuration, not new code: set `workspace.root` in the OpenClaw config to the substrate root.

## OpenClaw → PyFARS (Write-back)

This direction is the primary gap for M4 (memory feedback).

### Session observations

When an OpenClaw agent completes a tool call or produces a significant observation, that should be written to the substrate as an observation record:

```yaml
---
type: workitem
kind: observation
is-a: observation
session: <session-slug>
agent: <agent-slug>
observed-at: <iso-timestamp>
domain: <what was observed about>
method: openclaw-session
value:
  summary: <what was observed>
---
```

The observation is substrate content; subsequent dispatch decisions can read it via the projector framework.

**Implementation**: a hook in the OpenClaw harness (or an engine API endpoint called from an OpenClaw tool) writes observation records.

### Session close → consolidation

When an OpenClaw session ends, its memory state (`.openclaw/memory/MEMORY.md` or equivalent) should be translated into observation records and written to the substrate.
This is the session → substrate write-back.

The translation:

1. Parse each memory entry from the session memory file.
2. For each entry, emit a substrate observation record with `session: <slug>`, `agent: <slug>`, `domain: <inferred from entry>`.
3. Queue a consolidation workitem (`type: task`, `requires-skills: consolidating-session-observations`) that reads those observations and synthesizes instinct records via the `runtime/promote.py` settlement-path operator.

**Implementation**: an engine API endpoint with a `close-session` action that takes a session slug and walks the steps above.
Called from an OpenClaw session-close hook.

### Workitem creation from sessions

An OpenClaw agent that discovers work during a session should be able to queue it as a substrate workitem.
The engine API accepts intent-queue submissions; the next tick drains the queue and the dispatch graph's `load_store_node` lifts the new workitem cells.

## The OpenClaw ↔ Engine boundary

OpenClaw sessions are *interactive* — they respond to human input.
The engine's lifecycle StateGraph is *autonomous* — it ticks without a human present.
These are separate operating modes and should not collide.

The interaction point is the **intent queue** (a substrate-shaped queue of pending workitems).
A human-or-OpenClaw-agent interaction that produces a work item writes it to the intent queue via the engine API.
The engine's tick lifts the intent into a substrate workitem cell.
The dispatch graph's selection picks an eligible dispatchable.

```
Human conversation
    ↓ OpenClaw session
    ↓ engine API: queue-intent (writes to .pyfars/intents/)
    ↓
Engine tick (lifecycle.tick_node)
    ↓ intake-intent (promotes intent → workitem record + cell)
    ↓ dispatch_graph (load_store → eligibility → select_winners → invoke_agent)
    ↓ agent_invoked witness (LLM response recorded)
    ↓
Next OpenClaw session reads the result via the engine API
```

OpenClaw agents should never invoke the lifecycle's tick directly.
The intent queue is the handoff point.

## Harness re-run discipline

The harness writes projection files.
These projection files must not be hand-edited — they will be overwritten on the next `pyfars install openclaw`.
If a projection is wrong, fix the substrate record and re-run the harness.

The harness is idempotent and exact: files not in the manifest are not touched; files in the manifest are regenerated exactly from the substrate record.
Run it after every substantive change to agent records.

```bash
pyfars install openclaw
```

## Reference

- [OpenClaw harness source](../../src/pyfars/harnesses/openclaw/)
- [Wiring Protocols §4.4 — LLM agent ↔ engine via MCP](../../governance/specifications/wiring-protocols.md)
- [FARS kit-assembly concept](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/kit-assembly.md) — how a scope's operative kit is assembled from substrate records
- [FARS scope-as-fiber concept](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/scope-as-fiber.md) — an OpenClaw session is a fiber restriction of the substrate
- [FARS three-tier-memory concept](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md) — the memory model this write-back implements
- [Session and Memory implementation guide](session-and-memory.md) — M4 detail
