# Social casino build — 2026-08-29

Owner set the direction (see
[2026-08-29-note-on-social-casino-direction.md](../notes/2026-08-29-note-on-social-casino-direction.md)):
a real, monetized social casino at casino.561.group — spectacle-first, tickets-for-play,
no real-money wagering or payouts ever. Built and shipped the same day, upstream-first:
five engine packages enriched/created and published before the casino consumed them.

## Upstream published (Verdaccio, 127.0.0.1:4873)

| Package | Version | What landed |
|---|---|---|
| `@red-cup-engineering/energy-bank` | 0.3.0 | exact-BigInt ledger published (was on disk, unpublished) |
| `@red-cup-engineering/card-table` | 0.1.0 | NEW — deck/shuffle + SVG cards extracted from solitaire-service (footing-style), plus the org's first poker hand evaluator (verified against all 2,598,960 five-card hands) and exact blackjack per-decision EV |
| `@red-cup-engineering/qwzspace` | 0.6.0 | the spectacle layer: procedural drawables, tween/easing, deterministic particles, camera zoom/shake, celebration timelines, render-loop, audio-cue seam — qwzspace is now actually the house rendering/animation library |
| `@red-cup-engineering/resonator` | 0.2.0 | game/web fibers filled (were empty stubs): gesture-safe WebAudio engine, seeded cue library, ambient bed with ducking, `playSpec` event-stream seam; packaging fixed (real barrels, dead exports removed) |
| `@red-cup-engineering/music-engineering-services-section` | 0.2.0 | leitmotifs, functional harmony over arbitrary scale cardinality, intensity-layered stems, quantized transitions, performance-spec JSON contract, honest guqin-corpus bridge |
| `@red-cup-engineering/parlor-kernel` | 0.3.0 | multi-reel/multi-payline evaluation with wilds/scatters, exact multi-line RTP, jackpot odds; parlor-service compatibility proven (92/92) |
| `@red-cup-engineering/cast` | 0.1.0 | NEW — the founding "cast" idea realized: 8 authored personas (Pearl Winkle, Reef Halyard, Sable Ledger, Bonny Driftwood, Gull Corbin, Otter Vance, Marina Quill, Cove Brackish), seeded dialogue, exact-EV blackjack policy with bounded+costed temperament deviations, runner harness over a 4-method Transport contract |

## casino-service (new, `services/casino-service`)

Four passes, all suites green at every handoff (73 → 128 → 194 → 218 tests):

1. **Economy** — energy-bank's first live integration: TICKET (30-min accrual, cap 5,
   daily bonus streaks) and CHIP instruments, 7-SKU bundle catalog through the
   `SettlementBackend` interface (mock wired, real backend a one-line swap), jackpot
   pool, generic wager primitive, hledger journal at `GET /audit`.
2. **Blackjack** — seeded 6-deck shoe, rules-as-data (S17/H17), cartridge replay
   verifier, real chip settlement, House Math panel (exact per-action EV against the
   actual remaining shoe, off by default).
3. **Tideline Treasures** — flagship 5-reel/3-row/20-line slot: overall RTP 94.17%
   (line+scatter exact by full 16⁵ enumeration; free-spin contribution closed-form;
   every figure labeled by method), progressive jackpot at exactly 1-in-1,048,576,
   full spectacle client (staggered easeOutBounce stops, anticipation zoom+riser,
   tiered celebrations, coin fountains) on qwzspace + resonator.
4. **The floor** — qwzspace WS room: presence, zones, rolling event feed, live jackpot
   ticker; 5-of-8 cast personas on duty per UTC day, playing REAL games through real
   guest chip accounts via an in-process Transport (same module boundary as human HTTP
   requests), dormant at zero connections; win broadcasts tiered from both games'
   settlement hooks; lobby page upgraded into the living floor with graceful static
   degradation.

## Shipped

- `casino.561.group` deployed (Cloud Run `casino`, us-central1) and routed
  (cloudflare-router `ORIGIN_BY_HOST` + wrangler routes), linked from
  `play.561.group` (catalog regenerated honestly, `LIVE_SUBDOMAINS` promoted after
  live verification, honest-links suite green) — the fearful.561.group promotion
  discipline followed exactly. Promotion to `status: "playable"` + redeploy ran as
  the day's final pass.

## Also captured

Founding-session archaeology (session 47cac153, 2026-08-19) recovered ideas never
written to disk — four notes added: naming addendum (Hermit Crab, Ludeme, Flume,
Sluice…), trick-taking series stub, Parlor provenance verbatim, mobile-settlement
mechanic (tiospaye/buffalo economy).

## Known seams

Real settlement backend (ZBD/x402/Stripe — one-line swap point), durable-account
login, GCS persistence swap, presence tracking from game pages (floor-only today),
near-miss cast reactions, music-engine performance-specs wired into the floor bed
(resonator `playSpec` seam ready), replay-spectacle shareable big-win pages,
poker/trick-taking tables on `card-table/evaluate`.
