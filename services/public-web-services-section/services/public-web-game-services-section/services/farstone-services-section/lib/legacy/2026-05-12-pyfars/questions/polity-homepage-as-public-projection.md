---
type: question
status: partial
explores: [polity-homepage, public-fiber, public-projection, render-as-http-response, projection, polity]
---

# How should PyFARS realize the polity homepage as a public projection of substrate state?

The polity at 561.group needs a public homepage — the polity's first HTML face on the web.
PyFARS already has the substrate (the corpus, the predication graph, the JSONL log), the auth machinery (OAuth via Google federation), the web app skeleton (FastAPI), and the foundational self-theory spine (substrate, projection, render, etc.).
What's missing is the slice of self-theory that says what a *polity homepage* is in PyFARS terms — what fiber it projects from, what render specialization produces it, what claims it makes.
With that slice, the homepage becomes a derived practice rather than an artifact.

This is both a **realization question** (how does PyFARS realize a homepage) and a **governance-grounding question** (the polity's choice of what's public is a governance decision; the question's resolution provides the theoretical ground for that decision).

## What is known

- PyFARS already has a working OAuth Authorization Server and per-principal verb gating via granted-profiles.
  Authenticated principals can be distinguished from unauthenticated visitors.
- PyFARS already has FastAPI as the web transport and uvicorn as the runtime.
  The web app's `build_app(root)` factory takes a corpus root.
- PyFARS already has a corpus-as-flatfile, a predication graph derived from frontmatter, and a JSONL event log.
  Substrate state is well-defined.
- The `interactive-application-platform` upstream theory is current with predication-category theory; its `view` concept (substrate-fiber composition) gives the upstream framing for how a homepage should be theorized.
- The `web-server-platform` upstream theory carries endpoints, routes, request/response morphisms — the transport-side framing.
- An existing static `index.html` at `/var/www/561.group/` serves as a fallback today.

## What would settle it

The resolving artifacts are: 1.
A `public-fiber` object naming what PyFARS exposes publicly.
2.
A `public-projection` concept naming the role of projection-from-public-fiber.
3.
A `render-as-http-response` morphism specializing render to HTTP/HTML.
4.
A `polity-homepage` object specifying the polity's primary public view at `/`.
5.
A `homepage-derives-from-public-fiber` claim binding the homepage's content to the substrate's public-fiber.
6.
A claim about HTTP-render purity preserving substrate-purity.

Once these exist, the homepage's content is *theoretically derived* — it's the render of the public-fiber under render-as-http-response, no other content.
The captain's choice of what's public-fiber-content is a governance decision that the theory's structure makes possible.

## What this question does not settle

- The closure-rule-system that *generates* the public-fiber (i.e., what cells are public-licit).
  This is a per-polity governance decision; the theory provides the structure, the polity chooses the content.
- The handling of authenticated views — what a logged-in principal sees beyond the public-fiber.
  That is a follow-up question (`view-composition-for-authenticated-principals`) for after the unauthenticated homepage is anchored.
- Federation across polities — when a homepage is composed from multiple polities' public-fibers.
  Out of scope for the first anchor.

## Status

`partial` — the resolving manifest has been authored as theory entries (see `explores:` list).
The originating question is preserved here as the rationale for the slice; it will be deleted (per `theory/questions/_index.md` discipline) once a `polity-homepage` object plus the binding claim are settled (`status: sketch` or `proved`).
