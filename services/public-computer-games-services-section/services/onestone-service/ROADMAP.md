# onestone — roadmap

## v1 scope (this build)

Three tilings — square, hex, rhombille — on the full generic graph engine; 60 deterministic
levels (20 per chapter) with a validated ⟨r⟩ ramp toward the isostatic point; full economy
(shards/prisms, lives cap 5 with regen, streaks, boosters); ported mock/stripe/hive
`PaymentProvider` with a balanced double-entry audit ledger; native Node HTTP/SSE server;
single-file no-build SVG client. **Not** in v1: Cairo and beyond, accounts beyond token
identity, leagues/pass UI (the economy models the pass grant; UI to sell it is roadmap),
rewarded ads.

## The tessellation ladder

The whole differentiator is that this ladder is real geometry, not reskins. Each rung adds
a `cells(size): RawCell[]` producer to `tiling-core.mts`'s compiler; the match/cascade
engine is untouched at every step, because it only ever sees `BoardGeometry`.

1. **Square** (v1, chapter 1) — the onboarding-free baseline. 5-color palette, 2 rail
   families (rows/columns).
2. **Hex** (v1, chapter 2) — pointy-top axial hexes, 3 rail families, first tiling where
   `ring` specials become possible (cycles exist).
3. **Rhombille** (v1, chapter 3) — three rhombus orientations per hex, dual to the
   trihexagonal lattice; orientation shading produces the tumbling-cubes illusion as a
   cosmetic field the engine never reads.
4. **Cairo pentagonal / snub-square** (post-v1) — the first chapter whose king-adjacency
   junctions are provably 4-chromatic rather than merely bounded by headroom. This is where
   the **Belnap FOUR palette claim** becomes load-bearing rather than aspirational, and
   unlocks the **Duality Bomb** special: a match that exploits the tiling's face/vertex
   dual relationship to clear across both the matched cells and their dual-graph neighbors
   at once — a move shape with no square/hex/rhombille analog.
5. **Penrose P2/P3** (post-v1) — aperiodic, via offline Robinson-triangle deflation baked
   to JSON assets (deflation is not a runtime cost the match engine should ever pay).
6. **Hat/spectre monotile** (post-v1) — the 2023 aperiodic monotile result, via
   HTPF (hierarchical tile-position family) substitution tables, also baked offline.
7. **Jeandel-Rao Wang capstone** (post-v1) — the 11-tile 4-color aperiodic Wang tile set,
   the smallest known aperiodic Wang set. Shipped as the ladder's citable capstone: a
   chapter whose existence is a specific, checkable, published mathematical result, not a
   marketing description of "hard mode."

Each rung stays honest to the doctrine in `README.md`: the tiling supplies structure the
engine consumes, never the reverse.

## Rigidity Cup (post-v1)

A weekly competitive mode built directly on the `validate.mts` machinery already shipping
in v1: a fresh seed generates a board whose blocker constraint graph sits deliberately near
⟨r⟩ = 2.4 — the isostatic transition point itself, not comfortably below it — for a level
that is maximally, provably *just* solvable. Same pebble-game validator, same
`loadBearing_iff_critical` check, turned into the difficulty target instead of a ramp floor.
Leaderboard-shaped; no new engine mechanics required, only a new level-generation mode and
a scoring surface.

## Settling Pass UI (post-v1)

`types.mts`'s `PlayerMeta.passUntil` and the economy's bounded pass-grant SKUs already model
a time-limited pass in v1 — what's missing is the storefront surface: a pass sheet in the
client showing active-until, the elevated life cap (8 vs. 5) it grants, and purchase flow.
Named for the settle loop the game is otherwise built around: the pass is priced and scoped
by the same bounded-grant doctrine as everything else in the shop (`types.mts`'s
`Sku.grant` union) — no flat power, no solvability shortcuts, just currency/booster/life/
time grants a paying player would have earned anyway, faster.

## Rewarded ads (post-v1)

Opt-in rewarded-video slot for a bounded grant (extra life or a small booster amount) on the
same `Sku.grant`-shaped doctrine as purchases — an ad view is just another zero-cost SKU.
Deferred past v1 because it requires an ad-network integration decision (which network,
server-side reward verification) that the payments boundary doesn't yet need for
mock/stripe/hive.

## FeltOS world integration (post-v1)

v1 deliberately keeps its own atomic-JSON persistence rather than adopting
`@red-cup-engineering/fizzos/world`, because the assertion-trace model that fits
`flickering-delve-service` fits *settled per-move outcomes* (a level result, a purchase, a
star rating) well but does not fit *per-frame board physics* (a cascade's fall/spawn
sequence, replayed for animation) at all — forcing every cascade step onto the world's
functional-cell model would either lose the exact replay fidelity `client.mts` needs or
require inventing a second physics-shaped layer inside FeltOS that doesn't exist yet.

Scoped correctly, integration is worth doing for **shared events**: a weekly seed, a
cross-player leaderboard cell, a Rigidity Cup standings board — all settled, low-frequency,
exactly the shape FeltOS's world already serves well in the sibling service. Per-move board
state stays local and pure regardless.

## Ops decisions to make before production

- **Stripe identity**: decide whether onestone shares a Stripe account/webhook identity
  with `flickering-delve-service` (one 561-group payment identity, simpler reconciliation,
  shared risk surface) or runs a separate Stripe account (cleaner audit-ledger boundary per
  service, more setup). This must be decided **before** `/pay` goes live in production, not
  after — `payments.mts`'s stripe adapter is identity-agnostic today and will happily run
  under either choice, so nothing in code forces the decision either way.
- Real product/price setup in Stripe's dashboard matching `economy.mts`'s `SKUS` ladder
  (prisms 99¢/$4.99/$19.99, booster bundle $1.99, life refill 99¢, pass 7-day $4.99 /
  30-day $9.99), and the equivalent Hive memo-format documentation for the hive adapter.

## Known edges

- The math sections of `README.md` are honestly scoped: six mechanics are load-bearing on
  proved results; everything else in the design corpus (notably the sheaf/H1 flavor
  material) is naming only and is never checked by any test or validator. Any post-v1
  chapter that wants to add a seventh load-bearing use needs a citable result, not a vibe.
- The tessellation ladder above is ordered by geometric complexity, not by committed
  ship date — Cairo/snub-square is next only because it's the smallest step past v1's three
  Euclidean-regular-ish tilings before the aperiodic rungs.
