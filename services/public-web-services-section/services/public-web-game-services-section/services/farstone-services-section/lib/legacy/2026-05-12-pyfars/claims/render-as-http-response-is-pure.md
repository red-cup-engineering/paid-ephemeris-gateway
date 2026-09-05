---
type: claim
status: draft
depends-on: [render-as-http-response, render, substrate-purity]
---

# Render-as-HTTP-response is substrate-pure

**Claim.** The [render-as-http-response](../morphisms/render-as-http-response.md) morphism is substrate-pure: serving an HTTP response via this morphism does not modify substrate state.
The HTTP transport boundary adds no substrate-modifying behavior to the underlying [render](../morphisms/render.md) morphism, which is itself substrate-pure.

## Statement

For any substrate state $S$, fiber $F \subseteq S$, HTTP request $\mathrm{Req}$, and target type $T$:

$$\mathrm{render}_{HTTP}(F, \mathrm{Req}, T) \text{ does not modify } S.$$

In particular: invoking `render-as-http-response` does not append to the JSONL event log, does not write to the corpus, does not modify in-memory substrate caches in a way that propagates to the canonical state, and does not produce any cell that becomes part of substrate truth.

## Sketch

The proof routes through [`substrate-purity`](substrate-purity.md) and the parent [render](../morphisms/render.md) morphism's purity:

### (1) `render` is pure

Per the [render morphism](../morphisms/render.md), render is a function of (substrate, args) → artifact.
It does not modify substrate; this is the parent morphism's commitment.

### (2) `render-as-http-response` decomposes into render + HTTP wrapping

Per the [render-as-http-response](../morphisms/render-as-http-response.md) morphism, the operation decomposes into: - Fiber selection (a substrate read). - A call to render against the selected fiber. - HTTP wrapping (header construction, status code assignment, body serialization).

The first step is a read; the second inherits purity from render; the third is in-memory data manipulation that doesn't touch substrate.

### (3) Visit-witnessing is independent

Some PyFARS deployments witness incoming requests (analytics, audit).
When this happens, the witness is produced by a *separate* substrate transition — typically a middleware that writes to the JSONL log.
The witness is not part of `render-as-http-response`; it runs in parallel.

This separation matters: a deployment that witnesses requests does so as an explicit substrate transition (with its own verb, witness event, and audit trail).
A deployment that doesn't witness requests doesn't violate this claim by omission.
Either way, render-as-http-response itself is pure.

[Gap: the realization will need a careful audit of any planned middleware to ensure visit-witnessing is genuinely separate from render-as-http-response and doesn't entangle.
This is an implementation discipline, not a theoretical issue, but the audit must happen.]

### (4) Caching is also independent

A response cache (storing rendered responses keyed by substrate state) is a *derived* artifact, not a substrate write.
The cache is invalidated on substrate change, populated on cache miss, and read on cache hit.
Substrate is not modified by cache operations.
Render-as-http-response with caching remains pure.

## Discussion

### What this claim does

It extends substrate-purity from the read-side internal operation (render) to the externally-facing HTTP transport.
With it:

- A polity can run a public web server (PyFARS serving HTTP) without weakening the substrate-purity discipline.
  Every request is a read; no implicit writes happen.
- Auditors can rely on the JSONL log alone for substrate state — not on the HTTP server's behavior.
- The web server can be replicated (multiple instances behind a load balancer) without substrate consistency concerns; multiple readers don't conflict.
- The web server can be killed and restarted without losing substrate state — there is no in-flight substrate transition to lose.

### What this claim does not say

- It does not say HTTP requests are *unrecorded*.
  They may be recorded (visit-witnesses, access logs); the claim says only that render-as-http-response itself doesn't write substrate.
  Recording is a separate operation under different verbs.
- It does not say the HTTP transport has no side-effects of any kind.
  The transport produces network output; that's the morphism's purpose.
  The claim is specifically about *substrate* purity.
- It does not say the implementation respects the discipline.
  The realization currently has no HTML render path; the claim is a constraint on what the realization must satisfy.
  A future implementation that violated the discipline would be a substrate-purity bug, not a refutation of the claim's statement.

### What would have to change for this claim to fail

- If render-as-http-response's implementation called a verb that writes to substrate (e.g., updated a "last-rendered-at" cell): the claim fails.
  Fix: separate the witness from the render.
- If a middleware silently wrote to substrate as part of every render-as-http-response invocation: the claim fails for the deployment with that middleware.
  Fix: make the witness explicit and witnessable, not implicit.
- If the HTTP response body included content that was sourced from substrate via a write-back-pattern (cache-fill in canonical state): the claim fails.
  Fix: cache out-of-substrate.

The first two are implementation disciplines; the third would be an architectural mistake the realization must avoid.

### Why this claim is separate from `substrate-purity`

The general substrate-purity claim says PyFARS does not modify substrate outside of explicit substrate-transitioning verbs.
This claim specializes to a specific morphism (render-as-http-response) for two reasons:

1. **Discoverability.** Implementing the web slice will surface many opportunities to violate substrate-purity (caching, sessions, request-tracking, performance-counters).
  Having a specific claim about this morphism makes the audit checklist explicit.
2. **Auditability.** A reviewer of web-slice code can check this specific claim without re-deriving from the general substrate-purity claim.

The two claims compose: substrate-purity + render-as-http-response-is-pure ⊢ "PyFARS's web server preserves substrate-purity even under load."

## Connection to upstream

Per [predication-categories projection theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), pure projections compose to pure projections.
The PyFARS-side claim is that wrapping a render in an HTTP transport preserves the projection's purity.
The upstream theorem provides the categorical machinery; the PyFARS-side specificity is in naming the HTTP transport as the wrapping.
