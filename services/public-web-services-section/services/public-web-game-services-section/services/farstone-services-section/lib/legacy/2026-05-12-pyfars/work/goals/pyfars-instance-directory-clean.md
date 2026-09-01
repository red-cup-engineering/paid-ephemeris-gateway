---
title: "PyFARS instance directory clean"
type: goal
milestone: m1-operational-housekeeping
status: open
horizon: doing
theory-basis: [operations-loop, task-cell-system, normative-operational-layering]
tasks:
  - clean-pyfars-instance-directory
  - deprecate-fars-directory
---


After this goal is complete, `.pyfars/` holds only instance configuration and session data.
The instance profile determines where operational records go — by default `work/` for task records and the corpus root for substrate records.
The `.fars/` directory (an older deprecated layout) is either removed or confirmed empty.

## Theory grounding

Per the `event-log-is-jsonl` decision: the event log is the primary state.
Instance configuration (profiles, event log, lock files, session state) belongs in `.pyfars/`.
If `.pyfars/` accumulates mixed content — both config and generated records — it becomes ambiguous what is primary state and what is a projection.
Clean separation is prerequisite for reliable replay.

## Acceptance

- [ ] `.pyfars/` contains only: `config.toml`, `event-log/`, `harness-manifests/`, `sessions/`, `cache/`, plus runtime-generated lock files.
- [ ] No task records, agent projections, or corpus notes live under `.pyfars/`.
- [ ] `.fars/` is either removed (if deprecated) or documented (if still used for a specific purpose).
- [ ] `runtime.profile.discover_profile` reports the expected paths from `<substrate-root>/.pyfars/config.toml`, not hardcoded fallbacks.
- [ ] The substrate validation suite shows no unexpected content warnings on the instance directory.
