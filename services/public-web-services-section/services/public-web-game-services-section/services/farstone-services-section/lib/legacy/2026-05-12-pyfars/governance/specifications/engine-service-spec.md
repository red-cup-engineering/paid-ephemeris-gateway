---
title: "Engine service-spec"
type: specification
status: draft
authors: [emsenn, claude-opus-4-7]
date: 2026-05-08
supersedes: []
---


> **Status: draft.** Names the schema for `type: service-spec` substrate records — the records the host-OS-supervisor harness projects into systemd unit files (or launchd plists, or container manifests).
> Per [wiring-protocols §4.7](wiring-protocols.md): the polity↔host-OS-supervisor wiring is "declarative file projection" — substrate carries service-spec cells; the harness materializes them; the host enacts them.
> This document fixes what those cells look like.

## 1. Problem

The engine has to run as a supervised service.
The [`engine-runs-as-supervised-service`](../../work/goals/engine-runs-as-supervised-service.md) goal grounds this in three theoretical commitments: practical-reasoning-as-operator-schedule, recurrent-practice-as-the-operations-loop's-regime, and tick-as-iteration.
The supervisor (currently systemd-user) is what makes the regime-of-recurrent-practice realizable across host events.

But the unit file itself is not substrate.
The unit file is a *projection* of substrate.
What's substrate is the record that says: *this engine instance, on this host, runs `pyfars run <root>` with this restart policy, this env file, this halt-signal*.
The harness reads that record and emits the unit file.
Re-projection-on-substrate-change is the standard wiring discipline (per wiring-protocols §4.7).

This spec names the record's frontmatter shape so the harness has a stable contract to project against, and so an operator can read a service-spec and understand how the host will treat it.

## 2. Record shape

A service-spec record lives at `governance/specifications/services/<slug>.md` (canonical) or any path the substrate walks; the kind discriminator is the frontmatter, not the path.
Required fields:

```yaml
---
title: "<human-readable name>"
type: service-spec
status: draft | active | retired
slug: <kebab-case-slug>           # e.g. pyfars-engine-cold-red-gate

# What runs.
exec-verb: pyfars run             # the pyfars subcommand the unit invokes
exec-args: []                     # any additional CLI args

# Where it runs.
substrate-root: <path>            # absolute path or $HOME-relative
                                  # (per `engine-runs-as-supervised-service` design constraint:
                                  # this MUST be a stable substrate root, not a wrapper output)

# How the host supervises it.
service-manager: systemd-user     # systemd-user | systemd-system | launchd | container
restart-policy: on-failure        # on-failure | never | always — see §3
restart-delay-seconds: 5          # small backoff so flapping doesn't hammer

# Lifecycle signals.
halt-signal: SIGTERM              # the signal the supervisor sends on stop
halt-timeout-seconds: 30          # how long the supervisor waits for clean halt before SIGKILL
                                  # (must exceed the longest-tick budget so in-flight closure runs settle)

# Environment.
env-file: <instance>/.pyfars/secrets.env  # canonical: instance-local secrets file
                                          # format is .env (KEY=VALUE per line); mode 600
                                          # may be omitted if the polity has no secrets

# Activation discipline.
wants-target: default.target      # systemd-user: default.target; systemd-system: multi-user.target
                                  # (see `engine-runs-as-supervised-service` constraint:
                                  # user-space services MUST NOT use multi-user.target)

# Binding.
host: <computer-system-slug>      # the `governance/group/computer-systems/<slug>.md` record
                                  # that names the host this spec deploys to

# Provenance.
authored: <YYYY-MM-DD>
authored-by: [<agent-slug>]
---
```

Optional fields the harness may consume if present:

- `tick-interval-seconds: <int>` — overrides the polity's default tick cadence on this host.
- `runtime-directory: pyfars` — sets `RuntimeDirectory=` in the systemd unit (auto-created `/run/user/<uid>/pyfars/`).
- `journal-priority: info` — sets the syslog priority for stdout (default: info).
- `cpu-quota: <percent>` — caps CPU share (`CPUQuota=` in systemd).
- `memory-max: <size>` — caps memory (`MemoryMax=` in systemd).

Body of the record is human-readable prose explaining *why this engine instance exists on this host* (what the polity expects of it, what bindings constrain its restart policy, etc.).
The body is not consumed by the harness; it's for the operator and for audit.

## 3. Restart policy semantics

Three values, with substrate-grounded meanings:

- **`on-failure`** — the engine restarts iff its halt was *unwitnessed*: i.e., the engine died before emitting its halt-witness to the event log.
  This is the canonical case and the default.
  A crash, an OOM-kill, a power loss → the lifecycle never reached its `close_session` morphism, no halt-witness, supervisor restarts.
  The next tick's input is the substrate plus the event log up to the last *complete* witness; tick-as-iteration's determinism contract guarantees the resumed engine reaches the same state it would have without the crash.
- **`never`** — the engine does not restart even on crash.
  Used for one-shot diagnostic runs or when an operator wants manual control over restart.
- **`always`** — restarts on any halt, including a clean witnessed halt. **Wrong for the engine.** A clean halt (SIGTERM during planned maintenance) is the operator's signal that the engine should stay down; auto-restart contradicts that signal.
  The substrate-supervised correctness contract requires the engine to honor planned halts.

The default for a new service-spec is `on-failure`.
`always` should be authored only with explicit justification in the record body.

## 4. Halt-signal semantics

The supervisor sends `halt-signal` (default `SIGTERM`); the engine catches it and drives the halt morphism (run_dispatch in flight finishes, last witness emitted, UDS socket unbound — the same path as `POST /halt` per wiring-protocols §4.2).
After `halt-timeout-seconds`, the supervisor escalates to `SIGKILL` to force termination.

Two correctness invariants:

1. **`halt-timeout-seconds` must exceed the longest expected single-tick budget.** If a tick takes 12s (closure run + dispatch + LLM invocation), `halt-timeout-seconds: 30` gives a 2.5× margin.
  Premature `SIGKILL` mid-tick produces an unwitnessed crash; the next boot will treat it as a failure-restart even though the operator's intent was clean halt.
2. **The engine MUST install the signal handler before binding the UDS socket.** Otherwise a SIGTERM arriving in the boot window leaves the socket bound but the engine unresponsive — the supervisor can't tell it's halting because the witness pipeline isn't online yet.

Both invariants land in the lifecycle implementation (#155 = B.
3).

## 5. Computer-system binding

The `host:` field references a `governance/group/computer-systems/<slug>.md` record, which carries host-specific context the harness composes with the service-spec at projection time:

- The host's `service-manager` (systemd-user vs systemd-system vs launchd) — overrides the spec's `service-manager` if the host doesn't support it.
- The host's `home-dir` for resolving `$HOME`-relative `substrate-root` paths.
- The host's user account for systemd-user (`User=` derives from the host record, not the spec).
- The host's reachable network interface (relevant when the spec wants TCP-bound web alongside UDS).

A single service-spec can have at most one `host:` binding.
To run the same engine on two hosts, author two service-spec records — they may share most fields, but they're separate records because their host context differs.

## 6. Projection (the harness contract)

`pyfars install systemd-units <host-slug>` reads:

1. The host's computer-system record at `governance/group/computer-systems/<host-slug>.md`.
2. All `type: service-spec` records with `host: <host-slug>` and `status: active`.

For each service-spec, the harness:

1. Renders the appropriate template (`pyfars-engine.service.j2` for `service-manager: systemd-user`).
2. Writes it to the host's user systemd path (`~/.config/systemd/user/<slug>.service` for systemd-user).
3. Writes the env-file referenced in the spec.
4. Optionally runs `systemctl --user daemon-reload` (or instructs the operator to).

The harness DOES NOT:

- Write `multi-user.target` units for service-specs declaring `service-manager: systemd-user`.
- Render units for service-specs whose `host:` doesn't match the install target.
- Skip records silently — a service-spec with malformed frontmatter must produce an audit witness, not a no-op.

## 7. Acceptance

A service-spec is "well-formed" when:

- All required fields present and pass type validation.
- `restart-policy` is one of the three named values (no operator-coined values).
- `halt-timeout-seconds` ≥ the polity's longest expected tick budget (substrate-derived where possible, operator-asserted otherwise).
- `host:` resolves to an existing computer-system record.
- `substrate-root` resolves to a directory containing a `.pyfars/` (the polity boundary marker).

`pyfars validate <service-spec.md>` checks all five.

## 7.1 Instance-locality discipline

A polity instance is a self-contained directory.
Everything the engine reads or writes for the instance lives **inside** that directory:

- `<instance>/.pyfars/secrets.env` — the env-file the systemd unit's `EnvironmentFile=` points at
- `<instance>/.pyfars/oauth/clients.json` — DCR client registry (when OAuth runs)
- `<instance>/.pyfars/event-log/` — witness log (per wiring-protocols)
- `<instance>/.pyfars/run.sock` — UDS socket (per wiring-protocols §4.2)
- `<instance>/.pyfars/harness-output/` — staging dir for harness projections that haven't yet been materialized to host-expected paths

The only PyFARS-authored files that ever leave the instance directory are **wiring projections** — files projected into host-expected paths (systemd units in `~/.config/systemd/user/`, etc.) because the host's own systems won't read from inside our instance.
That's structural to "wiring" per [wiring-protocols](wiring-protocols.md) §4.7.
Everything else stays in.

A service-spec's `env-file:` field MUST point at a file inside the instance directory.
Pointing at `$HOME/.config/...
` or another out-of-instance path violates the instance-locality discipline; the harness rejects such specs.

## 8. What this specification does not yet decide

- **launchd / container projection.** The schema is supervisor-agnostic but the harness only ships the systemd-user template in the first cut. launchd plist projection and container manifest projection are downstream work.
- **Multi-engine supervision.** Whether one host can run multiple engines bound to different polities (and whether they share a UDS prefix or get distinct ones) — see wiring-protocols §7 (multi-engine federation).
- **Socket activation.** Systemd supports starting services on first connection to their socket.
  Whether the engine's UDS should use socket activation (faster cold-start) or eager bind (simpler) is open; first cut is eager bind.
- **Environment-file format.** `.env` (KEY=VALUE per line) is the simplest and what systemd's `EnvironmentFile=` consumes natively.
  Whether to support YAML/TOML for env config is open; first cut is `.env`.
