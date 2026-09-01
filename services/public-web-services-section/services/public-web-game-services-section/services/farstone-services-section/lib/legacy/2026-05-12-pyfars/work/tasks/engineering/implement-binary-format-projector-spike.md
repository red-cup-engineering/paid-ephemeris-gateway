---
title: "Implement a binary-format projector spike (capnp/protobuf)"
type: task
area: engineering
status: open
horizon: later
milestone: m11-assurance-audit-chain-export
goal: polyglot-source-projectors
depends-on: [finalize-projector-protocol-as-adjoint-pair]
requires-capabilities: [code-authoring, schema-handling]
theory-basis: [projector-framework-counit]
---


## Description

Spike a projector for one binary format (Cap'n Proto OR Protobuf, captain to choose) to verify the projector framework handles non-text formats.
The spike's goal is to find the friction points: how does the framework's `Substrate` type accommodate binary fields?
Does the counit law hold under binary-canonical-form requirements?
Are there transport-layer concerns when a binary field is shipped through a federation envelope?

This is *exploration*, not production work.
The spike produces a working projector for one format plus a written finding (substrate-cell or markdown record) describing what worked, what didn't, and what the next step would be for a production binary-format projector framework.

Per the [substrate-algebra question](../../questions/substrate-algebra-closure-and-replay.md), all substrate content has a canonical form; the spike tests whether binary-format canonical forms compose with the projector framework's existing canonicalization discipline.

## Acceptance

- [ ] One binary-format projector implemented (capnp OR protobuf, captain-chosen).
- [ ] Projection of a fixture binary file produces a deterministic cell-set.
- [ ] Rendering reconstructs the binary file; counit-law property test passes (or fails, with documented reason).
- [ ] A finding record at `governance/findings/binary-format-projector-spike-<date>.md` documents what worked, what didn't, and recommended next steps.

## Progress cells

*(empty — task not yet started)*
