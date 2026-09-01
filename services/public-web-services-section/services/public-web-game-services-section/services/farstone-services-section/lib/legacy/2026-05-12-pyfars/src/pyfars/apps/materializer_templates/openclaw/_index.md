---
kind: harness
title: "OpenClaw harness"
type: harness
target-default: ".openclaw"
target-runtime: "openclaw"
manifest: ".pyfars/harness-manifests/openclaw.json"
emits:
  - source: agent-records
    template: "agent.md.j2"
    target-pattern: "agents/{slug}.md"
    mode: per-record
---


Materializes substrate agent records (under `records/engineering/agents/` in the current polity repo, with legacy `operations/engineering/agents/` still supported) as OpenClaw agent configurations that the [OpenClaw](https://openclaw.ai) runtime can discover and execute.

## What it writes

For each `records/engineering/agents/<slug>.md` (skipping `_index.md` and any directory entries):

```
.openclaw/agents/<slug>.md
```

with OpenClaw-flavored frontmatter (`name`, `description`, `model`, `tools`, etc.) and a body summarizing the agent's role, duties, skills, jurisdiction, and the autonomous-vs-escalate boundary the substrate record declares.

A manifest is written to `.pyfars/harness-manifests/openclaw.json` recording every projected file and its substrate source, so `--uninstall` is exact.

## What this harness does *not* yet write

The OpenClaw runtime also reads:

- `.openclaw/tools/` - OpenClaw-specific tools and skills
- `.openclaw/memory/` - Session memory and long-term MEMORY.md
- `.openclaw/workspace/` - Working directory for agent operations

These will be handled by ensuring PyFARS skills and substrate are accessible to OpenClaw through proper path configuration and symlinks.

## Why a projection, not a hand-written file

Two consumers writing the "what is this agent" sentence twice is two opportunities to drift.
The substrate record is the source of truth (it has model tier, duties, powers, skills, jurisdiction, autonomous-vs-escalates — far more than OpenClaw's frontmatter exposes).
The projection picks the subset OpenClaw's runtime actually consumes and writes it in OpenClaw's format.
Edit the substrate record, re-run the harness, and the projection updates.

## Frontmatter projection

| Substrate field | `.openclaw/agents/<slug>.md` field | Notes |
|---|---|---|
| filename stem | `name` | The slug OpenClaw dispatches against. |
| `description` | `description` | Truncated to fit the dispatcher. |
| `model` (`opus`/`sonnet`/`haiku`/`nemotron` etc.) | `model` | Passed through if present. |
| `skills` | `tools.skill` | Maps PyFARS skills to OpenClaw tool skills |
| `jurisdiction` | `description` | Included in agent description for context |
| `autonomous-vs-escalate` | `description` | Included to clarify agent boundaries |
| (other fields) | rendered into the body | Duties, powers, skills, jurisdiction, autonomous/escalates. |

The `tools:` section will include references to PyFARS skills so they're available in OpenClaw sessions.

## Integration Notes

This harness is designed to work with PyFARS' existing substrate by:

1. Making PyFARS skills available as OpenClaw tools
2. Ensuring PyFARS memory files (.openclaw/workspace/memory/) are accessible
3. Allowing OpenClaw agents to leverage PyFARS' frontmatter-markdown corpus as operational substrate
4. Supporting bidirectional knowledge flow between systems
