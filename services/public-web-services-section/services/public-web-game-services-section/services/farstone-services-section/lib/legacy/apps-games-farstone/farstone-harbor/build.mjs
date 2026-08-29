// build — materialize "Farstone Harbor — quarrel on the quay" into a world dir.
//
//   node examples/farstone-harbor/build.mjs            # write into examples/farstone-harbor/world/
//   node examples/farstone-harbor/build.mjs <dir>      # write a fresh copy elsewhere
//
// Two passes, both deterministic (no Date.now / Math.random — every `t` is a counter):
//
//   (1) LINT then loadWorld(definition) — the DSL compiles the authored definition to EAVT rows
//       and `doing`s each one, stamped `dsl:NNNNNN`. This is the lint-gated authoring path the
//       other examples use; it refuses to load a definition with errors.
//   (2) A SHORT seeding pass, stamped `harbor:NNNNNN` (sorts after `dsl:`), that adds the two
//       things the DSL cannot express:
//         - a NUMERIC `skill:combat` on the two quay fighters. The DSL records a skill only as
//           `practiced` (a string); but #fighting reads skill:combat as an INTEGER level (the
//           attacker's offence), so a string reads as 0 and no blow lands. Stamping a real level
//           here is what makes the fight on the quay actually land.
//         - a PLACED PLAYER ("you") in the start room, a `mover:session` actor so `play.mjs
//           --actor you` drops you straight into the quay with the cast.
//
// The committed example holds the DEFINITION + this script + the README, NOT a generated world —
// run this to produce examples/farstone-harbor/world/ (the dir the README's run commands expect).

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rm } from "node:fs/promises";

import { loadWorld, lint } from "#dsl";
import doing from "#doing";
import definition from "./definition.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORLD = join(HERE, "world");

// The combat levels stamped on the quay pair (see note above). Integers, deterministic. These are
// tuned above #fighting's defence floor so a blow actually LANDS: a target's defence is half its
// `capacity:moving` (50 when uninjured), so an attacker needs a combat level ABOVE 50 to wound an
// unhurt opponent. Dax swings hard and untempered (65); Mara is the trained constable who out-
// defends him and counters (80) — a real, winnable contest, not a one-sided beating or a stalemate.
const COMBAT = { "dax-pell": 65, "mara-quill": 80 };

// The player placed in the START room. The start is now the TUTORIAL landing (the ferry deck in the
// newcomer's cove), so a raw newcomer learns the verbs before reaching the harbour. The old quay is
// still the heart of the cast and the quarrel; we keep its id for the gear-placement below.
const START_ROOM = "newcomer-landing";
const QUAY = "harbor-quay";

export default async function buildHarbor(root = DEFAULT_WORLD, { fresh = true } = {}) {
  const issues = lint(definition);
  if (issues.length) {
    const lines = issues.map((i) => `  ${i.severity} [${i.code}] ${i.message}`).join("\n");
    throw new Error(`definition is not lint-clean (${issues.length} issue(s)):\n${lines}`);
  }
  if (fresh) await rm(root, { recursive: true, force: true });

  // Pass 1 — the lint-gated DSL load.
  const { written } = await loadWorld(root, definition);

  // Pass 2 — deterministic seeding the DSL cannot express. Stamped `harbor:NNNNNN` so these rows
  // sort AFTER the `dsl:` rows (a later supersession would win, but these predicates are fresh).
  let seq = 0;
  const t = () => `harbor:${String(++seq).padStart(6, "0")}`;
  const say = (subject, predicate, object) =>
    doing({ root, subject, predicate, object, t: t() });

  // Numeric combat levels on the two fighters.
  for (const [npc, level] of Object.entries(COMBAT)) {
    await say(npc, "skill:combat", level);
  }

  // A placed player in the start room — a session-driven actor present so the world has someone to
  // perceive it and so `play.mjs --actor you` works out of the box.
  await say("you", "kind", "player");
  await say("you", "mover", "session");
  await say("you", "naming", "you");
  await say("you", "located-in", START_ROOM);
  for (const p of ["naming", "describing", "ringing", "phase", "status"]) {
    await say("you", "perceives", p);
  }

  // --- the DEEP systems: attributes, purses, gear, a shop, and a forge's worth of stock ---------
  // None of this the DSL can express; all of it the player surface now reaches (score/wield/wear/
  // tactics/buy/sell/craft/consider). The fighters come ARMED and ARMOURED with stances; a chandler
  // trades priced wares; the boatyard holds raw iron + oak + tools so a player can actually forge.
  const item = async (id, cells, where) => {
    await say(id, "kind", "item");
    for (const [a, v] of Object.entries(cells)) await say(id, a, v);
    await say(id, "located-in", where);
  };

  // Attributes + a purse on the cast (stats feed skill bonuses, carry capacity, and combat).
  const STATS = {
    you:          { str: 12, dex: 11, int: 10, wis: 10, con: 11, coin: 250 },
    "dax-pell":   { str: 13, dex: 12, int: 9,  wis: 8,  con: 12, coin: 40 },
    "mara-quill": { str: 12, dex: 13, int: 11, wis: 12, con: 13, coin: 120 },
    "nessa-cawl": { str: 10, dex: 11, int: 12, wis: 12, con: 11, coin: 300 },
    "old-pell":   { str: 9,  dex: 9,  int: 11, wis: 13, con: 10, coin: 60 },
  };
  for (const [id, s] of Object.entries(STATS)) {
    for (const a of ["str", "dex", "int", "wis", "con"]) await say(id, `attr:${a}`, s[a]);
    await say(id, "coin", s.coin);
  }

  // The player arrives a credible hand (so a fight on the quay is winnable) with a little knife-work
  // and smithing already taught (the skill tree reads these as bonus).
  await say("you", "skill:combat", 55);
  for (let i = 0; i < 4; i += 1) await say("you", "skill:fighting.melee.knife", "fighting.melee.knife");
  for (let i = 0; i < 3; i += 1) await say("you", "skill:crafting.smithing.black", "crafting.smithing.black");

  // Weapons + armour, and who wields/wears them. (A fighter's wielded weapon ADDS its damage atop
  // their reach; an unpracticed weapon never lowers a skilled brawler — see fight.mjs offence.)
  await item("a-fish-knife",        { naming: "a fisherman's knife", "weapon-damage": 6, "weapon-skill": "fighting.melee.knife", weight: 1 }, QUAY);
  await item("a-gutting-knife",     { naming: "a gutting knife", "weapon-damage": 7, "weapon-skill": "fighting.melee.knife", weight: 1 }, "dax-pell");
  await item("an-oilskin",          { naming: "a tarred oilskin", "armor-protection": 2, "armor-covers": "torso", weight: 2 }, "dax-pell");
  await item("a-constables-baton",  { naming: "a constable's baton", "weapon-damage": 9, "weapon-skill": "fighting.melee.club", weight: 2 }, "mara-quill");
  await item("a-leather-jerkin",    { naming: "a studded leather jerkin", "armor-protection": 4, "armor-covers": "torso", weight: 4 }, "mara-quill");
  await say("dax-pell", "wielding", "a-gutting-knife");
  await say("dax-pell", "wearing:torso", "an-oilskin");
  await say("dax-pell", "tactics:attack", "offensive");
  await say("mara-quill", "wielding", "a-constables-baton");
  await say("mara-quill", "wearing:torso", "a-leather-jerkin");
  await say("mara-quill", "tactics:attack", "defensive");
  await say("mara-quill", "tactics:defense", "parry");

  // A shop: Yorrick Vane trades from the chandlery; the priced wares sit on the chandlery floor.
  await say("yorrick-vane", "kind", "npc");
  await say("yorrick-vane", "naming", "Yorrick Vane, the chandler");
  await say("yorrick-vane", "mover", "tick");
  await say("yorrick-vane", "located-in", "the-chandlery");
  await say("yorrick-vane", "coin", 1200);
  for (const n of ["hunger", "rest", "recreation"]) await say("yorrick-vane", `need:${n}`, 70);
  await item("a-clasp-knife",   { naming: "a brass clasp-knife", "weapon-damage": 5, "weapon-skill": "fighting.melee.knife", weight: 1, price: 60 }, "the-chandlery");
  await item("a-coil-of-rope",  { naming: "a coil of tarred rope", weight: 3, price: 25 }, "the-chandlery");
  await item("a-ships-biscuit", { naming: "a ship's biscuit", provides: "need:hunger", amount: 4, weight: 1, price: 8 }, "the-chandlery");
  await item("a-woollen-coat",  { naming: "a heavy woollen coat", "armor-protection": 3, "armor-covers": "torso", weight: 3, price: 90 }, "the-chandlery");

  // The boatyard as a forge floor: raw iron + oak + the tools, all takeable, so `craft` has stock.
  await item("a-bar-of-iron",        { naming: "a bar of pig-iron", material: "iron", quality: 6, weight: 4 }, "the-boatyard");
  await item("another-bar-of-iron",  { naming: "a bar of pig-iron", material: "iron", quality: 6, weight: 4 }, "the-boatyard");
  await item("an-oak-billet",        { naming: "an oak billet", material: "oak", quality: 5, weight: 3 }, "the-boatyard");
  await item("a-shipwrights-hammer", { naming: "a shipwright's hammer", tool: "hammer", quality: 6, weight: 3 }, "the-boatyard");
  await item("a-pit-saw",            { naming: "a two-man pit-saw", tool: "saw", quality: 5, weight: 5 }, "the-boatyard");
  await item("a-third-bar-of-iron",  { naming: "a bar of pig-iron", material: "iron", quality: 6, weight: 4 }, "the-boatyard"); // 3rd, so 'gather 3 iron' is doable

  // --- wave 2: arm the player for every art, add quest-givers + their places, and a daily rhythm
  const teach = async (id, path, n) => { for (let i = 0; i < n; i += 1) await say(id, `skill:${path}`, path); };

  // The player arrives a dabbler: a couple of cantrips + mana, a god to pray to, the fingers for
  // locks and theft, and a healer's touch — so cast/pray/invoke/hide/steal/pick/treat all work now.
  await teach("you", "magic.evocation", 3);
  await teach("you", "magic.illusion", 2);
  await teach("you", "covert.theft", 3);
  await teach("you", "covert.locks", 4);
  await teach("you", "covert.stealth", 3);
  await teach("you", "people.healing", 3);
  await teach("you", "faith.rituals", 1);
  await say("you", "knows-spell:spark", true);
  await say("you", "knows-spell:mend", true);
  await say("you", "knows-spell:befuddle", true);
  await say("you", "worships", "Maraset");
  await item("a-set-of-picks", { naming: "a set of lockpicks", tool: "lockpick", weight: 1 }, QUAY);
  await item("a-strongbox", { naming: "an iron strongbox", locked: 20, weight: 8 }, "the-saltloft-inn"); // pick me

  // Quest-givers whose ids match the #quests table, placed so their objectives are reachable.
  await say("harbormaster", "kind", "npc"); await say("harbormaster", "naming", "the Harbormaster");
  await say("harbormaster", "mover", "tick"); await say("harbormaster", "located-in", QUAY);
  for (const n of ["hunger", "rest", "recreation"]) await say("harbormaster", `need:${n}`, 70);
  await say("smith-bryn", "kind", "npc"); await say("smith-bryn", "naming", "Bryn the smith");
  await say("smith-bryn", "mover", "tick"); await say("smith-bryn", "located-in", "the-boatyard");
  for (const n of ["hunger", "rest", "recreation"]) await say("smith-bryn", `need:${n}`, 70);
  await teach("smith-bryn", "crafting.smithing", 8);

  // The two places the reach-quests point at, hung off the map WITHOUT colliding with the
  // definition's exits. The Lighthouse Gallery now caps the lighthouse interior (up the stair the
  // definition adds inside the tower); the Far Mole hangs off a free face of the ferry slip.
  await say("lighthouse-gallery", "naming", "the Lighthouse Gallery");
  await say("lighthouse-gallery", "describing", "the iron walkway around the lamp, the whole harbor laid out below.");
  await say("the-lighthouse-stair", "exit-up", "lighthouse-gallery");
  await say("lighthouse-gallery", "exit-down", "the-lighthouse-stair");
  await say("far-mole", "naming", "the Far Mole");
  await say("far-mole", "describing", "the long stone arm of the outer harbor, slick and wind-scoured.");
  await say("the-ferry-slip", "exit-down", "far-mole");
  await say("far-mole", "exit-up", "the-ferry-slip");

  // Nessa keeps the inn AND is the island's healer; give her the touch.
  await teach("nessa-cawl", "people.healing", 5);

  // A daily rhythm: the chandler works his shop by day and drinks at the inn by night; Bryn likewise.
  await say("yorrick-vane", "routine:8", "the-chandlery");
  await say("yorrick-vane", "routine:20", "the-saltloft-inn");
  await say("smith-bryn", "routine:7", "the-boatyard");
  await say("smith-bryn", "routine:21", "the-saltloft-inn");

  // --- WAVE 3: the TUTORIAL — the Newcomer's Cove (the new START), Pumpkin-Town-style ------------
  // A calm, safe onboarding zone. The lessons live on readable SIGNS (items with a `describing`
  // cell — `examine <sign>` shows the text), because the tick's intends `do` files a cell rather
  // than speaking; the guide greets via her intends, the signs teach the verbs, and a harmless
  // straw dummy lets a newcomer feel a blow land without any risk.
  //
  // A signpost: a takeable-looking notice whose `describing` is the lesson. We give each a tiny
  // weight so it reads as an ordinary item, and a `notice` cell so a client could pick them out.
  const sign = async (id, where, naming, text) => {
    await say(id, "kind", "item");
    await say(id, "naming", naming);
    await say(id, "describing", text);
    await say(id, "notice", "tutorial");
    await say(id, "weight", 1);
    await say(id, "located-in", where);
  };

  // Landing — looking, the senses, and moving.
  await sign("sign-welcome", START_ROOM, "a painted welcome-board",
    "WELCOME TO FARSTONE. You have just stepped off the ferry. To see where you are, type LOOK. " +
    "To read any sign or person, type EXAMINE followed by its name, e.g. EXAMINE the welcome-board. " +
    "Take your time here — nothing in this cove can harm you.");
  await sign("sign-senses", START_ROOM, "a sign about the senses",
    "YOUR SENSES. Between your commands the world reports what it newly notices — someone arriving, " +
    "a voice, a wound, a turn of the weather. That stream is your PERCEPTION; it is how a place feels " +
    "alive. Stand a moment and watch the lines come in.");
  await sign("sign-moving", START_ROOM, "a sign about moving",
    "MOVING. Rooms join by EXITS shown when you LOOK. Walk them by direction: N S E W, and UP / DOWN. " +
    "From here, go UP to follow the warden's walk. Every exit goes both ways, so you can never be " +
    "trapped — DOWN brings you back.");

  // Warden's walk — talking, and needs (eat/rest).
  await sign("sign-talking", "the-wardens-walk", "a sign about talking",
    "TALKING. SAY <words> speaks to everyone in the room; TELL <someone> <words> speaks to one person " +
    "even at a distance. Try SAY hello where Wynn can hear you. EMOTE <action> lets you act out a line, " +
    "and SOCIALS lists ready-made gestures like WAVE and BOW.");
  await sign("sign-needs", "the-wardens-walk", "a sign about food and rest",
    "FOOD AND REST. You grow hungry and tired as time passes. EAT at anything that feeds you and REST " +
    "where you can lie down — here, the ration-barrel below feeds you and this warming-bench rests you. " +
    "In town, the Saltloft Inn keeps a stew-pot and beds.");

  // Training yard — inventory, score/skills, combat, shops, and the senses of trade.
  await sign("sign-inventory", "the-tutorial-yard", "a sign about carrying things",
    "CARRYING THINGS. GET <thing> picks something up; DROP <thing> sets it down; I (or INVENTORY) lists " +
    "what you hold. GIVE <thing> TO <someone> hands it over. Try the lean-to shop's wares below.");
  await sign("sign-score", "the-tutorial-yard", "a sign about your character",
    "YOUR CHARACTER. SCORE shows your full sheet — your strength, your purse, your standing. SKILLS lists " +
    "what you can do and how well. Every skill grows by use; there is no level, only practice.");
  await sign("sign-combat", "the-tutorial-yard", "a sign about combat",
    "COMBAT. Before a fight, CONSIDER <foe> to judge your chances. WIELD a weapon and WEAR armour for the " +
    "edge. TACTICS offensive|neutral|defensive sets your stance. Then ATTACK <foe>. Practise on the straw " +
    "dummy in this yard — it cannot hurt you. Out in the harbour, choose your fights with more care.");
  await sign("sign-trade", "the-tutorial-yard", "a sign about shops",
    "SHOPS. In a shop, WARES lists the stock and its price, VALUE <thing> prices one, BUY <thing> spends " +
    "your purse, and SELL <thing> turns what you carry into coin. This yard's lean-to sells a newcomer's " +
    "first kit; the chandlery and the fishwives trade in town.");

  // Lower lane — the way out, the deeper arts, and where help waits.
  await sign("sign-onward", "the-lower-lane", "a sign pointing to the harbour",
    "ONWARD TO FARSTONE. Down this lane lies the working harbour: the quay where Dax and the constable " +
    "trade words, the market, the old town with its chapel and guild, and the moor beyond. Deeper arts " +
    "wait there — CAST a spell, PRAY at the chapel, JOIN a guild, ACCEPT a quest, TREAT the wounded. " +
    "When you are ready, go DOWN.");

  // The guide — Wynn the harbour-warden — placed and provisioned (the definition declares her cast
  // cells; she is a definition NPC, so here we only give her a purse and attributes to match the rest).
  for (const a of ["str", "dex", "int", "wis", "con"]) await say("wynn-warden", `attr:${a}`, 10);
  await say("wynn-warden", "coin", 30);

  // The PRACTICE DUMMY — an actor (so it is a valid combat target, defence 50 off its intact body)
  // with NO combat skill, NO weapon, NO intends and NO rivals, so it never strikes back. A newcomer
  // with the starting hand wounds it and watches the contest resolve, in perfect safety. We park it
  // in BOTH tutorial combat rooms' spirit by placing one on the landing and one in the yard.
  const dummy = async (id, where, naming) => {
    await say(id, "kind", "npc");
    await say(id, "naming", naming);
    await say(id, "mover", "tick");
    await say(id, "located-in", where);
    await say(id, "describing", "a straw-stuffed practice dummy lashed to a post — a safe thing to swing at. It will not fight back.");
    for (const n of ["hunger", "rest", "recreation"]) await say(id, `need:${n}`, 100);
  };
  await dummy("straw-dummy", START_ROOM, "a straw practice-dummy");
  await dummy("sand-post", "the-tutorial-yard", "a sand-filled practice-post");

  // The tutorial lean-to SHOP — a small newcomer's kit at a copper or two, so BUY/SELL/WARES can be
  // tried before the real economy. A keeper (Pip) with a purse runs it.
  await say("pip-keeper", "kind", "npc");
  await say("pip-keeper", "naming", "Pip, the lean-to keeper");
  await say("pip-keeper", "mover", "tick");
  await say("pip-keeper", "located-in", "the-tutorial-yard");
  await say("pip-keeper", "describing", "a quick, cheerful youngster who minds the cove's lean-to, selling a newcomer's first kit for coppers.");
  for (const n of ["hunger", "rest", "recreation"]) await say("pip-keeper", `need:${n}`, 80);
  await say("pip-keeper", "coin", 120);
  for (const a of ["str", "dex", "int", "wis", "con"]) await say("pip-keeper", `attr:${a}`, 10);
  await item("a-practice-cudgel", { naming: "a plain practice cudgel", "weapon-damage": 3, "weapon-skill": "fighting.melee.club", weight: 2, price: 10 }, "the-tutorial-yard");
  await item("a-cloth-cap",       { naming: "a quilted cloth cap", "armor-protection": 1, "armor-covers": "head", weight: 1, price: 8 }, "the-tutorial-yard");
  await item("a-traveler-loaf",   { naming: "a traveller's loaf", provides: "need:hunger", amount: 5, weight: 1, price: 4 }, "the-tutorial-yard");

  // --- WAVE 3: the BIGGER HARBOUR — provision the new cast and add a SECOND real shop ------------
  // Attributes + purses on the new definition NPCs, so SCORE/CONSIDER read them like the old cast.
  const TOWN_STATS = {
    "greer-tbenn":      { str: 12, dex: 10, int: 10, wis: 10, con: 12, coin: 180 },
    "edrun-clerk":      { str: 9,  dex: 10, int: 13, wis: 12, con: 9,  coin: 400 },
    "father-coll":      { str: 10, dex: 10, int: 12, wis: 14, con: 10, coin: 90 },
    "guildmaster-orla": { str: 12, dex: 12, int: 12, wis: 13, con: 12, coin: 500 },
    "matron-ivy":       { str: 10, dex: 11, int: 11, wis: 13, con: 11, coin: 110 },
    "tomas-quarryman":  { str: 15, dex: 9,  int: 9,  wis: 10, con: 14, coin: 70 },
    "morrigan-witch":   { str: 9,  dex: 11, int: 13, wis: 13, con: 10, coin: 150 },
  };
  for (const [id, s] of Object.entries(TOWN_STATS)) {
    for (const a of ["str", "dex", "int", "wis", "con"]) await say(id, `attr:${a}`, s[a]);
    await say(id, "coin", s.coin);
  }

  // A handful of the new cast carry real skill levels, weapons, and a routine, so the town fights,
  // heals, prays, and keeps a clock the way the original pair did.
  await teach("father-coll", "faith.rituals", 6);
  await teach("father-coll", "people.healing", 4);
  await teach("matron-ivy", "people.healing", 7);
  await teach("morrigan-witch", "magic.illusion", 6);
  await teach("morrigan-witch", "magic.evocation", 4);
  await teach("guildmaster-orla", "crafting.smithing", 5);
  await say("guildmaster-orla", "skill:combat", 70);
  await say("tomas-quarryman", "skill:combat", 60);

  // Tomas comes armed with his maul (a real weapon on the quarry floor) and an offensive habit.
  await say("a-quarry-maul", "weapon-damage", 11);
  await say("a-quarry-maul", "weapon-skill", "fighting.melee.club");
  await say("tomas-quarryman", "wielding", "a-quarry-maul");
  await say("tomas-quarryman", "tactics:attack", "offensive");

  // Orla keeps a guild-master's dirk.
  await item("a-guild-dirk", { naming: "a guild-master's dirk", "weapon-damage": 8, "weapon-skill": "fighting.melee.knife", weight: 1 }, "guildmaster-orla");
  await say("guildmaster-orla", "wielding", "a-guild-dirk");

  // A SECOND priced shop — the fishwife Greer sells off the morning's catch and a fishwife's tools.
  await item("a-string-of-fish", { naming: "a string of fresh fish", provides: "need:hunger", amount: 8, weight: 2, price: 12 }, "the-fishwives-stalls");
  await item("a-fishwife-knife", { naming: "a thin filleting knife", "weapon-damage": 5, "weapon-skill": "fighting.melee.knife", weight: 1, price: 45 }, "the-fishwives-stalls");
  await item("a-creel",          { naming: "a willow creel", weight: 2, price: 30 }, "the-fishwives-stalls");
  await item("a-jar-of-relish",  { naming: "a jar of samphire relish", provides: "need:hunger", amount: 3, weight: 1, price: 6 }, "the-fishwives-stalls");

  // The marsh-witch trades cures — a healing draught and a charm — from her hut.
  await item("a-healing-draught", { naming: "a green healing draught", provides: "need:rest", amount: 6, weight: 1, price: 35 }, "the-witchs-hut");
  await item("a-bone-charm",      { naming: "a carved bone charm", weight: 1, price: 50 }, "the-witchs-hut");

  // A few more daily routines, so the bigger town keeps a clock: the fishwife works the market by
  // day and the inn by night; the priest keeps the chapel; the quarryman the quarry then the inn.
  await say("greer-tbenn", "routine:7", "the-fishwives-stalls");
  await say("greer-tbenn", "routine:20", "the-saltloft-inn");
  await say("father-coll", "routine:6", "the-chapel-of-maraset");
  await say("father-coll", "routine:22", "the-almshouse");
  await say("tomas-quarryman", "routine:8", "the-granite-quarry");
  await say("tomas-quarryman", "routine:19", "the-saltloft-inn");

  return { root, written: written + seq };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || DEFAULT_WORLD;
  const { written } = await buildHarbor(target);
  console.log(`✓ built "Farstone Harbor": ${written} cells under ${target} (start room: ${START_ROOM})`);
}
