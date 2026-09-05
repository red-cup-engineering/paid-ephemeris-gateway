# aletheon

> A browser 3D fantasy MMORPG whose world-truth **is** voidmath.
> The realm is settled out of the Void; every vital fact is a bilattice cell — **⊥** unknown · **t** real · **f** slain · **⊤** a contradiction the world *holds as a situation* and lets walk as a Corrupted Anomaly.
> Zero dependencies, zero build, pure ESM.
> A from-scratch WebGL2 engine over a from-scratch WebSocket server over the cleaned-up voidmath kernel.

`aletheon` (`@561/development.experimental.aletheon`) is the game member of the voidmath stack.
It takes the repo at its word — *rederive everything* — and builds a real-time multiplayer 3D game with **no game engine, no graphics library, no networking library, and no bundler**.
The renderer, the 3D math, the WebSocket framing, and the world simulation are all in-tree.
The one thing it does *not* reinvent is the logic the world runs on: that is the kernel.

Open `aletheon.experimental.development.
561.group/` (or `http://localhost:8787/`), name yourself, and step out of the Void.

## Quick start

Requires Node ≥ 20.
No install step — there are no dependencies.

```sh
node scripts/aletheon-server.mjs            # serve the client + run the world on a 15 Hz tick (PORT=8787)
#   then open http://localhost:8787/ in a WebGL2 browser

node tests/math.test.mjs                # the rederived 3D math (matrix·inverse = I, perspective, quats)
node tests/world.test.mjs               # world-truth via the REAL kernel (t / f / ⊤ from joinKnowledge)
node tests/net.test.mjs                 # the hand-rolled WebSocket handshake + join→input→delta
npm test                                # all three
```

**Controls:** `WASD` move · `mouse` look (click to capture) · `LMB` / `Space` strike · `1–4` speak a force (or, in a Parley, play it) · `Z X R B` powers (Reflect/Banish/Reveal/Bind) · `F` settle a Cairn · `P` parley a foe · `K` stake a claim at an Altar (with the focused force) · `Enter` chat.

## Why this is voidmath, not flavour

**The world's truth is the bilattice — literally.** Every creature carries one load-bearing predication, `(self, alive, self)`, whose charge is computed by the kernel's own charge operations (`@561/development.experimental.voidmath-kernel-cleanup`).
Combat is **evidence**: a blow appends *negative* evidence; when it overwhelms the positive face the cell settles to **f** and the creature dies.
Re-assert *positive* life-evidence onto an already-slain cell — corruption near an Anomaly — and the kernel's `joinKnowledge` returns **⊤**: the creature does not die, it rises Corrupted.
That ⊤ is not a bug or a flag; it is the join of life and death evidence, a contradiction the world keeps as a situation, exactly as `tab` files Building Permit #23 at tick 30.
(`server/world/value.mjs` runs the real kernel; `tests/world.test.mjs` also drives the full four-regime descent `articulate → predicate → posit → settle` on minted utterances.)

**The geometry is voidmath's own 3 + 1.** `cosmogenerating.md` classifies the kernel's four regimes by `(κ, H¹)`: three — strict-finite, scott-continuous, transfinite — have `H¹ = 0` (they only rearrange evidence already present), and exactly one — the **aperiodic** corner — "extends the base with genuinely new entities and facts… the only corner that needs the outside."
Read the three as **space** (reversible — move ◇/□ back and forth, nothing new is made) and the one as **time** (irreversible novelty — the EAVT trace, the tick), and voidmath is **3 spatial + 1 temporal**.
So Aletheon's time **is** the append-only trace, and its map is the **void-monoid manifold** ported from the archive (`lab/archive/.../void-monoid/manifold_dpm.py`): concentric grade-rings, the Settled Reach at the origin, strangeness rising with grade outward.
See [`docs/dev/notes/voidmath-spacetime-3plus1.md`](docs/dev/notes/voidmath-spacetime-3plus1.md).

## Shape

```
scripts/aletheon-server.mjs   entry: node:http static + hand-rolled ws upgrade + the 15 Hz loop
server/
  app.mjs                 composition root (shared by the bin and the net test)
  http.mjs                static-asset serving for the browser client (the repo had none)
  net/ws.mjs              a zero-dependency WebSocket server: RFC 6455 handshake + frame codec
  net/session.mjs         one player: join, input intake, interest-filtered delta sync
  world/kernel.mjs        the single seam to voidmath-kernel-cleanup (charge ops + the descent)
  world/value.mjs         world-truth: the alive cell's ⊥/t/f/⊤ verdict via joinKnowledge
  world/store.mjs         the EAVT trace (TIME, the aperiodic axis) + its folded entity projection
  world/spacetime.mjs     the 3+1 geometry; re-exports the shared void-manifold + terrain
  world/combat.mjs        THE pillar: damage = negative evidence; death = f; corruption = ⊤
  world/ticking.mjs       the autonomous advance: movement, NPC AI, corruption spread, reaping
  world/seed.mjs          enacts the starting region on the grade-rings (incl. a true ⊤ Anomaly)
  world/claims.mjs        CLAIM ALTARS: the player-authored claim cell, settled by the real kernel
shared/                   imported verbatim by BOTH server and client
  constants.mjs · protocol.mjs · encoding.mjs · worldgen.mjs (terrain + void-manifold)
client/                   native browser ESM, no bundler
  main.mjs                boot · input (intent only) · the frame loop
  math/{vec3,mat4,quat}   rederived 3D math (no gl-matrix, no Three.js)
  gl/{shader,mesh,terrain,camera,renderer}   the WebGL2 engine; procedural geometry, inline GLSL
  net/connection.mjs      the browser WS client + entity interpolation
  ui/{hud.mjs,hud.css}    vitals, target frame, void-ring minimap, combat/chat log
deploy/                   ws-aware nginx + systemd, for the subdomain (modeled on website-server)
tests/                    math · world (incl. the real descent) · net (the real handshake)
```

## Systems (all kernel-grounded)

The engine started engine-deep on one pillar (real-time **combat**: strike → evidence → settle → f / ⊤, with corpses and emergent ⊤-corruption), then grew a set of voidmath-native systems on top:

- **Combat & world-truth** — every creature's life is a bilattice cell settled by the real kernel charge ops; death is `f`, life re-asserted on a slain cell is `⊤` (a Corrupted Anomaly the world holds and lets walk; corruption spreads on its own).
- **Codex of the Four Ways** (`shared/codex.mjs`) — you *learn* the bilattice by witnessing each value in play (⊥ on arrival, t/f/⊤ as the world shows them), taught by peaceful **Keeper** NPCs.
- **The Laplacian void-tension field** (`server/world/field.mjs`) — a scalar field diffused each tick by the discrete graph Laplacian (the repo's sheaf-Laplacian/H¹ idea); Anomalies radiate it, Keepers and Cairns drain it, corruption takes where it pools; painted as a heat wash in the 2D view.
- **The Four Illocutionary Forces** (`shared/illocution.mjs`) — Assert(t)/Deny(f)/Abstain(⊥)/ Contest(⊤) speech (keys 1–4), composing by knowledge-join (Assert ∨ Deny = Contest); Keepers teach the matching Way.
- **Marks, the base quantum** (`server/world/marks.mjs`) — the kernel's distinction/mark made playable: conserved marks transfer on kill, condense, and **settle into a Cairn** (a standing `t`, raised through the real four-regime descent) that calms the tension field.
- **The K₄ gauge as powers** (`shared/powers.mjs`, `server/world/powers.mjs`) — voidmath's Klein-four gauge ⟨negate, conflate⟩ + the two modal ops, each a player power that **spends marks** and is computed by the actual kernel op: **Reflect** (`negate` — a living `t` reflected to `f`, slain), **Banish** (`conflate` — a ⊤ Anomaly's contradiction sent to ⊥, dissolved), **Reveal** (`possibilize` ◇ — a knowledge-raise that widens your sight), **Bind** (`necessitate` □ — a knowledge-lower that roots a creature still).
  Keys `Z X R B`; a power bar dims what you can't afford.
- **The bilattice economy** (`shared/items.mjs`, `server/world/richness.mjs`, `server/world/trade.mjs`) — value is not a number, it is **fiber RICHNESS**: the count of an item's DETERMINED predicate cells (⊥ counts 0; ⊤ — a thing the world argues about — counts and is *contested value*; a FUNCTIONAL/settled cell weighs more, because "scarcity is settledness").
  A slain creature drops **loot** by kind into the slayer's inventory (conserved, minted onto the trace); two players **trade** by dual-filed `held-by` moves (the append IS the double-entry — no ledger), conserving the combined marks + items exactly.
  Inventory panel `I`, trade prompt `T`.
  Grounded in tab's `richness.mjs` / `trade.mjs` and `docs/dev/notes/economy-is-predicate-richness.md`.
- **The Ludics Dispute** (`server/world/dispute.mjs`) — **a Parley**: agon's two-sided contest driver, the piece `ludics-grounding.md` names as missing ("a two-sided contest driver — agon's harness").
  A **non-lethal win path**: each side holds a **stance** (a kernel charge), and the four illocutionary forces ARE the moves — **assert** pushes a foe toward `f` (loses ground), **deny** defends, **contest** forces `⊤` (PLAY itself), **abstain** yields.
  Moves resolve against the opponent's stance with the REAL kernel ops (`meetTruth ⊙`, `joinKnowledge ∨ₖ`, read with `present`/`isTop`). **Convergence** = one side's stance settles to `f` and **YIELDS** (the daimon †): a yielding hostile NPC is **pacified** (hostile off, hunt laid down); a yielding player takes a brief stun + a few marks. **Divergence** = repeated mutual `⊤` → **stalemate** (no winner).
  The panel (`P`, against the nearest hostile foe) shows both stances, the move log's last outcome, the **FLOW** meter (`flow()` — the four-glyph histogram, "active" when ≥3 kinds appear) and the **DEEP-PLAY** `⊤`-count (`deepPlay()` — Geertz's depth).
  Keys `1–4` play a force into the dispute.

- **Settle the World — CLAIM ALTARS** (`server/world/claims.mjs`) — the **keystone**: it makes the world's truth **player-authored**.
  A **Claim Altar** (`KIND.altar`, one on each grade ring — standing, peaceful, immobile, never a valid target) carries a **claim cell**: a bilattice cell whose verdict is co-authored by players who STAKE evidence through the four illocutionary forces.
  Standing by an altar you stake (key `K`, or the panel's four-glyph palette): **Assert** stakes a POSITIVE mark, **Deny** a NEGATIVE, **Contest** BOTH, **Abstain** retracts your last stake — and the marks are **conserved**, moving *into* the altar's evidence (tracked per staker, so abstain returns them and dividends can pay).
  The cell re-settles through the **REAL kernel** after each stake (`joinKnowledge` of the accumulated evidence, read with `present`/`isTop`) — the same algebra a creature's life cell runs on.
  The settled face then **ripples through the existing systems**: settle to **t** → **SANCTUARY** — the altar DRAINS void-tension in its cell (`field.mjs`, like a big Cairn) and pays a periodic marks **DIVIDEND** back to its claimants (coherence rewards); settle to **⊤** (asserted AND denied) → **ERUPTION** — a **real** `⊤` Anomaly rises at the altar (the same slay→`corrupt` path `seed.mjs` uses — a genuine `joinKnowledge` of life and death, not a flag) and the altar RADIATES tension as a **contested-value** site dropping richer loot for whoever clears it; settle to **f**/`⊥` → dormant.
  Resolution needs **no new code**: the erupted Anomaly is already **Banishable** (K₄ `conflate`), **fightable**, or **parley**-able (the Ludics Dispute) — once it is removed or calmed, the altar **decays** its contested evidence and settles **back to t**.
  The panel (shown when you stand by an altar) paints the settled glyph in its bilattice colour, the pos/neg evidence bars, and the four forces as stakes.

Deferred / next-phase (shaped in the EAVT model, not yet built): entropy/Pisot growth laws, affordance-as-richness reads, accounts/persistence beyond the trace.

## Status

- **Working:** everything above — the full client↔server loop (browser WebGL2 client + 2D fallback, hand-rolled WS, 15 Hz authoritative server), the kernel-backed world-truth, the tension field, the Codex/Keepers, illocution, and marks/Cairns; the void-manifold map + shared terrain; NPC AI; interest-filtered delta sync with client interpolation; the K₄ gauge as mark-spending powers; the bilattice economy (items as fiber richness, loot on kill, conserved player-to-player trade); the Ludics Dispute (a Parley — the non-lethal, force-vs-force win path that pacifies a foe); and **Settle the World** — Claim Altars whose player-staked, kernel-settled truth makes the world co-authored, draining tension as Sanctuaries (t) and erupting real ⊤ Anomalies as contested-value sites that ripple through the field/corruption/economy. **51 checks pass** (`npm test`).
- **Honest about its reach:** procedural art only (no assets); one zone; no auth/persistence beyond the trace.
