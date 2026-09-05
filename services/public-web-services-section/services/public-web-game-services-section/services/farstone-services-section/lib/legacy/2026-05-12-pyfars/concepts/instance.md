---
type: concept
class: polity-state
status: draft
depends-on: [polity, image, engine, runtime]
---

# Instance

A [polity](polity.md) running: an [image](image.md) bound to an [engine](engine.md), with the engine actively ticking, pulsing subscribed agents, settling, and dispatching.
An instance is the *living* form of the polity.

The transition image → instance is [booting](../morphisms/booting.md); instance → image is [halting](../morphisms/halting.md).
A given polity may be image, then instance, then image again, many times across its lifetime; each cycle is system-witnessed.

## What makes an instance

An instance is identified by:

1. **The image** — the polity-content the engine is bound to.
2. **The engine** — the running execution-component.
3. **The runtime** — the PyFARS install hosting the engine.
4. **The host** — the system on which it all runs.
5. **A start-moment** — the moment of boot.
6. **An identity / handle** — a process-id or instance-id usable to address the running instance from outside (e.g., for halting).

Two instances of the same image (running on different hosts, or sequentially on the same host) are *distinct instances* sharing common system-content but with separate run-histories.
Their JSONL logs may diverge after their respective start-moments.

## Instance vs. image — what changes

When a polity transitions from image to instance:

- The system-content is the same (the directory's files don't move).
- An engine begins ticking; ticks are substrate-witnesses appended to the log.
- Subscribed agents begin pulsing; pulse-witnesses appear in the log.
- Settling fires after each batch of witnesses; substrate becomes [quiescent](quiescent.md) between ticks.
- Ports become live; inbound external events are accepted; outbound events are emitted.
- [Services](service.md) are spawned (the heartbeat process, the web server, the MCP server).

When the polity transitions back to image:

- The engine writes a halt-witness.
- Services are terminated.
- Ports are closed.
- The clock stops emitting ticks.
- Pulses cease.
- The system-state on disk is the system-state at halt-moment.

## Instance liveness

A live instance has substrate-recordable liveness markers:

- **Last-tick moment** — the moment of the most recent tick.
  An overdue last-tick suggests the engine has stalled.
- **Active services** — which services are running, their substrate-cell heartbeat-witnesses.
- **Subscriber pulse-queue depths** — substrate-visible queue-state per agent.
- **Settling state** — whether substrate is currently quiescent or mid-settling.

A captain (or external monitor) reading these can diagnose health without disturbing the instance.

## Instance and federation

When two instances federate, they coordinate cell-changes via bilattice network-sheaf consensus.
Each instance retains its own engine, log, and clock; cross-instance witnesses propagate through bridge channels.
Multi-instance federation discipline is partly settled.

## What this concept does not specify

- Multi-engine instances (whether one image can have multiple engines for high-availability).
  Open.
- Instance migration (moving a running instance from one host to another without halting).
  Open.
- Instance snapshots (capturing instance-state mid-tick for backup).
  Currently we rely on quiescent-state snapshots.
