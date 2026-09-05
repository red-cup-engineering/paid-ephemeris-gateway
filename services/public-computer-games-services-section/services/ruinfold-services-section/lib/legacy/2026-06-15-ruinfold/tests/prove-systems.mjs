// prove-systems — the next-gen systems wired into the live tick: threat-based targeting (tanking),
// on-hit status effects that tick (poison), skill-by-use, and the craft/party intents. Drives the
// real runTick over a temp world, exactly as the server does, so this guards the INTEGRATION (not
// just the modules in isolation, which their own builders verified).

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import buildWorld from "#server/scripts/seed.mjs";
import { runTick } from "#engine/tick.mjs";
import { assert, section, report } from "./_harness.mjs";
import { view, numOf } from "#engine/_world.mjs";
import { topThreat } from "#engine/threat.mjs";
import { skillsOf } from "#engine/skills.mjs";
import { activeEffects } from "#engine/effects.mjs";
import { inventoryOf, grantItem } from "#engine/items.mjs";
import { partyOf, membersOf } from "#engine/party.mjs";
import changing from "#changing";
import { clock } from "#engine/functional.mjs";

const root = mkdtempSync(join(tmpdir(), "ruinfold-sys-"));
const players = new Set();
let T = 0;
const tick = (intents = []) => runTick(root, ++T, intents, players);
const put = (who, x, z, zone) =>
  Promise.all([
    changing({ root, subject: who, predicate: "located-in", object: zone, t: clock(T, 700) }),
    changing({ root, subject: who, predicate: "pos-x", object: x, t: clock(T, 701) }),
    changing({ root, subject: who, predicate: "pos-z", object: z, t: clock(T, 702) }),
  ]);

try {
  await buildWorld(root);
  await tick([{ kind: "join", actor: "tank" }, { kind: "join", actor: "dps" }]);

  section("threat: a monster fights its highest-threat attacker, not merely the nearest");
  await put("tank", 10, -26, "the-courtyard");
  await put("dps", 10, -26, "the-courtyard"); // both on skeleton-2 (10,-26) — equally near
  await changing({ root, subject: "dps", predicate: "attack-power", object: 1, t: clock(T, 703) }); // weak: won't kill
  await tick([{ kind: "attack", actor: "dps", target: "skeleton-2" }]); // dps builds threat; same tick the skeleton acts
  assert((await topThreat(root, "skeleton-2")) === "dps", "the skeleton now holds the most threat for dps");
  assert(numOf(await view(root, "dps"), "health", 20) < 20 && numOf(await view(root, "tank"), "health", 20) === 20, "it struck the high-threat dps, sparing the equally-near tank");

  section("skill-by-use: attacking levels a weapon skill");
  assert((await skillsOf(root, "dps")).some((s) => s.skill === "blade"), "dps gained a blade skill from swinging");

  section("status effects: a bolt leaves poison that ticks health down");
  await put("dps", 0, -22, "the-throne"); // onto the boss (60 hp — survives, so the rider lands)
  await changing({ root, subject: "dps", predicate: "stamina", object: 20, t: clock(T, 704) });
  await changing({ root, subject: "dps", predicate: "attack-power", object: 3, t: clock(T, 705) });
  await tick([{ kind: "ability", actor: "dps", ability: "bolt", target: "the-hollow-king" }]);
  assert(activeEffects(await view(root, "the-hollow-king"), T).some((e) => e.name === "poison"), "the boss is poisoned");
  const hp = numOf(await view(root, "the-hollow-king"), "health");
  await tick([]);
  await tick([]);
  assert(numOf(await view(root, "the-hollow-king"), "health") < hp, "poison ticked the boss's health down over the next ticks");

  // The boss may have downed dps during the poison ticks — stand them back up safely at the gate
  // (the point above was the BOSS being poisoned, not dps surviving melee on its face).
  await put("dps", 0, 12, "the-gate");
  await changing({ root, subject: "dps", predicate: "status", object: "up", t: clock(T, 720) });
  await changing({ root, subject: "dps", predicate: "health", object: 20, t: clock(T, 721) });

  section("crafting intent: recipe consumes inputs, yields the output");
  await grantItem(root, "dps", "bone-shard", () => clock(T, 706), new Set());
  await grantItem(root, "dps", "bone-shard", () => clock(T, 707), new Set());
  await tick([{ kind: "craft", actor: "dps", recipe: "bind-charm" }]);
  assert((await inventoryOf(root, "dps")).some((i) => i.archetype === "bone-charm"), "bind-charm produced a bone-charm");

  section("party intents: players group up");
  await tick([{ kind: "party-create", actor: "tank" }]);
  await tick([{ kind: "party-join", actor: "dps", party: "tank" }]);
  assert((await partyOf(root, "dps")) === "tank", "dps joined tank's party");
  assert((await membersOf(root, "tank")).includes("dps") && (await membersOf(root, "tank")).includes("tank"), "the party roster holds both");
} finally {
  rmSync(root, { recursive: true, force: true });
}
report("prove-systems");
