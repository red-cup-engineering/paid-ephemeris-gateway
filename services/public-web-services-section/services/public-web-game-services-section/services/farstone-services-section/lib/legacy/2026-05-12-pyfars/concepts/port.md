---
type: concept
class: system-boundary
status: draft
depends-on: [substrate, channel, observation, witness]
---

# Port

A substrate-recordable interface point between PyFARS's substrate-purity-discipline and an external system.
A port is where substrate-internal events are exposed to (or events from outside are received from) systems outside the polity's system.

Ports are how PyFARS preserves substrate-purity at its boundaries.
Without ports, the polity could neither receive external input nor produce external output.
With ports, every cross-boundary act has a system-side record: an inbound event lands at a port and produces an [observation](observation.md) of what arrived; an outbound act leaves through a port and produces a [witness](witness.md) of what was sent.

## What a port has

A port is a substrate entity (a `kind: port` record, or a port-shaped object such as a [channel](../objects/channel.md) configured for external bridging) carrying:

1. **An identity** — a stable name for this port.
2. **A direction** — inbound (events arrive from outside), outbound (events depart to outside), or bidirectional.
3. **A protocol** — what shape the external interaction takes (HTTP, file-system-read, OS-signal, MCP tool-call, git-hook-invocation, etc.).
4. **A bridging-discipline** — how cross-boundary acts are recorded as substrate witnesses: schemas for the bridging-witness, retention-discipline, error-handling.
5. **An access-policy** — which agents can interact with this port (system-side); which external principals can access it (external-side, where applicable).

## Ports preserve substrate-purity

The discipline: every substrate-affecting act crossing the port is *witnessed at the port*.
Inbound: arriving events are recorded as observations of "we received this from outside at moment $\tau$."
Outbound: departing events are recorded as witnesses of "we emitted this to outside at moment $\tau$."

This means the system's audit-trail is complete with respect to external interaction: replay reproduces the *recorded* observations of external events (not the external events themselves), and reproduces the *witnessed* outbound acts.

## Port subtypes

Ports specialize by direction and trigger-shape:

- **[Hook](hook.md)** — an inbound event-driven port.
  External event fires; the hook is the system-side response-point.
- **Endpoint** — typically a request-response port (an [endpoint](endpoint.md) is one of the agent-forms; in port terms, an endpoint is a specialized port hosting agent-shaped responses to external requests).
- **Bridge channels** — channels configured for external messaging (e.g., HTTP-bridged channels, email-bridged channels).
  Bridge channels are ports with channel-semantics.
- **Outbound emitters** — ports that only emit (one-way notifications, telemetry exports).

Other subtypes admissible; the catalogue is open.

## Ports vs. channels

Distinct concepts:

- A **channel** is substrate-internal: messages on a channel are between PyFARS-internal agents.
- A **port** is substrate-bridging: it interfaces with something outside.
- A **bridge channel** is a channel *configured* as a port — system-side it looks like a channel; external-side it interfaces with a non-substrate system.

A pure substrate-internal channel is not a port.
A port is not necessarily channel-shaped (it could be request-response, signal-driven, or polling).

## What this concept does not specify

- The complete protocol catalogue.
  New protocols added per polity needs.
- Port reliability / retry semantics.
  Per-port-kind currently.
- Port authentication.
  External access policies are partly settled.
- Port-to-port composition.
  Whether a port can chain to another port (proxying) — partly settled.
