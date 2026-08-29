# Farstone Harbor — quarrel on the quay

A large, dense, hand-authored demo world.
A raw newcomer steps off the mainland ferry into a calm, self-contained **tutorial cove** (in the spirit of Discworld MUD's Pumpkin Town), learns the verbs from a guide and a row of readable signposts, swings at a harmless straw dummy, then follows a short guided path **down** into the working harbour: a cold New-England waterfront in the lean off-season, with named people to talk to, hand things to, and fight, hot stew and a bed close by, market streets, a chapel and a guild, a lighthouse you can climb, and a salt-marsh and granite quarry behind the town — a whole island of **~30 rooms** you can walk in either direction without ever getting lost.

## The start room (read this first)

**Start room id: `newcomer-landing`** (the Newcomer's Landing) — the ferry deck in the tutorial cove.
This is where `play.mjs --actor you` and the server's `--start` drop a new arrival.
The old **`harbor-quay`** is still the heart of the cast and the quarrel, one short guided walk away (`up`, `up`, `north`, `down`).

It is also where the **deep systems** land: you arrive with attributes, a small purse, and a little knife-work and smithing already taught; the two fighters on the quay come armed, armoured, and in a stance; a chandler up the way sells priced wares; and the boatyard out back holds raw iron, oak, and the tools to forge.
So beyond walking and talking, you can `score` your character sheet, `wield`/`wear`/`tactics`, `buy`/`sell` at the chandlery, and `craft` at the boatyard.

## The vibe

Farston Harbor is the working waterfront of a granite island after the summer trade has gone.
The fleet is half tied-up, money is short, and tempers on the quay are shorter.
The harbour at the heart is the old fully-walkable loop — the fish-pier and **chandlery** off the quay (where Yorrick Vane sells), the warm Saltloft Inn up the lane, the ferry slip and the harbor-light breakwater out past the moorings, the **boatyard** round the back (a forge floor of iron, oak, and tools).
Around it the world has grown: a **market row** with the fishwives and a counting-house, an **old town** up the high street (chapel, watch-house, mariners' guild, smithy, almshouse), the **lighthouse interior** you climb to the lamp gallery, the **fishing boats** below the pier, and a **hinterland** of salt-marsh, marsh-witch's hut, granite quarry, and the moor gate.
Every exit goes both ways across all ~30 rooms; you can't get lost or walled in.

## The tutorial — the Newcomer's Cove (the new start)

A calm, safe onboarding zone in the spirit of Discworld's Pumpkin Town.
You arrive here, not on the quay, and learn the ropes before anything can hurt you.
Four rooms, a guide, ten teaching signs, two harmless dummies, and a starter shop:

- **`newcomer-landing`** — the ferry deck (**START**). **`wynn-warden`** (Wynn the harbour-warden) greets each arrival; a **`straw-dummy`** leans on a post; a **ration-barrel** feeds you and three signs teach **looking/examining**, the **senses**, and **moving** (`up` from here).
  `up` →
- **`the-wardens-walk`** — a warming-bench (rest) and signs on **talking** (`say`/`tell`/`emote`) and **food/rest** (`eat`/`rest`).
  `up` →
- **`the-tutorial-yard`** — a sand-filled **`sand-post`** to attack, a lean-to shop run by **`pip-keeper`** (Pip) selling a cudgel, a cap, and a loaf for coppers, and signs on **carrying** (`get`/`drop`/`i`/`give`), **your character** (`score`/`skills`), **combat** (`consider`/`wield`/ `wear`/`tactics`/`attack`), and **shops** (`wares`/`buy`/`sell`/`value`).
  `north` →
- **`the-lower-lane`** — a sign pointing onward to the deeper arts (cast/pray/join/accept/treat), then `down` onto **`harbor-quay`** — the real Farstone begins there.

**The signs** are items bearing a `describing` cell — `examine <sign>` prints the lesson.
(The guide greets via her `intends`; the teaching itself lives on the signs, because an NPC's tick-`intends` files a cell rather than speaking.) **The dummies** are `mover` actors with full bodies (so a blow lands) but **no** `skill:combat`, weapon, or `intends` — they never strike back, so a newcomer feels combat resolve in perfect safety.

## The cast on the quay

Standing on the quay with you, close enough to come to blows:

- **`dax-pell` — Dax Pell, an out-of-work deckhand.** Hot-headed and restless, broke and hungry since the boats tied up (`need:hunger` 34, so he's `spoiling-for a-fight`).
  A perfect first target: *talk* to him, *give* him stew to take the edge off, or *fight* him — he has a real numeric `skill:combat` (65), and now comes **armed and armoured**: a gutting knife wielded, a tarred oilskin on his torso, and an **offensive** stance.
  Blows land both ways.
- **`mara-quill` — Sergeant Mara Quill, the harbor constable.** Steady and dutiful, twenty years keeping the peace.
  She carries `skill:combat` (80) — higher than Dax — and fights like a trained constable: a **baton** wielded, a **studded leather jerkin** (armour 4), a **defensive** stance, and a **parry**.
  She out-defends and counters, so fighting her is a genuine contest, not a free win.
  The two are flagged rivals (`opinion-of` each other = `rival`), so the quay is one short fuse.

One step **north** at the Saltloft Inn:

- **`nessa-cawl` — Nessa Cawl, the innkeeper.** Cheerful and generous, the social hub.
  Her room has the **stew-pot** (`provides need:hunger`), the **beds** (`provides need:rest`), and the **taproom** (`provides need:recreation`) — so *eat* and *rest* verbs all work a step from start.

Out on the edge, the breakwater (**west** to the ferry slip, then **south**):

- **`old-pell` — Old Pell, the lamp-keeper.** Solitary, watchful, alone at the harbor light — the second NPC to walk to and `tell`/mail.

In the **chandlery** (east off the quay):

- **`yorrick-vane` — Yorrick Vane, the chandler.** A shopkeeper with a purse (1200p) and a floor of priced wares.
  `wares` to see his stock, `buy <thing>` to spend your purse, `sell <thing>` to unload what you carry.

## The wider town (the bigger world)

Beyond the quay loop, a living cast now keeps the town.
The market, old town, and hinterland each hold named people with needs, traits, and (for several) skills, gear, and daily routines:

- **Market row & counting-house.** **`greer-tbenn`** (Greer Tenn, the loud, shrewd **fishwife**) runs a **second priced shop** at the fishwives' stalls — fresh fish, a filleting knife, a creel, samphire relish — plus a hot fry-stall (`need:hunger`). **`edrun-clerk`** (Edrun Sable) keeps the harbour's tolls in the **counting-house** over an iron strongbox.
- **The old town** (up the high street from the inn). **`father-coll`**, priest of **Maraset**, keeps the **Chapel of Maraset** — the place to `worship` and `pray` (a votive candle and the chapel's quiet for recreation). **`guildmaster-orla`** (Yorrick's stern elder sister) enrols hands at the **Mariners' Guild Hall** (a hearth for recreation); the **smithy** sits below it. **`matron-ivy`** runs the **almshouse** (charitable cots and a healer's hands).
  The **watch-house** is the constable's other haunt.
- **The hinterland** (inland off the chapel). **`tomas-quarryman`** (Tomas Strake) works the **granite quarry** — strong, stolid, armed with a maul (`skill:combat` 60), a fight you should `consider` first. **`morrigan-witch`** (Morrigan, the marsh-witch) keeps a **hut** out past the **salt-marsh** (clam-beds at the ebb), trading cures and charms and the spells the chapel frowns on.
  The **moor gate** is the end of the made world.
- **The lighthouse interior.** From the breakwater, `east` to the **foot**, then `up` the **spiral stair** to the **lamp gallery** (the quest's climb), the whole harbour laid out below.

## Combat note (why the numbers are what they are)

Combat is now **deep but backward-compatible**.
Offence is `weapon-skill bonus + weapon-damage` when you wield (or the legacy flat `skill:combat` bare-handed), plus a tactics swing (offensive +5 / defensive −5) and any condition modifier.
Defence is half your effective mobility plus your defence-skill (dodge/parry/block) plus a defensive-stance bonus.
A landed wound's depth is **soaked** by armour on the struck part.
The contest still resolves as a bilattice meet: hit / miss / **⊤ clash** (both fighters wound each other).

The legacy floor still holds: an *un-geared* actor with only `skill:combat` settles byte-for-byte to the old numbers (a target's defence is half its `capacity:moving`, 50 when uninjured, so a bare `skill:combat` needs to be **above 50** to wound an unhurt opponent).
The DSL only records a skill as the string `"practiced"` (reads as 0), so `build.mjs` stamps the numeric levels (Dax 65, Mara 80) on top of the lint-clean DSL load — then layers their weapons, armour, and stances.

## The deep systems on this map

The demo's `build.mjs` layers a second pass onto the DSL load — everything the DSL can't express, all of it reachable from the player surface:

- **Attributes + purses.** Every named actor carries `attr:str/dex/int/wis/con` and a `coin` purse.
  Stats feed skill bonuses, carry capacity (`str * 20`), and combat.
  `you` start with a hand of stats and **250p**.
- **A skill tree on `you`.** You arrive with `skill:combat` 55, knife-work (`fighting.melee.knife`, taught ×4), and smithing (`crafting.smithing.black`, taught ×3) — so `score`/`skills` show real bonuses and a forge is within reach.
- **Gear + stances** on the two fighters (above), all wieldable/wearable by you too.
- **A shop:** Yorrick Vane's chandlery, with priced wares on the floor.
- **A forge floor:** the boatyard holds raw iron, oak, and the tools, so `craft` has stock.

## Items

- `a-mooring-line` — a coil of mooring-line, takeable, on the **start room**.
- `a-fish-knife` — a fisherman's knife (weapon, dmg 6) on the **start room**, ready to `wield`.
- `a-gaff-hook` — on the fish-pier.
- `a-tar-pot` — in the chandlery.
- `a-storm-lantern` — out on the breakwater.

**Worn/wielded by the cast:** `a-gutting-knife` + `an-oilskin` (Dax), `a-constables-baton` + `a-leather-jerkin` (Mara).

## The chandler's wares (buy/sell)

Priced stock on the chandlery floor (`wares` to list, `buy <thing>`):

- `a-clasp-knife` — a brass clasp-knife (weapon, dmg 5) — **60p**
- `a-coil-of-rope` — a coil of tarred rope — **25p**
- `a-ships-biscuit` — a ship's biscuit (`provides need:hunger`) — **8p**
- `a-woollen-coat` — a heavy woollen coat (armour 3, torso) — **90p**

## The boatyard forge-stock (craft)

Raw stock + tools, all takeable, in the **boatyard** (round the back).
Carry the materials and a tool, then `craft`:

- `a-bar-of-iron`, `another-bar-of-iron` — pig-iron (material iron, quality 6)
- `an-oak-billet` — oak (material oak, quality 5)
- `a-shipwrights-hammer` — tool: hammer (quality 6)
- `a-pit-saw` — tool: saw (quality 5)

With two iron bars and the hammer you can `craft blade` (a forged sword that carries `weapon-damage`/`weapon-skill`, immediately wieldable); a single bar + hammer makes `nail`; oak + saw makes `plank`.
`recipes` lists what the catalog can make.

## Resources (so eat/rest work)

- `the-stew-pot` (`need:hunger`) and `the-clam-bed` on the pier (`need:hunger`).
- `the-inn-beds` (`need:rest`).
- `the-taproom` (`need:recreation`).

## Build it

The committed folder holds the **definition + scripts + this README**, not a generated world.
Build the world dir first:

```
node examples/farstone-harbor/build.mjs
```

This lints the definition, loads it through the DSL, stamps the numeric combat skills and your player, and writes everything to `examples/farstone-harbor/world/`.
It is fully deterministic (no `Date.now`, no `Math.random` — every `t` is a counter), so it rebuilds byte-for-byte.

## Play it

Telnet-style server (other people can connect):

```
node scripts/serve.mjs examples/farstone-harbor/world --start newcomer-landing --port 4000
```

Single-player session, dropped onto the **newcomer landing** (the tutorial cove) as the placed player:

```
node scripts/play.mjs examples/farstone-harbor/world --actor you
```

In a session, the basics: `look`, then read the signs (`examine the welcome-board`), `say hello` to Wynn, `up` and `up` and `north` and `down` to walk the guided path onto the quay.
`i` for inventory, `?
` for affordances.
The autonomous tick keeps decaying needs and firing the NPCs' intends around you the whole time.

The deep systems, all reachable from the prompt:

- **Self:** `score` (your full character sheet), `skills` (skills with bonuses), `consider <who>` (size up a foe before you swing).
- **Gear:** `wield a fish-knife`, `unwield`, `wear <armour>`, `remove <armour>`, `tactics offensive|neutral|defensive` / `tactics dodge|parry|block`.
- **Trade** (in the chandlery): `wares`, `buy <thing>`, `sell <thing>`, `value <thing>`.
- **Craft** (in the boatyard, materials + tool in hand): `recipes`, `craft blade`.
- **Social:** `smile`, `bow`, `wave`, `glare <who>`, … (`socials` lists all 151), plus `say`/`tell`/`emote`/`mail`.

## Verify

```
node examples/farstone-harbor/build.mjs
node scripts/run.mjs examples/farstone-harbor/world --replay
```

The replay settles the world to `t` — ~30 rooms (the tutorial cove, the harbour loop, the market, the old town, the lighthouse interior, and the hinterland), the full cast (the four authored quay NPCs, the chandler `yorrick-vane`, the guide `wynn-warden`, the two practice dummies, the lean-to keeper `pip-keeper`, and the seven wider-town NPCs), the DSL items and resources, and the deep-systems seeding: every actor's `attr:*` and `coin`, the fighters' wielded/worn gear and stances, the chandler's and the fishwife's priced wares, the boatyard's forge-stock, the tutorial signs (each an item with a `describing` lesson), and the new cast's skills/weapons/routines.
`dax-pell` and `mara-quill` carry `mover`, full `need:*`, and a numeric `skill:combat`; the dummies carry `mover` and a full body but **no** combat, so they never strike back.

## Wave 2 — magic, faith, stealth, guilds, quests, medicine

A second wave of systems lands on the same map, and `build.mjs`'s wave-2 pass arms `you` to reach all of it.
You arrive a **dabbler**: a little evocation and illusion taught, a healer's touch, the fingers for locks and theft, a god to pray to, and three known spells.
Everything below is reachable from the prompt.
(Stats are hand-picked so each art *just* works — gates are tight.)

**Magic.** You know **spark**, **mend**, and **befuddle** (`spells` lists them and your mana).

- `cast spark <who>` — a small evocation, scratches an arm (try it on `dax-pell`).
- `cast befuddle <who>` — an illusion that afflicts the **drunk** condition on the target.
- `cast mend` — heal yourself; `learn <spell>` to study a new one (e.g. `learn frostbite`).

**Faith.** You already **worship Maraset** (grey-eyed lady of tide and harbor) and have the trained hand for the simplest rite.

- `pray` — deepen your piety (and quietly train `faith.devotion`); repeat to afford bigger rites.
- `worship` to see your god and the pantheon; `invoke benediction` — call Maraset's favor down on yourself, landing the **blessed** condition.
  Pray a couple of times first (a benediction costs piety).

**Stealth.** You carry **a set of lockpicks** (on the quay) and have the covert skills.

- `hide` / `sneak`, `steal <thing> from <who>` — a deterministic contest, no dice.
- The **iron strongbox** sits in the Saltloft Inn (`locked` 20).
  Walk north, then `pick the strongbox` — with the picks in hand your craft clears the lock.

**Guilds.** The **City Watch** keeps the law here.

- `guilds` lists the orders; `join watch` (it debits a joining fee from your purse).
  Your **title** is read off your governing-skill bonus — it rises as you train, no separate promotion.
  `title` (or the `calling` line of `score`) shows where you stand.

**Quests.** Two quest-givers stand on the map, their ids matching the quest table.

- The **Harbormaster** (on the quay) offers *A Letter for the Lighthouse Keeper* — `accept deliver-the-letter`, carry the sealed letter to **Old Pell** out at the harbor light, then `complete` it for coin.
- **Old Pell** offers *Climb to the Lantern* (`reach-the-lighthouse`) — the wave-2 pass hangs a **Lighthouse Gallery** east of the breakwater to reach; **Bryn the smith** works the boatyard.
- `quests` shows what you've accepted and its standing (objectives are read straight off the world — no hidden counter).

**Medicine.** **Nessa Cawl** at the inn is the island's healer, and you have the touch too.

- `diagnose <who>` reads a body's wounds and whether it's infected; `treat <who> <part>` closes a wound, scaled by `people.healing`, and fights the fever.
  After a quay fight, treat the wounded — an untended severe wound **festers** into sickness on the tick if left, and a body driven to death becomes a lootable **corpse** that decays.

**A world with a clock.** The chandler and Bryn now keep **daily routines** — Yorrick works his shop by day and drinks at the inn by night; Bryn likewise from the boatyard.
As the autonomous tick turns the harbor clock, they walk their schedules a room at a time, so where you find someone depends on the hour.

The wave-2 commands, all from the prompt:

- **Magic:** `cast <spell> [who]`, `learn <spell>`, `spells`.
- **Faith:** `worship`, `pray`, `invoke <ritual> [who]`.
- **Stealth:** `hide`, `sneak`, `steal <thing> from <who>`, `pick <thing>`.
- **Guilds:** `guilds`, `join <guild>`, `title`.
- **Quests:** `quests`, `accept <quest-id>`, `complete <quest-id>`.
- **Medicine:** `diagnose <who>`, `treat <who> <part>`.
