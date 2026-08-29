---
type: claim
status: draft
depends-on: [polity-homepage, public-fiber, public-projection, render-as-http-response, substrate-purity]
---

# The polity homepage derives from the public fiber

**Claim.** For any polity $P$ running PyFARS, the polity-homepage $H_P(\tau)$ at time $\tau$ is exactly the render of the public fiber $F^{\mathrm{pub}}_P(\tau)$ under `render-as-http-response` with HTML target.
No content in $H_P(\tau)$ comes from cells outside $F^{\mathrm{pub}}_P(\tau)$.
No cells inside $F^{\mathrm{pub}}_P(\tau)$ are systematically excluded by the homepage's render (they may be unrenderable in HTML, but they are not selectively suppressed).

## Statement

For any polity $P$, time $\tau$, and any HTTP request $\mathrm{Req}^{\mathrm{root}}_P$ to $P$'s substrate-root URL with no authentication credentials:

$$H_P(\tau) \;=\; \mathrm{render}_{HTTP}\big(F^{\mathrm{pub}}_P(\tau),\; \mathrm{Req}^{\mathrm{root}}_P,\; \mathrm{HTML}\big)$$

and additionally:

- For every cell $c$ that contributes to $H_P(\tau)$'s rendered content, $c \in F^{\mathrm{pub}}_P(\tau)$.
- For every cell $c \in F^{\mathrm{pub}}_P(\tau)$ that is HTML-expressible, $c$ contributes to $H_P(\tau)$ unless the polity's per-cell render configuration explicitly excludes it (e.g., a cell marked `homepage-suppressed: true`).

## Sketch

The proof has two parts: (1) every byte of the homepage traces to a public-fiber cell, and (2) every public-fiber cell that's HTML-expressible appears on the homepage (modulo explicit suppression).

### (1) Every homepage byte traces to a public-fiber cell

Per the [polity-homepage](../objects/polity-homepage.md) definition, the homepage is the function application of [render-as-http-response](../morphisms/render-as-http-response.md) to the public fiber.
Render is pure (per the [render morphism](../morphisms/render.md) and [substrate-purity](substrate-purity.md)) — it depends only on its input fiber and its arguments.
Therefore the rendered output depends only on the public-fiber.

[Gap: the proof requires showing that render-as-http-response, as currently implemented, has no path that injects content from outside the input fiber.
The current realization has no HTML render path yet, so the proof obligation cannot be discharged against running code; it constrains the *implementation* to a path that satisfies it.
This claim is therefore conditional on the implementation respecting the constraint.]

### (2) Every HTML-expressible public-fiber cell appears

Per the [public-projection](../concepts/public-projection.md) discipline, projections are not selectively suppressing — they're lossy in the sense that some cells aren't expressible in the target transport, but they don't hide expressible cells unless explicitly configured to.

[Gap: the claim's "modulo explicit suppression" qualifier means the per-cell render configuration must itself be substrate-tracked; otherwise suppression could happen at the implementation level without audit.
The discipline for declaring a cell `homepage-suppressed:` is partly settled (suppression-as-public-licit-restriction) and partly open.
Until settled, this part of the claim is `status: draft`.]

## Discussion

### What this claim does

This is the load-bearing commitment that makes the polity homepage's privacy story tractable.
With it:

- A polity can audit "what is on our homepage" by enumerating $F^{\mathrm{pub}}_P$.
  The audit is exhaustive — any byte the homepage shows is in the answer.
- A polity can change "what's on our homepage" by changing $F^{\mathrm{pub}}_P$ — i.e., declaring or un-declaring cells public-licit.
  The page updates derivatively.
- A polity can prove "we don't expose X" for a non-public cell X by showing X ∉ $F^{\mathrm{pub}}_P$.
- A polity can be confident that the homepage is not selectively misleading — it's not hiding cells that are public, it's not surfacing cells that are private.

Without this claim, the homepage's content would be an artifact-side decision (whatever the page template says), and the privacy story would require auditing template output rather than substrate fiber.

### What this claim does not say

- It does not say the homepage is *aesthetically* good or useful.
  The render-as-http-response morphism's HTML output may be a wall of structured data, an empty page, or a polished design — those are template-level concerns, not claim-level.
- It does not say the public-fiber is *complete*.
  A polity may have under-declared public-licit cells (the homepage is sparser than it could be); that's the polity's choice, not a claim violation.
- It does not say the homepage is *cached* or *fast*.
  Performance disciplines are separate.
- It does not say all public-fiber cells are HTML-expressible.
  Some may project better to JSON; the homepage may link to JSON endpoints for those.

### What would have to change for this claim to fail

- If render-as-http-response read non-public-fiber cells during homepage rendering (a substrate-purity violation): the claim fails, render-as-http-response is bug.
  Fix is to constrain the render path.
- If the homepage's HTML template injected content from out-of-substrate sources (a CDN-loaded blob, a hard-coded brand string, an environment variable): the claim fails for the injected content.
  Fix: those injections must be substrate-tracked (as configuration cells in the public fiber) or removed.
- If suppressed cells were hidden without the suppression itself being substrate-licit: the claim's "modulo explicit suppression" qualifier becomes vacuous, and the audit becomes incomplete.
  Fix: suppression must be substrate-witnessed.

### Why "polity homepage" is the right granularity

The claim is about the polity-homepage object — the single rendered response at the polity's root URL — not about all of the polity's public surface.
Other public surfaces (a public-JSON endpoint, an RSS feed) have analogous claims; together they establish that "all public surfaces derive from the public fiber."
This claim is the first such; further claims will follow as more public surfaces are theorized.

## Connection to upstream

Per [predication-categories projection theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) and the upstream definition of fiber-restriction-and-projection, this claim is the PyFARS-side statement of the general result that a projection from a sub-fiber agrees with the sub-fiber on all sub-fiber-expressible cells and excludes everything else.
The PyFARS-side specificity is in naming the public-fiber, the render specialization, and the homepage object.
