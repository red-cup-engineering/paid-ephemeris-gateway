---
kind: harness
title: "systemd-user harness"
type: harness
target-default: ".pyfars/harness-output/systemd-user"
target-runtime: "host:~/.config/systemd/user"
manifest: ".pyfars/harness-manifests/systemd-user.json"
emits:
  - source: discover_service_specs
    template: "pyfars-engine.service.j2"
    target-pattern: "{slug}.service"
    mode: per-record
  - template: "secrets.env.j2"
    target-pattern: "/.pyfars/secrets.env.example"
    mode: aggregate
---


The polity's harness onto the host's systemd-user supervisor. systemd is an external system with its own ongoing relationship to PyFARS: PyFARS declares which long-running processes the host should supervise (via `type: service-spec` substrate records), the harness projects them to systemd unit files, and systemd enacts them — starting the engine on boot, restarting it on crash, halting it cleanly on shutdown.

In its current alpha, this harness ships only the **config** layer — the `.service` files projected from substrate.
The fuller harness will add: signal-handling on the engine side (SIGTERM → halt morphism), `sd_notify` status reporting (engine → systemd), journal-querying as substrate observation (systemd → engine).
Bootstrap first; live two-way later.

## What it projects

For each `type: service-spec` substrate record with `status: active`:

| File | Template | Consumer |
|---|---|---|
| `<slug>.service` | [`templates/pyfars-engine.service.j2`](templates/pyfars-engine.service.j2) | `systemctl --user enable --now <slug>.service` |

The manifest is written to `.pyfars/harness-manifests/systemd-user.json`.

## Default target & operator workflow

By default the harness writes into `.pyfars/harness-output/systemd-user/` (a substrate-local staging directory).
The polity's `governance/harnesses/systemd-user.md` config record can override `target` to point directly at `~/.config/systemd/user/` if the operator wants in-place projection.

After install (default staging path), copy or symlink to the systemd-user dir:

```bash
cp .pyfars/harness-output/systemd-user/*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now pyfars-engine-<slug>.service
```

## Substrate context the template sees

Per service-spec record:

- `slug`, `title`, `description` — from the record.
- `exec_verb`, `exec_args`, `substrate_root`, `restart_policy`, `restart_delay_seconds`, `halt_signal`, `halt_timeout_seconds`, `env_file`, `wants_target` — frontmatter fields from the spec.
- `host` — the resolved computer-system record (so the template has the host's `home_dir`, `primary_user`, `service_manager`).
- Optional: `runtime_directory`, `journal_priority`, `cpu_quota`, `memory_max`.

Plus harness-global:

- `polity` — title and slug from the active polity record.
- `generated_at` — UTC ISO timestamp.
- `generation_command` — the literal command that regenerates the unit.

## Schema

The `type: service-spec` record schema is fixed by [`engine-service-spec`](../../../../governance/specifications/engine-service-spec.md).

## Status

v0.1, scoped to systemd-user only.
Out of scope for first cut: launchd (macOS), systemd-system (root services), container manifests.
The service-spec schema is supervisor-agnostic; downstream harnesses (launchd, container-units) project the same records into different supervisors.
