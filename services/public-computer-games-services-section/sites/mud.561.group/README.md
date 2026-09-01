# mud.561.group

The 561 Group's MUD / graphical-MMO directory. Not a fork of play.561.group --
a JSON parameter over the same shared catalog platform
(`@red-cup-engineering/games-catalog-storefront`), per house law that a
public property is a parameterization, never a bespoke daemon.

## What makes this a different property from play.561.group

- `catalog-filter.json`: the one parameter. `{ "includeIfAnyKeyword": ["mud", "mmorpg"] }`.
  A graphical MMO counts as a MUD here (owner ruling, 2026-08-31).
- `scripts/build-mud-catalog.mjs`: reads play.561.group's own generated
  `catalog.json` (never re-scans every game's manifest -- one upstream, one
  source of truth), filters by the keyword parameter, and additionally
  performs a real, dated HTTP `liveProbe` of each selected entry's own
  play URL. mud.561.group's honesty rule for "can I link out to this game
  right now" is stricter than play.561.group's own (a router-membership
  mirror): it is "did this actually answer when we last checked", which is
  what lets it show an honest, dated offline note during the
  permanent retirement of the paid GCP lane (2026-08-31 founder ruling), migration in progress,
  instead of a link straight to a 500.
- `js/catalog.mjs`: binds the shared package's `canPlayLive`/`catalogModel`
  to `liveSubdomainsFromProbes(entries)` instead of a hand-maintained
  `LIVE_SUBDOMAINS` set.

Scope for this pass, per the commission: directory + per-game listing +
honest web-play links only. A shared player chat network across these
worlds is explicitly future work, not built here.

## Install and run

```sh
npm install
npm run build     # regenerates catalog.json (live-probes each game) and index.html
npm run serve     # http://127.0.0.1:8562/
```

## Test

```sh
npm test    # node --test test/*.test.mjs
npm run check
```

## Deploy

mud.561.group is its own Cloudflare Worker (`wrangler.jsonc` in this
directory), serving the static build straight off disk via a Workers
static-assets binding -- no Cloud Run origin, no proxy through the
shared `cloudflare-router`. `.assetsignore` excludes everything that
is not part of the served site (source, tests, package files).

```sh
npm run build     # regenerate catalog.json and index.html first
npm run deploy    # wrangler deploy
```

`custom_domain: true` in `wrangler.jsonc` attaches `mud.561.group` and
provisions its DNS record. `npm run dev` runs `wrangler dev` for a
local preview of the deployed shape. The GCP `five-six-one-group-dev`
project (billing permanently off, per the 2026-08-31 GCP exit ruling)
is not part of this site's deploy path at all; the `Dockerfile` and
`.gcloudignore` in this directory are dead and slated for removal as
the fleet's other Cloud Run lanes migrate off the same origin.
