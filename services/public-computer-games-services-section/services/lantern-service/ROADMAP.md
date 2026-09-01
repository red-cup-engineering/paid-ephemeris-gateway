# lantern — roadmap

## Shipped (v1, wing one: the weiqi corpus)

Corpus compilation (`compile.mts`) with shape-based door extraction and promotion; genuine FCA
Hall computation (`fca.mts`); vendored pebble-game Hall-stability check (`stability.mts`);
FSRS-lite scheduling (`srs.mts`) with territory/light-cone kept strictly separate
(`lightcone.mts`); five rule-based gate-card generators (`cards.mts`); auto-hall kata with belts
(`kata.mts`); a full static browser face (map, gate review modal, daily lantern-walk, kata mode,
accessibility, `localStorage` persistence).

## Next (scoped, no new design decision required)

- **Surface `stability.mts`'s existing pebble-game verdict as honest player-visible copy.** No
  new math: the verdict already computes (`hallStability`, `STABLE_HALL_BONUS`'s dimming
  multiplier) and is currently used only internally. The exposure is UI copy attached to the
  map's existing hall-enclosure rendering (`web/js/map.js`), reusing `buildHallGraph`'s own
  node/edge counts rather than inventing a second summary of the same graph.
- Write `DEPLOY.md` (this service currently has no deployment doc — see `ARCHITECTURE.md` §11).
- Adopt `@561-group/cartridge`, following the pattern the sibling game services establish:
  `createEngine(seed)` ignores `seed` (SRS state is not seed-derived), `applyIntent` wraps
  `reviewCard(state, grade, now)` with `now` threaded through the intent payload, and the
  manifest may omit `replayVerifier`'s ledger-facing use case since there is no adversarial win
  claim to verify here.

## Later (blocked on a decision or dependency that doesn't exist yet)

- **weiqi-Learn / Equivo theming**: extracting the five theme-neutral modules
  (`frontmatter.mts`, `fca.mts`, `srs.mts`, `stability.mts`, `lightcone.mts`) as a shared
  platform surface, refactoring `cards.mts` behind a pluggable `Checker` interface, and adding
  Equivo as a second theme once its own lesson corpus is authored (it does not exist yet). A
  real, multi-step migration, blocked on that authoring work.
- Accounts/ledger/payments layer matching the sibling-service convention — blocked on the
  fleet's shared-identity decision, the same dependency every other fleet service carries.
  Player-state export/import (already implied by the existing `roomId#kind#index` id scheme) is
  the seam this would attach to.
- Custom curator-authored kata paths (auto-generated-per-hall only in v1, per `DESIGN.md`'s own
  scope line).
- Vault-mounting UI (a second `Wing.root` pointed at a player's own directory) — the compiler
  contract already supports this with zero special-casing (`DESIGN.md` §7); only the
  folder-picker/upload UI is unbuilt.

## Explicit non-goal

**Players do not write to the shared corpus, anywhere, in any roadmap tier above.** This is a
deliberate boundary, not a missing feature: letting players' in-game actions (adding a citation,
earning a hall-pinning effect) mutate the shared concept graph would blur "gameplay" and "corpus
editing" in a way that needs an owner ruling before it is designed toward. This roadmap does not
propose it, schedule it, or design toward it in any tier.
