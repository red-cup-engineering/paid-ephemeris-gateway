---
title: "Implement the federation cycle as a recurrent practice"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: federation-envelope-wire-transport
depends-on: [implement-admit-federation-envelope-endpoint]
requires-capabilities: [python-editing, recurrent-practice-implementation]
theory-basis: [recurrent-practice, federation-by-value-domain-join]
---


## Description

Author `work/recurrent-practices/federation-cycle.md` declaring the practice's cadence (e.g., per-minute when peers exist; never when no peers), aggregation (Markov per-peer; finite-history if cross-peer state is needed), constituent rules.

Implement the supervisor for the cycle: at the declared cadence, walk peer records; for each peer, call `emit-federation-envelope` to produce an envelope, push it via HTTP to the peer's address, await the response, then call `admit-federation-envelope` for any envelope received in the same exchange (or pull on next cycle).

## Acceptance

- [ ] [`work/recurrent-practices/federation-cycle.md`](../../recurrent-practices/) exists, theory-grounded.
- [ ] The supervisor (in `runtime/lifecycle.py` or a sibling) fires the cycle at cadence.
- [ ] Per-cycle witnesses: cycle-id, peers-contacted, cells-emitted, cells-admitted, $\top$-cells-produced.
- [ ] HTTP failures don't crash the engine; failed peers retry next cycle (per the at-least-once delivery discipline).
- [ ] Tests cover: cycle with no peers (no-op), cycle with one healthy peer (round-trip envelope), cycle with one unreachable peer (witness, no crash, retry next cycle).

## Progress cells

*(empty — task not yet started)*
