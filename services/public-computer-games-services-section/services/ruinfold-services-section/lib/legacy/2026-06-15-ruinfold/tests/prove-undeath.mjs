// prove-undeath — the headline. An undead declares `slain` the converse of `alive`, so a killing
// blow folds NEGATIVE evidence into the alive-cell that already holds POSITIVE: it settles to ⊤
// (alive AND slain) — a contradiction held as a VALUE, not a crash. death.mjs reads that ⊤ and
// RISES the thing: heals it, scars it (alive-revives++), and LEAVES it ⊤ so it stays undead and
// rises again. And the whole behaviour hangs on the converse declaration alone: a thing WITHOUT
// one can never reach ⊤ — proof that the five deaths are data-driven, not special-cased.

import { world, assert, section, report } from "./_harness.mjs";
import { spawnPlayer } from "#engine/zones.mjs";
import { attack } from "#engine/combat.mjs";
import { resolveDeaths } from "#engine/death.mjs";
import doing from "#doing";
import changing from "#changing";
import { view, numOf, glyphOf, cellOf } from "#engine/_world.mjs";

const { root, t, cleanup } = await world();

async function killOnce(target) {
  // stand a strong hero on the target and strike until it drops
  const dirty = new Set();
  const v = await view(root, target);
  await changing({ root, subject: "hero", predicate: "located-in", object: "the-courtyard", t: t() });
  await changing({ root, subject: "hero", predicate: "pos-x", object: numOf(v, "pos-x", 0), t: t() });
  await changing({ root, subject: "hero", predicate: "pos-z", object: numOf(v, "pos-z", 0), t: t() });
  let r;
  let guard = 0;
  do {
    r = await attack(root, "hero", target, t, dirty);
  } while (r.hit && !r.killed && guard++ < 30);
  return r;
}

try {
  const d0 = new Set();
  await spawnPlayer(root, "hero", t, d0);
  await changing({ root, subject: "hero", predicate: "attack-power", object: 50, t: t() });

  section("a slain undead settles its alive-cell to ⊤");
  const r1 = await killOnce("skeleton-1");
  assert(r1.killed && r1.deathRule === "undead", "skeleton is an undead kill");
  let sk = await view(root, "skeleton-1");
  const cell = cellOf(sk, "alive", "skeleton-1");
  assert(cell.value.glyph === "⊤", "alive glyph is ⊤");
  assert(cell.value.pos === 1 && cell.value.neg === 1, "evidence is (pos 1, neg 1) — a held contradiction");

  section("death resolution RISES it, and it stays ⊤");
  await resolveDeaths(root, [{ target: "skeleton-1", deathRule: "undead", killer: "hero" }], t, new Set(), { tick: 1 });
  sk = await view(root, "skeleton-1");
  assert(numOf(sk, "health", 0) === numOf(sk, "max-health", -1), "health restored to full on the rise");
  assert(numOf(sk, "alive-revives", 0) === 1, "alive-revives scar is 1");
  assert(glyphOf(sk, "alive", "skeleton-1") === "⊤", "it remains ⊤ — still alive AND slain");

  section("…and it rises AGAIN");
  const r2 = await killOnce("skeleton-1");
  assert(r2.killed, "it can be put down a second time");
  await resolveDeaths(root, [{ target: "skeleton-1", deathRule: "undead", killer: "hero" }], t, new Set(), { tick: 2 });
  sk = await view(root, "skeleton-1");
  assert(numOf(sk, "alive-revives", 0) === 2, "alive-revives scar is now 2 (it rose again)");

  section("contrast: a thing WITHOUT the converse can never reach ⊤");
  await doing({ root, subject: "wisp", predicate: "alive", object: "wisp", t: t() }); // no declareConverse
  await doing({ root, subject: "wisp", predicate: "slain", object: "wisp", t: t() });
  const wisp = await view(root, "wisp");
  assert(glyphOf(wisp, "alive", "wisp") === "t", "alive stays t — slain did not fold as negative evidence");
} finally {
  cleanup();
}
report("prove-undeath");
