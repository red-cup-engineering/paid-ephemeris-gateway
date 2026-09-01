---
type: question
status: open
explores: [polity-homepage, public-fiber, render-as-http-response, polity, corpus-as-flatfile]
---

# How does PyFARS's web app know which polity it is serving?

The current `pyfars.web.app.build_app(root)` factory takes a corpus root and serves substrate from it.
The `polity_facts` function walks the corpus to find a `kind: polity` note and uses the first one found.
If the corpus contained multiple polities (which can happen — federations, multi-polity development environments, test fixtures), the result would be non-deterministic; the web app would render whichever polity happened to be discovered first.

The [polity-homepage](../objects/polity-homepage.md) is a polity's *primary* public projection — defined per polity, served at *that polity's* domain root URL.
PyFARS's transport (FastAPI, nginx, systemd) doesn't currently model the polity-context: it knows the corpus root but not which polity within the corpus the request is for.

## What is known

- A single PyFARS instance typically serves a single polity (one corpus root = one polity in the realized 561 deployment).
- A multi-polity instance is *theoretically* possible (the substrate model accommodates it; multiple `kind: polity` notes in one corpus are not malformed).
- The current implementation handles the single-polity case adequately by accident: the corpus has one polity, so "first found" is "the polity."
- The theory does not commit to single-polity-per-instance.
  It treats the polity as a parameter of the homepage's identity.

## What would settle it

A `polity-context` mechanism: the web app knows which polity it serves at any given request.
Possibilities:

1. **Single-polity-per-instance** — make this an explicit commitment.
  `build_app(root, polity_slug)` requires a polity slug; serving begins only when the slug resolves to exactly one `kind: polity` note.
  Multi-polity corpora would require multiple instances.
2. **Domain-routed** — the web app reads the request's `Host:` header and maps domain → polity-slug via a substrate-tracked mapping (e.g., a `kind: domain-binding` record).
  Multi-polity instances are admissible; routing happens at the request level.
3. **Path-routed** — `/polity-A/` and `/polity-B/` as path prefixes.
  Substrate-tracked.
  Plays poorly with the polity-homepage being at `/`.
4. **Captain-set default** — the polity has a `default-polity` cell at the corpus root; `polity_facts` reads it.
  Single-polity-per-corpus convention.

Each has tradeoffs.
Single-polity-per-instance is simplest; domain-routed is most flexible for federations.

## Why this matters now

- The 561 polity deployment is single-polity.
  Adding another polity's notes to the same corpus would (silently) corrupt the homepage.
  This is a substrate-purity-adjacent concern: the homepage's content depends on which polity-note the function finds first, not on a substrate-declared answer.
- The static fallback at `/var/www/561.group/` is implicitly bound to the 561 polity by URL (nginx routes `561.group` to PyFARS).
  But PyFARS itself doesn't know the URL-to-polity mapping; it only knows what's in the corpus.
- Future federation work will require this context.
  If the captain wants a homepage view that aggregates multiple polities' public-fibers, the polity-context question must be settled first.

## Open dimensions

- Whether polity-context should be a property of the running PyFARS instance (config-time decision) or per-request (transport-level routing).
- Whether the existing `polity.yaml` manifest at the corpus root has a role here.
  Currently it lists member repos; could it also declare the active polity?
- The relationship to the existing `pyfars install-harness repo-instructions` which projects polity facts into `README.md`/`CLAUDE.md` — does that already commit to single-polity-per-instance?
  Probably yes, in practice.
