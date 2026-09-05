---
title: "Content-hash addressing for substrate notes"
type: goal
milestone: m6-federation
status: open
horizon: captured
theory-basis: [content-hash-addressing, sovereign-node]
tasks:
  - implement-content-hash-derivation-for-substrate-notes
  - extend-substrate-index-to-key-by-content-hash
  - emit-content-hash-cells-on-substrate-write
---


After this goal, every substrate note has a canonical content hash; the hash is the stable identifier across hosts (paths are local).
Two engines holding the same note (with the same content) compute the same hash; merging across engines uses the hash as the join key.

## Why

[M6](../milestones/m6-federation.md) federates across hosts that have *different filesystem paths* for the same conceptual record.
`vps-mini-cold-red-gate`'s `/var/cells/<X>` is `loc-lap-bare-cedar-fog`'s `/home/emsenn/.
561/<X>`.
Without a content-derived identifier, federation cannot match records across hosts; it would have to negotiate a path-mapping per peer.

Content-hash addressing makes the records **globally identifiable**.
Each engine computes the same hash for the same content; the hash is the substrate-level join key.

## Theory grounding

**1.
Content-hash-addressing as substrate identity** ([`flatfile-agentic-resource-system/concepts/content-hash-addressing`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/content-hash-addressing.md)). **Notes are globally identifiable; paths stay local.** Content-hash addressing makes the substrate addressable without coordinating a global namespace.
Federation can occur between engines that have different layout conventions because the hash is the same.

**2.
Sovereign-node** ([`flatfile-agentic-resource-system/concepts/sovereign-node`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/sovereign-node.md)).
Each engine is a sovereign node; federation is between sovereigns, not under a central coordinator.
Content-hash-addressing enables sovereign federation: each node maintains its own paths; cross-node merge happens via hash.

### Design constraints from this grounding

- **The hash is over canonical-form content, not raw bytes.** YAML frontmatter has multiple valid representations (key ordering, whitespace); the canonical form is what's hashed.
  This guarantees two engines hash the same record identically even if their authoring tools differ.
- **The hash is deterministic and replay-stable.** Re-deriving the hash from the same canonical content produces the same hash.
  This is what makes federation verifiable: a peer can confirm "I have the record with this hash" without exchanging content.
- **Hash collisions are vanishingly improbable but must be defensible.** Use a sufficient hash (SHA-256 or BLAKE3 variant); document the choice in the spec.

## Acceptance

- [ ] Every substrate note has a `content-hash:` cell derived from its canonical content.
- [ ] The hash derivation is documented (which canonical form, which hash algorithm).
- [ ] The substrate index keys notes by content-hash in addition to slug/path.
- [ ] Two engines with the same authored content produce the same content-hash; verified by a cross-engine test (or simulated cross-engine in CI).
- [ ] Hash re-derivation is replay-stable.
