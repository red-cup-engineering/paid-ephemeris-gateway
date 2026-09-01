// prove-combat — a melee blow is a state transition on the trace, not an accumulation. health is
// FUNCTIONAL, so the latest-t row wins (10 → 7, not 10 ⊔ 7); a fatal blow appends an attributed
// `slain`; and a blow out of reach is a no-op. Drives the engine directly over a temp world.

import { world, assert, section, report } from "./_harness.mjs";
import { spawnPlayer } from "#engine/zones.mjs";
import { attack } from "#engine/combat.mjs";
import changing from "#changing";
import { view, numOf, glyphOf, cellOf } from "#engine/_world.mjs";

const { root, t, cleanup } = await world();
try {
  // a hero standing on goblin-1 (mortal, hp 6, at the-courtyard 6,-8)
  const dirty = new Set();
  await spawnPlayer(root, "hero", t, dirty);
  await changing({ root, subject: "hero", predicate: "located-in", object: "the-courtyard", t: t() });
  await changing({ root, subject: "hero", predicate: "pos-x", object: 6, t: t() });
  await changing({ root, subject: "hero", predicate: "pos-z", object: -8, t: t() });
  await changing({ root, subject: "hero", predicate: "attack-power", object: 4, t: t() });

  section("a hit reduces health by (power - armor), latest-t wins");
  const r1 = await attack(root, "hero", "goblin-1", t, dirty);
  assert(r1.hit === true, "the blow lands (same zone, in reach)");
  assert(r1.dmg === 4, "damage = attack-power 4 − armor 0");
  let g = await view(root, "goblin-1");
  assert(numOf(g, "health", null) === 2, "health 6 → 2 (functional supersession, not 6⊔2)");

  section("a fatal blow appends an attributed slain");
  let res;
  let guard = 0;
  do {
    res = await attack(root, "hero", "goblin-1", t, dirty);
  } while (res.hit && !res.killed && guard++ < 20);
  assert(res.killed === true, "the killing blow reports killed");
  assert(res.deathRule === "mortal", "it carries the victim's death-rule (mortal)");
  g = await view(root, "goblin-1");
  assert(numOf(g, "health", 1) <= 0, "health is at or below 0");
  // slain is the converse of alive, so it folds NEGATIVE into the alive-cell → ⊤ (alive AND slain),
  // and the killer is recorded as the observer who made that cut.
  assert(glyphOf(g, "alive", "goblin-1") === "⊤", "alive settles to ⊤ once slain lands (pre-resolution)");
  const aliveCell = cellOf(g, "alive", "goblin-1");
  assert(aliveCell && aliveCell.observers.includes("hero"), "the kill is attributed to hero");

  section("a blow out of reach is a no-op");
  await changing({ root, subject: "hero", predicate: "pos-x", object: 99, t: t() });
  const before = numOf(await view(root, "skeleton-2"), "health", null);
  const miss = await attack(root, "hero", "skeleton-2", t, dirty);
  assert(miss.hit === false, "out-of-range attack does not land");
  assert(numOf(await view(root, "skeleton-2"), "health", null) === before, "the target's health is untouched");
} finally {
  cleanup();
}
report("prove-combat");
