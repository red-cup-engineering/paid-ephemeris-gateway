---
type: concept
class: system-execution-component
status: draft
depends-on: [runtime, polity, image, instance, ticking]
---

# Engine

The active execution-component bound to a running [instance](instance.md).
The engine is what *makes a polity run*: it ticks the clock, fires triggers, drives subscribers' pulses, runs settling, dispatches work.
When an [image](image.md) is booted, an engine is instantiated and bound to the image; while bound, the polity is an instance.

The engine is to the [runtime](runtime.md) what a worker process is to its server binary: the runtime is the static install; the engine is the dynamic, running execution-machinery.
One runtime can spawn one engine per running instance.

## What the engine does

The engine, while running:

1. **Loads the polity-image** — reads the system-cells, the JSONL log, the rule-set, the governance.
2. **Ticks the clock** — emits ticks per the polity's cadence configuration.
3. **Fires triggers** — pattern-matches events against active subscriptions; fires subscribed agents' pulses.
4. **Runs settling** — applies the active ruleset to the system after each pulse-batch; reaches quiescence.
5. **Dispatches work** — reads the work-queue and governance-derived eligibility; assigns ready work to capable agents.
6. **Logs witnesses** — appends events to the JSONL log.
7. **Hosts ports** — listens on ports (HTTP server, MCP server, hooks) for inbound external events.

The engine is the *agent* (in OS-process-architecture sense) of the polity's running state.
Without an engine, the polity is at-rest.

## Engine and substrate-purity

The engine itself is not system-content.
It is execution-machinery.
But every transition the engine causes IS system-content: the witnesses it appends, the closures it computes, the pulses it fires are all in the JSONL log.
The engine *operates the substrate*; the substrate *records the operations*.

This is what makes engines replaceable: a future engine version can re-run the same image, producing the same system-state, because the substrate is a function of the log + ruleset, not of the engine's implementation choices.

## Engine and host process

In current PyFARS realization, the engine runs as a host-OS process (or a small process tree).
Typically: one main `pyfars run` process for the engine; child processes for [services](service.md) the engine spawns (heartbeat-tick service, web-server service, MCP server service).

Halting the engine halts the instance: the engine writes its halt-witness, closes connections, terminates child services, and returns the polity to image-state.

## Engine and federation

When polities federate, their engines coordinate via bilattice network-sheaf consensus.
Each polity has its own engine; cross-polity messaging routes through dedicated bridge channels with consensus-aware semantics.
Multi-engine federation is open territory.

## What this concept does not specify

- The engine's internal architecture (single-thread, multi-process, async, etc.).
  Currently single-process Python with selective async; partly open.
- Engine restart discipline.
  When an engine crashes mid-flight, recovery starts from the last quiescent state in the JSONL log; the discipline for partial-tick replay is partly settled.
- Engine concurrency.
  Whether two engines can simultaneously bind to the same image (for high-availability or load-sharing).
  Open.
