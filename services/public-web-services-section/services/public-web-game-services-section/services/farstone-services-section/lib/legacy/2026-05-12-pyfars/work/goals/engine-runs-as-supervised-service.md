---
title: "Engine runs as a supervised service"
type: goal
milestone: m3-continuous-loop
status: open
horizon: soon
theory-basis: [recurrent-practice, operations-loop]
tasks:
  - author-systemd-user-service-template
  - bootstrap-installs-and-starts-engine-service
  - migrate-hook-dispatch-to-engine-uds-post
---


After this goal, `pyfars run` runs as a systemd user-service on hosts whose `service-manager: systemd-user` registration calls for it.
The service survives a host reboot, restarts on engine failure, and writes its state to `<substrate-root>/.pyfars/event-log/`.

## Why

Today the engine runs interactively — a captain types `pyfars run` and watches it tick.
That's fine for development.
For unattended operation on `vps-mini-cold-red-gate` (the M3 acceptance target), the engine needs supervision: failure recovery, post-reboot resume, and a clear control surface for stopping and restarting.

The lifecycle StateGraph already halts cleanly on SIGINT/SIGTERM.
The wire-protocols spec (§4.7) anticipates host-OS supervisor integration via systemd.
This goal closes that integration.

## Theory grounding

**1.
Practical-reasoning-as-operator-schedule** (charter C5; [`predicated-computing/.../predicated-agentic-computing`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/predicated-agentic-computing.md)).
The tick / dispatch / runbook-execution cycle IS the practical-reasoning loop.
A polity that ticks is reasoning; a polity that doesn't tick has paused its reasoning.
Treating the engine as a "mere daemon" misses what supervision is for: **supervision is the substrate-purity-preserving mechanism by which practical reasoning continues across host events** (reboots, crashes, network partitions).
Systemd is one realization of that mechanism; it's not the only one possible (NixOS service, launchd, Kubernetes), but it's the realization registered for the polity's current hosts.

**2.
Recurrent-practice as the operations-loop's regime** ([`predicated-work/theorems/regime-of-recurrent-practice`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/regime-of-recurrent-practice.md)).
Recurrent practice — the form work takes when ticks repeat — has its own cohomological signature distinct from one-shot tasks.
A polity that runs unattended exhibits recurrent-practice's regime; one that runs only when a human invokes it does not.
The supervised service is what makes the regime-of-recurrent-practice realizable: the same closure-rule system applies the same rules every tick, accumulating settled cells across ticks rather than starting from $\bot$ each invocation.

**3.
Tick-as-iteration** ([`flatfile-agentic-resource-system/concepts/tick-as-iteration`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/tick-as-iteration.md)).
Ticks are iterations of a closure-rule-system over a substrate; each iteration produces a new substrate state, deterministic in `(prior state, rule-system)`. **An engine that crashes mid-tick must resume by re-running the same tick deterministically, not by skipping ahead.** This is the supervisor's correctness contract: `Restart=on-failure` is fine because the next tick's input (the on-disk substrate plus the JSONL log up to the last halt witness) reproduces the same state the engine had before the crash.

### Design constraints from this grounding

- **The unit's `ExecStart=` must run `pyfars run` against a stable substrate root.** No wrapper that does additional pre-processing — that would break the substrate-as-canonical-input property; a pre-processor's output isn't itself substrate.
- **`Restart=on-failure` is correct; `Restart=always` is not.** A clean halt (SIGTERM during planned maintenance) shouldn't auto-restart; a crash should.
  The lifecycle's halt-witness is what distinguishes the two.
- **`WantedBy=default.target`** so the user session pulls it in. **Don't use `multi-user.target`** — that's for system services; pyfars runs in user space.
- **Don't journal-suppress witness output.** Stdout/stderr go to journal by default (good); the witness chain is in `<substrate-root>/.pyfars/event-log/` (also good); both are addressable, neither is canonical-versus-the-other (the journal is for human reading, the event-log is canonical per `event-log-is-jsonl`).

## Acceptance

- [ ] A systemd user-service template at `src/pyfars/harnesses/<harness>/templates/pyfars-run.service.j2` (in a new or existing harness; the host-OS-supervisor harness is a candidate) renders to `~/.config/systemd/user/pyfars-run.service` with the substrate root path and tick interval populated from the host's computer-system record.
- [ ] `pyfars install <host-os-supervisor-harness>` installs the unit and a matching socket-activation file (or just the service file).
- [ ] `systemctl --user enable --now pyfars-run.service` starts the engine; it ticks at the configured cadence; SIGTERM halts cleanly.
- [ ] After `systemctl --user restart pyfars-run.service`, the event log shows a clean halt-witness and a fresh boot-witness.
- [ ] Host reboot resumes the engine automatically (per `WantedBy=default.target`).
