// prove-quests — a bounty is data on a quest-giver that a player accepts, makes progress on by
// killing the right species, and turns in for coin, xp, and gear. The whole loop is just the
// substrate: accept writes the bounty cells, onKill increments progress, turnIn pays out and
// retracts them. Drives the quest engine directly over a temp world.

import { world, assert, section, report } from "./_harness.mjs";
import { spawnPlayer } from "#engine/zones.mjs";
import { accept, onKill, turnIn, activeBountyOf } from "#engine/quests.mjs";
import { inventoryOf } from "#engine/items.mjs";
import { view, numOf } from "#engine/_world.mjs";

const { root, t, cleanup } = await world();
try {
  const d = new Set();
  await spawnPlayer(root, "hero", t, d); // gold 10, xp 0, level 1

  section("accept a bounty from the shrine-keeper");
  const a = await accept(root, "hero", "shrine-keeper", t, d);
  assert(a.accepted === true, "the offer is accepted");
  let b = await activeBountyOf(root, "hero");
  assert(b && b.id === "cull-the-courtyard" && b.goal === 3, "the bounty is active (goal 3 goblins)");
  assert((await accept(root, "hero", "shrine-keeper", t, d)).accepted === false, "cannot hold two bounties at once");

  section("progress only counts the right species");
  assert((await onKill(root, "hero", "skeleton", t, d)) === null, "a skeleton kill does not count");
  assert((await onKill(root, "hero", "goblin", t, d)).progress === 1, "goblin 1");
  assert((await onKill(root, "hero", "goblin", t, d)).progress === 2, "goblin 2");
  const third = await onKill(root, "hero", "goblin", t, d);
  assert(third.progress === 3 && third.complete === true, "goblin 3 completes the bounty");

  section("turning in pays out and clears the bounty");
  assert((await turnIn(root, "hero", "rag-merchant", t, d)).turnedIn === false, "only the giver can take the turn-in");
  const before = numOf(await view(root, "hero"), "gold", 0);
  const r = await turnIn(root, "hero", "shrine-keeper", t, d);
  assert(r.turnedIn === true, "turned in to the shrine-keeper");
  assert(numOf(await view(root, "hero"), "gold", 0) === before + 25, "rewarded 25 gold");
  assert(numOf(await view(root, "hero"), "xp", 0) >= 30, "rewarded 30 xp");
  assert((await inventoryOf(root, "hero")).some((i) => i.archetype === "leather-jerkin"), "rewarded the leather jerkin");
  assert((await activeBountyOf(root, "hero")) === null, "the bounty is cleared after turn-in");
} finally {
  cleanup();
}
report("prove-quests");
