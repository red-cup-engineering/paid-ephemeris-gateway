# The Things of Farstone

This file is the canon of Farstone's **stuff**: the items actors carry, wield, and wear; the wares the shops sell; the currency that changes hands; the raw materials and recipes of the forge; and the renewable provisions that keep needs at bay.

It is also the canon of how Farstone's **economy works**, which is not the usual thing.
In Farstone, value is not a number stamped on an object.
Value is the *richness of a thing's predicates* — how much the world has come to say about it.
Trade is not a ledger transaction layered on top of the world; trade *is* the world moving an item's `located-in` assertion from one fiber to another.
The accounting and the world are the same data.
This file records that model alongside the concrete inventory, because in Farstone the theory and the things are inseparable.

---

## Economy is predicate-richness

The core economic theory of Farstone, stated plainly:

- **Value IS fiber richness, not assigned.** A thing's "fiber" is the list of settled cells the world holds about it — one cell per distinct `(predicate, object)` pair.
  A sword with fifteen settled predicates is worth more than a sword with three, *because doing something with it produces richer results*.
  A rich thing has accumulated many *determined* cells (neither absent nor contradictory); a thin thing has few.
  Worth is a pure function of the determined region of a fiber.

- **Trade IS fiber exchange.** When two actors trade, predicates move between fibers.
  The sword you receive is no longer the sword I had, because it is now entangled with *your* predicates.
  Concretely: an item's `located-in` cell is the hinge.
  It is **relational** (dual-filed — recorded once, readable from either anchor: the item's side and the place/holder's side) and **functional** (an item is in exactly one place at a time; the latest-`t` row wins).
  Picking something up is one append-only row, filed at both anchors at once.
  The double-entry the accountant wants — "my inventory debits the sword, yours credits it" — *is* that one dual-filed row.
  There is no separate ledger object.
  The accounting is the log.

- **Scarcity IS settledness.** Scarce resources are *settled* resources; abundant resources are *firable* (still open to more assertions).
  Gold is scarce because its predicates are dense, inert, stable — a settled functional cell, the cheap and stable kind.
  Food is abundant because its predicates fire freely: a non-functional, many-valued predication accumulates cells without supersession.

- **Contested value IS ⊤ (TOP).** Contradiction is a value, not a fault.
  When a cell carries both positive and converse evidence, settlement lands it at ⊤.
  A contested price has exactly this shape: the same good worth one thing through one fiber and its opposite through another.
  Farstone *shows* this rather than hiding it — the same way the Hydrant-23 water-quality dispute is held as ⊤ rather than silently picking a winner.

- **Inflation IS the tower outrunning settlement.** More tokens minted than there are stable values to back them — the predicted failure mode when freshly-minted predications outpace settled functional cells.
  (This belongs to a deferred growth layer that is not yet built; recorded here as intent.)

### Future engine intent: linear logic and `!`

A note carried forward for the next engine, not yet implemented as such:

The distinction between a **consumable** and a **reusable** thing is the distinction linear logic draws with the **`!
` ("of course") modality**.
A consumable — a ship's biscuit, a bar of iron fed into a recipe — is a *linear* resource: using it consumes it, and the assertion that it exists is spent.
A reusable — a hammer, a saw, a skill, a wielded knife — is a `!
`-marked resource: it may be used arbitrarily many times without being spent.
The intent is that recipes and verbs should eventually distinguish these formally, so the substrate can reason about what a use *costs*.
Today the distinction is encoded informally: crafting **retracts** an input's `located-in` (a tombstone — the linear consume), while tools are merely *required to be present* and survive the operation (the `!
`-reusable read).
This is the seed of a future, explicit linear-logic accounting of Farstone's economy.

---

## Currency: the penny

- **Coin is a functional predicate** on an actor: an integer count of **pennies** (100 pennies = 1 dollar).
  The latest `coin` cell is the actor's balance; a debit or credit appends a new total and supersedes the old.
  History is never mutated.
- **Display.** A purse renders as `$X.
  YYp` once it reaches a dollar, otherwise as `Np`.
  So 380 → `$3.80p`, 80 → `80p`, 100 → `$1.00p`.
- **The player starts with 250p.**

### Known purses (MUD reading)

| Actor | Coin |
|-------|------|
| You (player) | 250p |
| Yorrick Vane (chandler) | 1200p |
| Nessa Cawl (innkeeper) | 300p |
| Mara Quill (constable) | 120p |
| Old Pell (lamp-keeper) | 60p |
| Dax Pell (deckhand) | 40p |

---

## Weight and carrying capacity

- Every item may carry a **`weight`** cell (an integer; absent ⇒ 1).
- An actor's **burden** is the sum of the weights of the items it contains.
- **Carry capacity** is `attr:str × 20` (a default strength of 10 gives 200).
  The player, at strength 12, carries up to **240**.
- **Overburdened** is the state the system reads when burden exceeds capacity.

---

## Buying and selling

Priced wares are simply items that bear a **`price`** cell (in pennies) *and* whose `located-in` is set to a shop.
A shop is not a special kind of object — anything holding priced items is a shop.
`waresOf(shop)` returns every contained, priced item.

- **buy(buyer, shop, item):** move the item to the buyer (attributing the move to the buyer as acquiring agent), debit the buyer's coin by the price, credit the shop's coin.
  Two functional supersessions — both legs of the trade in one recorded act.
  Returns the amount paid and the buyer's new balance, or a failure reason (can't afford, not for sale).
- **sell(...)** is the reverse.

There is no special "shop transaction" machinery: a purchase is two trade legs over `located-in` and `coin`, recorded once.

---

## The shops

### The Chandlery — Yorrick Vane's shop

Rope, tar, lamp-oil, brass fittings; the commercial heart of the quay.

| Item | Properties | Price |
|------|-----------|-------|
| a brass clasp-knife | weapon, damage 5, weight 1 | 60p |
| a coil of tarred rope | weight 3 | 25p |
| a ship's biscuit | provides `need:hunger` amount 4, weight 1 | 8p |
| a heavy woollen coat | armour 3, covers torso, weight 3 | 90p |

### The Fishwives' Stalls — Greer Tenn

A second priced shop on market row: fresh fish, a filleting knife, a creel, samphire relish, and a hot fry-stall that provides `need:hunger`.
(Item-level detail for the stalls is thinner in the archive than for the chandlery — see open questions.)

---

## Carried, wielded, and worn

### Start-room takeables (harbor-quay)

| Item | Properties |
|------|-----------|
| a coil of mooring-line | material hemp, quality 45 |
| a fisherman's knife | weapon, damage 6, weight 1, skill `fighting.melee.knife` |
| a set of lockpicks | tool lockpick, weight 1 |

### Weapons and armour (wielded or worn by NPCs, or for sale)

| Item | Properties | Holder |
|------|-----------|--------|
| a fisherman's knife | damage 6, weight 1, knife-work | start room |
| a gutting knife | damage 7, weight 1, knife-work | wielded by Dax Pell |
| a constable's baton | damage 9, weight 2, club | wielded by Mara Quill |
| a brass clasp-knife | damage 5, weight 1 | chandlery (60p) |
| a tarred oilskin | armour 2, covers torso, weight 2 | worn by Dax Pell |
| a studded leather jerkin | armour 4, covers torso, weight 4 | worn by Mara Quill |
| a heavy woollen coat | armour 3, covers torso, weight 3 | chandlery (90p) |

Armour names the body part it covers (`armor-covers`) and the soak it grants (`armor-protection`).
A weapon names its damage (`weapon-damage`) and the skill that governs it (`weapon-skill`).

### Scattered across the map (flavour takeables, by quality)

a-gaff-hook (iron, q50, fish-pier) · a-storm-lantern (brass, q55, breakwater) · a-tar-pot (iron, q40, chandlery) · a-bait-bucket (wood, q30, fishing-boats) · a-votive-candle (wax, q35, chapel) · a-half-model (oak, q60, guild hall) · a-quarry-maul (iron, q55, quarry) · a-bundle-of-weed (herb, q40, witch's hut) · a-heron-feather (feather, q25, marsh) · a-ledger-key (brass, q45, counting-house) · a-strongbox (iron, locked 20, weight 8, saltloft inn — pickable with the lockpicks).

---

## The forge: materials and recipes

Crafting in Farstone is **fiber fusion** — composition over a recipe's required input channels.
A recipe is data, not code; adding one is permissionless content.

A recipe is `{ requires: [{predicate, object}…], yields: { id, cells: [...] } }`.
Each requirement is met when *some* input's settled fiber bears that `(predicate, object)` pair.
On success: the output is minted (its `yields` cells are written, attributed to the crafter) and each **consumable** input is consumed (its `located-in` is retracted — the linear spend).
On failure: **no writes at all**.
Deterministic; no randomness.

### Boatyard forge-stock (in the-boatyard)

| Item | Properties |
|------|-----------|
| a bar of pig-iron (×2 in stock) | material iron, quality 6, weight 4 |
| an oak billet | material oak, quality 5, weight 3 |
| a shipwright's hammer | tool hammer, quality 6, weight 3 (reusable) |
| a two-man pit-saw | tool saw, quality 5, weight 5 (reusable) |

### Recipes

| Recipe | Requires | Yields |
|--------|----------|--------|
| craft blade | 2× iron bar (consumed) + hammer (reused) | a forged sword (weapon-damage / weapon-skill `fighting.melee.sword`, immediately wieldable) |
| craft nail | 1× iron bar (consumed) + hammer (reused) | a nail |
| craft plank | oak billet (consumed) + saw (reused) | a plank |

The iron bars and the oak billet are the **linear** inputs (spent on use); the hammer and saw are the **`!
`-reusable** tools (present, required, but never spent).
This is the informal encoding of the linear-logic distinction described above.

---

## Provisions: the renewable resources

Resources bear `provides` cells linking them to a need category (`need:hunger`, `need:rest`, `need:recreation`) and an `amount` they can yield before depleting.
These are the abundant-but-finite stuff of survival; in the off-season their amounts are kept deliberately small, so scarcity bites.

**Hunger (food):** the-stew-pot (Saltloft Inn, 30) · the-clam-bed (fish-pier, 12) · the-marsh-clams (marsh, 20) · the-fishwives-fry (market row, 24) · the-ration-barrel (tutorial cove, 40).

**Rest:** the-inn-beds (Saltloft, 24) · the-warming-bench (tutorial cove, 40) · the-almshouse-cots (almshouse, 20).

**Recreation:** the-taproom (Saltloft Inn, 30) · the-guild-hearth (guild hall, 30) · the-chapel-quiet (chapel, 24).

---

## Attributes and skills (what items plug into)

Items don't act alone — they read against an actor's attributes and skills, all of which are functional cells on the actor.

- **Attributes** (`attr:str/dex/int/wis/con`) feed carry capacity (`str × 20`), skill bonuses (each skill reads its governing stat), and combat (offence / defence / armour-soak).
  The **player**: str 12, dex 11, int 10, wis 10, con 11.
- **Skills** are repeating `skill:<dotted-path>` cells read as taught counts / bonuses.
  The player starts with `skill:combat 55` (bare-handed), `fighting.melee.knife ×4`, `crafting.smithing.black ×3`, plus dabbler levels in magic (evocation ×3, illusion ×2), covert (theft ×3, locks ×4, stealth ×3), healing (×3), and ritual (×1).

---

## The larger frame: PyFARS token economy (planned)

At the polity scale, Farstone's economics extend the same idea: an office's **token balance** is a substrate cell `(office, token-balance, value, t)` with first-class provenance, not a database column.
Capabilities, achievements, and reputation are likewise cells, each with a witness pointing to the event that produced it.
Work completion emits **XP-as-revenue** cells; an office can **stake** reputation on a plan and be **slashed** if it fails; two offices using each other's work form a capability market whose price is computed by `respond(supply, demand)`.
Certifications are content-addressed (SHA-256), append-only, and replay-provable — "the same mathematics as NFTs without a blockchain."
The thesis is a *six-domain convergence*: when two fibers compose, that single act is simultaneously a message, an accounting entry, a game event, a token transfer, a certification, and a governance act — one algebra under all of them.
(Planned milestone work; recorded here as the economic horizon, not as shipped mechanics.)

---

## Open questions (things & economy)

- Is the crafting recipe catalog drop-in extensible (recipe JSON files), or does adding a recipe require registration somewhere?
- When an actor exceeds carry capacity, is the action rejected outright, or does `overburdened` simply become a status flag with downstream penalties?
- Does predicate-richness actually drive in-game value quotes today, or is it a theoretical foundation awaiting a pricing/appraisal UI?
- How do contested (⊤) values render in the player interface when appraising or pricing an item?
- The forge defines three tool types (hammer, saw, lockpick) — are these the only crafting tools, or are others defined elsewhere?
- The Fishwives' Stalls are named as a second priced shop, but per-item prices and weights are not fully recorded the way the chandlery's are.
- The linear-logic / `!
  ` distinction is intent, not yet a formal substrate feature; the tower/fold growth layer that would make inflation concrete is "not yet present."
- The PyFARS token economy (staking, slashing, capability market, certification) is planned-milestone work, not live in Farstone today.
