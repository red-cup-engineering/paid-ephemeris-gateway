---
title: "Bootstrap installs and starts the engine service"
type: task
area: engineering
status: open
horizon: soon
milestone: m3-continuous-loop
goal: engine-runs-as-supervised-service
depends-on: [author-systemd-user-service-template]
requires-capabilities: [python-editing, nix-editing]
theory-basis: [recurrent-practice]
---


## Description

The instance repo has a `pyfars-bootstrap` flake app distinct from `pyfars-install`: install does the working-tree setup; bootstrap goes further and starts host services.
Today, bootstrap doesn't know how to start the engine because there's no service template for it.

After the systemd-user template lands (the parent task), wire bootstrap to:

1. Read the host's computer-system record.
2. If `service-manager: systemd-user` and the record opts the engine in (`runs-engine: true` or similar), `pyfars install <host-os-supervisor-harness>` to materialize the unit file.
3. Run `systemctl --user daemon-reload` and `systemctl --user enable --now pyfars-run.service`.
4. Witness the bootstrap completion.

Hosts with `service-manager: manual` should print the commands and not execute them (the existing pattern from `prose/explanation/the-install-pipeline.md` §"Why install and bootstrap are separate").

## Acceptance

- [ ] On `vps-mini-cold-red-gate` (or another host with `service-manager: systemd-user` and `runs-engine: true`), `make bootstrap` results in a running `pyfars-run.service`.
- [ ] On a host with `service-manager: manual`, bootstrap prints the activation commands and exits cleanly.
- [ ] A repeat run of `make bootstrap` is idempotent (does not duplicate the unit, does not error on already-enabled).

## Progress cells

*(empty — task not yet started; blocked on `author-systemd-user-service-template`)*
