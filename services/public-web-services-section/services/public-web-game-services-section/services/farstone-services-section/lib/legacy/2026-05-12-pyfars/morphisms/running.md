---
type: morphism
class: process-state
status: draft
depends-on: [process, agent, pulse, pulsing]
---

# Running

The morphism by which a [process](../concepts/process.md) is alive — consuming resources, receiving triggers, producing pulses.
Running is the *interval-shaped* counterpart to [pulsing](pulsing.md) (which is point-shaped).
A process is in-running between its start-event and its termination-event; while running, it pulses each time triggered.

The OS-analog is direct: running is what a host-OS process *does* between fork and exit; running is what a PyFARS-substrate process does between its start-witness and its end-witness.

## Action

For a process $P$ at system state $S$, between moments $\tau_{\text{start}}$ and $\tau_{\text{end}}$:

$$\mathrm{running}_P \colon S \;\longrightarrow\; S \cup \{\text{pulse-events of } P \text{ in } [\tau_{\text{start}}, \tau_{\text{end}}]\}$$

Running over an interval produces the sequence of pulse-events the process emits during that interval.
The interval may be bounded (process completes) or open-ended (process is still running at observation time).

## Running and pulsing

A process is *running* across the interval.
The process *pulses* at each trigger-arrival within the interval.
Running is the state; pulsing is the per-trigger event.
Reading "is process P running?" reads a substrate-cell; reading "did P pulse at $\tau$?" reads an event-witness.

## Running and resource-bounding

A running process consumes resources — capability-table entries, rate-limit budget, attention-slots.
PyFARS's discipline: every running process is substrate-visible, with its current resource consumption reconstructible from its run's witness-stream.

When the polity is over-provisioned (more running processes than resources support), the excess is visible *in the system* — saturation can be diagnosed by reading running-process counts against capability-table capacity.

## Running and termination

Termination is itself a substrate event: a witness recording why-and-when the process stopped running.
Terminations are categorized — completed (workitem finished), suspended (deferred to a future trigger), failed (encountered an error), cancelled (revoked by authority).
Each is recordable; the running-interval's final state is the terminated-state.

## What this morphism does not specify

- The schema of process-running cells.
- The discipline for crashed running processes (host-process died without a termination witness).
- Cross-instance running (when a process spans federation events).
