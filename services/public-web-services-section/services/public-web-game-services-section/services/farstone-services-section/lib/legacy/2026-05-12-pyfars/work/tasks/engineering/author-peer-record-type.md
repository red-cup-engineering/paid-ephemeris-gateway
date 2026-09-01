---
title: "Author the peer record type"
type: task
area: engineering
status: open
horizon: captured
milestone: m6-federation
goal: peer-records-and-trust-levels
depends-on: [publish-fars-federation-spec-as-rfc]
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [sovereign-node, jurisdiction]
---


## Description

Add a `peer` record type to the substrate.
Frontmatter:

```yaml
---
title: "<peer-name>"
type: peer
slug: <kebab-case>
status: active | suspended | retired
sovereign-id: <content-hash-of-peer-charter>
addresses:
  - <https-or-onion-or-other-url>
trust-level: full | scoped | observer
sync-scope: <cell-pattern-or-predicate-list>    # what predicates federate
mutual: true | false                             # is the peer expected to also have a peer record for us
last-cycle-at: <ISO-timestamp>
last-cycle-rsv-hash: <hash>                      # for replay correctness across federated engines
---
```

Add `governance/peers/` to [`governance/specifications/directories.md`](../../../governance/specifications/directories.md).
Add a template at `governance/templates/peer.md`.
Add the trust-level norms (full, scoped, observer) at [`governance/norms/`](../../../governance/norms/_index.md).

## Acceptance

- [ ] [`governance/specifications/directories.md`](../../../governance/specifications/directories.md) includes `governance/peers/`.
- [ ] [`governance/conventions.md`](../../../governance/conventions.md) declares the peer frontmatter shape.
- [ ] `governance/templates/peer.md` exists.
- [ ] Three trust-level norms exist under [`governance/norms/`](../../../governance/norms/_index.md).
- [ ] One example peer record is authored (perhaps `loc-lap-bare-cedar-fog` from `vps-mini-cold-red-gate`'s perspective) for end-to-end testing.

## Progress cells

*(empty — task not yet started)*
