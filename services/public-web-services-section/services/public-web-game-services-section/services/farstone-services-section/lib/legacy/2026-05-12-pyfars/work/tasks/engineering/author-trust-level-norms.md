---
title: "Author trust-level norms"
type: task
area: governance
status: open
horizon: captured
milestone: m6-federation
goal: peer-records-and-trust-levels
depends-on: [author-peer-record-type]
requires-capabilities: [norm-authoring]
theory-basis: [norm, jurisdiction]
---


## Description

For each trust level (`full`, `scoped`, `observer`), author a [norm](../../../governance/norms/_index.md) record explaining the deontic content:

- **full-trust** (Per): the peer's writes federate fully into the local substrate, modulo same-charter compatibility.
- **scoped-trust** (Per/Proh combo): the peer's writes within sync-scope are admitted; outside, they're refused (Proh) and surface as ultra-vires-from-peer witnesses.
- **observer** (Proh): the peer receives federation envelopes but cannot author cells that the local engine accepts.
  The local engine's writes propagate to the observer; the observer's writes never propagate back.

Each norm has authority-grounding back to [Charter](../../../governance/charter.md) C4 (federation by value-domain join).

## Acceptance

- [ ] [`governance/norms/full-trust-peers.md`](../../../governance/norms/), [`governance/norms/scoped-trust-peers.md`](../../../governance/norms/), [`governance/norms/observer-peers.md`](../../../governance/norms/) exist.
- [ ] Each norm cites the trust-level it formalizes.
- [ ] Each norm names the failure-witness emitted on violation (typically ultra-vires-from-peer).

## Progress cells

*(empty — task not yet started)*
