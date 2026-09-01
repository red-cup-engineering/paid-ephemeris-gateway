---
type: index
class: channel-registry
status: draft
---

# Channels

Substrate-resident named routing conduits.
Each channel hosts an ordered stream of [messages](../../concepts/message.md); subscribers listen on a channel and receive arrivals as substrate witnesses.

This directory holds two related groups:

## The seven operation-typology channels

Per [`operation-kinds-completeness`](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/) (AOP), every witness is tagged with one of seven kinds — these doubling as the canonical channels every PyFARS deployment carries:

- [`observation`](observation.md) — records what happened
- [`guard`](guard.md) — produces an admissibility value
- [`accounting`](accounting.md) — updates a ledger predication
- [`query`](query.md) — read-only; well-disciplined queries emit no witnesses
- [`mutation`](mutation.md) — transforms system state
- [`analysis`](analysis.md) — composed query producing aggregate output
- [`learning`](learning.md) — edits the system's own closure-rule system

Witness records reference these by slug in their `channel:` field.
They are realized as full system records here so the substrate validator and projector can recognize them.

## Messaging channels

Polities author additional channels per their messaging needs: work-queue, audit, inter-office, external-bridge, coordination, and others.
Those records live alongside the seven canonical ones, distinguished by `kind:` (anything other than `operation-typology`).
