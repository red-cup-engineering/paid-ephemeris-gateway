---
title: Deploy Log
description: Bugs found and fixed while bringing the game fleet's eight services live on Cloud Run, plus the registry and second-host search.
date: 2026-08-19
keywords: ["gaming", "enterprises", "deploy", "cloud-run", "registry"]
---

# Deploy Log

Eight services landed on Cloud Run: the storefront, crucible, solitaire, gambling-trainer,
ruinfold, durante, farstone, and aletheon. See [the deploy runbook](../2026-08-19-note-on-deploy-runbook.md)
for current live status and operating procedure; this log records what was found and fixed
getting there.

## Front-door same-URL-rewrite bug

`web/server.mjs` in crucible, solitaire, and gambling-trainer used to rewrite `/` to serve
`/web/index.html`'s bytes without changing the URL. Every asset reference in those
documents is written path-relative with no leading slash, correct only when the document's
real URL is `/web/index.html`. A browser visiting the bare front door resolved those
references against `/` instead and 404'd on all of them silently — `app.mjs`/`landing.mjs`
never ran, so solitaire's daily-play link never got rewritten and dead-ended. Found by
walking the front door with a real reference-graph walker instead of curling paths already
known correct. Fixed: `/` is now a real `302` redirect to `/web/index.html` in all three
trees, with `web/test/frontdoor.test.mts` regression coverage (4 tests per service).

Two bugs were found in the walker itself while getting a clean run, neither a real site
bug: it used to eagerly fetch every import-map entry instead of only the ones an import
specifier actually resolves through (flagged an unused, deliberately-unreferenced
`@561-group/cartridge/replay` mapping as missing); and its JSON-body scanner resolved
relative-looking URLs against the wrong origin when scanning `catalog.json`. Both fixed in
`frontdoor-walk.mjs`.

## ruinfold persistence

Moved to GCS persistence (`gs://five-six-one-ruinfold-daily`) per the owner's "data in
buckets" decision, using a hand-rolled JSON-API-over-fetch client rather than an SDK, to
keep ruinfold zero-dependency. Two bugs found and fixed while wiring it up:

1. `server.mts` was never actually wired to the bucket store — it called `openStore()`
   directly instead of the shared `AsyncStore` surface, so `RUINFOLD_BUCKET` would have
   been silently ignored in production. Fixed by converting request handling to
   `openStoreAuto`.
2. The bucket-store's object-name prefix leaked the container's filesystem path
   (`dataRoot` was forwarded straight into the GCS prefix), landing objects at
   `.../five-six-one-ruinfold-daily//app/data/runs/...` instead of
   `.../five-six-one-ruinfold-daily/runs/...`. Fixed with an extracted `resolveStoreRoot`
   that only threads the filesystem path through when the file-store backend is selected.

Also fixed: `src/server.mts` read only `RUINFOLD_PORT`, never Cloud Run's injected `PORT` —
this service would have deployed and then never become healthy. Fixed as
`process.env.PORT ?? process.env.RUINFOLD_PORT ?? 8787`.

A live statefulness proof (submit a run, force a genuine new revision via a no-op
redeploy, confirm 100% traffic on the new revision, re-read the leaderboard, attempt a
second scored submission for the same actor/date) confirmed both the GCS-backed
leaderboard and the per-`(date, actor)` scored-run lock (a GCS conditional-create) survive
an instance churn.

## durante and abrash

Ported from the legacy archive to house convention (`@red-cup-engineering/abrash`,
`@red-cup-engineering/durante`), published to Verdaccio. Two bugs found and fixed before
deploy:

1. The browser page couldn't load at all — the module graph statically imports
   `@561-group/computer/posix-holography/eavt-substrate` (no import-map entry) and
   `node:crypto` (doesn't exist in a browser). Fixed with a pure-JS synchronous SHA-256
   shim, a generic path-traversal-guarded `/vendor/<scope>/<pkg>/<realPath>` server route,
   and matching import-map entries.
2. No demon sprite ever rendered — `render()` only drew walls/floor/sky, so a demon in
   plain view was indistinguishable from facing away. Fixed at the engine level (abrash
   0.1.0 → 0.1.1): a depth-tested billboard sprite pass occluded per-column against the
   wall pass's own depth buffer.

A further bug was found in `frontdoor-walk.mjs` itself while verifying the live deploy: it
resolved `node:crypto` (a syntactically-valid-looking URL) as a literal absolute
specifier without ever consulting the import map, unlike a real browser's resolution
order. Fixed to compute the specifier's `asURL` form and check the import map first for
both absolute- and relative-looking specifiers.

## Live churn proofs: farstone and aletheon

Both farstone and aletheon were deployed, tested, and played live, then subjected to a
forced redeploy while carrying real, freshly-written state, to check whether that state
survived. Both proofs found bugs deeper than either service's original deploy report
claimed — see the runbook's "Known open issues" for their current status:

- **Farstone**: an item carried into a non-native room and dropped, then a forced redeploy
  after waiting past the autosave interval, came back with the world reverted to a state
  that predated the drop. Root cause: without `--no-cpu-throttling`, Cloud Run only
  guarantees CPU scheduling while a request is in flight, so the autosave `setInterval`
  may simply not run during an idle stretch, regardless of how much wall-clock time has
  elapsed.
- **Aletheon**: the persisted EAVT log grew from a 38-entity seed to over 96,000 rows
  (8.28MB) within about 19 minutes of ordinary idle-ticking traffic, exceeding the 256MiB
  container memory limit — five confirmed OOM kills in an eleven-minute observation
  window, each restart reloading a strictly larger log and crashing sooner than the last.
  Entity population and identity did restore correctly across a forced redeploy; a
  specific single write made just before a disconnect did not always survive, consistent
  with (but more frequent than) the documented "up to one autosave interval" caveat.

## Registry and second-host search

`registry.561.group` is live on `cold-red-gate`, unblocked by a disk cleanup there
(`993M` → `5.3G` free: apt cache, seven superseded snap revisions, a vacuumed journal,
npm cache, old rotated syslogs — done under the owner's explicit "yes clean up cold red
gate" authorization, scoped to disk reclamation only). Six old kernels and 1412
`apt-get autoremove`-eligible packages were found but left untouched — a package-removal
action outside that authorization's scope, flagged for the owner instead.

The doctrine's tiny-box/stronger-box split assumed a second host would be available for
the registry. The search for one found exactly one other real machine on the account, GCP
`bare-cedar-fog-cloud-mirror` (`e2-standard-2`, not free-tier) — already the live
`ap.561.group` (ActivityPub) host, not a spare. A `chat.561.group` Hetzner box surfaced in
an old session transcript but no identity file on this machine is authorized against it.
No Oracle-Cloud or GCP free-tier box was found. The registry landed on `cold-red-gate`
instead, since that box had the headroom after cleanup.

The full house-scope package mirror (860 packages / 1171+ versions) from the local
Verdaccio instance to the remote one runs as a detached, sequential background job — an
initial parallel attempt at `-P 8` pushed the box's load to 6.6 against its 1 vCPU/1.6GB
RAM and was reverted to sequential. Check progress: `ssh cold-red-gate 'grep -c "^+ "
~/services/verdaccio-561-group/publish-mirror.log'`.

## stoke and parlor, first-time deploy (2026-08-20)

Both had only ever run locally. Suites re-confirmed green immediately before deploy: stoke
98/98 baseline, 103/103 after the fixes below (5 new regression tests added, none removed);
parlor 92/92 unchanged throughout. Deployed sequentially, `stoke-00001-vkt` then
`parlor-00001-7q5`, each verified reachable before the next started.

Two real bugs found and fixed before deploy, both by test rather than by a live incident:

1. **stoke's front door was a same-URL internal rewrite, not a redirect** — the identical bug
   class this log already fixed for crucible/solitaire/gambling-trainer (see "Front-door
   same-URL-rewrite bug" above), just never caught in stoke because its own test suite never
   walked the real front door. `web/server.mjs` rewrote `/` to `/web/index.html`'s bytes
   in-process with no HTTP redirect; `web/index.html`'s path-relative asset references
   (`css/style.css`, `js/app.mjs`) would have 404'd for a real browser hitting `/`. Fixed with
   a real `302` redirect, exactly matching crucible's own fix shape, plus a new
   `web/test/frontdoor.test.mts` (module-graph walk from the real front door, import-map-aware)
   for regression coverage the other three services already carry.
2. **stoke's `app.mjs` (the live "Verify replay" button) imports `hashState` from
   `@red-cup-engineering/cartridge/replay` directly, and that vendored file's own top level does
   `import { createHash } from 'node:crypto'`** — unresolvable by a real browser, the same bug
   class this log's own "durante and abrash" section already found and fixed once. Unlike
   gambling-trainer-service, which also depends on the same cartridge package but deliberately
   never re-exports the `replay`/`manifest` subpaths from its browser client specifically to
   avoid this trap (see that file's own module doc, which names the trap explicitly), stoke's UI
   genuinely calls `hashState` live, so the import is real and unavoidable. Fixed the same way
   durante was: durante's own `web/node-crypto-shim.mjs` (a pure-JS synchronous SHA-256,
   byte-verified against Node's real `node:crypto`) copied into `stoke-service/web/js/`, with a
   `"node:crypto"` import-map entry added to `web/index.html`. The new frontdoor test's own
   specifier-resolution order needed the identical fix `frontdoor-walk.mjs` itself already got in
   the durante/abrash pass: check the import map before deciding an absolute-looking specifier
   (a URL scheme, or `node:*`) is unresolvable, not after.

parlor-service needed neither fix, confirmed by reading rather than assumed: its
`web/server.mjs` already treats `web/` as the site root for every pretty path including `/`
(unlike stoke's ROOT-relative-with-a-`/web/`-special-case shape), so its path-relative asset
references were never mismatched against the real front-door URL in the first place; and its
`kernel-*.mjs` files already follow gambling-trainer's own precedent of never re-exporting
`manifest.mts`/`cartridge.mts` (the only files that reach `node:crypto`) into the browser client.

parlor-service's `web/server.mjs` *does* read `process.env.HOST ?? '127.0.0.1'` explicitly,
though — the storefront's own documented HOST bug, for real this time, not hypothetically:
without `ENV HOST=0.0.0.0` in its Dockerfile this service would have deployed and simply never
become reachable from outside the container. stoke's own server never reads `HOST` at all (a
bare `listen(PORT, ...)` already binds broadly), so the same `ENV HOST=0.0.0.0` line is inert
there and load-bearing here; both Dockerfiles carry it regardless, per house convention.

Both Dockerfiles are new (`FROM node:24-slim`, `COPY . .`, `ENV NODE_ENV=production`,
`ENV HOST=0.0.0.0`, `CMD ["node", "web/server.mjs"]`) — neither service had one before. Neither
`package.json` needed a start-script addition — both already carried `"serve": "node
web/server.mjs"`.

Router updated (`ORIGIN_BY_HOST`, `wrangler.jsonc` routes, that directory's own README table)
and deployed (`npm run deploy` from `sites/cloudflare-router`, `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID` sourced from `/home/emsenn/info/.env`'s
`API_KEY_CLOUDFLARE_WORKERS_EDIT` / `CLOUDFLARE_ACCOUNT_ID` — worth stating plainly: the task
that requested this deploy described this credential shape as "the equivo deploy pattern
recorded" in the runbook, but no such precedent exists anywhere in the runbook or in this log;
`equivo` has never been deployed — it is design-only, per the games census. The shape used here
came straight from the router's own README and the root `.env`'s actual variable names). Both
new front doors walked clean: `stoke.561.group` — 19 URLs, 0 MISS, 0 BADMIME; `parlor.561.group`
— 3 URLs, 0 MISS, 0 BADMIME (`/`'s own shelf-page graph only; the five game pages are separate,
independently-verified front doors, matching how weiqi's own sibling pages were verified above).

Storefront catalog regenerated (tree was cool, last touched ~69 minutes prior). A new
`parlor-service/catalog-entry.json` was authored (parlor had none on disk at all — a real gap,
not just a census gap); `parlor`'s `seedPolicy.kind` is `on-demand`, not `daily-utc`, at that top
level, since the front door is a shelf page over five independently daily-seeded games with no
single canonical today's-seed for the entry as a whole (the same reasoning already used for
`cartridgeWrapped: false` on both stoke's and parlor's entries). `stoke`/`parlor` added to both
`LIVE_SUBDOMAINS` sets. **Noted, not touched**: another session was concurrently editing this
same router/storefront file set live during this pass (`equivo`, `you-are-conscious`, `tidepool`
entries appearing mid-session across repeated reads). `equivo` sits in both `LIVE_SUBDOMAINS`
sets with no `catalog-entry.json` anywhere behind it (it is design-only, no code); `tidepool` has
a router entry and a `catalog-entry.json` but is missing from both `LIVE_SUBDOMAINS` sets and
fails its own manifest-shape check (`status: "playable"` with no `entryPoints`). Both pre-date
and are unrelated to stoke/parlor; left alone per house convention on concurrent-session state,
named here instead of silently absorbed or silently ignored. Storefront suite: 39/42 passing
after this pass (35/42 immediately after the first catalog regeneration, before the `seedPolicy`
correction above fixed 3 of the 7 original failures); the remaining 3 are exactly the
`equivo`/`tidepool` items just named.
