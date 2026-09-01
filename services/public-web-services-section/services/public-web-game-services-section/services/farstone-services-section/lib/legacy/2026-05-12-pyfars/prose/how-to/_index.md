---
title: "PyFARS how-to guides"
type: index
status: open
---

# PyFARS — how-to guides

Goal-oriented recipes for specific problems.
A how-to assumes the reader knows the basics and just needs the steps.
Skip background, skip rationale, give commands.
If a reader is going to learn from the doc, it belongs in [`../tutorials/`](../tutorials/) instead.

## Available how-to guides

- [`recovering-from-a-broken-install.md`](recovering-from-a-broken-install.md) — diagnose and fix a misbehaving install.
  Symptoms include `pyfars: command not found`, hooks failing to dispatch, stale projected files, and stuck heartbeat locks.

## Planned

- *Adding a harness to the bootstrap list* — when you've authored a new harness under `src/pyfars/harnesses/` and want it included in `make install`.
- *Switching the active free-cloud endpoint* — for `make claude endpoint <name>` and the heartbeat's `--prefer` flag.
- *Migrating an instance to a new computer-system record* — when the host's identity changes (rename, re-image, new VPS).
