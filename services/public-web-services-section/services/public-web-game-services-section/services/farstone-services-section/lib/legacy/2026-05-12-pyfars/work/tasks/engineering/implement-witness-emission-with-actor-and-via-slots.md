---
title: "Implement witness emission with bifurcated actor/via slots"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: signed-witness-chain-for-inbound-work
depends-on: []
requires-capabilities: [python-editing, witness-emission, signing-keys]
theory-basis: [witness-chain-bifurcation, first-class-provenance]
---


## Description

Extend the runtime's witness-emission API to accept a `via:` parameter naming substrate-foreign participants.
The witness shape:

```python
class Witness:
    actor: str           # SUBSTRATE-NATIVE: an office or in-process agent slug
    via: Optional[str]   # SUBSTRATE-FOREIGN: cloud agent id, LLM endpoint slug, etc.
    consequent: ...      # the substrate cells or projection the act produced
    signature: bytes     # signed by `actor`'s key, NEVER by `via`
    rsv_hash: str
```

The signing logic:

1. Look up the actor's signing key (from substrate's office or agent records).
2. Sign the witness body (canonical-form serialization of actor + via + consequent + rsv_hash).
3. Reject emission if actor isn't a substrate-loaded office or in-process agent.
4. Reject emission if a `via:` is provided for an in-process call (in-process has no via — the actor is sufficient).
5. Reject emission if a `via:` is missing for an inbound or outbound boundary-crossing call (every boundary call must name its via).

This task is foundational for both M7 (outbound, via=endpoint) and M8 (inbound, via=cloud agent).
It centralizes the bifurcation discipline so neither milestone has to re-implement it.

## Acceptance

- [ ] Witness-emission API accepts `via:` parameter.
- [ ] Actor is signature-verified against substrate; non-substrate-native actors are rejected.
- [ ] Via slot accepts substrate-foreign identifiers without trying to verify their signing.
- [ ] In-process calls (no via): no `via:` cell emitted.
- [ ] Inbound/outbound calls (boundary-crossing): `via:` is required, missing produces $\top$.
- [ ] Tests cover: in-process witness, outbound witness with endpoint via, inbound witness with cloud-agent via, forbidden patterns (cloud agent in actor; missing via on boundary call).
- [ ] Replay determinism: signing produces the same signature for the same canonical input.

## Progress cells

*(empty — task not yet started)*
