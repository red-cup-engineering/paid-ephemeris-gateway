// seed — build Aletheon's starting region BY DOING: spawn its inhabitants onto the void-manifold
// grade-rings (server/world/spacetime.mjs). Grade 0 is the Settled Reach (gentle, critters only);
// danger and strangeness rise outward; a single seed Anomaly waits at the strange rim, from which
// ⊤-corruption spreads inward over the ticks. (Echoes tab's examples/farstone/build — a world is
// not configured, it is enacted.)

import { KIND } from "../../shared/constants.mjs";
import { WAYS } from "../../shared/codex.mjs";
import { spawn, settleEntity } from "./store.mjs";
import { corrupt } from "./combat.mjs";
import { gradePosition } from "./spacetime.mjs";
import { seedAltars } from "./claims.mjs"; // [claims] CLAIM ALTARS — one per grade ring

export function seedWorld(world) {
  // grade 0–1: wildlife around the heart
  ring(world, 0, 6, (x, z, i) =>
    spawn(world, { kind: KIND.critter, name: pick(CRITTERS), x, z, yaw: ang(i, 6), maxHp: 14 }));
  ring(world, 1, 9, (x, z, i) =>
    spawn(world, { kind: KIND.critter, name: pick(CRITTERS), x, z, yaw: ang(i, 9), maxHp: 18 }));

  // the Keepers of the Four Ways — peaceful NPCs of the Settled Reach who carry the world's
  // culture. One per bilattice value, named from the codex. They never hunt and can never be
  // struck (see ticking.mjs target selection); they amble the heart like critters, but friendly.
  const keepers = [WAYS["⊥"].keeper, WAYS.t.keeper, WAYS.f.keeper, WAYS["⊤"].keeper];
  ring(world, 1, keepers.length, (x, z, i) =>
    spawn(world, { kind: KIND.keeper, name: keepers[i], x, z, yaw: ang(i, keepers.length), maxHp: 30 }));

  // grade 2–3: brigands — hostile humans who hunt the unwary
  ring(world, 2, 7, (x, z, i) =>
    spawn(world, { kind: KIND.brigand, name: pick(BRIGANDS), x, z, yaw: ang(i, 7), maxHp: 34, hostile: true }));
  ring(world, 3, 6, (x, z, i) =>
    spawn(world, { kind: KIND.brigand, name: pick(BRIGANDS), x, z, yaw: ang(i, 6), maxHp: 40, hostile: true }));

  // the rim: a seed Anomaly already settled to ⊤ — the contradiction the world holds, and the
  // wellspring of corruption. We make it by slaying-then-raising a brigand so its ⊤ is REAL
  // (joinKnowledge of life and death), not stamped on.
  const a = spawn(world, { kind: KIND.brigand, name: "Hollow Reiver", ...gradePosition(4, 0, 1), maxHp: 50, hostile: true });
  a.hp = 0;
  a.killed = true;
  a.diedTick = world.tick;
  a.corpseUntil = world.tick + 1;
  settleEntity(world, a); // → f (slain), the negative face the kernel will join against
  corrupt(world, a); // re-assert life onto the slain cell → joinKnowledge → ⊤, a true Anomaly

  // [claims] CLAIM ALTARS — one standing, peaceful, immobile altar on each grade ring, each carrying
  // a player-authorable claim cell. The world's truth here becomes co-authored, settled by the kernel.
  seedAltars(world);

  return world;
}

function ring(world, grade, count, make) {
  for (let i = 0; i < count; i++) {
    const { x, z } = gradePosition(grade, i, count);
    make(x, z, i);
  }
}

const ang = (i, total) => (2 * Math.PI * i) / total;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CRITTERS = ["Fenwood Hare", "Moss Boar", "Dappled Stag", "Reed Heron", "Bramble Fox"];
const BRIGANDS = ["Roadworn Brigand", "Ashen Cutpurse", "Gallows Deserter", "Fen Poacher"];
