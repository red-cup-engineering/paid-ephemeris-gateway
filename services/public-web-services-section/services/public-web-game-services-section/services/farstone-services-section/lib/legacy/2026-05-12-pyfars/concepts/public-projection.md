---
type: concept
class: rendering-relation
status: draft
depends-on: [projection, public-fiber, substrate]
---

# Public projection

The role [projection](projection.md) plays when its source is restricted to the [public fiber](../objects/public-fiber.md): rendering of system state for *unauthenticated* readers.
A public projection is what an anonymous web visitor sees; what a stranger learns about the polity from any of its public-facing surfaces; what no-credential observation can extract.

Public projections are projections in the sense of [`projection`](projection.md) — passive, lossy, multiple — with the additional discipline that their source is the public fiber, not the full substrate.
A homepage is a public projection.
A `/api/health` response (which exposes no substrate beyond "the service is up") is a degenerate public projection.
An RSS feed, an OpenGraph card, a public OAuth metadata endpoint — all public projections.

## What public projections commit to

A morphism $\pi^{\mathrm{pub}}: F^{\mathrm{pub}} \to T$ to a transport $T$ is a public projection if and only if:

1. **Source is $F^{\mathrm{pub}}$.** The projection reads only public-fiber cells.
  Reading a non-public cell during projection is a substrate-purity violation.
2. **No information leakage.** The transport-rendered output does not enable reconstruction of any non-public cell.
  This is stronger than "the output references only public cells" — it forbids derivable inferences from the output back to non-public cells.
3. **Audit-traceable.** Each cell in the rendered output traces to a public-fiber cell, which traces to a public-licit declaration witness.
  The audit chain runs from rendered-byte to the system-truth without gaps.

Property 2 is the substantive commitment.
A naive projection might satisfy "source is public-fiber" while leaking private information through metadata, error messages, timing channels, or aggregate statistics.
The public-projection discipline forbids these leaks.

## Public vs. authenticated projections

A non-public projection — what an authenticated principal sees — is not a public projection.
It is composed from a *richer* fiber that includes the principal's user-account predications and granted-profile-licit cells.
The authenticated fiber strictly contains the public fiber: every public cell remains visible to authenticated principals, plus more.

The relationship between public and authenticated projections is: authenticated = public ⊕ user-account-fiber ⊕ granted-profile-fiber.
The composition is per the [view-as-fiber-composition](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/interactive-application-platform/) upstream.
Public projection is the *base case* of view composition — the smallest fiber a viewer can have.

## Public projections across transports

The same public-fiber may project to different transports:

- **HTTP/HTML** — `render-as-http-response` produces an HTML page (the homepage).
- **HTTP/JSON** — a public-JSON endpoint produces a structured projection of the same fiber.
- **RSS/Atom feed** — a sequence-projection of recent public events.
- **MCP tools** — read-only tools exposed publicly (today, MCP tools require authentication — this is a tightening, not a public-projection).
- **Static export** — a snapshot rendering for offline consumption.

Different transports have different expressivity.
The public fiber is the same; the projection-into-transport selects what's expressible.

## Public projection and substrate purity

Public projections are pure (read-only on substrate) per the inherited discipline of [render](../morphisms/render.md).
They produce rendered output without writing system cells.
The serving of a public projection is a system read; the *consumer's* request is recorded as an event (visit-witness), but the projection itself adds no cells.

## Why this concept matters

Without a precise public-projection concept, "what the homepage shows" is ambiguous.
With it, the homepage's content is a function of: 1.
The polity's declared public-licit cells.
2.
The public closure-rule-system.
3.
The render-as-http-response morphism's discipline.

Each component is theorized, audited, revisable.
The captain doesn't have to decide "what should the homepage show" each time content changes; the captain decides what's public-licit, the system's closure derives the public fiber, the render morphism produces the page.
Decisions live at the level of public-licit cells, not page templates.

## Open structural questions

- Whether public-projection composes with caching transparently (the cache holds rendered output; invalidation depends on system change detection).
- The handling of "would-be public" cells — cells that *could* be public-licit but aren't yet declared.
  Whether the homepage should hint at their existence or stay silent.
- Whether public-projection is the right scope for cross-polity federation.
  A federated public-projection composes public-fibers from multiple polities; this concept doesn't yet address that.
