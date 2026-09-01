---
title: "Implement peer record loading into the engine"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: peer-records-and-trust-levels
depends-on: [author-peer-record-type]
requires-capabilities: [python-editing, projector-framework]
theory-basis: [sovereign-node]
---


## Description

The boot phase's substrate projector must load peer records and make them available to the federation cycle.
Implement:

1. A `runtime/peer_loader.py` that reads `governance/peers/` and produces `PeerRecord` objects.
2. The federation cycle (next goal's territory) consults this list to decide who to send envelopes to and who to admit envelopes from.
3. Peer record validation: a malformed peer record produces a $\top$ cell on its predicate; the federation cycle treats it as inactive.

## Acceptance

- [ ] `runtime/peer_loader.py` exists.
- [ ] Boot loads peer records into the engine state.
- [ ] Validation rejects: missing sovereign-id, missing addresses, invalid trust-level, malformed sync-scope.
- [ ] Tests cover: well-formed peer records load successfully, malformed records produce $\top$, no peers (empty federation) is a valid no-op state.

## Progress cells

*(empty — task not yet started)*
