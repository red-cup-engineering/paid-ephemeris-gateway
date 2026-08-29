---
type: morphism
class: process-lifecycle
status: draft
realizes: [service]
depends-on: [engine, host, service, running, halting, booting, jsonl-event-log]
implementation: pyfars.harness.systemd
---

# Supervising

The morphism by which a host's process-supervisor (systemd, runit, s6, launchd) wraps a PyFARS engine instance: it starts the engine on host-boot, restarts it on unclean exit, captures its stdout/stderr to the log, and stops it on host-shutdown.
Supervising lives at the boundary between the polity's system and the host's process-table — it is what makes "the engine runs unattended" a real claim rather than an in-dev observation.

Supervising is *not* a substrate morphism in the strict sense — it acts on the host-OS process for the engine, not on system cells.
But the supervising relationship is itself a system cell: a `(host, supervises, engine-instance)` predication that the captain can read, and from which the harness derives the host-side unit file.
Per [substrate-purity](../claims/substrate-purity.md), the configuration of the supervisor is system content; the running of the supervisor is host-OS reality.

## Action

For a host $H$ with a process-supervisor $\sigma$ and a target PyFARS engine $E$:

$$\mathrm{supervising}_\sigma(H, E) \;\longrightarrow\; \big(H, \texttt{supervises}, E\big) = \mathbf{t}$$

Once the supervising relationship is asserted (and the harness has materialized the host-side unit file), the supervisor's runtime behavior is:

- **Start.** On host-boot, the supervisor invokes `pyfars run` with the configured polity-corpus path; emits a `start-witness` to the [JSONL event log](../objects/jsonl-event-log.md) per [booting](booting.md).
- **Watch.** While the engine is in [running](running.md) state, the supervisor monitors the engine's process — exit-code, restart count, time-since-last-restart.
- **Restart.** On unclean exit (non-zero exit code, signal, or watchdog timeout), the supervisor restarts the engine after a configured back-off, emitting a `supervisor-restart-witness` recording the prior exit's cause and the restart's start-moment.
- **Stop.** On host-shutdown or explicit `pyfars halt`, the supervisor signals the engine for graceful [halting](halting.md) and waits for the halt-witness to land in the log before reporting the unit stopped.

The supervisor is *not* part of the engine.
It runs as a separate process owned by the host's init system, with the engine as its single child.

## System cells

Supervising binds to the system via:

- `(engine-instance, hosted-on, host) = t`
- `(host, supervises, engine-instance) = t`
- `(engine-instance, supervisor-kind, "systemd-user-service" | "runit" | ...) = t`
- `(engine-instance, restart-policy, "on-failure" | "always" | "never") = t`
- `(engine-instance, restart-backoff-seconds, <integer>) = t`

The harness's `pyfars install-harness systemd-user-service` morphism reads these cells and emits the unit file at the host's expected path (`~/.config/systemd/user/pyfars-<polity-slug>.service` for systemd-user).
Editing the cells and re-running the harness installer produces a new unit file; the host's supervisor picks up the change on its next reload.

## Restart witnesses

A supervisor-restart event in the JSONL log:

```json
{
  "ts": "2026-05-09T03:14:22.001Z",
  "actor": "host:vps-mini-cold-red-gate",
  "verb": "supervisor-restart",
  "cells": [
    {"s": "engine-instance-quiescent", "p": "restart-count", "o": "7", "v": "t"},
    {"s": "engine-instance-quiescent", "p": "last-exit-code", "o": "1", "v": "t"}
  ],
  "rationale": "engine exited non-zero at 03:14:21; restarting after 5s backoff"
}
```

Restart witnesses make the supervisor's behavior visible to the substrate: a query "how often has the engine restarted in the last 24 hours?" reads the log; an anomaly rule "restart-count exceeds threshold" produces a $\top$-cell per [anomaly-witness](../objects/anomaly-witness.md).

## Discussion

Supervising is the morphism that closes the loop between "the engine ticks" and "the polity is alive."
A polity whose engine ticks only when a developer has a terminal open is fundamentally different from one whose engine ticks unattended on a server — the difference is the supervisor.
The supervisor's existence is what lets [recurrent-practice](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md)'s cohomological signature appear, because recurrent practice requires unsupervised cycle-firing across long horizons, which requires the engine to be restarted automatically when it falls over.

The choice of supervisor (systemd vs. runit vs. launchd) is a *harness* concern, not a substrate concern.
The substrate carries the abstract supervising relationship; the harness materializes it for whichever process-supervisor the host runs.
