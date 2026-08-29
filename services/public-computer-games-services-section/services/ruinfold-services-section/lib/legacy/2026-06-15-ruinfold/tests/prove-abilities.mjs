// prove-abilities — abilities spend stamina, respect cooldowns, and reach where they should: a
// heavy strike hits for 2× attack-power and arms its cooldown so it can't be spammed; second-wind
// heals the caster; a bolt reaches a target a melee swing can't. Drives the engine over a temp world.

import { world, assert, section, report } from "./_harness.mjs";
import { spawnPlayer } from "#engine/zones.mjs";
import { useAbility } from "#engine/abilities.mjs";
import changing from "#changing";
import { view, numOf } from "#engine/_world.mjs";

const { root, t, cleanup } = await world();
try {
  const d = new Set();
  await spawnPlayer(root, "hero", t, d);
  // stand on goblin-1 (courtyard 6,-8) with a strong arm and full stamina
  await changing({ root, subject: "hero", predicate: "located-in", object: "the-courtyard", t: t() });
  await changing({ root, subject: "hero", predicate: "pos-x", object: 6, t: t() });
  await changing({ root, subject: "hero", predicate: "pos-z", object: -8, t: t() });
  await changing({ root, subject: "hero", predicate: "attack-power", object: 10, t: t() });

  section("a heavy strike spends stamina, hits for 2× attack-power, and arms its cooldown");
  const before = numOf(await view(root, "goblin-1"), "health", 6);
  const r1 = await useAbility(root, "hero", "heavy", "goblin-1", 5, t, d);
  assert(r1.used === true, "heavy was used");
  const dealt = before - numOf(await view(root, "goblin-1"), "health", before);
  assert(dealt >= 18, `heavy hit hard (≈2×10 − armor): dealt ${dealt}`);
  assert(numOf(await view(root, "hero"), "stamina", 20) === 14, "stamina 20 → 14 (cost 6)");

  section("…and it cannot be used again until the cooldown elapses");
  const r2 = await useAbility(root, "hero", "heavy", "goblin-1", 5, t, d);
  assert(r2.used === false && r2.reason === "cooldown", "a second heavy on the same tick is refused (cooldown)");
  const r3 = await useAbility(root, "hero", "heavy", "goblin-1", 9, t, d);
  assert(r3.used === true, "after the cooldown tick it is usable again");

  section("second-wind heals the caster and costs stamina");
  await changing({ root, subject: "hero", predicate: "health", object: 5, t: t() });
  const stBefore = numOf(await view(root, "hero"), "stamina", 0);
  const heal = await useAbility(root, "hero", "second-wind", null, 20, t, d);
  assert(heal.used === true, "second-wind used");
  assert(numOf(await view(root, "hero"), "health", 5) > 5, "health rose");
  assert(numOf(await view(root, "hero"), "stamina", 0) < stBefore, "stamina spent on the mend");

  section("a bolt reaches where a melee swing cannot");
  // move ~10 units from skeleton-2 (courtyard 10,-26)
  await changing({ root, subject: "hero", predicate: "pos-x", object: 10, t: t() });
  await changing({ root, subject: "hero", predicate: "pos-z", object: -16, t: t() });
  await changing({ root, subject: "hero", predicate: "stamina", object: 20, t: t() });
  const skBefore = numOf(await view(root, "skeleton-2"), "health", 8);
  await useAbility(root, "hero", "heavy", "skeleton-2", 30, t, d); // a swing you take, but the reach is short
  assert(numOf(await view(root, "skeleton-2"), "health", 8) === skBefore, "heavy deals NO damage at ~10 units (out of melee reach)");
  const bolt = await useAbility(root, "hero", "bolt", "skeleton-2", 30, t, d);
  assert(bolt.used === true && numOf(await view(root, "skeleton-2"), "health", 8) < skBefore, "bolt lands at range");
} finally {
  cleanup();
}
report("prove-abilities");
