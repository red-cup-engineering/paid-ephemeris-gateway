---
title: "PyFARS tutorials"
type: index
status: open
---

# PyFARS — tutorials

Step-by-step lessons that take a reader from no-state to a known good state.
Tutorials are *learning-oriented*: they prioritize a successful first experience over completeness or rationale.
If you find yourself wanting to explain a design choice, push it into [`../explanation/`](../explanation/) instead and link back.

## Available tutorials

- [`installing-pyfars.md`](installing-pyfars.md) — fresh checkout to working install: `pyfars` on `PATH`, all agent harnesses projected, hooks dispatching, MCP wired.

## Planned

- *Running the dispatch heartbeat* — once the autonomous loop is wired end-to-end, a tutorial that takes a reader from a working install to "I can see work being picked up and dispatched to a free cloud endpoint."
- *Authoring a new agent record* — take a reader through the full loop: edit a record, re-run install, verify the projection, confirm the agent shows up in the harness it targets.
