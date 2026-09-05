# Roadmap

Deliberately out of this build, each for a reason the design docs already name or this build
surfaced:

- **weiqi-Learn ("wing one")** -- the platform doc's placement plan calls for Lantern's own
  corpus to ship as a renamed theme on this same kernel. Not started here; this task scoped to
  Equivo only. Porting it is mostly a `themes/weiqi-learn/` directory wrapping `cards.mts` behind
  `Checker`, plus its own corpus copy (vendored, not cross-imported).
- **Type F / repair exercises** -- the checker is implemented and tested (`repairChecker`), but
  no corpus content ships it. `equivo-design.md` §8's own reason stands: no corpus-attested
  vocabulary yet distinguishes a genuine repair from evasion-by-deletion. The one heuristic this
  build adds (reject an edit that drops an original entity) is disclosed as insufficient in
  `registry.mts`'s own comment, not offered as a solution.
- **The Lakotaean register** -- blocked on owner-authored source material, confirmed absent
  across all nine surveyed corpora. `themes/equivo/registers/lakotaean.mts` is complete as an
  honest absence; populating it is an authoring dependency on the owner, not an engineering task.
- **Unit 2+** -- only Unit 1 (The Descent, 7 rooms) exists. The corpus schema, extraction rule,
  and content-validation suite all generalize to more units without kernel changes; writing them
  is the next content-authoring pass.
- **Cross-lens comparison exercises, nuclear-quartet/quasicrystal content** -- named out-of-scope
  by `equivo-design.md` §8 (research-frontier, not launch pedagogy).
- **Server-authoritative accounts/sync** -- v1 persistence is `localStorage`-only, per the
  platform doc's own documented, unresolved gap. Export/import JSON is the interim seam.
- **Earn-only / ZBD rails for Equivo** -- `zbd-micropayment-rails.md`'s adoption map does not
  include Equivo at all. `src/earn.mts` stubs the adapter shape only; no payout logic exists.
- **Deploy** -- DONE, 2026-08-20, REDEPLOYED 2026-08-31 per the products-as-data GCP-exit ruling
  (GCP billing permanently off; the Cloud Run game fleet is migration inventory, not outage). Live
  at `https://equivo.561.group/` as its own Cloudflare Worker (`wrangler.jsonc` in this directory,
  `equivo-561-group`, `assets.directory` `./web`, own `custom_domain` route) -- no Cloud Run
  origin, no proxy through the shared `cloudflare-router` (that router's own route trim is another
  section's custody, tracked separately). `.assetsignore` (inside `web/`, matching wrangler's own
  ignore-file resolution) excludes `server.mjs`, `build/`, and `test/` from the deployed asset set;
  the Node static server (`web/server.mjs`) remains a dev/test convenience only, never what
  production serves. Hostname stays `equivo.561.group` per the original direct instruction; still
  open for the owner to revisit if a generic `learn.561.group` is preferred once a second theme
  ships. A full learner session (gate pass with a wrong+right answer, full Unit 1 clear, SRS review
  queue populated at day+10 and graded both ways, a simulated reconnect proving localStorage
  round-trips) was played against the 2026-08-20 deploy's exact vendored logic -- see that deploy
  session's own report for the transcript; the 2026-08-31 redeploy carries the identical `web/`
  build output (byte-identical `index.html` verified against the live response) onto the new
  Worker.
