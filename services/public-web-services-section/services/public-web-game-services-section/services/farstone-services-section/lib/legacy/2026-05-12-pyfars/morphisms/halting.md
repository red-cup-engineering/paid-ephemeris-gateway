---
type: morphism
class: polity-state-transition
status: draft
depends-on: [polity, instance, image, engine, booting]
---

# Halting

The inverse of [booting](booting.md): the morphism that takes a polity from [instance](../concepts/instance.md) state to [image](../concepts/image.md) state.
Halting stops the engine, closes ports, terminates services, settles to quiescence, and writes the halt-witness.
After halting, the polity is at-rest on disk.

## Action

For an instance $\mathrm{Instance}(I, R, H, \tau_{\text{start}})$ at halt-moment $\tau_{\text{halt}}$:

$$\mathrm{halting} \colon \mathrm{Instance}(I, R, H, \tau_{\text{start}}) \;\longrightarrow\; I'$$

— the engine writes a halt-witness, terminates services, releases ports, returns the polity to image-state $I'$ (which differs from the pre-boot $I$ only by the run-history witnesses appended during the running interval).

## Halting modes

Halting can be:

- **Graceful** — the polity reaches quiescence, completes pending settling, terminates services in their declared order, releases resources, writes a halt-witness with status `clean`.
- **Forced** — the captain or host-supervisor demands immediate halt; the engine writes a halt-witness with status `forced`; some pending work may be left mid-flight (recoverable via reconciliation on next boot).
- **Crashed** — the engine terminates abnormally (host crash, fatal engine error); no halt-witness is written; the system-state-on-disk reflects whatever was flushed to disk before crash.
  Next boot reconciles via the log.

The system's audit-trail covers all three; the halt-mode is itself a system cell.

## Halting and substrate-purity

Halting preserves substrate-purity: the JSONL log is durable across the halt; the system-state at halt-moment is the system-state at next boot's start (modulo any out-of-band edits between halt and next boot).
Replay reproduces the same halt-state given the same pre-halt log.

## Halting and services

A graceful halt walks the service-graph in reverse-dependency order: dependent services halt first, then their dependencies.
Each service's halt is a substrate-witness (and the service's host-supervisor is informed).
Forced halts skip the order, terminating services as quickly as possible; crashes leave services in undefined states (the next boot's reconciliation handles them).

## Halting authority

Halting requires authority to halt.
Typically captain-level or administrator-level; ordinary agents cannot halt the instance they're part of.
The halt-authority check happens before the halt-sequence starts; unauthorized halt-attempts produce audit-rejected witnesses rather than actually halting.

## What this morphism does not specify

- The graceful-halt timeout.
  How long the engine waits for services to halt cleanly before forcing them.
  Per-deployment configurable; partly settled.
- Mid-tick halt discipline.
  When halt fires mid-tick (mid-settling), the next-boot reconciliation must complete the partial work; the discipline is partly settled.
- Halt-and-snapshot.
  Whether halt can produce a snapshot-image rather than just leaving the polity-as-it-is; open.
