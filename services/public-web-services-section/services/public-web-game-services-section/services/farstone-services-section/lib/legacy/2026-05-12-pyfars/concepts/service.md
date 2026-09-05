---
type: concept
class: long-running-supervised-process
status: draft
depends-on: [harness, program, system, process, instance, engine, host]
see-also: [service-harness-program, wiring, running]
---

# Service

The system-frame name for *a long-running [process](process.md) under external supervision, whose presence in the polity persists across its own restarts*.
A service is the EXTERNAL view of any process — PyFARS-side or otherwise — that a service-manager (systemd, launchd, container orchestrator, nix-daemon, OS init) starts, stops, restarts, and reports on.

A service is a refinement of the external-program category that [harnesses](harness.md) target.
Where one-shot external programs (compilers, linters, file converters) are invoked-and-finished, services are started-and-supervised: they run until told to stop.
Services are how the polity couples its long-lived work to host-OS lifecycle: when the host boots, supervised services start; when the host halts, supervised services stop.

## What makes a process a service

A service has three properties that one-shot programs lack:

- **Long-running.** The program runs until externally signaled to stop.
  There is no natural exit point at "task complete."
- **Supervised.** A supervisor (systemd, container orchestrator, init system) is responsible for starting, stopping, restarting, and reporting the program's state.
  The supervisor reads files a service-[harness](harness.md) produces; the harness produces those files from system cells.
- **Stateful across lifecycle.** The program may maintain state (open connections, in-memory caches, mounted filesystems) that the supervisor expects to persist as long as the process is running, and that the supervisor knows must be reset on restart.

The pyfars [engine](engine.md) itself meets these criteria from the perspective of any service-manager that supervises it.
From inside PyFARS, the engine is a [program](program.md) of the engine class.
From outside PyFARS, the engine is a service.
The same process; two frames.

## What a service has

In its system-resident form, a service has:

1. **A workitem (process subtype)** — the system-side workitem the service realizes.
2. **A host-supervision unit** — the systemd unit file, launchd plist, container manifest, or equivalent.
  This is the [wiring](wiring.md) that materializes the service to the host's supervisor.
  The unit is produced by a [service-harness-program](service-harness-program.md).
3. **An invocation command** — what the host runs to start the service (typically `pyfars run <directory>` for the engine; harness-specific for other services).
4. **A lifecycle policy** — restart-on-failure, watchdog timeout, dependency declarations on other services.
5. **System-resident liveness witnesses** — the service emits witnesses while [running](../morphisms/running.md), recording last-heartbeat-at, current-state, recent-activity.

## What a service is NOT

- A service is not a [program](program.md) class.
  Program class is the PyFARS-side classification of pyfars processes (engine, query, harness-program, etc.).
  "Service" is the external view: how a non-PyFARS supervisor sees the program.
  A pyfars engine is *a program of the engine class* (internal view) and *a service* (external view) simultaneously.
- A service is not a [harness](harness.md).
  A service is the *target* of a harness — specifically, of a [service-harness-program](service-harness-program.md), which lifts a service rather than a one-shot external program.
- A service is not every process.
  A captain-incited derivation that runs for an hour is a process but typically isn't a service (no host-supervisor manages it).
  Services are processes long-lived enough and load-bearing enough to warrant host-OS-level lifecycle management.

## Service vs. process vs. workitem

Distinct levels:

- **Workitem** — the system's notion of work to be done.
  Includes processes, procedures, derivations, inquiries.
- **Process** — a workitem subtype: long-running, interval-shaped, produces multiple events over its lifecycle.
- **Service** — a process under host-OS supervision, with its lifecycle managed externally.

## Why service is its own concept

A service-harness produces more than a one-shot harness:

- **Configuration files** (like any harness) — the service's settings, environment, mount paths.
- **Lifecycle declarations** — start, stop, restart, status, reload commands the supervisor invokes; the harness produces the metadata (systemd unit files, container manifests) that hooks the service into the supervisor.
- **Supervision policy** — restart-on-failure, dependency ordering, graceful-shutdown windows, log routing.
- **Health-check declarations** — the supervisor's notion of "is this service okay" needs hooks the harness defines.

A service-harness's projection therefore covers more system→external surface than a plain (one-shot) harness.
The input fiber a service-harness reads is larger (service slot, supervisor cells, lifecycle policy cells); the file-output set is broader (config files + unit files + health-check declarations).

## Standard PyFARS services

A typical polity-instance may expose these services:

- **Engine service** — the [tick](tick.md)/dispatch/UDS-serving process supervised as a systemd-user unit; from inside PyFARS it's the engine program, from outside it's the polity's primary service.
- **Web server service** — hosts the polity's HTTP/HTTPS endpoints (may run as a program bridged to the engine via UDS, supervised separately).
- **MCP server service** — exposes the polity's verbs as MCP tools to external clients.
- **Hook receiver service** — listens for inbound webhooks and other event-driven inputs.

Other services exist per-polity needs (sync services for federation, monitoring services, etc.).
The catalogue is open.

## Position relative to harness

Service refines harness's target:

```
harness               (any external program: one-shot or service)
└── service-harness   (specifically, services)
```

A polity that harnesses a service uses a [service-harness-program](service-harness-program.md); a polity that harnesses a one-shot tool uses a (non-service) [harness-program](harness-program.md).
The polity's `has-harness` cell does not distinguish — the harness itself is either service-class or not, and the appropriate program-class runs.

## Service and system-purity

Services operate within system-purity: their work is recorded as system witnesses; their lifecycle (start, restart, stop) emits witnesses; their inputs (received messages, observed state) are recorded.
The host-supervisor's role is *only* to keep the service running; system content is the polity's responsibility.

This means a polity's service-state at any moment is reconstructible from system alone (which services have started, which have halted, which are currently expected-running).
The host-supervisor's view is a *projection* of the system-truth.

## What the predicated-nix theory says about services

Per [predicated-nix](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/deployment-systems/theories/nix/theories/predicated-nix/_index.md), Nix's daemon (`nix-daemon`) and the operator's nix-built service binaries are themselves services in this sense: long-running, supervised, lifecycle-aware.
A polity's `nix-flake-harness` is, in this taxonomy, a **service-harness**: it produces both the build configuration (one-shot harness behavior) and the supervisor-side declarations (service-harness behavior, particularly when paired with `systemd-user-harness` for the engine-as-service case).

## Open issues

- **Per-host service-supervision protocol.** systemd is the primary target; launchd/sysvinit/upstart support is partly settled.
- **Service dependency graphs.** When service A depends on service B (e.g., web-server depends on engine), the system-form of the dependency declaration is partly settled.
- **Service hot-reload.** Whether a service can be reconfigured (rule-set update, governance amendment) without restarting.
  Open.
