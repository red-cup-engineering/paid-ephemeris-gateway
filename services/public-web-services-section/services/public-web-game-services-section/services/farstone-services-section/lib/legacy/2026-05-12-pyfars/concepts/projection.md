---
type: concept
class: rendering-relation
status: draft
depends-on: [substrate, predication-cell]
---

# Projection

A morphism from [substrate](substrate.md) state to a transport-readable rendering.
Projections produce the artifacts humans and external systems read: markdown notes, JSON-API responses, HTML pages, MCP tool listings, BibTeX exports, monograph documents.
Each rendering is a projection; the system is the source.

## Projections preserve substrate, with information loss

A projection $\pi: \mathrm{Substrate} \to T$ to a transport $T$ produces an artifact in $T$ that *agrees with* the substrate in the cells $T$ is capable of expressing.
Different transports are capable of different things: - Markdown can express prose, structured data via frontmatter, links between documents. - JSON can express arbitrary nested structure but not narrative prose. - HTML can express markdown plus interactive elements. - A BibTeX file can express only bibliographic structure.

Information not expressible in $T$ is *lost* in the projection — projections are rarely lossless.
A markdown note's frontmatter and body are projections of the system cells about that entity; cells about the entity that aren't expressible in markdown's frontmatter+body shape (e.g., the rich edge metadata, or speculative cells with paraconsistent values) don't appear in the markdown projection.

This loss is acceptable because the substrate (and the canonical event log) carry the full state.
Projections are *renderings for a purpose*, not authoritative replicas.

## Multiple projections, no canonical surface

PyFARS supports multiple projections of the same system state.
The same cell $(\text{task-42}, \text{assigned-to}, \text{agent-x})$ may be projected: - As a line in `task-42.md`'s frontmatter: `assigned-to: agent-x`. - As a JSON field in `/api/show/task-42`'s response. - As a row in a dispatch-board HTML view. - As an MCP tool result if `intents` is queried.

None of these projections is *the* projection.
Each is a rendering for its target transport.
The system is the truth; the renderings agree with the truth on the cells they can express.

## Projection vs. transformation

A projection is *passive*: it reads system state and produces a rendering, without modifying substrate.
A *transformation* writes back.
PyFARS's [render](../morphisms/render.md) morphism family is projection-only by commitment.
Verbs that *modify* substrate (queue-intent, witness, dispatch) are not projections; they're system transitions, recorded as JSONL events.

This distinction matters for substrate purity: projections cannot violate it because they don't write.
Transformations can violate it if they write to the system without producing a corresponding event.
PyFARS commits that no transformation does the latter — see [`substrate-purity`](../claims/substrate-purity.md).

## What this concept does not specify

- The full taxonomy of PyFARS projections.
  The realization keeps adding them (each new harness adds a new projection target).
  The concept stays open-ended.
- The agreement conditions formally. *Agreement* on a cell-by-cell basis is what a projection commits to; the formal definition routes through the upstream notion of [predication-fiber](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) and the projection's chosen sub-fiber.
