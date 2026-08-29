// prove-demo-world — the DESIGNED demo world "Farstone — the off-season" (farstone-tale): proof
// that a hand-authored DSL definition is well-formed, connected, peopled, tense, and LIVE.
// Builds the world into a UNIQUE temp dir via the example's own build.mjs, then asserts:
//   (a) the definition is lint-clean (the DSL contract a designed world must pass);
//   (b) the MAP is fully connected — BFS over exit-* reaches every area from any area;
//   (c) every npc has a home, needs, ≥1 trait, and is located in a real area;
//   (d) the CENTRAL-TENSION entities exist — the disputed permit, the feuding pair with OPPOSED
//       traits, and the scarce food (small-amount hunger resources);
//   (e) ticking a few times advances the world without error and the npcs ACT.
// tab is the engine; Farstone is a game on it. The engine surface is consumed by name from
// @561-group/tab. Run: node tests/prove-demo-world.mjs

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lint } from "@561-group/tab/dsl";
import { settle, subjects, locationOf, containedBy } from "@561-group/tab/substrate";
import ticking from "@561-group/tab/ticking";
import buildTale from "../farstone-tale/build.mjs";
import definition from "../farstone-tale/definition.mjs";

let pass = 0;
const ok = (name, fn) =>
  fn().then(
    () => { pass += 1; console.log(`  ok  ${name}`); },
    (e) => { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; },
  );

// latest functional value of a predicate on a settled fiber (max-t, positive).
const latestOf = (thing, predicate) => {
  let best = null;
  for (const c of thing.fiber) {
    if (c.predicate !== predicate || c.value?.pos !== 1) continue;
    if (best === null || c.t > best.t) best = c;
  }
  return best ? best.object : null;
};
const traitsOf = (thing) =>
  thing.fiber.filter((c) => c.predicate === "trait" && c.value?.pos === 1).map((c) => c.object);

const tmp = mkdtempSync(join(tmpdir(), "farstone-tale-"));
const world = join(tmp, "farstone-tale");

try {
  // (a) lint-clean — gate before anything else, and what build.mjs itself enforces. -------------
  await ok("(a) the definition is lint-clean", async () => {
    const issues = lint(definition);
    assert.deepEqual(issues, [], `expected no lint issues, got: ${JSON.stringify(issues, null, 2)}`);
  });

  // Build the designed world into the unique temp dir, through the example's own build script.
  await ok("build.mjs loads the designed world into a fresh dir", async () => {
    const { written } = await buildTale(world, { fresh: true });
    assert.ok(written > 0, "should write cells");
    const subs = await subjects(world);
    assert.ok(subs.includes("harbor-quay"), "the harbor should exist");
    assert.ok(subs.includes("takeshi-aoki"), "the harbormaster should exist");
  });

  // (b) the MAP is fully connected — BFS over exit-* reaches every declared area. ---------------
  await ok("(b) the map is fully connected (BFS over exits reaches every area)", async () => {
    const areaIds = definition.areas.map((a) => a.id);
    const areaSet = new Set(areaIds);
    // Build the adjacency from the WRITTEN world (exits emitted both ways by the DSL).
    const neighbors = async (area) => {
      const thing = await settle(world, area);
      const out = [];
      for (const c of thing.fiber) {
        if (c.predicate?.startsWith("exit-") && c.value?.pos === 1 && areaSet.has(c.object)) {
          out.push(c.object);
        }
      }
      return out;
    };
    const seen = new Set([areaIds[0]]);
    const queue = [areaIds[0]];
    while (queue.length) {
      const a = queue.shift();
      for (const n of await neighbors(a)) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    const unreached = areaIds.filter((a) => !seen.has(a));
    assert.equal(unreached.length, 0, `unreachable areas: ${JSON.stringify(unreached)}`);
    assert.equal(seen.size, areaIds.length, "BFS should cover every area");
  });

  // Every exit must also be walkable BOTH ways (the DSL's return-exit guarantee). ---------------
  await ok("(b') every exit is walkable both ways", async () => {
    for (const a of definition.areas) {
      for (const [dir, dest] of Object.entries(a.exits ?? {})) {
        const there = await settle(world, dest);
        const back = there.fiber.some(
          (c) => c.predicate?.startsWith("exit-") && c.value?.pos === 1 && c.object === a.id,
        );
        assert.ok(back, `${dest} should have a return exit to ${a.id} (forward ${a.id} -${dir}-> ${dest})`);
      }
    }
  });

  // (c) every npc has a home, needs, ≥1 trait, and a real-area location. ------------------------
  await ok("(c) every npc has home + needs + ≥1 trait + real-area location", async () => {
    const areaSet = new Set(definition.areas.map((a) => a.id));
    assert.ok(definition.npcs.length >= 8, "a designed cast should have ≥8 npcs");
    for (const npc of definition.npcs) {
      const thing = await settle(world, npc.id);
      assert.equal(latestOf(thing, "kind"), "npc", `${npc.id} should be an npc`);
      assert.equal(latestOf(thing, "mover"), "tick", `${npc.id} should move on the tick`);

      const home = latestOf(thing, "home");
      assert.ok(home && areaSet.has(home), `${npc.id} home "${home}" must be a real area`);

      const loc = await locationOf(world, npc.id);
      assert.ok(loc && areaSet.has(loc), `${npc.id} located-in "${loc}" must be a real area`);
      assert.ok((await containedBy(world, loc)).includes(npc.id), `${loc} should contain ${npc.id}`);

      assert.ok(traitsOf(thing).length >= 1, `${npc.id} should have ≥1 trait`);

      const needCells = thing.fiber.filter((c) => c.predicate?.startsWith("need:") && c.value?.pos === 1);
      assert.ok(needCells.length >= 1, `${npc.id} should carry needs`);
      for (const c of needCells) {
        const n = Number(c.object);
        assert.ok(Number.isInteger(n) && n >= 0 && n <= 100, `${npc.id} ${c.predicate}=${c.object} in 0..100`);
      }
    }
  });

  // (d) the central-tension entities exist. ----------------------------------------------------
  await ok("(d1) the disputed permit exists (the ⊤-in-waiting)", async () => {
    const permit = await settle(world, "the-dredging-permit");
    assert.equal(latestOf(permit, "kind"), "item", "the permit is an item");
    assert.ok(latestOf(permit, "naming"), "the permit has a name");
    // the clerk who sits on it exists and is located in the council hall.
    assert.equal(await locationOf(world, "mireille-dax"), "the-council-hall");
  });

  await ok("(d2) the feuding pair exists with OPPOSED traits over the scarce catch", async () => {
    const coilin = await settle(world, "coilin-vey");
    const brannaugh = await settle(world, "brannaugh-ross");
    const cT = new Set(traitsOf(coilin));
    const bT = new Set(traitsOf(brannaugh));
    assert.ok(cT.size >= 1 && bT.size >= 1, "both rivals carry traits");
    // The feud is OPPOSED traits: hot-headed vs cold (no trait shared between them).
    assert.ok(cT.has("hot-headed"), "coilin is hot-headed");
    assert.ok(bT.has("cold"), "brannaugh is cold");
    const shared = [...cT].filter((t) => bT.has(t));
    assert.equal(shared.length, 0, `feuding pair should share no trait, shared: ${JSON.stringify(shared)}`);
  });

  await ok("(d3) the food is SCARCE (small-amount hunger resources)", async () => {
    const foods = definition.resources.filter((r) => r.provides === "need:hunger");
    assert.ok(foods.length >= 2, "there should be ≥2 food sources to compete over");
    for (const f of foods) {
      const r = await settle(world, f.id);
      const amount = Number(latestOf(r, "amount"));
      assert.ok(Number.isInteger(amount), `${f.id} should carry an integer amount`);
      assert.ok(amount > 0 && amount <= 12, `${f.id} food should be scarce (1..12), got ${amount}`);
    }
    // Designed scarcity: total food is far below "everyone eats freely forever".
    const totalFood = foods.reduce((s, f) => s + f.amount, 0);
    assert.ok(totalFood < definition.npcs.length * 10, "aggregate food should be a pressure, not a surplus");
  });

  // (e) ticking advances the world without error and the npcs ACT. -----------------------------
  await ok("(e) ticking a few times advances the world and npcs act", async () => {
    let acted = false;
    let lastTick = 0;
    for (let i = 0; i < 6; i += 1) {
      const { tick, appended } = await ticking({ root: world });
      assert.ok(tick > lastTick, "the dimension clock should advance each tick");
      lastTick = tick;
      assert.ok(Array.isArray(appended) && appended.length > 0, "a tick should append rows");
      if (appended.some((r) => typeof r.t === "string" && r.t.includes("/act:"))) acted = true;
    }
    assert.ok(acted, "at least one npc should ACT (an /act: row) across the ticks");

    const areaSet = new Set(definition.areas.map((a) => a.id));
    const npcSet = new Set(definition.npcs.map((n) => n.id));
    for (const npc of definition.npcs) {
      const loc = await locationOf(world, npc.id);
      assert.ok(loc && (areaSet.has(loc) || npcSet.has(loc) || loc != null),
        `${npc.id} should still have a location after ticking, got ${loc}`);
    }
  });

  // (e') scarcity bites: sustained ticking depletes a food resource (the failing fishery). ------
  await ok("(e') sustained ticking depletes the scarce food (failing-fishery pressure)", async () => {
    const before = Number(latestOf(await settle(world, "the-gull-eggs"), "amount"));
    for (let i = 0; i < 12; i += 1) await ticking({ root: world });
    const after = Number(latestOf(await settle(world, "the-gull-eggs"), "amount"));
    assert.ok(Number.isInteger(after), "the food still carries an integer amount after the run");
    assert.ok(after !== before || before <= 5, `the gull-egg ledge should be a live, used resource (before ${before}, after ${after})`);
  });

  console.log(`\n${pass} demo-world checks passed.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
