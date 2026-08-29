# Ruinfold — roadmap

A living roadmap for what to build next on Ruinfold, the browser 3D MMORPG over the **tab** EAVT world-substrate and **voidmath** four-valued bilattice.
This v1 is roadmapped from knowledge of the current codebase; it is being refined by parallel research (next-gen MMORPG design from the web; the repo's own concurrent-game-systems / ludics material; tab's unused capabilities).

## Where we are (shipped + verified) - World substrate: zones + portals, EAVT trace, 5 Hz tick, SSE+POST server, three.js client. - Combat: melee + four abilities (stamina, cooldowns), the shared `strike` primitive. - Death: the five-way bilattice router (undead ⊤ / mortal f / construct ⊥ / boss f / cursed-form ⊤). - Loot + equipment (slots, archetypes, stat derivation), inventory. - Progression: xp / levels / stat scaling. - Quests (data-driven bounties), NPCs, vendor economy (gold), zone chat. - AI v2 (acquire / leash / engage / patrol, ranged mobs), out-of-combat regen. - 67 headless assertions green; live HTTP/SSE playthrough green.

## Design north star We are not chasing feature-parity with a generic MMO.
The substrate makes three things *uniquely* buildable, and the roadmap is weighted toward them: 1. **Perception is paraconsistent** — `observing`/`perceives` lets each player settle a *different* world from one trace (fog of war, hidden undead, unreliable senses) for free.
2. **The world is a forkable, replayable trace** — `settle-forks` + `history` give instances, rewind, death-recaps, and parallel timelines almost for nothing.
3. **Interaction can be modeled as a game** — the repo's `concurrent-game-systems` + ludics let us resolve PvP / negotiation / contested objectives as *strategies interacting*, not ad-hoc rules.
This is the headline "next-gen" direction the rest of the roadmap supports.

## Batch 1 — combat & character depth (independent engine modules) - **Status effects** (`engine/effects.mjs`): timed buffs/debuffs/DoT (poison, stun, regen, might) applied as cells with an `expires-at` tick; the tick ages and fires them.
Bilattice-native: a "petrified AND moving" contested state can settle ⊤. - **Threat / aggro tables** (`engine/threat.mjs`): monsters target highest accumulated threat (damage + heals nearby), not just nearest — enables tanking.
AI reads threat instead of pure distance. - **Skill-by-use progression** (`engine/skills.mjs`): Project-Gorgon-style — using an ability levels *that* skill; skills unlock ability ranks. xp stays for character level; skills add a second axis. - **Tab-target + target frame**: client target selection already partial; add cycling + a target HUD.

## Batch 2 — social & economy (the "massively multiplayer" part) - **Parties** (`engine/party.mjs`): group membership, shared xp/loot in a zone, party chat channel. - **Player-to-player trade** (`engine/playertrade.mjs`): a two-sided escrowed trade (both confirm). - **Crafting** (`engine/crafting.mjs`): recipes consume items → produce items; wrap tab's `craft`. - **Auction / player shops**: list items for gold; a market board NPC. - **Whispers / channels**: `/tell`, zone vs party vs global chat scopes (extends chat).

## Batch 3 — substrate-unique systems (the differentiators) - **Fog of war via `observing`** (`engine/perception.mjs`): the snapshot becomes per-player — settle each player's frontier through their `perceives` Umwelt.
Stealth, scouting, an undead you only see if you carry the bone-charm.
(Today the snapshot is omniscient.) - **Instances & rewind via `forking`**: a dungeon is a fork of the trace; party gets its own copy; death-recap replays the last N ticks (`history`).
Boss arenas as forks. - **Dynamic world events** (`engine/events.mjs`): tab-style ambient ticking — a tide of undead, a blood moon (buffs undead), a wandering boss; the world acts on itself between turns. - **Federation via `federate`**: multiple world-servers as shards; cross-shard travel/chat.

## Batch 4 — the headline: ludics-modeled player interaction (`engine/ludics.mjs`) Model a contested interaction between two parties (a PvP duel, a haggle, a standoff over an objective, an NPC debate) as **two strategies/designs interacting** in the sense of Girard's ludics / concurrent game semantics, resolved by normalization to a bilattice outcome (win/lose/⊤ deadlock/⊥ abandoned).
Grounded in the repo's `concurrent-game-systems` (player tuples) and voidmath's FOUR.
Exact data model + resolution procedure to be set by the research agents' findings.
This is where "computing concurrent game systems / players-as-ludics" becomes a real mechanic, not a metaphor.

## Cross-cutting / infra - **Accounts & durable identity**: today an actor id lives in localStorage; add a claim/login so a character is durable and not spoofable.
(The trace already persists the character.) - **Log compaction**: append-only logs grow without bound; a periodic rewrite keeping surviving functional rows + history.
(Flagged in README as out-of-scope for v0 — time to schedule it.) - **Server `/health`** endpoint for systemd/uptime checks. - **Spatial interest management**: only send a player deltas for their zone/AoI (snapshot already scopes by zone — formalize and cap broadcast fan-out as player counts grow).

## Sequencing Batches 1–3 are mostly independent engine modules that fan out cleanly to concurrent agents against the existing `_world` / `strike` / `tick` contracts.
Batch 4 (ludics) waits on the research; it is the integrative centerpiece the others feed.

## Research findings → decisions (2026-06) Two parallel web agents (next-gen MMORPG design; ludics/game-semantics) and two repo agents (concurrent-game-systems/ludics; tab's unused modules) reported.
Decisions:

- **Architecture is validated, not exotic.** Valve's Source is a tick + snapshot + client-interp model (≈100 ms interp buffer); EVE runs a *single shard at 1 Hz* for tens of thousands.
  Our 5 Hz
  + SSE snapshots + three.js interpolation is exactly this lineage. → add a **client interpolation buffer** and **area-of-interest** gating before scaling player counts.
- **Web "top 5 fit our model": ** tick-folded **status effects + threat**, **AoI on the SSE stream**, **client interpolation**, **skill-by-use + gear affixes**, **auction/order-book**.
  Deferred as fighting a 200 ms tick: action/aim combat and client-side movement prediction+rollback.
- **The repo already has the ludics ground.** `development/lab/concurrent-game-systems` (players / action-profiles / strategies / coalitions); `development/lab/swarm/src/players.mjs` `buildPlayerTuple()` binds a player to a CGS arena (`arenaFormula: "A⊥ || B"`, observe=opponent / act=player polarity events, handedness recv/send/actuate/observe); and `…/archive/.../ludics/questions/girard-caillois-substrate-correspondence.md` maps ludics↔bilattice (⊤ = play's held ambiguity; agon/alea/mimicry/ilinx as algebra).
  The ludics engine reuses the player-tuple shape rather than inventing one.
- **Ludics resolution model (from the game-semantics agent):** a *design* is a JSON tree of polarized addressed moves `(±, locus, ramification)`; `normalize(A, B)` steps them (Curien's rule R) to one of: **† converges** → win **t** / lose **f** (by who conceded), **deadlock** (no matching move) → **⊤**, **divergence** (fuel out / disengage) → **⊥**.
  Outcome IS a FOUR value, composes via the bilattice.
  Implementable in plain JS over the append-only log.
- **Tab modules → features (value/effort, from the tab agent):** `practice` → skill-by-use (evidence settles a skill cell t/f/⊤); `observing`+`perceives` → fog of war; `trade` → economy; `craft` → crafting; `grow` → procedural Fibonacci dungeons; `federate` → cross-shard; `history` → quest/lore replay; `monologue` → NPC inner conflict from ⊤ cells; `settle-forks` → branching timelines.
  We wrap these rather than reimplement.

## Status after the concurrent build (2026-06) **Built + unit-tested (9 modules):** effects, threat, skills, perception, crafting, playertrade, party, events, ludics — each by its own agent, each with an inline proof.

**Wired into the live game + integration-tested (`tests/prove-systems.mjs`, full suite 75 green):** - threat → `combat.strike` accrues it, `ai` targets top-threat over nearest (tanking), `death` clears it. - world events → `tick` rotates them (`tickEvents`); `ai` reads blood-moon/undead-tide modifiers (undead get wider aggro + harder hits). - status effects → processed every tick (`tickEffects` for all entities); abilities apply riders (heavy→stun, bolt→poison); poison/regen tick, stun/might/weaken are read by combat. - skill-by-use → attacking/abilities call `practiceSkill` (a `blade`/`sorcery`/… skill levels by use). - crafting, party, player-trade → reachable as validated intents (craft / party-create|join|leave / trade-open|offer|confirm|cancel). - snapshot now carries effects / skills / party / active-event for each player.

**Client overhaul (gamey pass) — landed:** the client was refactored into an orchestrator (`main.mjs`) + a `state.mjs` store that diffs snapshots into semantic events (damage/heal/died/ levelup/effect/loot/chat/world-event), with seven modules built by concurrent agents and wired in: `audio` (synth Web-Audio SFX), `world` (gradient sky, fog, shadowed moonlight, flickering torches, procedural ground + ruined props), `entities` (per-type models, nameplates + HP bars, target ring, attack/hit/death juice, floating damage numbers, ⊤/effect visuals), `hud` (player/target/party frames, effect chips, event banner, quest tracker), `actionbar` (canvas ability icons + cooldown sweeps + stamina gating), `panels` (inventory / character+skills / shop / quest / craft windows), `chat` (chat + combat log + minimap).
All 9 client files parse and serve (200); browser-rendered look is the user's to confirm.

**Built but NOT yet wired (deferred, clearly noted):** - **perception / fog-of-war** — `engine/perception.mjs` is ready (`visibleTo`, sight + Umwelt + hidden-undead rule), but wiring it changes broadcast from one shared delta to per-player deltas (each connection tracks its own last-seen set).
A focused follow-up on `loop.mjs`/`snapshot.mjs`. - **ludics duels** — `engine/ludics.mjs` (designs + normalize → t/f/⊤/⊥) is ready and tested; needs a duel/negotiation intent + a way to build each side's design from player moves, plus client UX.
The headline still to land. - **client UI** for the above (effect icons, skill panel, party frame, craft/shop/trade windows, event banner) — the data flows in the snapshot; the three.js/DOM surface for it is not built this round. - AoI gating, client interpolation buffer, log compaction, accounts — infra from the brief, not started.

## Dispatched build (concurrent agents, one new engine file each) effects · threat · skills(practice) · perception(observing/fog) · crafting(craft) · playertrade(trade) · party · events · **ludics** — then integrated into tick/snapshot/actions/ai by the main thread, with tests.
New functional predicates these need are already added to RUIN_FUNCTIONAL (effect-*, threat-table, party-*, trade-*, world-event/event-until).

Sources for the above are recorded in the dispatch and the agents' reports (Valve/EVE netcode, Project Gorgon skills, Girard *Locus Solum* / Curien ludics intro, Belnap four-valued logic).
