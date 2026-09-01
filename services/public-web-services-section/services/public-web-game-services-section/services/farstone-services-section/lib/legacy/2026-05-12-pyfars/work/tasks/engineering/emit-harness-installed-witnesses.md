---
title: "Emit harness-installed witnesses for each of the four claude harnesses"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: [audit-claude-harness-manifest-coverage]
requires-capabilities: [witness-authoring, event-log-write]
theory-basis: [witness-as-increment, substrate-purity]
---


## Description

Per [`witness`](../../../concepts/witness.md): "every change to PyFARS substrate state is a witness; nothing changes without one."
Installing a harness is a substrate change — it adds projected files derived from substrate records, it adds inbound channels, it adds an MCP server.
The current `pyfars install-harness` populates `.pyfars/harness-manifests/` and writes target files, but does it append a `harness-installed` witness to the event-log?
Verify and repair.

Two-step:

1. **Verify** — read `src/pyfars/cli/install_harness.py` (or wherever the install verb lives) and inspect whether it appends an event-log line of the form `{verb: harness-installed, harness-slug: <slug>, manifest-path: ..., projected-files-count: N, ...}
  `.
  The [`installing-a-harness`](../../../governance/skills/installing-a-harness.md) skill (authored under task [`author-installing-a-harness-skill`](author-installing-a-harness-skill.md)) names this as a step.
  The implementation may already do it, or may not.
2. **Repair if absent** — if the install verb doesn't emit the witness, this falls under `pyfars-developer` office work: extend the install verb to append the witness as a load-bearing step.
  The witness must fire after the manifest is written and before the install command returns 0; if either side fails, the install should not be reported successful.

Optionally: emit one composite `harness-set-installed` witness for the four-sister-set as a single substrate event, in addition to per-harness witnesses, so audits can distinguish "the operator surface was brought up wholly" from "individual harnesses were touched in isolation."

## Acceptance

- [ ] Running `pyfars install-harness claude-code` against a clean polity appends one `harness-installed` witness to `.pyfars/event-log/<today>.jsonl` carrying the harness slug and projected-files count.
- [ ] Same for the other three claude-* harnesses.
- [ ] If a witness emission step needed to be added, the change to the install verb is itself committed under `src/pyfars/` and references this task in the commit message (per `derive-from-theory-before-planning`).
- [ ] No witness is emitted when an install fails (atomicity per [`witness`](../../../concepts/witness.md): "a witness either fires fully or not at all").

## Progress cells

*(empty — task not yet started)*
