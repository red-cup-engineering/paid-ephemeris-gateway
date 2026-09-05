---
type: definition
class: public-view
status: draft
realizes: [public-projection]
depends-on: [public-fiber, public-projection, render-as-http-response, polity, substrate]
---

# Polity homepage

The polity's primary public projection at the substrate-root URL — the HTML page served at `https://<polity-domain>/` to unauthenticated visitors.
Realizes the [public-projection](../concepts/public-projection.md) concept as the specific top-level view a polity exposes to anonymous readers.

For the 561 polity, the polity-homepage is what's served at `https://561.group/`.
For another polity running PyFARS, it would be that polity's domain root.
PyFARS-the-package commits to the polity-homepage *shape* — its derivation from the public-fiber, its projection-target (HTML), its naming-by-convention at the root URL — without prescribing the per-polity content.

## Data

A polity-homepage $H$ for a polity $P$ at time $\tau$ is

$$H(P, \tau) \;=\; \mathrm{render}_{HTTP}\big(F^{\mathrm{pub}}_P(\tau),\; \mathrm{Req}^{\mathrm{root}},\; \mathrm{HTML}\big)$$

where:

- $F^{\mathrm{pub}}_P(\tau)$ is the polity's [public fiber](public-fiber.md) at time $\tau$.
- $\mathrm{Req}^{\mathrm{root}}$ is an HTTP request to the substrate-root URL of the polity's domain.
- $\mathrm{HTML}$ is the HTML target of [render-as-http-response](../morphisms/render-as-http-response.md).

The polity-homepage is the function-application of render-as-http-response to the public fiber at the root URL.
There is no separate "homepage data" beyond the public fiber; the homepage is a render of the fiber, no other content.

## Notation

For polity $P$, we write $H_P$ for the polity-homepage when the time is fixed by context. $H_P(\tau)$ when the time matters (e.g., to discuss how the homepage changes as substrate evolves).

## What this object commits to

1. **Derivation from public-fiber.** The homepage's content comes from the public fiber and only from it.
  Cells outside the public fiber do not appear in the homepage.
  This is the load-bearing commitment that makes the homepage's privacy story tractable.
  See [`homepage-derives-from-public-fiber`](../claims/homepage-derives-from-public-fiber.md).
2. **Substrate-purity preserved.** Serving the homepage does not modify the system.
  A request for the homepage is a system read; the request itself may be witnessed (analytics), but the witness is independent of the homepage object and rendering.
3. **Determinism modulo substrate.** Two requests for the homepage against the same system state produce the same response (modulo time-varying fields like timestamps in headers).
  The homepage is a function of system state, not of session state, request order, or agent context.
4. **Static-fallback compatible.** When PyFARS is unavailable (the substrate-serving service is down), the polity's web infrastructure (typically nginx) serves a static-fallback page.
  The fallback is *not* the homepage object — it is a degraded surface for outages — but the polity-homepage's existence does not preclude the fallback.

## What this object does *not* commit to

- The specific HTML structure.
  Different polities may render their public-fiber to different HTML shapes (a status-dashboard layout, a marketing-style layout, a minimal text layout).
  PyFARS-the-package provides default Jinja2 templates; polities can override.
- The specific cells in the public fiber for any polity.
  That's a governance decision per polity.
- The rendering of authenticated principals' richer fibers.
  That is `view-composition-for-authenticated-principals`, a separate (and later) object.
- The cross-polity case.
  A homepage for a federation of polities is out of scope for this object.

## Distinguishing from related objects

- **The static fallback** (`/var/www/<domain>/index.html` or equivalent) is *not* the polity-homepage.
  It's a degraded-mode surface served by web infrastructure when PyFARS is unavailable.
  The polity-homepage is the substrate-derived, PyFARS-served version.
- **A web-server-platform endpoint-record** for `/` is not the polity-homepage.
  The endpoint-record is the system-side declaration that a route exists; the polity-homepage is the rendered response that route produces.
- **The corpus-browser SPA** at `/` (in the existing PyFARS web app, before web-slice work lands) is not the polity-homepage.
  It exposes system cells beyond the public fiber and is intended for developer/agent introspection, not for unauthenticated visitors.

## Boundary case: the empty public-fiber polity

A polity that has declared no cells public-licit has an empty public fiber.
The polity-homepage for that polity renders to an essentially-empty HTML page (just the polity's name, served from the captain's identity cells if those are public-licit, or nothing at all if not).
This is structurally honest — a polity that has chosen not to declare anything public has nothing public to show.
The render produces a page; the page is mostly empty; that's the truth of the polity's stance.

## Implementation pointers

The polity-homepage is currently *not yet implemented* in PyFARS code.
Implementing it requires (per [`deriving-practice-anchor-from-self-theory`](../../governance/skills/deriving-practice-anchor-from-self-theory.md)):

- A `public-licit` predicate added to the system's vocabulary.
- A subset of system cells declared public-licit by the captain (the 561 polity's first set of public commitments).
- A `render-as-http-response` route at `/` that selects the public-fiber and renders to HTML.
- A Jinja2 template in `pyfars/web/templates/` for the polity homepage layout.
- The static fallback in nginx config pointing to the existing `/var/www/561.group/` content for outage handling.

## Open structural questions

- The choice of homepage layout for the 561 polity specifically.
  The captain has indicated a "status dashboard that happens to be our homepage" framing; the layout discipline that realizes this isn't yet specified.
- The handling of homepage updates over time.
  As the public-fiber evolves (new public-licit cells settle), the homepage changes.
  Whether to record homepage-render-events (for caching, for archival) is a follow-up question.
- The relationship to the existing static `index.html`.
  After the polity-homepage is implemented, does the static page get retired, become the fallback, or co-exist for some time?
  A migration discipline is open.
