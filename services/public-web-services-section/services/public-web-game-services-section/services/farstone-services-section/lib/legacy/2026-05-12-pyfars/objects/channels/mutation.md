---
type: object
class: channel
status: draft
name: Mutation
kind: operation-typology
emit-policy: any
read-policy: any
retention: durable
ordering: total
depends-on: [channel, witness]
---

# Mutation channel

The *admit-and-settle* step that transforms system state.
The most common kind; the default for operators that don't classify themselves explicitly.

Examples: substrate-record edits (frontmatter changes, body replacements), insertions, retractions, relocations, federation-cell merges.

Every mutation witness carries before-hash and after-hash so an auditor can replay the transformation.
The mutation kind's audit discipline is *hash continuity*: every cell change has a witnessed predecessor.
