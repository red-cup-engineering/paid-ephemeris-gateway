---
type: concept
class: external-system
status: draft
depends-on: [runtime, instance, service, port]
---

# Host

The system on which the [runtime](runtime.md) is installed and on which [instances](instance.md) run.
The host is *external* to the system: it is not a polity-cell, not a witness-target, not an entity in the polity's system-graph.
The host is, from the polity's perspective, the *outside* — but a particular outside that the polity reads, writes through, depends on, and observes.

## What a host provides

A host provides, to the polity:

1. **A filesystem** — where the polity-image lives on disk.
2. **A process supervisor** — systemd or equivalent, hosting the polity's [services](service.md).
3. **Network access** — for the polity's [ports](port.md) (inbound HTTP, outbound API calls, etc.).
4. **A clock source** — the host-OS clock, from which the polity's [clocks](clock.md) draw wall-clock timestamps.
5. **Resource budgets** — CPU, memory, disk, network bandwidth available to runtime processes.
6. **Authentication context** — host-level identity (Unix user, container identity, etc.) under which the runtime runs.

These are *outside-substrate* but *load-bearing for system operation*.
The polity's runtime is bounded by what the host provides.

## Host as observed entity

While the host is not in the system, it is *observable*: the polity can observe host-level state (CPU usage, disk-free, network-status, host-OS clock readings).
Each observation produces an observation-witness in the system.

This is the standard substrate-purity discipline at the polity-host boundary: observed host-state lives in the system as observations; the host-state-itself does not.
Replay reproduces the observations, not the host-state at the time.

## Host and federation

When polities federate across hosts, the federation-coordination uses bilattice network-sheaf consensus over bridge channels.
Each polity's host is its own; the federation operates *despite* the polities being on different hosts (with different clocks, different network-paths, different resource-availability).

## Host and substrate-purity at the boundary

The substrate-purity discipline at the host boundary:

- **Inbound from host** (e.g., webhook arrives, OS signal fires, file-system event triggers): record as observation-witness; system-state changes flow from the witness, not from the host-event directly.
- **Outbound to host** (e.g., write a file, send an HTTP request, log a metric): record as a substrate-witness; the actual host-action is a side-effect of the witnessed transition.

Replay reproduces the *recorded interactions*, not the host's behavior at the time.
A polity replayed on a different host will reproduce the same system-state.

## What this concept does not specify

- Multi-host orchestration.
  When a polity spans multiple hosts (e.g., a federated deployment), the host-coordination discipline is partly settled.
- Container vs. bare-metal vs. VM hosts.
  PyFARS abstracts over host-types; the differences mostly show up in supervision-protocol specifics.
- Host failure recovery.
  When a host crashes mid-instance, the recovery routes through reboot + image-state-on-disk; partial-tick recovery is partly settled.
