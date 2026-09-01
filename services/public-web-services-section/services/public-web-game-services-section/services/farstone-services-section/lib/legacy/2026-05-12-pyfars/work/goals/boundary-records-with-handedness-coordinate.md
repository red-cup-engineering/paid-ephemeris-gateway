---
title: "Boundary records with handedness coordinate"
type: goal
milestone: m7-boundary-handedness-and-outbound-endpoints
status: open
horizon: captured
theory-basis: [boundary-as-fiber, swarm-participation-handedness]
tasks:
  - author-boundary-record-type
  - extend-boundary-fiber-composition-to-accept-handedness
  - migrate-existing-boundary-references-to-explicit-handedness
---


After this goal, every boundary in the substrate is a record at `governance/boundaries/<slug>.md` carrying an explicit `handedness:` field of value `inbound-only`, `outbound-only`, or `bidirectional`.
The boundary fiber's composition is updated to accept the new coordinate; existing boundary references migrate to explicit handedness.

This is the foundational goal of [M7](../milestones/m7-boundary-handedness-and-outbound-endpoints.md) — without explicit handedness, the FARS [`swarm-participation-handedness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md) question stays open, and downstream goals (LLMEndpointRecord, MCP-client-as-swarm-participant) can't compose into the same algebra.

## Why

The captain's described swarm has three participation classes with structurally different handedness across the substrate's boundary:

- **Self-hosted FARS sovereign node**: bidirectional.
  Acts on its own substrate; participates in confederation as a federation peer; acts on other nodes' substrates via federation envelopes.
- **MCP/A2A-client cloud agent**: inbound-only.
  The swarm exposes endpoints; the client dials in.
- **Routable LLM endpoint**: outbound-only.
  The swarm dispatches to the endpoint; the endpoint never initiates.

None of `identity + office + location + mode + scope-policy` (the existing boundary-fiber coordinates) is *directional*.
Without an explicit handedness coordinate, the substrate cannot distinguish "this boundary admits work-from" vs "this boundary dispatches work-to" — a distinction that gates whether the closure-rule machinery for inbound admission or outbound dispatch fires.

## Theory grounding

**1.
Boundary-as-fiber decomposition** ([`flatfile-agentic-resource-system/narratives/boundary-as-fiber`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/narratives/) — when authored).
The boundary fiber composes from `identity + office + location + mode + scope-policy`. **The decomposition is what enables substrate-readable boundary semantics.** This goal extends the composition with a sixth coordinate (handedness); the existing five remain.

**2.
Handedness as a property of the boundary, not the actor** (per the [`swarm-participation-handedness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md) question's third candidate reading). **Each boundary substrate-record carries a fixed handedness; an actor's role at that boundary is determined by which boundary they cross.** A sovereign node has a boundary-pair (one inbound, one outbound) for each peer; an MCP-server endpoint has only an inbound boundary; an LLM-endpoint has only an outbound boundary.
This is the cleanest reading because it puts handedness on the substrate-record itself, not on the fiber composition's per-actor instantiation.

**3.
Per-handedness operation typing** (from the FARS *Harness surfaces & interfacers* spec section).
The interfacer operations (`extract`, `apply`, `compose`) are typed differently depending on the boundary's handedness:

- *Inbound-only*: `extract` is substantive (parse incoming request → predications); `apply` is response-shaped; `compose` is response-fan-out.
- *Outbound-only*: `apply` is substantive (project request from predications → outbound call); `extract` is response-parsing.
- *Bidirectional*: all three are substantive; the counit law constrains round-trip composition.

The handedness coordinate makes this typing substrate-readable rather than implicit in code.

### Design constraints from this grounding

- **Handedness is a frontmatter cell, not a path convention.** The boundary record's `handedness:` cell is what the dispatch graph and admission rules read.
  Putting handedness in the directory path (e.g., `governance/boundaries/inbound/`, `governance/boundaries/outbound/`) is wrong — the directory schema's recursive principle means structure shouldn't carry semantic data the closure rules need.
- **Each boundary has *one* handedness.** A boundary-pair between peers (inbound + outbound) is *two* boundary records, not one bidirectional record with two endpoints.
  The bidirectional case is a sovereign-node-pair where each side records its own boundary.
- **Existing boundary references migrate before downstream goals begin.** If [`runtime/boundary.py`](runtime/boundary.py) (or equivalent) currently treats boundaries as path-based or implicit, the migration to explicit handedness happens here, not later.

## Acceptance

- [ ] A `boundary` record type exists at `governance/templates/boundary.md` with the canonical frontmatter shape (including `handedness:`).
- [ ] [`governance/specifications/directories.md`](../../governance/specifications/directories.md) names `governance/boundaries/` (already added).
- [ ] [`governance/conventions.md`](../../governance/conventions.md) declares the boundary record's frontmatter shape with `handedness` as a required field.
- [ ] The boundary fiber composition (in code or theory) accepts a sixth coordinate; tests verify all three handedness values produce well-typed fibers.
- [ ] All existing boundary references in PyFARS source migrate to explicit handedness (audit by grep; produce a [finding](../findings/_index.md) record for any boundary-shaped code currently lacking explicit handedness).
- [ ] At least one example boundary of each handedness is authored under `governance/boundaries/` for testing.
