# farstone-services-section

Consolidation point for Farstone game/world content gathered from across the enterprise. The
current generation is deployed, its browser surface is downstream of QwzSpace and TUFTE, and its
world kernel is FeltOS. Legacy branches remain here as feature evidence until they are reconciled.

## Layout

- `../../sites/farstone.561.group/` — the current deployed generation. It owns its browser adapter,
  deployment recipe, catalog entry, and operational documentation. The obsolete vendored FeltOS
  deployment copy was consumed after the FeltOS-based Cloud Run image and persistence path passed
  the complete application suite and live production verification.
- `apps/terminal-client/` — Farstone's REST/JSON terminal adapter and CLI. It composes the generic
  Wheatstone interface as a dependency; no Farstone-specific code lives in Wheatstone.
- `lib/legacy/` — every prior generation found, each in its own directory, moved
  in as-is (no cleanup, no dedup, no import fixing).

## Legacy generations and where each came from

All paths below are relative to the `red-cup-engineering` submodule
(`lib/emsenn/services/561-group/services/red-cup-engineering`) unless noted otherwise.

- `lib/legacy/farstone-harbor-mud-service/` — was
  `services/public-services-section/services/public-computer-services-section/services/public-web-services-section/services/public-web-game-services-section/services/farstone-services-section/lib/legacy/farstone-harbor-mud-service`.
  Package `@red-cup-engineering/farstone-561-group`, marked `decommissioned`/`triage`
  in its own `package.json` despite a README describing it as "the live site."
  Targets the `farstone.561.group` domain.
- `lib/legacy/2026-07-12-fizzos/` — was
  `src/content/assets/legacy/2026-07-12-fizzos`. A combined fizzos-engine +
  Farstone-game snapshot from the day before the current generation was split
  out of fizzos.
- `lib/legacy/apps-games-farstone/` — was
  `src/content/assets/legacy/2026-06-17-archive.emsenn.net/dev/ref/src/from-content-source/apps/games/farstone`.
  Plain-JS `@561-group/farstone` package built on `tab` + an early `feltos`;
  bundles four sub-worlds (`farstone/`, `farstone-harbor/`, `farstone-tale/`,
  `farstone-wild/`).
- `lib/legacy/pyfars-examples-farstone/` — was
  `src/content/assets/legacy/2026-06-17-archive.emsenn.net/src/lib/code/2026/05/12/pyfars/examples/farstone`.
  Python civic-governance/world simulation of the town "Farston" (~168 files),
  not a MUD — no player interface.
- `lib/legacy/tab-2026-05-25-farstone/` — was the `farstone` library nested inside
  the `tab` MUD engine tree at
  `src/content/assets/legacy/2026-06-17-archive.emsenn.net/src/lib/code/2026/03/11/topical/arts/ludics/mud/tab/javascript/tab-2026-05-25/articulating/doing/changing/growing/library/paracosm/library/world/library/farstone`
  (under `world-library/` here), plus its standalone test file
  `tab-2026-05-25/tests/prove-farstone.mjs` (under `tests/` here). Earlier
  ancestor of `apps-games-farstone`, pre-extraction, missing several areas the
  later package has.

## cold-red-gate findings

Per the Leader's instruction, searched the `cold-red-gate` host (tailnet
100.118.93.93) read-only for other Farstone copies. Found:

- `/home/emsenn/561-group/sites/farstone.561.group` + the farstone-\*.mts files
  in `/home/emsenn/561-group/services/fizzos` — byte-identical (verified by
  hash) to `farstone-harbor-mud-service` and `2026-07-12-fizzos` above. Not
  re-pulled. No `farstone.service` is actually running on the host (unit not
  found); the TLS cert/Caddy config are leftover, and there's a
  `.deploy-cruft-backup-*` directory confirming it's decommissioned, not live.
- `/home/emsenn/561-group/_archive/from-content-source/apps/games/farstone` —
  byte-identical (verified by hash) to `apps-games-farstone` above. Not re-pulled.
- `/home/emsenn/561-group/_archive/emsenn-archive-code/.../tab-2026-05-25/.../farstone`
  — byte-identical (verified by hash) to `tab-2026-05-25-farstone` above. Not
  re-pulled.
- `lib/legacy/cold-red-gate-pyfars-examples-farstone/` — was
  `/home/emsenn/561-group/_archive/code/pyfars/examples/farstone`. Same file
  count as `pyfars-examples-farstone` (168) but content has diverged (verified
  by hash on `governance/places/mt-farstone.md`) — a parallel edit branch, not
  a duplicate. Pulled down.
- `lib/legacy/cold-red-gate-theories-pyfars-examples-farstone/` — was
  `/home/emsenn/561/theories/engineering/theories/tech/theories/computing/theories/continuous-computation/theories/artificial-intelligence/theories/agents/theories/agentic-orchestration-platforms/theories/predicated-agentic-orchestration-platform/theories/flatfile-agentic-resource-system/governance/assets/computing/platform/pyfars/examples/farstone`
  (179 files). Lives inside an entirely separate repo/ontology
  ("theories") not otherwise represented anywhere in this enterprise's tree, on
  its own `main` branch, vendored via a `pyfars` git submodule. Pulled down.
- Also present on cold-red-gate but not brought over: two Claude Code workflow
  scripts, `~/.claude/projects/-home-emsenn-561-group/*/workflows/scripts/farstone-world-recovery-wf_*.js`
  and `farstone-finish-everything-wf_*.js` — session-authored orchestration
  scripts about consolidating/finishing Farstone, not codebase content.
- Nothing was deleted or modified on cold-red-gate; it was only read from.

A follow-up pass will reconcile the remaining historical branches feature by feature. They are not
assumed redundant merely because the current deployment is healthy.
