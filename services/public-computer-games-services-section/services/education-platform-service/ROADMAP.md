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
- **Deploy** -- DONE, 2026-08-20. Live at `https://equivo.561.group/` (Cloud Run service `equivo`,
  revision `equivo-00001-rjb`, `us-central1`, `min-instances 0`/`max-instances 2`/`cpu 1`/
  `memory 256Mi`, exactly the runbook's shape). Fronted by the Cloudflare router: `equivo.561.group`
  added to `sites/cloudflare-router/src/index.mjs`'s `ORIGIN_BY_HOST` and `wrangler.jsonc`'s
  `routes`, deployed, and `frontdoor-walk.mjs https://equivo.561.group/` walked 25 URLs with 0
  MISS / 0 BADMIME. Hostname chosen as `equivo.561.group` (not `learn.561.group`) per direct
  instruction at deploy time; still open for the owner to revisit if a generic `learn.561.group`
  is preferred once a second theme ships. A full learner session (gate pass with a wrong+right
  answer, full Unit 1 clear, SRS review queue populated at day+10 and graded both ways, a
  simulated reconnect proving localStorage round-trips) was played against this live deploy's
  exact vendored logic (sha256-verified byte-identical to what the server serves) -- see the
  deploy session's own report for the transcript.
