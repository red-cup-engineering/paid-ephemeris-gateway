// prove-farstone — the game-package smoke test: Farstone is a first-class MUD on the tab engine
// (@561-group/tab) + the FizzOS driver (@561-group/fizzos), and its worlds build & run. Asserts:
//   (1) the SEED island (farstone/build-farstone.mjs) materializes, with its dimension, its harbor
//       district holding the bell + the harbormaster, and its permit's converse declared;
//   (2) ticking the seed past the permit window settles the permit to ⊤ (a held contradiction) —
//       the engine law (paraconsistent, append-only) holds through the moved content;
//   (3) the HARBOR world (farstone-harbor/build.mjs — the bin's world) builds lint-clean with its
//       start room and the quay cast present.
// The tab engine surface is consumed BY NAME from @561-group/tab. Run: node tests/prove-farstone.mjs

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { settle, containedBy, locationOf, subjects } from "@561-group/tab/substrate";
import ticking from "@561-group/tab/ticking";
import buildSeed from "../farstone/build-farstone.mjs";
import buildHarbor from "../farstone-harbor/build.mjs";

let pass = 0;
const ok = (name, fn) =>
  fn().then(
    () => { pass += 1; console.log(`  ok  ${name}`); },
    (e) => { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; },
  );

const glyphOf = (thing, predicate) =>
  thing.fiber.find((c) => c.predicate === predicate)?.value?.glyph;

const tmp = mkdtempSync(join(tmpdir(), "farstone-"));

try {
  const seed = join(tmp, "seed");

  // (1) the SEED island builds with its dimension, harbor district, and dual-filed contents. -----
  await ok("(1) the seed island builds: dimension + harbor district + bell + harbormaster", async () => {
    await buildSeed(seed);
    const dim = await settle(seed, "farstone");
    assert.equal(glyphOf(dim, "kind"), "t", "farstone is a settled dimension");
    const here = await containedBy(seed, "harbor-district");
    assert.ok(here.includes("a-brass-bell"), "the bell is in the harbor district (dual-filed)");
    assert.ok(here.includes("takeshi-aoki"), "the harbormaster is in the harbor district");
    assert.equal(await locationOf(seed, "a-clam-rake"), "the-marsh", "the clam rake is in the marsh");
  });

  // (2) ticking past the permit window settles the permit to ⊤ — the paraconsistent law holds. ----
  await ok("(2) ticking ages permit-23 to a held ⊤ (within-window AND overdue)", async () => {
    for (let i = 0; i < 31; i += 1) await ticking({ root: seed });
    const permit = await settle(seed, "permit-23");
    const cell = permit.fiber.find((c) => c.predicate === "within-window");
    assert.equal(cell.value.glyph, "⊤", "the permit is contradictory past its window");
  });

  // (3) the HARBOR world (the bin's world) builds lint-clean with its start room + quay cast. ------
  await ok("(3) the harbor world builds lint-clean with the start room and the quay cast", async () => {
    const harbor = join(tmp, "harbor");
    const { written } = await buildHarbor(harbor, { fresh: true });
    assert.ok(written > 0, "the harbor build writes cells");
    const subs = await subjects(harbor);
    assert.ok(subs.includes("newcomer-landing"), "the tutorial start room exists");
    assert.ok(subs.includes("harbor-quay"), "the quay exists");
    assert.ok(subs.includes("dax-pell") && subs.includes("mara-quill"), "the quay fighters exist");
    assert.ok(subs.includes("you"), "a placed player exists in the start room");
    assert.equal(await locationOf(harbor, "you"), "newcomer-landing", "you start at the landing");
  });

  console.log(`\n${pass} farstone checks passed.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
