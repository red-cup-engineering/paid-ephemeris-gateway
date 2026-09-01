---
type: morphism
class: projection-morphism-specialization
status: draft
depends-on: [render, projection, public-fiber, substrate, handle-request, emit-response, endpoint]
realizes: [render, emit-response]
---

# Render as HTTP response

The render specialization that takes a [public-fiber](../objects/public-fiber.md) (or a richer view fiber for authenticated principals) and produces an HTTP response — typically with an HTML body, sometimes with JSON, occasionally with other media.
Realizes the upstream [web-server-platform](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/)'s [`handle-request`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/morphisms/handle-request.md) → [`emit-response`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/morphisms/emit-response.md) pipeline at a specific [`endpoint`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/concepts/endpoint.md) for HTML/JSON targets, with PyFARS's system as the source of response content.

This is the morphism that makes a polity's system web-readable.
It is the bridge between PyFARS's predication-cell substrate and the web's HTTP transport.
Most PyFARS web operations go through it (or a specialization thereof).

## Action

For a fiber $F$ (the public-fiber for unauthenticated requests, an authenticated fiber for principal-bearing requests), an HTTP request $\mathrm{Req}$, and target type $T$ (HTML, JSON, etc.):

$$\mathrm{render}_{HTTP}(F, \mathrm{Req}, T) \;\longrightarrow\; \mathrm{HttpResponse}$$

The response carries: - **Status code** — typically 200; 401/403 for auth-required paths invoked without credentials; 404 for paths outside the polity's exposed routes; 5xx for server errors. - **Headers** — content-type, cache-control, security headers (CSP, X-Content-Type-Options, etc.). - **Body** — the rendered fiber in $T$.

## Composition

`render-as-http-response` decomposes into:

1. **Fiber selection.** Determine which fiber to render against based on the request: public-fiber for unauthenticated, authenticated fiber for credentialed.
2. **Render to text/JSON.** Call the parent [render](render.md) with appropriate target.
3. **Wrap in HTTP response.** Add status code and headers; serialize body.

The composition is *transport-thin*: the substantive work is in the render; HTTP wrapping is bookkeeping.
This is intentional — substrate purity must be preserved across the transport boundary.

## Naturality / functoriality

`render-as-http-response` inherits naturality from [render](render.md): a closure-preserving substrate morphism $\phi: S \to S'$ commutes with render-as-http-response in the sense that $\mathrm{render}_{HTTP}(\phi(F), \mathrm{Req}, T) = \mathrm{render}_{HTTP}(F, \mathrm{Req}, T)$ with cells substituted per $\phi$.
The HTTP transport adds no system-state-modifying behavior.

This naturality is what underwrites [`render-as-http-response-is-pure`](../claims/render-as-http-response-is-pure.md): the HTTP wrapper does not violate substrate-purity.

## What this morphism does *not* do

- It does not authenticate the request.
  Authentication is a separate concern (handled by middleware in `pyfars/cli/_mcp_auth.py` and equivalent for the FastAPI app); the result of authentication — the principal, the granted-profiles — is what determines the fiber to render against, but the authentication itself is not part of this morphism.
- It does not authorize the request beyond fiber selection.
  Path-level authorization (which paths a principal can reach) is a separate gate; this morphism only selects the *fiber* to render once authorization has admitted the request.
- It does not write substrate.
  Per substrate-purity, render-as-http-response is read-only.
  The arrival of a request may cause a separate event to be witnessed (e.g., a visit-event for analytics), but that witness is independent of this morphism — it's a parallel transition, not a side-effect of rendering.
- It does not produce HTML directly from PyFARS Python.
  The HTML body is rendered via Jinja2 templates (or equivalent); the morphism wraps the template output in an HTTP response.
  Templates are themselves substrate-projecting renderers; a separate per-template discipline applies.

## Routing

Multiple paths can resolve to render-as-http-response, parameterized by: - The fiber selector (public-fiber, authenticated-fiber-for-principal-X). - The target type (HTML, JSON, etc.). - The system slug or query that determines which cells are rendered (the homepage at `/` renders polity-identity cells; `/show/<slug>` renders one note's cells; etc.).

The route table is itself system content (per the upstream web-server-platform's `endpoint-record` object).
A polity may add public routes by declaring endpoints; PyFARS's web app discovers them at startup.

## Implementation pointers

- `pyfars.web.app.build_app()` — current realization of FastAPI app construction.
- New Jinja2 templates under `pyfars/web/templates/` for HTML render targets.
- Per-route handlers in `pyfars/web/app.py` that compose fiber-selection + render + HTTP-wrap.

The current realization has *no* HTML render path beyond the existing corpus-browser SPA; the homepage practice-anchor will require adding HTML rendering capability for the public-fiber.

## Open structural questions

- Caching.
  Render-as-http-response is pure, so its outputs are cacheable; the discipline for cache invalidation (when does the system change in a way that invalidates a rendered response?) is partly settled (key by system-state-hash) and partly open (cross-request consistency).
- Streaming.
  For large fibers, streaming the response makes sense; whether the morphism's contract supports streaming or only complete-response is open.
- Content negotiation.
  When a request specifies multiple acceptable types, which target does the morphism choose?
  The web-server-platform upstream has `content-negotiation` as a concept; the PyFARS-side discipline is partly inherited, partly open.
