---
title: "Author the systemd-user service template for pyfars run"
type: task
area: engineering
status: open
horizon: doing
milestone: m3-continuous-loop
goal: engine-runs-as-supervised-service
depends-on: []
requires-capabilities: [python-editing, systemd-knowledge]
theory-basis: [recurrent-practice, operations-loop]
---


## Description

Write `pyfars-run.service.j2` (Jinja2) plus the harness install logic that renders it against the host's computer-system record under `governance/group/computer-systems/<slug>.md` (or the equivalent in this substrate's layout — to be determined).

The unit should:

- `ExecStart=` → `pyfars run --tick-interval <from-record>` from the substrate root the host's record names.
- `Restart=on-failure`, with a small retry-delay so flapping doesn't hammer.
- `WantedBy=default.target` so the user session pulls it in.
- Write stdout/stderr to journal (default).
- Use `RuntimeDirectory=pyfars` if a runtime dir is needed.

The render context comes from the substrate's computer-system record: substrate-root path, tick-interval, autonomous-or-not, web-host/port overrides if any.

Place the harness in `src/pyfars/harnesses/<host-os-supervisor>/` (name TBD — `host-supervisor`, `systemd-user`, etc.).
The harness is a peer of the existing harnesses (claude-code, openclaw, etc.) — its `_index.md` declares `type: harness`.

## Acceptance

- [ ] `src/pyfars/harnesses/<harness>/templates/pyfars-run.service.j2` exists and renders against a sample computer-system record.
- [ ] The harness's `_index.md` declares `type: harness` and the install target (`~/.config/systemd/user/`).
- [ ] `pyfars install <harness>` writes the unit file and runs `systemctl --user daemon-reload` (or instructs the operator to).
- [ ] On a host with the registered computer-system record, `pyfars install <harness>` produces a working unit that `systemctl --user start` activates without error.
- [ ] Tests cover the render given a representative computer-system record.

## Progress cells

*(empty — task not yet started)*
