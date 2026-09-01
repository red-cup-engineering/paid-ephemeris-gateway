---
title: "Enhance OpenClaw harness for memory sync and tool exposure"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: openclaw-memory-sync
depends-on: [normalize-work-item-write-paths]
requires-capability: [python-editing, openclaw-integration]
theory-basis: [operations-loop, normative-operational-layering]
---


## Description

The OpenClaw harness (`src/pyfars/harnesses/openclaw/`) currently projects `type: agent` records to `.openclaw/agents/<slug>.md` but does not sync memory files or expose PyFARS tools to OpenClaw agents.
This breaks the OpenClaw→PyFARS half of the memory loop: agents can receive work from PyFARS but cannot write observations back into the substrate through OpenClaw.

Three things needed: bidirectional memory sync (`.openclaw/workspace/memory/` ↔ PyFARS observation records), tool exposure (all PyFARS verbs and skills available as OpenClaw tools), and full agent projection (powers, duties, skills, jurisdiction in the projected frontmatter).

## Acceptance

- [ ] OpenClaw agents can access PyFARS substrate capabilities as tools via the harness.
- [ ] When an OpenClaw session closes, its memory file is translated into observation records and written to the substrate.
- [ ] Agent projections include `holds-power-over:`, `has-duty-to:`, `provides-capability:` from the substrate record.
- [ ] `pyfars install openclaw` produces projections that pass the substrate validation suite (`closure/rule/compose_rules.run`).
- [ ] No regressions in existing harness projection behavior.

## Progress cells

*(empty — task not yet started)*
