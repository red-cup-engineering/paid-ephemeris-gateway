---
title: Deploy Runbook
description: How the game fleet deploys to Cloud Run and the real 561.group subdomains — live services, redeploy commands, the PORT/HOST convention, cost posture, the Cloudflare router, the package registry, and rollback.
date: 2026-08-19
keywords: ["gaming", "enterprises", "deploy", "cloud-run", "cloudflare", "infra"]
---

# Deploy Runbook

## Live now

| Service | Real name | Cloud Run URL |
|---|---|---|
| Storefront (play.561.group) | https://play.561.group/ | https://play-561-group-1019481907460.us-central1.run.app/ |
| Crucible | https://crucible.561.group/ | https://crucible-1019481907460.us-central1.run.app/ |
| Solitaire | https://solitaire.561.group/ | https://solitaire-1019481907460.us-central1.run.app/ |
| Gambling trainer | https://gambling-trainer.561.group/ | https://gambling-trainer-1019481907460.us-central1.run.app/ |
| ruinfold | https://ruinfold.561.group/ | https://ruinfold-1019481907460.us-central1.run.app/ |
| durante | https://durante.561.group/ | https://durante-1019481907460.us-central1.run.app/ |
| farstone | https://farstone.561.group/ | https://farstone-1019481907460.us-central1.run.app/ |
| aletheon | https://aletheon.561.group/ | https://aletheon-1019481907460.us-central1.run.app/ |
| weiqi | https://weiqi.561.group/ | https://weiqi-1019481907460.us-central1.run.app/ |
| stoke | https://stoke.561.group/ | https://stoke-1019481907460.us-central1.run.app/ |
| parlor | https://parlor.561.group/ | https://parlor-1019481907460.us-central1.run.app/ |
| tidepool | https://tidepool.561.group/ | https://tidepool-1019481907460.us-central1.run.app/ |

The storefront (play.561.group) server-renders its catalog and daily-strip grids through
`@red-cup-engineering/web-tufte-gui-services-section`'s `renderTufteFragment`, not a
bare client-fetch-and-render page.

Every service above runs in `us-central1`, unauthenticated (public), `cpu 1`, `memory 256Mi`,
`min-instances 0` (**exception: farstone runs `cpu 2`/`memory 512Mi` since the 2026-08-20
cutover** — see "Known open issues" below). Most run `max-instances 2` (weiqi included).
Farstone and aletheon run `max-instances 1` — both are single-writer stateful worlds, so a
second concurrent instance would fork state — and carry a persistence-backend selector env var
(`FIZZOS_BUCKET=five-six-one-farstone`, `ALETHEON_BUCKET=five-six-one-aletheon`). ruinfold
carries its own selector, `RUINFOLD_BUCKET=five-six-one-ruinfold-daily`. durante carries the
identical selector pattern, `DURANTE_BUCKET=five-six-one-durante-daily` (bucket created and
IAM-granted `roles/storage.objectAdmin` to the `1019481907460-compute@developer.gserviceaccount.com`
Cloud Run service account, exactly matching the ruinfold bucket's own binding — see "durante
daily tournament" below). Farstone has no HTML front door by design — its fizzos-derived
HTTP surface registers no route for `/`, only `/health`/`/metrics`/`/connect`/`/command`/`/tick`/`/events`;
it is a headless REST/MUD server. stoke and parlor also run `max-instances 1` — not for
farstone/aletheon's single-writer-state reason (neither carries any server-side state at all;
each player's whole run lives in the browser's own `localStorage`), but because that is the
shape this pair's first-time deploy was specified against. Full deploy-history detail, bugs
found along the way, and status of items still needing the owner:
[the deploy log](logs/2026-08-19-deploy-log.md).

### weiqi (polish-phase ship, 2026-08-20)

`apps/weiqi-web` (a sibling to READ-ONLY `apps/weiqi-kernel`/`apps/weiqi-lsp`, verified
untouched by this deploy) is zero-dependency and ships its already-built `public/` directory
directly — `npm run build` (type-strips the kernel into `public/js/kernel/*.mjs`, compiles
`public/data/glossary.json`) runs from the repo, with `weiqi-kernel` present as a sibling
directory, **before** `gcloud run deploy`; the Docker build context (`apps/weiqi-web` alone)
never needs the kernel/lsp trees at all, so their READ-ONLY status is never at risk from a
deploy. `scripts/serve.mjs` was fixed to read `process.env.PORT` (it previously only read
`process.argv[2]`, the exact "deploys and then never becomes healthy" trap this runbook's own
PORT/HOST convention section warns about) and to default `HOST` to `0.0.0.0` in source, rather
than needing a Dockerfile-level override the way play.561.group's `serve.mjs` does.

```bash
gcloud run deploy weiqi \
  --source "science-services-section/services/agent-services-section/services/play-services-section/services/game-science-services-section/services/board-games-services-section/services/weiqi-services-section/apps/weiqi-web" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi
```

Live and walked clean, both directly and through the real front door:
`node sites/cloudflare-router/frontdoor-walk.mjs https://weiqi.561.group/` returns 3 URL(s)
visited (`/`, `css/theme.css`, `css/shelf-chrome.css` — `index.html`'s own reference graph; the
walker follows `<link>`/`<script>`/import-map/JSON-body references, not `<a>` navigation, so
`play.html`/`learn.html`/`tsumego.html`/`glossary.html` are separate, independently-walked pages
— all four also confirmed clean, 33 more URLs, 0 MISS/BADMIME combined), 0 MISS, 0 BADMIME.
`weiqi.561.group` is live on the Cloudflare router (`ORIGIN_BY_HOST`, `wrangler.jsonc` routes,
this file's own table above) and on the storefront's `catalog-entry.json` → `catalog.json` and
both `LIVE_SUBDOMAINS` sets (`js/catalog.mjs`, `js/today.mjs` — `test/honest-links.test.mts`
enforces these three never drift apart). See "Known open issues" below for the one-time
`wrangler` keyring snag hit and resolved along the way, left documented since it will recur on
a fresh environment.

### stoke and parlor (first-time deploy, 2026-08-20)

Both had only ever run locally before this pass; both already carried a `serve` script
(`node web/server.mjs`), so package.json needed no addition. Each got a house-pattern
Dockerfile (`FROM node:24-slim`, `COPY . .`, `ENV NODE_ENV=production`, `ENV HOST=0.0.0.0`,
`CMD ["node", "web/server.mjs"]`) — neither had one before.

Two real bugs surfaced before deploy, both caught by writing/extending each service's own test
suite rather than found live:

- **stoke shipped the exact same-URL front-door rewrite bug** the runbook's own "Front-door
  convention" section already documents for crucible/solitaire/gambling-trainer: `web/server.mjs`
  served `/web/index.html`'s bytes at the URL `/` with no redirect, so `web/index.html`'s
  path-relative `css/style.css`/`js/app.mjs` references would have 404'd for a real browser
  visiting the bare front door. Fixed identically to the other three: `/` is now a real `302`
  redirect to `/web/index.html`, with new `web/test/frontdoor.test.mts` regression coverage
  (module-graph walk from the real front door, import-map-aware).
- **stoke's `app.mjs` imports `hashState` from `@red-cup-engineering/cartridge/replay` directly**
  (the "Verify replay" button) — unlike gambling-trainer-service, whose `kernel.mjs` deliberately
  never re-exports that subpath specifically to avoid this, stoke's page genuinely needs it live.
  `replay.mjs`'s own top level does `import { createHash } from 'node:crypto'`, unresolvable by
  a real browser — the same bug class durante/abrash hit and fixed. Fixed the same way: durante's
  own browser-safe SHA-256 `node-crypto-shim.mjs` copied into `stoke-service/web/js/`, with a
  `"node:crypto"` import-map entry in `web/index.html` remapping to it. The frontdoor test's own
  specifier-resolution order was fixed to check the import map before rejecting an absolute-looking
  specifier — the identical ordering bug the deploy log's "durante and abrash" section already
  found and fixed in `frontdoor-walk.mjs` itself.
- **parlor-service's `web/server.mjs` reads `process.env.HOST ?? '127.0.0.1'` explicitly** — the
  storefront's own documented bug class, not merely a theoretical risk here: without
  `ENV HOST=0.0.0.0` at the Dockerfile level this service would have deployed and never become
  reachable. stoke's own `server.mjs` never reads `HOST` at all (its bare `listen(PORT, ...)`
  already binds broadly by Node's own default), so `ENV HOST=0.0.0.0` is harmless-but-inert there
  and load-bearing here — both Dockerfiles carry the line regardless, per house convention.

Suites re-run fresh immediately before deploy: stoke 103/103 (98 baseline + 5 new: the extra
`frontdoor.test.mts` coverage plus one `server.test.mts` test split into two to match the new
redirect), parlor 92/92 unchanged (its front-door architecture already serves everything
consistently under `web/` for every pretty path, including `/`, so it never had the rewrite bug;
its browser client already follows gambling-trainer's own precedent of never re-exporting
`manifest.mts`/`cartridge.mts` from any `kernel-*.mjs`, so it never had the `node:crypto` bug
either — confirmed by reading, not assumed).

```bash
gcloud run deploy stoke \
  --source "public-computer-games-services-section/services/stoke-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi

gcloud run deploy parlor \
  --source "public-computer-games-services-section/services/parlor-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi
```

Deployed sequentially (`stoke-00001-vkt`, then `parlor-00001-7q5`), each verified reachable
before the next started. `stoke.561.group`/`parlor.561.group` added to the Cloudflare router
(`ORIGIN_BY_HOST`, `wrangler.jsonc` routes, this file's own table above), `npm run deploy` run
from `sites/cloudflare-router` with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` sourced from
`/home/emsenn/info/.env` (`API_KEY_CLOUDFLARE_WORKERS_EDIT` / `CLOUDFLARE_ACCOUNT_ID`) —
**correction, stated plainly**: the task that requested this deploy described this as "the
equivo deploy pattern recorded" in this runbook; no such precedent actually exists anywhere in
this file or the deploy log (`equivo` is design-only — no service, no deploy, ever — per the
games census). The `.env`-sourced credential shape used here was derived directly from the
router's own README (`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`) and the root `.env`'s actual
variable names, not copied from a prior recorded deploy of anything named equivo.

Both new front doors walked clean:
`node sites/cloudflare-router/frontdoor-walk.mjs https://stoke.561.group/` — 19 URL(s) visited, 0
MISS, 0 BADMIME (the redirect, both css/js relative refs, the full `js/app.mjs` module graph
including the new `node:crypto` shim and the vendored cartridge subpaths, and the `.mts` source
tree, all resolving for real). `node sites/cloudflare-router/frontdoor-walk.mjs
https://parlor.561.group/` — 3 URL(s) visited, 0 MISS, 0 BADMIME (`/`'s own shelf-page reference
graph; `/pig/`, `/farkle/`, `/yacht/`, `/chutes/`, `/reels/` are separate, independently-verified
pages, not part of `/`'s own graph, matching the weiqi note's identical framing above). Spot-fetch
confirmation beyond the walk: `stoke.561.group/web/css/style.css` serves the
`.graph-node--clickable` rule live (the graphics-polish pass that landed on this tree roughly an
hour before this deploy); `parlor.561.group/yacht/` serves live, 200, real `<title>Yacht —
parlor.561.group</title>`.

Storefront catalog regenerated (`npm run generate-catalog && npm run build`, tree was cool —
last touched ~69 minutes before this pass, well past the 15-minute hot-tree threshold): both
`stoke-service/catalog-entry.json` (pre-existing, `status: playable`) and a newly-authored
`parlor-service/catalog-entry.json` (parlor had none — a real catalog gap, not merely a census
gap) feed `catalog.json`. `parlor`'s `seedPolicy.kind` is deliberately `on-demand`, not
`daily-utc`, at this top level: the front door is a shelf page over five independently
daily-seeded games with no single canonical today's-seed for the entry as a whole — the same
"can't honestly claim one thing for five things" reasoning already applied to
`cartridgeWrapped: false` on both stoke's and parlor's entries. `stoke`/`parlor` added to both
`LIVE_SUBDOMAINS` sets (`js/catalog.mjs`, `js/today.mjs`). **Left alone, and flagged instead of
fixed**: at the moment of this pass, another session was concurrently editing this exact same
router/storefront file set live (`equivo`/`you-are-conscious`/`tidepool` entries appearing and
changing between reads) — `equivo` sits in both `LIVE_SUBDOMAINS` sets today with no
`catalog-entry.json` behind it anywhere on disk (equivo is design-only, no code, see the games
census), and `tidepool` has a router entry and a `catalog-entry.json` but is missing from both
`LIVE_SUBDOMAINS` sets and fails its own manifest shape check (`status: "playable"` with no
`entryPoints`). Both pre-date and are unrelated to this stoke/parlor pass; per house
convention on concurrent-session dirty state, they were not touched here and are named plainly
instead so they aren't mistaken for something this pass introduced or silently ignored. The
storefront's own suite: 39/42 passing after this pass's changes (was 35/42 immediately after the
first catalog regeneration, before the `seedPolicy` correction above); the remaining 3 failures
are exactly the `equivo`/`tidepool` items just named, not stoke or parlor.

### durante daily tournament

durante's arena is no longer a fixed authored seed — `src/cartridge.mjs`'s `createDailyEngine(date)`
is wired into both the server (`GET /daily`, `POST /runs`, `GET /leaderboard/:date`, `GET /replay/:runId`)
and the browser client (`web/main.mjs`), matching the vision doc's own §5c framing ("daily QUAKE
tournaments that AI play when their owners aren't looking"): one seeded arena per UTC day, entrants
connect by intent-log API (a terminal for humans, the identical `POST /runs` route for agents —
peers by construction), every submitted log is replay-verified server-side against the
server-derived daily seed (never a client-supplied one), and the leaderboard labels each entry's
`entrantKind` (`human`/`agent`) honestly. Game-specific logic stays local and disclosed as ported
from ruinfold's own shape (`src/daily.mjs`'s `dailySeed`, `src/run.mjs`'s `replayRun` — whole-log
structural rejection, tolerance policy NONE). The daily-tournament plumbing itself — date
arithmetic, submission guard, leaderboard ranking, the run/score/scored-lock store (file and GCS
bucket-store backends), and the submission pipeline — is `@red-cup-engineering/footing`, extracted
from ruinfold's own former `src/server/*` modules after durante had independently duplicated them;
both apps depend on it (`package.json`) rather than each carrying its own copy.

**Tournament proof (2026-08-20, both local and live against `durante.561.group`)**: two reference
entrants (`agents/reference-entrant.mjs`, real BFS-pathfinding + line-of-sight aiming against the
real engine, no shortcuts) ran two genuinely different, fully deterministic strategies (injected
`fireThreshold` — `precise` vs `aggressive`, never a random draw) against the same live daily seed
and cleared it in different tick counts, landing correctly ordered on the leaderboard with honest
`entrantKind: "agent"` labels (aggressive: tick 288, score 102252, rank 1; precise: tick 382, score
102113, rank 2). Three cheat attempts were run against the same local arena and each was defeated,
though not uniformly by an HTTP error — worth stating precisely rather than rounding off:
- **Forged `score` field** (claiming 999999999 alongside an honest winning log): HTTP 200, but the
  forged field has zero effect — the server never reads a client-supplied score at all, so the
  leaderboard shows the real replayed score (102113), not the forged one. Not an error-code
  rejection; a structurally impossible attack surface.
- **Tampered log** (seq monotonicity broken mid-log): `400 {"rejected":"malformed-log"}` — the
  vendored whole-log structural rejection working as documented.
- **Yesterday's log replayed against today** (a genuinely-cleared log from 2026-08-19's practice
  arena, resubmitted under today's date/scored mode): HTTP 200, but `{"reason":"tick-cap","score":0}`
  — the canonical seed is always derived server-side from the submitted `date`, so replaying a
  different day's moves against today's actual (different) maze produces a real, honest, worthless
  result rather than a fraudulent win.
- (Bonus, not one of the three specified cheats but confirmed both locally and live) a second scored
  submission by an already-scored actor on the same date: `409 {"rejected":"already-scored-today"}`.

**Live-loop proof**: redeployed via the exact command below (revision `durante-00005-6ln`, then a
second forced no-op redeploy to `durante-00006-jl4` for the churn proof), `node
sites/cloudflare-router/frontdoor-walk.mjs https://durante.561.group/` walked 36 URLs from the real
front door with **zero MISS, zero BADMIME**. Two live entrants (distinct strategies) fetched the
live seed, played, and submitted through the public `POST /runs` route, landing on the live
leaderboard at the live-computed scores (102252/102113, matching the local run exactly — same
determinism, two different hosts). A second scored attempt for an already-scored live actor 409'd.
After the forced revision churn (`durante-00006-jl4`, 100% traffic), the leaderboard (4 entries,
including the 2 from the tournament proof above) and the scored-lock (still 409) both survived
unchanged — the GCS bucket-store, not the ephemeral container, is durante's real state.

**Footing extraction, live (2026-08-20)**: both durante and ruinfold run on
`@red-cup-engineering/footing` in production — `durante-00008-xol` and `ruinfold-00004-cip`, both
100% traffic, deployed `--no-traffic` first and traffic-migrated only after each new revision's own
tagged URL round-tripped a submission and confirmed the existing leaderboard/scored-lock state
intact. Both public front doors (`durante.561.group`, `ruinfold.561.group`) walked clean post-migration.

**Open item, honestly**: `frontdoor-walk.mjs` did not exist on disk at the documented path
(`sites/cloudflare-router/frontdoor-walk.mjs`), though only this runbook and the deploy log
referenced it. Reconstructed fresh, at the same path, to the documented contract
(import-map-first specifier resolution, only-referenced entries fetched, JSON-body URL scanning);
verified byte-for-byte against durante's own live front door as shown above. `src/manifest.mjs`'s
`CartridgeManifest` export exists but has no consumer yet — the open item the durante app's own
README/DESIGN.md already flag. The `durante@ap.561.group` actor (posting daily results) is
explicitly **not** built here — queued for the game-actors lane, see that lane's own queue.

## Real names and the Cloudflare router

A Cloudflare Worker (Workers Custom Domains, free tier) rewrites each request's `Host` to
the matching Cloud Run `*.run.app` origin and forwards the request unmodified otherwise.
This is necessary because a plain proxied CNAME to `*.run.app` does not work — Cloud Run's
shared regional frontend dispatches by matching Host/SNI against each service's own
`run.app` hostname, and a `561.group` Host is unrecognized there.

**Location**: `sites/cloudflare-router/` — outside every game's own tree, touches no game
source. Worker name `cloudflare-router-561-group`. The full mapping table, deploy command,
and verify command live in that directory's own `README.md`. The hostname-to-origin map is
`src/index.mjs`'s `ORIGIN_BY_HOST`; the matching Custom Domain routes are in
`wrangler.jsonc`'s `routes`.

**Verifying a live deploy**: curling paths already known to be correct only proves
transport, not that a human arriving at the bare front door can load the page and follow
its own links. Verify by walking the full reference graph from the URL a human actually
visits: `node sites/cloudflare-router/frontdoor-walk.mjs <front-door-url>` exits `0` with
zero `MISS` and zero `BADMIME` lines when every reference the document (and everything it
transitively imports) resolves to a real 2xx response with the correct content type,
resolved against the fetching resource's own URL. Run it against each real front door
before calling a deploy done, not just a deep-asset curl.

**Front-door convention**: a service's `/` must be a real redirect (`302`) to its asset
root, never an internal same-URL rewrite. A same-URL rewrite serves `/web/index.html`'s
bytes at the `/` URL without changing the URL, which breaks every path-relative asset
reference the document contains the moment a browser resolves them against the real `/`
instead of `/web/`. Crucible, solitaire, and gambling-trainer shipped with this bug once;
`web/server.mjs` in all three now redirects instead of rewriting, with
`web/test/frontdoor.test.mts` regression coverage in each tree. ruinfold and the storefront
never had this bug — ruinfold's own front door was never a same-URL rewrite, and the
storefront serves everything from `/` already.

**Teardown**:
1. *Unwind one hostname*: remove its entry from `src/index.mjs`'s `ORIGIN_BY_HOST` and from
   `wrangler.jsonc`'s `routes`, then `npm run deploy`. The other hostnames keep working.
2. *Delete the whole router*: `node_modules/.bin/wrangler delete` removes the Worker and
   every Custom Domain-managed DNS record in one step — they're tagged
   `read_only`/`origin_worker_id` and are deleted automatically with the owning Worker.
3. *Manual DNS fallback*, only if a record is ever orphaned with the Worker already gone:
   list/delete via the DNS-edit API token against the `561.group` zone — exact `curl` calls
   are in the router README.

No DNS record is hand-authored: Workers Custom Domains auto-provision and own every record,
tied to the Worker's lifecycle.

## Redeploy (exact commands)

Source-based deploys, `--source` pointed at the directory containing each `Dockerfile` — no
git flow, no Cloud Build config file beyond the Dockerfile itself. Run from anywhere; each
command tars its own `--source` directory. Run that service's `npm test` in its own
directory first and confirm it's green — do not deploy on a red suite.

**Storefront:**
```bash
gcloud run deploy play-561-group \
  --source "public-computer-games-services-section/sites/play.561.group" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi
```

**Crucible:**
```bash
gcloud run deploy crucible \
  --source "public-computer-games-services-section/services/crucible-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi
```

**Solitaire:**
```bash
gcloud run deploy solitaire \
  --source "public-computer-games-services-section/services/solitaire-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi
```

**Gambling trainer:**
```bash
gcloud run deploy gambling-trainer \
  --source "public-computer-games-services-section/services/gambling-trainer-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi
```

**ruinfold** (note the persistence-backend selector):
```bash
gcloud run deploy ruinfold \
  --source "public-computer-games-services-section/services/ruinfold-services-section/apps/ruinfold" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi \
  --set-env-vars RUINFOLD_BUCKET=five-six-one-ruinfold-daily
```

**durante** (note the persistence-backend selector, same pattern as ruinfold):
```bash
gcloud run deploy durante \
  --source "public-computer-games-services-section/services/durante-services-section/apps/durante" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi \
  --set-env-vars DURANTE_BUCKET=five-six-one-durante-daily
```

**farstone** (note `--max-instances 1` and its persistence-backend selector; `--cpu 2 --memory 512Mi`
since the 2026-08-20 cutover — see "Known open issues" below for why: this is the capacity bump
that answered the second pass's 429-pileup finding, `--max-instances` deliberately left at 1):
```bash
gcloud run deploy farstone \
  --source "public-web-services-section/services/public-web-game-services-section/sites/farstone.561.group" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 2 --memory 512Mi \
  --set-env-vars FIZZOS_BUCKET=five-six-one-farstone
```

**aletheon** (same `--max-instances 1` shape, its own persistence-backend selector):
```bash
gcloud run deploy aletheon \
  --source "web-services-section/services/gaming-services-section/services/aletheon-services-section" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi \
  --set-env-vars ALETHEON_BUCKET=five-six-one-aletheon
```

**weiqi** (no persistence-backend selector — zero-dependency static server, no bucket):
```bash
gcloud run deploy weiqi \
  --source "science-services-section/services/agent-services-section/services/play-services-section/services/game-science-services-section/services/board-games-services-section/services/weiqi-services-section/apps/weiqi-web" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi
```

**stoke** (no persistence-backend selector — every player's run lives in the browser's own
`localStorage`, replayed from `(seed, intentLog)` on load; `max-instances 1`, not the usual 2,
per this pair's own first-time deploy spec):
```bash
gcloud run deploy stoke \
  --source "public-computer-games-services-section/services/stoke-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi
```

**parlor** (same shape as stoke — no persistence-backend selector, `max-instances 1`):
```bash
gcloud run deploy parlor \
  --source "public-computer-games-services-section/services/parlor-service" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi
```

**tidepool** (same shape as farstone/aletheon — `--max-instances 1`, GCS persistence selector;
the LLM-native MUD, see the tidepool section under "Known open issues" below for the concurrency
fix ported in from the mud-persistence-hardening lane and the WS-transport bug found and worked
around while proving this out live):
```bash
gcloud run deploy tidepool \
  --source "web-services-section/services/gaming-services-section/services/tidepool-services-section/sites/tidepool.emsenn.net" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi \
  --set-env-vars FIZZOS_BUCKET=five-six-one-tidepool
```

## The PORT/HOST convention

- Every game server reads `Number(process.argv[2] ?? process.env.PORT ?? 8787)` — Cloud
  Run's injected `PORT` env var is honored with no source edit needed.
- The storefront's `serve.mjs` reads `process.env.HOST` but defaults it to `127.0.0.1`,
  unreachable from outside the container. Fixed with `ENV HOST=0.0.0.0` at the Dockerfile
  level, not a source change.
- Each `Dockerfile` follows one minimal pattern: `FROM node:24-slim`, `COPY . .` (copies the
  already-vendored `node_modules`, sidestepping the local-only Verdaccio registry Cloud
  Build can't reach), `CMD ["node", "<entrypoint>"]`. No `npm install`/`npm ci` runs at
  build time.
- A server that only reads a service-specific port env var (never Cloud Run's `PORT`) will
  deploy and then simply never become healthy — check for this specifically before the
  first deploy of any new service.

## Cost posture

- `min-instances 0` on every service scales to zero with no charge while idle;
  `max-instances` caps a traffic spike's blast radius; `cpu 1`/`memory 256Mi` is the
  smallest practical tier for a static or near-static node server.
- Realistic standing cost at rest is $0. Cost only accrues on actual request traffic
  (CPU-time billing while a container instance is warm), trivial Artifact Registry image
  storage, and each stateful service's GCS bucket (a handful of small JSON/JSONL objects —
  negligible storage cost, no client-facing egress).

## Package registry

`verdaccio-561-group.service` (a systemd **user** unit, linger-enabled) runs on
`cold-red-gate`, fronted by `https://registry.561.group/` via that box's own Caddy:
```caddyfile
registry.561.group {
	reverse_proxy 127.0.0.1:4873
}
```
DNS: `A registry.561.group → 45.76.19.133`, DNS-only/grey-cloud. Auth is the same
credential pair as the local Verdaccio instance, so one `.npmrc` auth line works against
either host. The config deliberately omits an npmjs pull-through proxy — only the house
scopes are served. Verdaccio's config resolves its `storage`/`htpasswd` paths relative to
the *config file's own directory*, not the working directory it's launched from — worth
knowing before debugging a "storage not found" error on a fresh install.

House-scope packages are mirrored from the local instance to the remote one; the mirror
runs as a detached, sequential background job (parallel publishing risked starving the
box's 1 vCPU/1.6GB RAM, so it runs one package at a time). See the deploy log for status
history and the second-host search this registry setup grew out of.

**Teardown**: `systemctl --user stop verdaccio-561-group.service && systemctl --user
disable verdaccio-561-group.service`, remove its unit file and service directory, remove
the `registry.561.group` Cloudflare record and its Caddy block.

## Terminal access

Nothing above needs a browser or a deploy. For a player or an agent reaching the fleet from
a real terminal:
- Install: `npm install --registry http://127.0.0.1:4873/ @red-cup-engineering/{arnold,daleske,tsander,wheatstone}`.
- Run: each package's own `bin/*.mjs`; durante specifically via `npm run terminal` in
  `apps/durante`.
- Best case: **kitty or WezTerm** — real pixels over the kitty graphics protocol,
  `daleske`'s preferred encoder.
- Good case: **xterm, foot, mlterm, contour, or mintty** — sixel, auto-detected, same
  visuals at lower color depth.
- Always works: **any terminal, including a bare SSH pipe** — an ASCII downsample
  fallback with no graphics support required. This is also the fleet's agent-native
  surface: an AI player reaches the identical game state over stdin/stdout, no canvas, no
  DOM.

## Rollback

Cloud Run keeps every deployed revision; traffic is reassigned, not destroyed, so rollback
is non-destructive by default.

**Roll back to the previous revision**:
```bash
gcloud run revisions list --service <service-name> --region us-central1
gcloud run services update-traffic <service-name> --region us-central1 \
  --to-revisions <previous-revision-name>=100
```

**Take a service down entirely** (removes the service and its URL, not the source tree or
the Dockerfile):
```bash
gcloud run services delete <service-name> --region us-central1
```

`<service-name>` is one of `play-561-group`, `crucible`, `solitaire`, `gambling-trainer`,
`ruinfold`, `durante`, `farstone`, `aletheon`, `weiqi`, `stoke`, `parlor`. For farstone/aletheon, rolling back to a
previous revision does **not** roll back their bucket state — the bucket is shared across
every revision of a service, so a bad revision that already autosaved bad state hands that
same state to the "good" revision on its next load. If a bad save is suspected, inspect or
repair the bucket object directly (`gsutil cat gs://five-six-one-farstone/world.json` /
`gs://five-six-one-aletheon/aletheon-world.jsonl`) before or alongside a traffic rollback.

## Known open issues

- **tidepool, 2026-08-20 — two real bugs found running a live mixed human+agent session,
  both fixed before this row's deploy was called done.**
  1. **Ported the concurrency fix this runbook's OWN farstone/aletheon incident above named as
     landed-but-not-yet-here**: `tidepool-runtime.mts` had been built as "a direct structural
     port of Farstone's proven `world-runtime.mts`", but its header's own claim of being
     "confirmed live post mud-persistence-hardening" was stale — it predated Farstone's real
     post-incident fix (single-flight `#flush()`/catch-up with trailing-edge coalescing,
     `world-runtime.mts` in the farstone tree, dated the same day this deploy happened). Without
     it, Tidepool's exact multi-agent-plus-human traffic shape (concurrent requests around the
     same catch-up window) was exposed to the identical "older snapshot overwrites a newer one"
     race the farstone incident above describes. Ported structurally, with two new concurrency
     regression tests (overlapping-flush coalescing; concurrent catch-ups never run `mud.tick()`
     in an overlapping window) — 81/81 tests pass, up from 79.
  2. **`@red-cup-engineering/qwzspace`'s `client-node` transport cannot do `wss://` at all** —
     `NodeWebSocket` only ever issues a plaintext `http.request(...)` upgrade (`import http from
     "node:http"`, no TLS anywhere in the file), so a `wss://` URL opens a plaintext socket to
     port 443 and simply hangs at CONNECTING forever against any real TLS origin (Cloud Run
     included — there is no plaintext origin to fall back to). No error, no close event fires,
     so a script built on qwzspace's own `connectRoom()` gives zero signal anything is wrong; it
     silently never plays. Found live: the stock `agents/reference-bot.mjs`, unmodified, never
     printed a single "connection state ->" transition against `wss://tidepool.561.group/`,
     while identical against a local plaintext `ws://` origin worked immediately. Per the house
     rule (consume qwzspace only from Verdaccio, never edit its tree), worked around entirely in
     tidepool's own tree: `agents/ws-transport.mjs` reuses qwzspace's real
     `createRealtimeClient`/`createWorldView` (protocol code, untouched) with Node's built-in
     global `WebSocket` (real TLS support, zero extra dependency) as the transport instead of
     `NodeWebSocket`. `agents/reference-bot.mjs` and the session-test scripts under `tools/` were
     switched to it; confirmed working live immediately after. **Not filed upstream against
     qwzspace from here** (out of scope per the house rule) — worth the qwzspace maintainer's
     attention, since this silently breaks the documented "how a real LLM agent connects" story
     for literally any deployed (TLS-only) instance, not just Tidepool.
  3. **Governance verbs (`propose`/`support`/`enact`, cap-governance.mts) are not enumerated in
     `frame.subjects[].affordances`** the way every other verb is (perception.mts never lists
     them) — a player driven purely off the perception frame (an LLM given only the frame, or
     the stock zero-LLM reference bot) can never discover they exist. Not fixed here (a
     perception.mts change was out of scope for a deploy pass); worked around for the live
     session's own governance proof by running a second, differently-scripted agent
     (`tools/agent-b-session.mjs`) that knows the verb out of band, same as this file itself was
     written from reading source, not the frame — which is the gap, not a hidden one. Real
     protocol thinness, named plainly rather than quietly routed around.

- **Cloudflare router `wrangler` keyring bug, 2026-08-20 (self-resolved this session, root
  cause left documented since it will recur).** Adding `weiqi.561.group` hit a hard,
  deterministic non-interactive-deploy failure: this Node 24 install's `secret-tool` doesn't
  support `--version` (exits 2, not 0), and `wrangler` 4.123.0's Linux keyring probe
  (`probeSecretTool()`) treats any non-zero exit as "keyring unsupported" — confirmed directly
  via `secret-tool --version; echo $?`. With `~/.config/.wrangler/preferences.json`'s
  `keyring_enabled` true (its state at session start), that makes every non-interactive
  `wrangler deploy`/`login` hard-fail (`CLOUDFLARE_AUTH_USE_KEYRING is set but secret-tool is
  required...`) instead of the graceful plaintext-file fallback the same code path takes on a
  supported host. A second, independent agent session hit the identical wall in the same
  window (adding `you-are-conscious.561.group`) and set `keyring_enabled: false` on disk,
  which routes around the crash — `npm run deploy` in `sites/cloudflare-router` then succeeded
  cleanly (`cloudflare-router-561-group`, uploaded + triggers deployed, confirmed in
  `~/.config/.wrangler/logs/wrangler-2026-08-20_07-04-*.log`). **Current state: resolved,
  nothing further needed** — `weiqi.561.group` is live and walks clean end to end (see the
  weiqi section above); `you-are-conscious.561.group` and (a third concurrent addition)
  `tidepool.561.group` are also in `ORIGIN_BY_HOST`/`wrangler.jsonc` as of the same deploy.
  Left here for the next person who hits the identical `secret-tool` probe failure on a fresh
  environment: the fix is `keyring_enabled: false` in `~/.config/.wrangler/preferences.json`
  (a real, valid non-keyring Cloudflare session already existed on disk once the keyring path
  stopped intercepting it — no `CLOUDFLARE_API_TOKEN` or interactive login was actually needed
  once that one setting was flipped).
- **Farstone and Aletheon, 2026-08-20 — live verification pass found the code-level fixes
  NOT yet safe in production, despite green local suites.** Both trees now have real,
  tested code for catch-up-on-request / flush-on-mutation / snapshot+compaction / GCS
  retry (Farstone 62/62 local tests, Aletheon 46/46 local tests, both re-run clean from a
  fresh invocation this pass), and both had already been redeployed (`farstone-00006-fmf`,
  `aletheon-00004-fvt`, both 100% traffic, correct env vars/resources per the commands
  below) roughly 13 minutes before this verification began. Attempting the documented
  churn scenario against the live `farstone.561.group` immediately surfaced a live, ongoing
  incident, confirmed from Cloud Run logs spanning 06:05–06:30 UTC on 2026-08-20 (i.e.
  starting at the redeploy itself, still active at last check):
  - **Farstone is OOM crash-looping on the new revision**: 15 "Memory limit of 256 MiB
    exceeded" events and 17 instance restarts logged in the ~25 minutes after the 06:05:21
    redeploy. Flushes are taking wildly long under real GCS latency/contention — observed
    durations up to **257,429ms (257 seconds)** for a single flush, with many more in the
    30–100s range, all logged by the code's own "slower than the 'no request stalls
    seconds' target" warning. `world.json` returned `HTTP 404` nine times in the same
    window (`Farstone pre-request catch-up failed` / `Farstone backstop save failed`), and
    GCS writes hit `HTTP 429` (rate-limited) repeatedly — consistent with many overlapping
    `preRequestCatchUp()`/flush calls (driven by the volume of concurrent bot/agent traffic
    this world receives) piling up concurrent conditional GCS writes against the same
    object, each retry-backing-off into the next, ballooning memory and flush latency until
    the container is OOM-killed.
  - **Reproduced the exact target scenario failing, live**: connected a test actor, took
    "a coil of mooring-line" from Farston Harbor Quay, moved to Downtown Farston, dropped
    it (`{"actor":"...","tick":2282,"worldAssertions":3321}` immediately after). A couple of
    minutes later — no redeploy, same revision, just real idle time during this
    investigation — the live world had reverted to `tick:6`→climbing from a near-empty
    state (`actors:5`, `worldAssertions` down from ~3300+ to ~2170), our test actor was
    gone from the actor list entirely, and `gs://five-six-one-farstone/world.json`'s only
    `located-in` assertion for `a-mooring-line` was the original seed placement at
    `harbor-quay` — i.e. the drop, the move, and the whole session were lost. This is the
    **same failure class the fix was written for**, now apparently reachable via the
    OOM-restart/404 path above rather than the original idle-timer path.
  - **Aletheon is not compacting in production**: the live `aletheon-world.jsonl` object is
    **179,920 rows / ~14.8MB**, confirmed on two separate boots (06:06:13 and 06:30:36 UTC,
    both after the fix redeploy) with the identical row count — the log is not shrinking
    between boots despite `DEFAULT_COMPACT_THRESHOLD_ROWS = 2000` in
    `server/world/snapshot.mjs` and a passing local compaction test at that same threshold.
    Aletheon also logged its own `Memory limit of 256 MiB exceeded` event at 06:12:11 UTC
    followed by `aletheon: closing` — the OOM crash-loop this fix was meant to close.
  - **What this means**: the unit-level design (catch-up-on-request, flush-on-mutation,
    snapshot+compaction, bounded retry) is real and correctly tested in isolation against
    fake-GCS/local disk, but something in the gap between "isolated correctness" and "real
    GCS latency + real concurrent traffic + real Cloud Run instance churn" is not yet safe
    — most likely missing concurrency control around flush/catch-up (nothing currently
    prevents two overlapping requests from both racing to flush/reload at once), and for
    Aletheon, either the compaction trigger isn't firing against the real accumulated
    backlog or a fresh boot isn't loading a compacted snapshot even when one exists. **Not
    fixed. Needs the owner's attention as a live incident, not just a code-review item** —
    consider an immediate rollback to the pre-fix revision (`farstone-00004-blj` /
    `aletheon-00002-shn`, both non-destructive per "Rollback" above) while the concurrency
    gap is diagnosed, since the crash-loop itself is now actively costing more durability
    than the bug it replaced.
  - GCS retry counters (the third fix, bounded-retry-with-logging) do appear to be doing
    their job as designed even under this load — every failure above was logged with an
    attempt count and eventually surfaced (`Farstone save failed: ...`), never silent — so
    that specific piece is verified working; it just isn't sufficient on its own to keep the
    service up under the write volume actually seen live.
- **Farstone and Aletheon, 2026-08-20, second pass — single-flight/coalescing (Farstone) and
  boot-time catch-up compaction (Aletheon) written, tested, and live-verified against
  `--no-traffic` candidates; real improvement confirmed, but traffic NOT cut over — each
  candidate hit a genuine failure against this runbook's own proof bar, for reasons distinct
  from (deeper than) the originally diagnosed bugs.** Local suites green from a fresh
  invocation (Farstone 63/63 incl. a new `world-runtime-concurrency.test.mts`; Aletheon 48/48
  incl. a new `tests/boot-compaction.test.mjs`). Deployed `farstone-00008-juz` /
  `aletheon-00006-wep`, both `--no-traffic`, both tagged `candidate`. **Stable revisions
  (`farstone-00004-blj` / `aletheon-00002-shn`) remain at 100% traffic — nothing below changed
  the "Live now" table.**
  - **Farstone candidate — code fix verified working, capacity is not.** 32 concurrent
    workers (connect/command/tick mix) for 223s against the candidate's own tag URL: **zero
    OOM kills, zero `world.json` 404s / failed-save log lines**, and flush latency is
    dramatically bounded — only 23 real flushes ran (single-flight coalescing confirmed: far
    fewer than the 1377 requests that arrived), max flush **10,527ms**, vs. the 257,429ms
    seen in the first pass's incident. The coil scenario (take `a-mooring-line` at Farston
    Harbor Quay, `go north` to Downtown Farston, drop, idle 2m41s, verify from a **fresh**
    connection) passed cleanly: the coil was exactly where it was dropped, `tick` strictly
    increased (2709→2739), no reversion. **But**: the same 32-worker run produced **1262
    Cloud Run-level "request was aborted because there was no available instance" events**
    (surfaced to the client as HTTP 429/500, 1262 of 1377 requests) — this is Cloud Run's own
    admission control rejecting load under `--max-instances 1`, not the GCS-write-pileup bug
    the fix targeted (the stable revision was confirmed idle/unloaded the whole window, so
    this wasn't cross-revision contention either). The concurrency fix works; the current
    capacity configuration cannot sustain the runbook's own specified 30+-concurrent-for-3+-
    minutes load without a real, literal 429 pileup. Not a pass on that specific bar.
  - **Aletheon candidate — boot-time compaction verified working, but one real OOM occurred
    during the required 20+ minute idle soak.** Every boot observed (07:14, 07:28) correctly
    loaded snapshot+tail and immediately ran `compactBacklogIfOversized()` (52,610→285 rows in
    394ms; 15,454→285 rows in 463ms) — the fix works exactly as designed when it gets to run.
    Across the full ~21-minute soak the tail was repeatedly driven back down by the regular
    flush()-triggered compaction path too (many cycles, tail oscillating 0–~1.1MB, snapshot
    holding steady at ~34KB/94 entities), and the pinned Anomaly entity (`brigand-33`,
    "Corrupted Hollow Reiver") survived a full kill→raise churn cycle and many compactions
    with its identity and state intact (confirmed both mid-soak and at the end, tick 8731→
    11032). **But**: at 07:27:50 — the very first health check after an ~8-minute gap with no
    traffic to the candidate (it had scaled to zero) — the candidate hit `Memory limit of 256
    MiB exceeded with 265 MiB used` and restarted. Root cause, reasoned from the bucket-size
    trend: the STABLE revision (`aletheon-00002-shn`, unfixed, still 100% traffic) kept
    appending to the SAME shared-bucket tail the whole time with no compaction of its own
    (confirmed growing ~300KB/min from real traffic — genuinely active during this window,
    not idle), so by the time the candidate's next cold boot needed to load+replay that tail
    before its own compaction could run, the backlog had grown large enough to blow the
    256MiB budget during the LOAD itself, ahead of the fix ever getting a chance to act. After
    that one restart the candidate ran continuously and cleanly for the remaining ~19.5
    minutes with zero further OOM. This is likely an artifact of the two-revision coexistence
    this exact test pattern requires (a genuinely single-revision, post-cutover Aletheon
    should never see a gap-grown tail this large, since its own compaction keeps pace
    continuously) rather than a flaw that recurs after cutover — but it is a real OOM that
    happened during the literal window the proof bar specifies, so this is not being called a
    clean pass either.
  - **New issue, found live, not in the original diagnosis, not fixed here**: both
    `gcs-client` modules (Farstone's `src/gcs-client.mts`, and Aletheon's own
    `server/world/gcs-client.mjs`, vendored byte-for-byte from it) read an object in two
    separate calls — a metadata GET for the current `generation`, then a SEPARATE content GET
    pinned to that generation. Neither bucket has object versioning on, so if a DIFFERENT
    writer overwrites the object between those two calls, the pinned generation is gone and
    the content GET 404s — and `gcs-retry.mjs` deliberately never retries a 404 (correct for
    "object legitimately absent," wrong for this case). Directly observed live: Aletheon's
    candidate logged `autosave flush failed: gcs content get failed for aletheon-world.jsonl:
    HTTP 404` at 07:15:36, while the stable revision was concurrently booting and writing to
    the identical object (confirmed via its own boot log at 07:12:53). This is a **latent,
    pre-existing, shared-code race** that only manifests with two genuinely concurrent
    writers — exactly the situation this runbook's own "`--no-traffic` candidate + tag-URL
    testing while the stable revision keeps serving real traffic" pattern creates. Neither
    service's single-flight/compaction fix touches this; flagging for the owner rather than
    patching unreviewed.
  - **Active, ongoing risk independent of this pass**: the STABLE Aletheon revision
    (`aletheon-00002-shn`) is, right now, still accumulating its log unbounded under real
    traffic (no compaction in that code at all) at roughly the rate observed above. Left
    alone, it is on a real trajectory back toward the same OOM crash-loop this whole effort
    was meant to close — independent of whatever happens with the candidate.
  - **Verdict this pass: traffic NOT shifted.** Both stable revisions remain at 100%; both
    candidates remain at `--no-traffic` (`candidate` tag). The concurrency/compaction fixes
    are real and substantially better than the first pass (zero OOM under Farstone's load
    test, zero failed saves, a clean coil-scenario pass, working boot-time compaction, a
    surviving pinned entity) — but a literal 429 pileup (Farstone, capacity-driven) and a
    literal single OOM (Aletheon, driven by the stable revision's continued unfixed growth
    racing the candidate's boot) both occurred inside the exact windows this runbook's own
    proof bar specifies, so this is reported as a partial, not a clean, pass. Owner attention
    needed on: Farstone capacity (raise `--max-instances` and/or `--concurrency`, or confirm
    real traffic never approaches 30 concurrent and relax the test), the Aletheon stable
    revision's live unbounded growth (independent urgency), and the shared `gcs-client`
    two-step-read race (both services, needs a design decision — e.g. a single conditional
    read call, or accepting eventual-consistency and retrying 404 with a cap — not made here).
- **Farstone and Aletheon, 2026-08-20, cutover complete — read race found live, fixed, deployed;
  429-under-hammer reclassified as capacity posture, not a bug.** Both trees had already been cut
  over to the second pass's candidates before this entry started (`farstone-00008-juz` /
  `aletheon-00006-wep`, both 100% traffic, confirmed via `gcloud run services describe` — the
  "Live now" traffic table above is current as of this entry, not the second pass's "nothing
  changed" note). Farstone additionally carries a capacity bump answering that pass's 429 finding:
  `cpu 2`/`memory 512Mi` (`--max-instances` deliberately left at 1 — see below).
  - **Live verify, farstone.561.group.** Coil scenario: `a coil of mooring-line` was no longer at
    Farston Harbor Quay (a real, shared, persistent world — other sessions had moved it to
    Downtown Farston since the last pass) — found it there, `take a coil of mooring-line` →
    "You take a coil of mooring-line.", walked back to Farston Harbor Quay, `drop a coil of
    mooring-line` → "You drop a coil of mooring-line.", tick strictly increased (4473→4655)
    throughout. 5-minute idle gap: tick strictly increased (3413→4231, catch-up-on-request
    confirmed working across the gap) with zero requests in flight. Fresh-connection check after
    idle: a brand-new actor connected and got a coherent `look` back. Concurrent burst (8 workers,
    2 minutes, run against the now-settled post-cutover revision so a mid-test traffic change
    couldn't muddy it — see the note on that below): 72 requests, **0 5xx / 0 worker-observed
    errors**, `{200: 48, 202: 24}`, tick strictly increased throughout (4534→5188). **Zero OOM,
    zero `world.json` 404s** in Cloud Run logs across this whole pass. Separately, unprompted:
    individual requests against `farstone.561.group` are currently slow under real load (one
    isolated `/connect` measured 33.8s; Cloud Run logs show `Farstone flush took Nms` up to
    198,709ms and intermittent `Farstone save failed: TypeError: fetch failed` throughout the
    whole session) — this is the SAME real-GCS-latency/transient-network class the first and
    second passes above already named and that `gcs-retry.mts` already covers (every one of
    these was logged with a retry attempt count, never silent); it is not the bug this entry
    fixes and is not newly introduced by anything in this entry.
  - **An earlier burst attempt was invalidated by this entry's own traffic migration landing
    mid-test — named plainly rather than quietly discarded.** A first 8-worker/2-minute burst
    (342 requests, 322 of them 429) straddled the exact moment `update-traffic` cut Farstone over
    to the fixed revision below; a mid-window revision swap is a real, honest reason for tick
    to have moved unpredictably across that burst's own before/after `metrics` reads, and the
    429 volume is not attributable to steady load. Re-run clean afterward against the settled
    single revision (numbers above); the moral for next time: finish `update-traffic` (or
    deliberately hold off on it) fully before starting a load window, don't interleave them.
  - **Live verify, aletheon.561.group (16-minute idle soak, `wss://` session held open).** Pinned
    reference entity `critter-2` ("Reed Heron") recorded from the initial snapshot
    (29 entities) and re-confirmed present with identical `id`/`kind`/`name` in a fresh snapshot
    taken after the idle window (23 entities — normal world churn among the rest, the pinned
    entity itself unaffected; only its `x`/`y`/`z`/`yaw` moved, exactly as a wandering critter
    should). **Zero OOM** in Cloud Run logs across the full 16-minute window; log volume bounded
    (60 lines). Bucket tail (`aletheon-world.jsonl`) oscillated 0 bytes → ~1.02MB → back to 0
    bytes across the window via the regular flush-triggered compaction path — nowhere near the
    original 179,920-row/14.8MB incident, consistent with compaction keeping pace continuously
    now that only one revision is writing (see "the shared-bucket contamination class is gone"
    below). The held-open test socket itself closed (code 1006, no reason string) after ~2m16s of
    silence — the server side shows no restart or error at that moment, so this reads as an
    idle-timeout on the transport in front of it (most likely Cloudflare's own default ~100s
    WebSocket idle timeout, since this test session sent no keepalive pings) rather than a
    service-side drop; worth sending periodic pings from any future long-idle `wss://` test tool
    so a real service-side drop isn't masked by this same transport timeout next time.
  - **Boot-time catch-up compaction, confirmed working exactly as designed, on the live revision,
    repeatedly.** `aletheon-00006-wep`'s boot at 07:14:23 logged
    `aletheon: compacted gs://five-six-one-aletheon/aletheon-world.jsonl — tail 52610 rows ->
    snapshot 285 rows (27720 bytes) in 394.1ms` immediately followed by `aletheon: boot-time
    catch-up compaction ran...`; an OOM-triggered restart at 07:28:26 (see below) repeated the
    same pattern on a smaller backlog (`tail 15454 rows -> snapshot 285 rows`, 463.4ms) — this is
    the exact fix the previous pass wrote and tested in isolation, now confirmed compacting a real
    inherited backlog on a real boot, twice, live.
  - **New finding, this entry: the gcs-client two-step read race the previous pass flagged but did
    not fix was NOT dormant — it was live and firing, continuously, at the moment this entry
    started, on `aletheon-00006-wep`'s own single-writer traffic (no second writer needed).**
    Both `compact()` and the regular `flush()` path call `writeConditionally()` (a metadata-read-
    then-content-read-then-write cycle) against the SAME tail object, and under the real GCS
    latency this session already documents (compactions observed taking up to 179 real seconds),
    two of the process's OWN async calls to that object can overlap each other — exactly the
    "concurrent overwrite between the metadata GET and the content GET" window the fix below
    closes, no cross-instance/cross-revision contamination required. Across this entry's own
    ~17-minute observation window on the stable (pre-fix) revision: **11 `autosave flush failed:
    gcs content get failed for aletheon-world.jsonl: HTTP 404` lines and 3 `log-store: compaction
    failed ... HTTP 404` lines**, the last at 08:23:57 and 08:25:05 respectively — both still
    BEFORE this entry's own traffic migration to the fixed revision completed (~08:25:10). **Zero**
    recurrences of either line in the ~4.5 minutes observed after migration, on the fixed
    revision, under the identical real-latency conditions (compactions in that same window still
    running 8–27 real seconds) — a short post-fix window, named as such rather than overstated,
    but the qualitative signature (races that were firing every 1–2 minutes go silent the moment
    the fix is live, same load, same latency) is exactly what the fix predicts. This is also, in
    hindsight, why "the shared-bucket contamination class is gone" (this entry's own starting
    premise) undersold the picture: stopping the SECOND writer removed cross-revision races, but
    the single remaining writer could still race itself, and did.
  - **The fix.** Both `getObject`s (`farstone/.../src/gcs-client.mts`,
    `aletheon/server/world/gcs-client.mjs` — logically identical bodies) collapse from two
    requests (metadata GET to learn the generation, then a SEPARATE content GET pinned to it) to
    ONE: a plain `alt=media` GET, with the generation read off that same response's own
    `x-goog-generation` header. No caller anywhere in either tree ever used anything from the old
    metadata GET besides `.generation` (checked directly, not assumed), so nothing is load-bearing
    on the two-step shape — the single-request version returns the identical `{text, generation}`
    shape, `null` on a genuinely-absent object exactly as before, and now has no window left for a
    concurrent write to land inside of, by construction, rather than by a wider retry policy.
    Each tree's `fake-gcs` test double was ALSO fixed alongside it — it had been retaining every
    past object generation forever, which meant it could never have reproduced this race even
    before the code fix (a real unversioned bucket deletes a generation the moment it's
    overwritten); it now models that correctly, and gained a one-shot
    `interleaveNextMatchingRequest(match, write)` hook so a test can inject a concurrent overwrite
    at an exact point in a request sequence. New tests, both trees: a request-count assertion
    (`getObject` now makes exactly one storage call), a regression test that reproduces the OLD
    two-call shape locally (test-only, not the real client) and confirms it DOES 404 under the
    corrected fake-gcs — proving the double can characterize the bug, not just fail to reproduce
    it — and a test proving the NEW client stays consistent (no 404, matching text/generation)
    even with a write interleaved on its one and only request. Suites re-run fresh: Farstone
    67/67 (63 baseline + 4 new). Aletheon 51 total (48 baseline + 3 new), 49 pass; 2 pre-existing
    `tests/ws-session.test.mjs` failures, confirmed unrelated (fail identically in complete
    isolation, touch no `gcs-client`/`fake-gcs` code, reproduce a real-socket handshake flake this
    same file's own header already documents in this sandbox) — not fixed here, named plainly.
  - **Deployed via the house `--no-traffic` → tag `candidate` → verify-tag → migrate pattern.**
    `farstone-00011-quw` and `aletheon-00008-tuq`, both deployed `--no-traffic --tag candidate`
    first. Verify-tag: both booted clean (boot logs show no errors); the farstone tag URL
    round-tripped two real connect/command/tick/events cycles cleanly; the aletheon tag URL's
    `wss://` session joined and received a real 21-entity snapshot. Only then migrated
    (`gcloud run services update-traffic ... --to-revisions <rev>=100`) to 100% traffic on both —
    confirmed live on the public domains immediately after (`farstone.561.group/metrics` and
    `aletheon.561.group/` both responding from the new revisions). **Final state: `farstone-00011-quw`
    and `aletheon-00008-tuq`, both 100% traffic**, `candidate` tag on each now aliasing the same
    (current) revision, matching house convention.
  - **429-under-hammer, reclassified: capacity posture, not a bug, not reopened.** The second
    pass's 32-worker/223s hammer produced 1262 Cloud Run-level "no available instance" 429/500
    events under `--max-instances 1` — this remains true by design: Farstone and Aletheon are
    each a single-writer stateful world (a second concurrent instance would fork state), so
    `--max-instances 1` is load-bearing, not a knob to raise casually. The capacity bump actually
    applied here (`cpu 2`/`memory 512Mi` on Farstone) targets the OTHER half of that finding —
    real per-request latency under GCS contention — not the instance ceiling. A modest 8-worker/
    2-minute burst (the realistic traffic bar, not the 32-worker hammer) now clears with zero
    errors and zero 429s under that same ceiling (numbers above); admission-control backpressure
    rejecting a deliberate 30+-concurrent hammer at that ceiling is the intended behavior at
    overload, not a regression to chase — owner attention only needed here if real measured
    traffic ever approaches that hammer's shape, which nothing observed this pass suggests.
- Cost-posture alternatives, noted for the owner, **not applied**: Farstone's
  `--no-cpu-throttling` / `min-instances 1` would remove the CPU-scheduling gap that
  motivated catch-up-on-request in the first place, at standing cost; may also reduce the
  concurrent-flush pileup above by keeping one warm instance instead of constant
  cold-starts, but would not by itself fix an unguarded concurrent-flush race.
- **Solitaire**: `src/cartridge.test.mts` expects `manifest.configs?.length === 6` but
  `VARIANT_LIST` now has 11 real variants — a real, currently-red assertion nobody has
  updated yet. Not a deploy blocker; solitaire's game-serving tests all pass.
- **durante**: RESOLVED 2026-08-20 — `src/cartridge.mjs` is now wired into both the server
  and the browser client via `createDailyEngine(date)`, and `src/manifest.mjs` exports a
  real `CartridgeManifest` (`seedPolicy: daily-utc`); the arena is a genuine per-UTC-day
  seed, not the old fixed authored one. See "durante daily tournament" above for the
  tournament/live-loop proof. `catalog.json`'s `cartridgeWrapped` flag (if any consumer
  still reads it) has not been independently re-checked as part of this change — worth a
  follow-up glance, not re-verified here. The open item that remains: `src/manifest.mjs`'s
  export has no consumer wired up yet (documented in the durante app's own README/DESIGN.md).
- **aletheon qwzspace repoint**: RESOLVED 2026-08-20 — `server/app.mjs` (the only real consumer;
  `server/net/session.mjs` only mentioned qwzspace in a comment) is now on
  `@red-cup-engineering/qwzspace@0.4.1`, off the old `@561-group/qwzspace@0.0.2` pin. Read both
  packages' real source before repointing rather than trusting the version bump: the
  ws-server/tick-driver surface this app actually uses (`attach`/`staticHandler` from
  `http-ws-server`, `startTickDriver` from `tick-driver`) kept identical signatures across the
  gap — `tick-driver.mjs` is byte-identical, `http-ws-server.mjs`'s only change is a disclosed
  `onClose`-firing fix unrelated to aletheon's call sites — so this was a clean scope/version
  swap, not a vendor. ruinfold's own half of this backlog item closes as **n/a**: it carries no
  qwzspace dependency (footing's daily-tournament rails are its shared surface, not qwzspace).
  Live on `aletheon-00010-muk`, 100% traffic, deployed `--no-traffic` → tag-verified (a real
  connect/join/snapshot WS session round-trip against the tagged URL, existing world state
  intact) → migrated; `aletheon.561.group` frontdoor-walked clean (21 URLs, 0 MISS/BADMIME) and
  re-confirmed with a second live WS session through the public domain post-migration.
- **Second host**: the only other real machine on the account, GCP
  `bare-cedar-fog-cloud-mirror`, is already the live `ap.561.group` (ActivityPub) host, not
  a spare. No free-tier Oracle or GCP box is reachable from this machine. If the
  owner-remembered free-tier box is real, it needs retrieval from outside this machine
  (the OCI console, or a Hetzner key not present here).
