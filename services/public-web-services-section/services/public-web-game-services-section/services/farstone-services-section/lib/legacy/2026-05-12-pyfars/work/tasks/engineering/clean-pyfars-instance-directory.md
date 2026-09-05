---
title: "Clean .pyfars/ instance directory"
type: task
area: engineering
status: open
horizon: doing
milestone: m1-operational-housekeeping
goal: pyfars-instance-directory-clean
depends-on: [normalize-work-item-write-paths]
requires-capability: [filesystem-restructuring, python-editing]
theory-basis: [operations-loop, task-cell-system]
---


## Description

The `.pyfars/` directory (at the corpus root — for the 561 repo this is `/home/emsenn/561/.pyfars/`) should hold only instance configuration and runtime state: `config.toml`, `events.jsonl`, `sessions/`, `locks/`, `cache/`, and `harness-manifests/`.
Currently it also contains a `drafts/` directory whose purpose is unclear and may be a vestige of an earlier layout.

The current contents: `config.toml`, `drafts/`, `harness-manifests/`, `heartbeat.lock`.
`harness-manifests/` is legitimate (installed harness state).
`heartbeat.lock` is a runtime lock file (fine).
`drafts/` needs investigation: if it holds generated records, they should move to `work/`; if it's a workspace scratch area, it should move to a more explicit location or be documented.

`.fars/` does not exist at the expected location — this may mean it was already cleaned up, or it was never created for this corpus.
No action needed on `.fars/`.

## Acceptance

- [ ] `.pyfars/drafts/` is either removed (if empty or obsolete) or its contents moved to the appropriate location under `work/` or documented as intentional.
- [ ] `.pyfars/` after cleanup contains: `config.toml`, `harness-manifests/`, `event-log/`, plus runtime-generated lock files (e.g., the per-engine `run.sock` per `wiring-protocols.md` §4.2), and optionally `sessions/`, `cache/`.
- [ ] No task records or corpus notes live under `.pyfars/`.
- [ ] `runtime.profile.discover_profile` reports the expected paths from config, not hardcoded fallbacks.

## Progress cells

*(empty — task not yet started)*
