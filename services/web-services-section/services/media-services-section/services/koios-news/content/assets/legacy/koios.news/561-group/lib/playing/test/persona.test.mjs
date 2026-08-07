// Theorem-shaped tests for the persona/mask layer, on the real ludics (delocation, the union-of-
// chronicles reconstruction, the incarnation split). Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { designFromActs, mask, sameActor, performativity, personaShadow, roleDistance } from "../dist/index.mjs";

const D = (entries) => designFromActs(new Map(entries));
const A = D([["", "proponent"], ["0", "proponent"], ["1", "proponent"]]);   // actor with a ballast locus 1
const M = D([["", "proponent"], ["0", "proponent"]]);                       // an actor with no ballast (material)
const C1 = D([["", "opponent"], ["0", "opponent"]]);                        // audience meeting root + 0
const Mperf = D([["", "proponent"], ["0", "opponent"]]);                    // a coherent 2-step play (root opens child 0)

const U = [A, C1];
const troupe = [A];

test("MASK = delocation: a persona is the same play worn at an address (Deleuze: masks of masks)", () => {
  const worn = mask(A, [9]);
  // every locus relocated under the prefix 9.
  assert.deepEqual(worn.entries.map((e) => e.locusKey).sort(), ["9", "9.0", "9.1"]);
  // it IS the same actor under that mask…
  assert.equal(sameActor(A, worn, [9]), true);
  // …and masks compose: masking the mask is again a mask (no original face beneath).
  const twice = mask(mask(A, [1]), [2]);
  assert.equal(sameActor(mask(A, [1]), twice, [2]), true);
});

test("PERFORMATIVITY (Butler): the persona IS the union of its chronicles — no doer behind the deed", () => {
  const p = performativity(Mperf);
  assert.ok(p.plays >= 1, "the persona performs at least one chronicle");
  assert.equal(p.faithful, true, "reconstruction from the plays equals the persona");
  assert.equal(p.noEssence, true, "no substantive self prior to the performances");
});

test("PERSONA / SHADOW (Jung): the mask shown vs the disowned reserve", () => {
  const ps = personaShadow(A, troupe, U);
  assert.deepEqual(ps.persona.entries.map((e) => e.locusKey).sort(), ["", "0"]); // the mask the audience meets
  assert.deepEqual(ps.shadow.entries.map((e) => e.locusKey), ["1"]);             // the disowned ballast
  assert.equal(ps.personaLoci, 2);
  assert.equal(ps.shadowLoci, 1);
});

test("ROLE DISTANCE (Goffman; Stanislavski ↔ Brecht): identification vs demonstration", () => {
  // A holds a reserve (ballast 1) → it SHOWS the role from a distance (Brecht).
  const brecht = roleDistance(A, troupe, U);
  assert.ok(Math.abs(brecht.distance - 1 / 3) < 1e-9);
  assert.equal(brecht.material, false);
  assert.equal(brecht.mode, "role-distance");
  // M has no reserve → it IS the role (Stanislavski / the Method).
  const method = roleDistance(M, [M], [M, C1]);
  assert.equal(method.material, true);
  assert.equal(method.distance, 0);
  assert.equal(method.mode, "identification");
});
