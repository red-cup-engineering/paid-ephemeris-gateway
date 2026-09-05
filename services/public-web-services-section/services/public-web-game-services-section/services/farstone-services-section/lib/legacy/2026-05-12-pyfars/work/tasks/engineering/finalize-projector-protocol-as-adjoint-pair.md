---
title: "Finalize the Projector protocol as an adjoint pair"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: certification-artifact-projector-framework
depends-on: []
requires-capabilities: [code-authoring, theory-derivation]
theory-basis: [projector-framework-counit]
---


## Description

Author the formal `Projector` protocol in `pyfars/projectors/protocol.py` as an adjoint pair: a `project: Substrate -> Artifact` morphism and a `render: Artifact -> Substrate` morphism, with the counit `render ∘ project ≅ id` verifiable as a property test. mypy-checkable types throughout; the protocol must be importable in any projector implementation.

Today the projector framework has many implementations (markdown, JSON, the existing certification-aspirational projectors) but no formal protocol — each implementation reinvents the shape.
The protocol crystallizes the discipline and gives subsequent projectors (polyglot source, certification artifacts, materialized views) a single contract.

Per the [substrate-algebra question](../../questions/substrate-algebra-closure-and-replay.md) and [`materialized-view-record`](../../objects/materialized-view-record.md), the projector protocol is what makes views, exports, and substrate-content all uniformly substrate-derived rather than each one re-implementing a custom pipeline.

## Acceptance

- [ ] `pyfars/projectors/protocol.py` declares `Projector` as a `typing.
  Protocol` with `project` and `render` methods.
- [ ] Protocol carries explicit `Substrate` and `Artifact` type variables.
- [ ] Per-projector implementations re-declare conformance via `@runtime_checkable` or static check.
- [ ] mypy passes on the protocol module with `--strict`.
- [ ] A reference implementation (the existing markdown projector) is ported to declare protocol conformance.

## Progress cells

*(empty — task not yet started)*
