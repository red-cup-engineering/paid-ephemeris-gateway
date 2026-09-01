# Hive Games Services Section

Parent home under `hive-services-section` for every Hive blockchain game the
Union operates software against, seated one game per service section rather
than as a pile of scripts sharing one directory. Where `aagaard` is the
fleet's autonomous wallet-operations service (the account, the signer, the
cross-game arbitrage and settlement machinery), this section is where each
game's own domain logic — its card/land/pool shapes, its custom_json
encodings, its planning rules — gets a proper address: a README, a scoped
package, a `src/` of pure exported functions, and a `test/` that proves them
without touching the network.

## Seating derivation

`aagaard` (sibling section, `services/aagaard`) grew its per-game logic as
scripts in `scripts/` and modules in `src/integrations/<game>/` and
`src/core/`, because every game's automation shares aagaard's account,
signer, and settlement machinery, and that is a defensible way to build a
single operating fleet fast. But "Splinterlands' owned-card readiness rule"
and "dCrops' plot-maturity rule" are not wallet-operations logic — they are
facts about those games' own contracts, unrelated to aagaard's signing or
arbitrage concerns and reusable by anything else that ever needs to observe
or plan against those games. A library survey of `hive-services-section`
(2026-08-27) found `aagaard` as the only existing service section, with no
place for game-specific logic to live independent of the fleet-operations
concerns it happens to currently run inside.

This section takes that seat: one child service section per game, sibling to
`aagaard` rather than nested under it, because a game's rules do not belong
to aagaard's account any more than they belong to any other Hive account that
might one day want to observe or plan against the same game. `aagaard`
remains the place fleet-specific policy (which account, which key file, which
credit ceiling, which lane) and cross-game settlement composition live;
these sections are where each game's own domain rules live, aagaard-agnostic
and independently testable.

## What every child section is

Each `<game>-services-section` is real software structure, not a
convenience wrapper:

- **README.md** — what the game is, what the service observes and plans,
  and — stated as plainly as a bug — what it deliberately refuses to do.
- **package.json** — `@red-cup-engineering/<game>-services-section`, ESM,
  `node --test`, zero runtime dependencies.
- **src/** — plain `.mjs` runtime source with hand-written `.d.ts`
  declarations, one clean exported function per concern. Observation
  (parsing a card, a plot, a player state) is separated from planning
  (proposing a bounded action) is separated from I/O (an HTTP client, a
  signer, a broadcaster) — and this section holds only the first two. No
  child section signs, broadcasts, or holds a key file.
- **test/** — `node --test` against fixtures captured from real observed
  game state. No network call runs in a test.

## Holdings

- `services/splinterlands-services-section` — card-collection observation,
  bounded card-market purchase planning, and a battle-readiness audit
  signal that stops short of automated play (see that section's README for
  the ToS boundary this preserves).
- `services/terracore-services-section` — player-state observation with
  exact monetary-lexeme preservation, scrap-claim and Engineering-upgrade
  planning, and conservative PvE battle-target selection.
- `services/dcity-services-section` — recovery pricing for the closed
  dCity token's SIM/SWAP.HIVE pool exit; CITY NFT custody is left untouched.
- `services/dcrops-services-section` — land/seed/season observation and
  single-plot plant/harvest/remove-expired/wait planning.
- `services/hashkings-services-section` — recovery observation and a
  conservative preserve-custody vs. review-recovery classification for a
  game whose web client has repeatedly parked behind a redirect lander.
- `services/holozing-services-section` — pending-reward observation and
  pure stake-only reward-claim planning; never touches an Alpha Vial NFT.
- `services/workerbee-services-section` — WORKERBEE self-stake-and-delegate
  yield planning against the ph1102 mining pool, and settlement of that
  pool's distributions.

## Migration debt from aagaard

Every module in these sections was ported from working code already proven
in `aagaard` (`scripts/`, `src/integrations/<game>/`, and the relevant
`src/core/*Settlement.mts` files) — this is not new-written game logic, it is
the same rules given their own address. Per the task that founded this
section, `aagaard` was left untouched rather than having its imports
rewritten to point here, so the same logic currently exists in two places:

- `aagaard`'s TypeScript adapters (`src/integrations/<game>/*.adapter.ts`)
  remain the versions aagaard's scripts actually import and its own test
  suite exercises. The `.mjs` modules here are a plain-JavaScript port of
  that same logic (dropping only the TypeScript type-only surface), not a
  reimplementation — see each section's README for exactly what was ported.
- A handful of modules (`dcity-services-section`'s `swapTokensOperation`,
  `workerbee-services-section`'s `stakeOperation`/`delegateOperation`/
  `batchOperations`) duplicate a small slice of aagaard's shared
  `src/integrations/hive-engine/hiveEngineOps.mjs` Hive-Engine custom_json
  encoder, rather than depending on aagaard's package from a sibling
  section. Extracting that encoder into its own
  `computer-blockchain-system-services-section`-style shared package (or a
  `hive-engine-services-section` sibling here) and having both aagaard and
  these sections depend on it is the next real step; until then this is
  duplicated, not shared, and both copies must be kept in sync by hand.
- `aagaard`'s own scripts still own every I/O boundary — the HTTP polling,
  the key-file reading, the broadcaster subprocess, the append-only event
  recording. Making `aagaard`'s scripts import these sections' pure
  modules instead of their own `src/integrations/<game>/*.adapter.ts` copies
  is the migration step that would retire the duplication above; it has not
  been done, so today aagaard keeps working exactly as it did before this
  section existed.

Registering this section in `hive-services-section`'s own README is also
carried as debt: no README exists yet at that level to register it in.

## Org

- **Over**: red-cup-engineering (Internal Market)
- **Owns**: services/splinterlands-services-section,
  services/terracore-services-section, services/dcity-services-section,
  services/dcrops-services-section, services/hashkings-services-section,
  services/holozing-services-section, services/workerbee-services-section
