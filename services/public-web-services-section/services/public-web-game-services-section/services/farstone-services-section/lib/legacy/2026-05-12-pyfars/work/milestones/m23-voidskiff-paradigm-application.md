---
title: "M23 — Voidskiff (Paradigm Application: Multiplayer Terminal Space Game)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m15-bundled-userland, m22-semioverse-navigation, m19-self-developing-pyfars, m21-substrate-native-token-economy]
goals:
  - karst-substrate-seeded
  - telnet-server-as-pyfars-endpoint
  - claim-injection-combat
  - spore-respawn-mechanism
  - lineage-alignment-and-reputation
  - morphism-teaching-via-anastomosis
  - world-clock-padovan-ticked
  - full-play-session-test
theory-basis: [agential-self-generation, dispatch-as-closure-rule-system, monetary-cost-as-quantale-extension, four-regime-dichotomy, federation-by-value-domain-join]
prior-art: [engineering-archive/operations/command/ideas/triage/voidskiff-multiplayer-terminal-game.md]
implementation-language: rust
backing-gaps:
  - pyfars/objects/game-world-record.md (NOT YET AUTHORED — substrate-resident world state for a paracosm instance)
  - pyfars/objects/spore-record.md (NOT YET AUTHORED — Padovan-ticked respawn anchor with morphism subset)
  - pyfars/objects/lineage-record.md (NOT YET AUTHORED — faction with goals, grievances, and teachable morphisms)
  - pyfars/objects/captain-record.md (NOT YET AUTHORED — player-character as office-holding agent)
  - pyfars/morphisms/sporulating.md (NOT YET AUTHORED — captain drops a spore-anchor with morphism subset)
  - pyfars/morphisms/anastomosing.md (NOT YET AUTHORED — two captains merge morphism subsets and teach each other)
  - pyfars/morphisms/claim-injecting.md (NOT YET AUTHORED — combat as targeted predication write into opponent's scope)
  - pyfars/claims/game-tick-is-engine-tick.md (NOT YET AUTHORED — world state updates are substrate closure firings)
acceptance: "A player connects via telnet, creates a captain, picks a lineage (Russula Bloom default), and spawns in Volva-Minor. The player accepts a courier job from Keeper Oys, undocks, charts a route, hyphal-fuses to Cap-Horizon, delivers the cargo, earns credit-claims, and drops a spore. The entire play session runs without any non-substrate state — all game state is substrate cells, all game events are closure-rule firings, all player actions are dispatchable workitems. A second player in a separate session anastomoses with the first, learns their morphism subset, and survives to teach it to a third."
---

# M23 — Voidskiff (Paradigm Application)

Voidskiff is a multiplayer terminal space-game where the **predication substrate IS the game world**.
Combat is claim-injection.
The economy runs through the closure wavefront.
Players teach each other by writing morphisms.
Death triggers spore-respawn inheritance.
The Karst — a post-Subsidence cluster of ~120 systems — is the setting.
Seven named lineages have competing goals.

This is the **paradigm application**: the one that demonstrates, non-abstractly and non-academically, that the substrate algebra generalizes to any domain where agents act, compete, cooperate, and learn.
If Voidskiff runs, the substrate works.

## What's built

### The Karst — game world substrate

The Karst is seeded as substrate content under `examples/voidskiff/`.
Every system, station, lineage, NPC, and item is a substrate record.
The world IS the substrate:

| Game entity | Substrate form |
|---|---|
| Star system | location-record with predications for fuel cost, traffic volume, lineage presence |
| Station | facility-record with open-hours closure rule, dock-fee cell, service inventory |
| Lineage | lineage-record with goals, grievances, teachable-morphisms, reputation-cells per captain |
| NPC | agent-record with dispatchable workitems (jobs the NPC offers) |
| Item (cargo, equipment) | inventory-cell on a captain-record |
| Captain (player character) | captain-record (an office-holding agent) with skill inventory, spore list, lineage affiliations |
| Job | dispatchable workitem with `requires-skills`, `on-complete: credit-transfer`, lineage-consequences |
| Spore | spore-record with Padovan-ticked expiry, morphism subset, anastomosis-permits |

The five live systems (Cap-Horizon, Ostiole, Cordyceps Reach, Septa, Volva-Minor) and three sinkhole systems (Thrombus, Hollowshield, Mitre-Deep) are authored at milestone ship.
Procedural generation applies within the authored keystones.

**Seven lineages:** - **Russula Bloom** — newcomer-default; collegial, democratic; teach basic morphism hygiene - **Hartig Net** — mycorrhizal trade bureaucracy; teach specialization morphisms - **Anthrax Quires** — parasitic raiders; teach inversion morphisms (weaponized) - **Ostiole Quiet** — forsaken hermits; teach fusion morphisms (rarest, most dangerous) - **Cordycipit Order** — militant mycorrhizal; teach constraint morphisms - **Sclerotic Choir** — saprotroph fleet; teach composition morphisms - **Tinder Cartel** — neutral smugglers; teach implication morphisms

### Telnet server as PyFARS endpoint

A TCP listener on port 4000 is a PyFARS endpoint: telnet-in, text-out.
The server is an endpoint record in the substrate (`governance/assets/computing/endpoints/voidskiff-telnet.md`) with capability `run-interactive-session`.

A player connection is an **inbound participant** (per [M8](m8-inbound-participation-mcp-clients.md)'s boundary handedness): the player's terminal is an inbound-only boundary; their commands are inbound calls that become workitems; the game response is the workitem's completion output.

Player commands (`look`, `sense`, `undock`, `chart`, `hyphal-fuse`, `sporulate`, `accept <job>`, `anastomose`) are dispatched as workitems.
The game state updates are closure-rule firings. **The game tick IS the engine tick.** No separate game loop exists.

### Claim-injection combat

Combat is the predication algebra operating adversarially.
When a captain fires weapons at another:

1. The attacker chooses a morphism declaration from their substrate scope and a target predication to inject
2. The injection is a `claim-injection` dispatchable workitem against the target's substrate scope
3. The target's closure rules resist: their `defense-morphisms` fire against the injected claim, attempting to produce a `⊥` (false) resolution that nullifies the injection
4. If the injection survives the defender's closure, the claim settles in the target's scope with consequences (hull-damage cell, cargo-loss cell, etc.)

This is claim-injection warfare: the weapon IS a predication; defense IS closure-rule priority.
A captain with stronger closure rules is harder to damage.
A captain who understands the algebra can tailor injections to exploit their opponent's morphism gaps.

Combat is asymmetric by design: the Quires' inversion morphisms (which reverse claims' truth values) are devastating against captains who haven't authored counter-inversion defenses.

### Spore-respawn

Death in Voidskiff is not erasure — it is a **Padovan fold**: one situation settles; three more open.

When a captain's hull-integrity cell reaches ⊥, a `captain-death` event fires: - The captain's substrate scope is archived (the moment of death is a snapshot) - A `survival-fragment` spore is emitted at the death location - The captain respawns at their nearest unexpired spore

**Spore record:**
```
(spore:<id>, dropped-by, captain:<X>, t)
(spore:<id>, of-lineage, <L>, t)
(spore:<id>, at, <system>:<coords>, t)
(spore:<id>, carries, <morphism-declaration-subset>, t)  # captain's choice
(spore:<id>, permits-spawn, <anastomosed-partner>, t)   # for each partner
(spore:<id>, expires-at, <tick>, t)                     # Padovan-n ticks
```

Spore persistence follows the Padovan recurrence: a captain who spent effort-level $n$ on the sporulate action has a spore lasting $P_n$ ticks. $P_{10} = 28$.
Effort costs coherence-tokens; the practical range is 3–9.

**Inheritance:** Other captains who have anastomosed with the dead captain can respawn from their spores.
A captain's death seeded a distributed network of players who share their morphism style.
This is the Padovan fold: the captain died, but three new morphism-inheriting captains may now exist.
Their existence IS the captain's legacy.

### Lineage alignment and reputation

Every lineage tracks a `reputation-cell` per captain: `(lineage:russula-bloom, trusts, captain:foo, <value>, t)`.
Reputation is earned by completing lineage jobs and lost by betrayal (delivering to rival lineages, accepting Quire contracts while registered Bloom).

Lineage alignment affects: - **Dock access** — some stations require minimum reputation with the owning lineage - **Job availability** — better reputation unlocks higher-value jobs - **Price** — lineage merchants adjust prices against reputation cells - **Morphism teaching** — a lineage NPC teaches their morphisms only at reputation ≥ threshold

Reputation is a substrate cell, not a database value.
It federates, persists, and accretes provenance like every other cell.

### Morphism teaching via anastomosis

Two captains can **anastomose** — merge morphism subsets and teach each other.
The anastomosis ritual:

1. Both captains must be docked at the same station
2. Both `consent` to anastomosis (mutual consent closure rule fires)
3. A morphism-subset exchange: each captain selects which morphisms to share
4. The substrate writes the shared morphisms into both captains' scopes with witness back to the anastomosis event

The teaching is durable: the receiving captain now carries the shared morphism.
But the sharing is **not free** — the donor's morphism is now known to the receiver and potentially to the receiver's enemies.
The Quires used a leaked stealth-hop morphism to counter the Bloom captains who taught it.
Teaching is trust.

The Ostiole Quiet's fusion morphisms are the most powerful and rarest; they refuse to anastomose except with captains who have spent significant time at Quiet-on-the-Rim.

### World clock: Padovan-ticked

The world clock follows the **Padovan recurrence** ($a_n = a_{n-2} + a_{n-3}$, constant ρ ≈ 1.3247, plastic number).
Each tick unfolds three prior situations into new consequences:

- NPC jobs expire and new ones spawn (frequency follows Padovan distribution)
- Spore expiry ticks down (each spore's Padovan-$n$ counter decrements)
- Market prices shift (closure rules fire over supply/demand cells)
- Lineage events unfold (Quire raids, Hartig Net courier dispatches, Quiet hermit appearances)

The Padovan clock means: **one situation settles; three more open**.
The world is never static; it is never chaotic.
The plastic number governs both the world's pace and the algebraic learning calculus ([M20](m20-algebraic-learning-calculus.md)) — the same constant governing the formality staircase governs the Karst's unfolding.

### Game as substrate integrity test

Voidskiff is not just a game — it is a **substrate integrity test** that exercises every PyFARS commitment simultaneously:

| PyFARS commitment | Voidskiff exercise |
|---|---|
| Predication substrate | All game state is substrate cells |
| First-class provenance | Every combat outcome, every spore drop, every trade has a witness chain |
| Agential self-generation | Players write morphisms; the game engine can't distinguish player-authored closure rules from developer-authored ones |
| Federation by value-domain join | Anastomosis IS cellwise federation between captain scopes |
| Practical reasoning as operator schedule | The game tick IS the engine tick; world unfolding IS the dispatch loop |

If a polity can run a living game world on PyFARS, it can run anything.
Voidskiff is the paradigm application because it uses every piece.

## What M23 does NOT claim

- **Not a commercial game.** Voidskiff is a research testbed and a paradigm application.
  The Karst is a testbed for substrate commitments, not a product for external users.
  It lives under `examples/voidskiff/`, not as a production service.
- **Not classical-swarm-style emergent AI.** Per [`llm-swarms-fail-classical-conditions`](../../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md), PyFARS is orchestrated, not classical-swarm.
  NPC behavior is substrate-driven closure, not emergent population dynamics.
  The game is complex because the algebra is, not because of swarm intelligence.
- **Not a full MMORPG.** The telnet server handles N concurrent sessions (where N is PyFARS's comfortable dispatch capacity, probably 4–8).
  This is not an MMO with thousands of concurrent users.
  It is a small, algebra-correct game that demonstrates the substrate works.
- **Not Rust-only.** The game substrate is authored in PyFARS (Python substrate + closure rules).
  A Rust telnet server binary wraps the engine for the connection layer.
  The core game logic is substrate content, not Rust code.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `karst-substrate-seeded` | 5 live systems + 3 sinkholes + 7 lineages + NPC agents seeded as substrate records under `examples/voidskiff/` | open |
| `telnet-server-as-pyfars-endpoint` | TCP 4000 listener as endpoint-record; player connections are inbound-only boundary participants | open |
| `claim-injection-combat` | Attacker fires morphism-shaped predication into target scope; defender's closure rules resist; outcome is substrate cell | open |
| `spore-respawn-mechanism` | Death → survival-fragment spore; respawn at nearest unexpired spore; Padovan-n tick persistence | open |
| `lineage-alignment-and-reputation` | Reputation cells per captain × lineage; dock/job/price gates read reputation; lineage events fire on schedule | open |
| `morphism-teaching-via-anastomosis` | Mutual-consent anastomosis ritual exchanges morphism subsets; teaching is witnessed and durable | open |
| `world-clock-padovan-ticked` | Padovan recurrence governs NPC job spawn, spore expiry, price shifts, lineage event frequency | open |
| `full-play-session-test` | One player connects, completes a courier job, drops a spore, anastomoses with another player, dies and respawns — all on the substrate | open |

## Done when

Two players connect over telnet simultaneously.
One completes the Keeper Oys tutorial courier run without manual substrate manipulation.
Both anastomose at Septa.
One player picks a fight with a Quire scout; the combat outcome is a substrate cell with a witness chain; one player dies and respawns at their Volva-Minor spore with the morphism subset they dropped there intact.
The world clock has ticked at least 100 times; NPC jobs have expired and respawned; Quire raids have fired according to the Padovan schedule.
The complete game state is reconstructable from the event log.

## Theoretical shape

**Game world as predication graph.** Every game object is a substrate record; every game event is a closure-rule firing.
The Karst is not a database with game logic attached — it IS the predication graph.
Voidskiff makes this abstract claim concrete and testable: if the game runs without non-substrate state, the substrate works at world-scale.

**Padovan constant as universal governing pace.** The plastic number ρ ≈ 1.3247 governs the algebraic learning calculus ([M20](m20-algebraic-learning-calculus.md)), the Voidskiff world clock, and the spore persistence timescale.
This is not decorative coincidence: the Padovan recurrence ($a_n = a_{n-2} + a_{n-3}$) is the minimal three-level lookback recurrence, and three-level lookback is what the closure algebra requires for genuine settlement.
The game's pace follows the algebra's natural timescale.

**Anastomosis as federation at captain scope.** Captain scope anastomosis is cellwise federation ([M6](m6-federation.md)) applied at the individual-agent level: two captains exchange substrate content (morphisms), apply the bilattice join, and settle the merged state.
The federation discipline — no last-write-wins, contradictions surface as `⊤` — governs morphism merging.
Anastomosis is federation at the game's social scale.

**Claim-injection as adversarial closure.** The opposing player's substrate scope is a predication graph with its own closure rules.
Injecting a claim into that scope is applying an *adversarial* closure operator.
Defense is priority ordering among closure rules.
This makes PvP combat formally tractable: the outcome is deterministic given the closures, and a skilled player is one who understands the algebra, not one with better reflexes.

## Related

- [Roadmap](roadmap.md)
- [M15 — Bundled Userland](m15-bundled-userland.md), [M19 — Self-Developing PyFARS](m19-self-developing-pyfars.md), [M21 — Token Economy](m21-substrate-native-token-economy.md), [M22 — Semioverse Navigation](m22-semioverse-navigation.md) — prerequisites
- [Engineering archive source](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/voidskiff-multiplayer-terminal-game.md)
- [Okagan paracosm source](../../../../../operations/command/personnel/emsenn/triage/projects/writing/fiction/okaga/)
