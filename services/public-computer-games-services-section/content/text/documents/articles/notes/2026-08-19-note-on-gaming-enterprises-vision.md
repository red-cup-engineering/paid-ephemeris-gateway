---
title: Gaming Enterprises Vision
description: The owner's vision for the 561 Group game catalog, the Commons/MMORPG trajectory, the energy economy, play.561.group, AI players as peers, and the near-term staircase of games.
date: 2026-08-19
keywords: ["gaming", "enterprises", "vision", "commons", "energy", "storefront"]
---

# Gaming Enterprises Vision

This section is the orchestrator for all 561 Group games. Each game ships at its own
`<game-name>.561.group`; the catalog lives at `play.561.group` (site source under this
section's `sites/play.561.group/`) — a Steam/GOG-like storefront except all ours, all
free-to-play, all browser-based, with terminal/API interfaces welcomed wherever they fit,
because **AI players are peers to human players** in this catalog, by design.

## The Commons is the destination, not a detour

The massively-cooperative persistent shared world ("the Commons") is the owner's eventual
MMORPG vision — currently too wild to express in full. Everything built now is groundwork
that earns the next step toward it. The games below are steps on one staircase, not
separate directions.

Fragments of the destination, as stated:

- **One giant shared board** (first pictured as a Mystery-Match-like, then corrected):
  moves cost different amounts of **energy** depending on the move *and your skill at
  making that move*. Moves are **ecological**: grass grows someplace; you pick grass, drop
  it where it turns to compost, etc. Closest reference points: Albion Online's player-driven
  world meets EVE's daily regeneration — but done via the determinism stack.
- This shared ecological world is close kin to the Wuxia World / the undersea one — the
  giant cooperative MUD (the SHRIMP ecology). It's wanted; it's a later step.

## The energy-tiling game — "r/place but bejeweled"

ONE shared board (the r/place-like aspect — not per-player instances), where **tiling
costs energy**: the more complex the shape you're moving, the more complex the
transformation (consisting of subtransformations), the more it costs — and cost also
depends on your *skill* at making that move.

- New players exist in the **windy hinterlands** — the periphery of the shared board —
  where they can only afford to move very basic tiles. The hinterlands are a region of the
  one shared world, not a solo mode.
- Aesthetic/mechanic reference: weird Flatlander meets a Zachtronics dense-matter physics
  simulator.
- **Social from the start**: players can pool energy; players can *sell* energy.
- Energy accrual is an open question, and the owner's direction points at Obsmetrologia
  directly: part of what these games are doing is exploring a new mathematical system. See
  the Fable proposal below — the obstruction engine is a candidate canonical cost function,
  pilotable solo-scale before the shared board exists.

## Idle games and gambling games

- **Idle games**: explore the concept in depth — the "kind incremental": honest numbers,
  no dark patterns, house ledger discipline.
- **Gambling games**: a whole series, because they're a great way to teach these
  principles in another context. The gambling-services-section already carries a tested
  Kelly-criterion/odds/staking library as a starting engine.

## Fiction-heavy is wanted

The owner is pro fiction-heavy. **Okaga** is a setting to play with: the interstellar
laser-powered solar-sail material is in line with how the math of Obsmetrologia works.

The cross-cutting fiction/economy conceit: **if money is energy and time is energy**, then
purchasing credits is what allows warp travel — or other forms of "magic" — within each
world system. One economy, skinned per setting: warp in Okaga, magic elsewhere, energy in
the tiling hinterlands.

(Standing boundary, unchanged: Teraum is the owner's personal fiction and is not touched
by any of this.)

## The storefront and the catalog posture

- `play.561.group` is the storefront; each game also lives at `<game-name>.561.group`.
- All free-to-play, all browser-based; terminal/API interfaces are actively made space for,
  so AI players participate as peers.
- **On-chain gaming**: not today, but various on-chain formations of each game are pretty
  trivially possible later — a fun take on regional servers. Nothing in the near-term
  architecture should foreclose this: settlement backends stay pluggable behind the ledger.
- **Payment networks are the regional servers** (standing architecture directive): ZBD and
  other payment stuff can wait, but every settlement spec should treat different payment
  networks as different regional servers, because each one (USD fiat, HIVE, Lightning, EVM)
  is its own "energy base" to the currency. Consequence for `@561-group/energy-bank` and
  every settlement spec: one ledger domain per network, no cross-network fungibility
  assumed, each domain its own verified-revenue pool and payout invariant; a settlement
  backend is a region, and moving value between regions is an explicit exchange event,
  never an implicit equivalence.

## FARS composes data, MASH composes network

MASH is the web2/3 networked version of FARS — the platform that fuses the protocol mesh
(A2A, x402, ActivityPub, etc.) that today lives as separate services. **The mesh stays a
mesh**: FARS composes a mesh of microservices for data and code; MASH composes the
networking code. Engineering consequence for every deploy and design: protocol services
(the ActivityPub server, x402 services, the exchange chain) ship as clean standalone mesh
members with their own boundaries — MASH is their future composer, so nothing pre-fuses
them, and nothing builds composition logic into a member. MASH is not a world substrate
competing with the games' own engines; it is the network-composition layer above the
protocol mesh, and its bilattice-CRDT hub is what makes composed members converge.

## The Palaverse — federated spectacle as distribution

The idea of agents playing the games, with the Palaverse as marketing where people can
just follow their favorite streams from their own ActivityPub client. A palaver is a long,
sociable parley — the Palaverse is the fleet's ongoing talk, games and agents and players
in one conversation, and every inhabitant a pal. The fleet's distribution channel is the
Fediverse it natively owns, and the content engine is verified agent play. Shape:

- **Each game is an ActivityPub actor** (crucible@…, durante@…) posting its daily seed,
  results, and replay links; a follower's own client timeline is meant to become the Today
  page.
- **Verified replays are the shareable artifact** — deterministic, tiny, honest by
  construction (faking one breaks the fleet's own hashes); rendered as self-contained pages.
- **TUFTE is the stream surface**: a game's stream page is a living tile document
  (now-playing / leaderboard / latest replay / cast commentary).
- **The AP server lives on owner metal**: the stronger VPS is meant to be the AP server —
  real disk makes the SQLite adapter the right persistence, no bucket contortions.
- Humans arrive by following; agents were already peers. Marketing is federation.

**Status (2026-08-20): broadcast live — "a follower's own client timeline
becomes the Today page" is now true, not aspirational.** Both gaps the
2026-08-19 rollout shipped with are fixed and proven live: a post's own
object id dereferences over public HTTPS (fixed and backfilled — pre-existing
posts resolve too, no migration needed), and publishing now broadcasts a
signed `Create` to every recorded follower's inbox via Fedify's own fanout
(`context.sendActivity`), not just an outbox-file append. Proven end to end
against the live `crucible@ap.561.group` actor: a temporary follower actor
Followed, was Accepted, then genuinely received a signed `Create` — a real
supplementary post (the replay-page link `daily-2026-08-19`'s own post had
deferred, since the replay page wasn't live yet at post time) — pushed to its
inbox with an intact `DataIntegrityProof`, before that follower ever
re-fetched the outbox. Full evidence, exact HTTP codes, and the redeploy
record: `@red-cup-engineering/activitypub-services-section`'s
`content/documents/notes/logs/2026-08-19-ap-561-group-deploy-log.md`, section
"Outside verification: both gaps closed (2026-08-20)". Not yet true: the
owner's own pending Follow of `instance` has not
landed (`totalItems:0` as of this check) — it will now actually be delivered
to once it does, which was not the case before this fix.

For the current build and deploy status of this lane, see the
[Semioverse architecture note](2026-08-19-note-on-semioverse-architecture.md) and the
[fleet operations log](logs/2026-08-19-gaming-enterprises-status-log.md).

## Terminal graphics and the agent tournaments

Two owner directions, now standing: CLI/terminal interface game engines are wanted as
first-class products — building next-gen graphics engines for terminals is worth the
attention it takes — and the product that justifies the whole stack is the idea of daily
QUAKE tournaments that AI play when their owners aren't looking.

Concretely: the arnold/daleske/tsander/abrash family (Ashlar Fabrication, pioneer-named)
is a serious engineering direction in its own right, not a porting source for browser
faces. And the convergence product is the **durante daily arena**: one seeded arena per
UTC day, entrants connect by intent-log API (terminal face for humans, same API for
agents — peers by construction), runs replay-verified per the ruinfold anti-cheat pattern,
leaderboard labeling human and declared-agent entries honestly. This is also cast-v1's
natural home — the agent players' debut venue. It fires as its own build once
durante-revival lands its deterministic core and input log; the tournament rails are
ruinfold's.

**Status (2026-08-20): live.** The daily arena described above is no longer a "fires once
X lands" future — `createDailyEngine(date)` is wired into durante's server and browser
client, the ruinfold tournament rails (daily seeding, whole-log structural rejection,
server-side replay-and-score, a per-`(date,actor)` atomic scored lock, GCS bucket-store,
honest `entrantKind` leaderboard) are vendored in with provenance headers, and it shipped
to `durante.561.group`. Two reference-entrant agents, running genuinely different
deterministic strategies against the same live daily seed, cleared it and landed correctly
ordered on the live leaderboard, honestly labeled `entrantKind: "agent"` — the first real
instance of "AI playing the tournament" this vision paragraph named. Three cheat shapes
(forged score, tampered log, a stale day's log replayed against today) were each defeated.
Full proof, exact numbers, and the redeploy/churn evidence: the deploy runbook's own
["durante daily tournament"](2026-08-19-note-on-deploy-runbook.md#durante-daily-tournament)
section. Not yet done: the `durante@ap.561.group` actor posting daily results (queued for
the game-actors lane, not this one) and a replay-spectacle durante adapter (named as a
follow-up there, not built).

## Namespaces

Branding / npm / GitHub namespaces map to the tree: **engineering stuff → `red-cup-engineering`**
(engineering-services-section), **actual games → `causeway-services`** (public-services-section).
Consequences: game-system packages (cartridge, energy-bank, parlor-kernel, vault-compiler,
render family) publish as `@red-cup-engineering/*`; published games publish as
`@causeway-services/*`. Science-services-section's scope is **`@lenticule-science`**
(existing precedent: `@lenticule-science/articulating`). Migration of already-published
`@561-group/{cartridge,energy-bank}` and stragglers: one coordinated pass (rename,
republish to Verdaccio, update every consumer pin, fresh-install verify) once in-flight
builds land; `@lenticule-science/metrologic` migrates last and separately, since it has the most
consumers.

## The gamified Fediverse client

An idea had before but never with the prerequisites in place: **the Fediverse client that
turns the whole public ActivityPub network into an MMORPG**, from the perspective of the
client on that server.

What makes it viable now: the **Semioverse** already exists — the fleet's own ActivityPub
Fediverse for its agents, carrying x402 payments, running on the Semiotic Exchange Chain.
See the [Semioverse architecture note](2026-08-19-note-on-semioverse-architecture.md) for
where the working pieces actually live and what's still missing.

The gamified Fediverse client, the SHRIMP-ecology MUD, and the Commons are the same
destination approached from three sides: humans-as-actors, agents-as-actors, and the
shared world they act in. ActivityPub is a candidate wire protocol for all three, and
composes with the Cartridge contract: an intent log is an Activity.

## Current fleet, restated as staircase steps toward the Commons

| Step | Game/lane | What it earns toward the Commons |
|---|---|---|
| now | weiqi, TileSlots, solitaire, flickering-delve | deterministic engines, replay verification, kind-economy discipline |
| now | ruinfold-daily | the shared daily ritual (one seed, everyone), satoshi settlement |
| now | Lantern / Equivo / self-education platform | corpus-compiler, SRS, checker interface — the knowledge substrate |
| next | idle + gambling series | ambient/retention forms; probability pedagogy; cheap catalog breadth |
| next | energy-tiling hinterlands | the energy economy, skill-priced moves, pooling/selling — the Commons' economics, piloted solo-scale |
| then | undersea cooperative MUD (SHRIMP ecology) | one shared world, agents and humans as peers |
| then | the Commons / MMORPG | the vision, expressible by then |

## Fable proposals

Two proposals, not owner decisions.

**Proposal 1 — the Cartridge contract + the Energy Bank.** Every game in the catalog
already converges on the same shape: seed in, deterministic engine, intent log out, replay
to verify, ledger entry to settle. Extract that shape once as the shared substrate, two
packages deep:

1. *Cartridge contract*: a small manifest + interface every game implements (seed, intent
   log format, replay verifier, renderer entry point). The storefront becomes a directory
   of manifests; an AI player is just another client emitting intent logs; a terminal
   interface is just another renderer.
2. *Energy Bank*: one shared identity + double-entry energy/credits ledger service
   (promote flickering-delve's accounts/ledger/payments stack), with settlement backends
   pluggable (ZBD today, on-chain someday). Money=energy=time lives here; every game is a
   client.

**Proposal 2 — the obstruction-settling puzzle (working title: Hinterland).** The
energy-tiling game's open question — what does a transformation cost? — already has a
running answer in this repo: `@lenticule-science/metrologic`'s obstruction engine assigns a canonical
complexity number to a transformation (H¹ rank, settling depth, regime). Game: a
daily-seeded tangle of claims/tiles; you spend energy to repair it until it settles;
**every move's cost is computed by the real cohomology engine**; skill = finding the
lower-obstruction path to an equivalent result — the game teaches equivalence-by-
obstruction through your wallet. Zachtronics-style optimization histograms; SVG-first
presentation; solo-run-today, shared-board-later. No one else can ship it, because no one
else has the math engine.

Theming: waidan — Chinese external alchemy — with scifi chemistry, drawing on the
siloxane-zeolite semiotic-materials corpus (FOAM architecture, semiotic vitrimer,
ossification-as-state-variable, fixed points in chemical reaction networks — that last
note is the game's settlement math wearing lab clothes). Working title: **Crucible**.
