// score — the exact integer formula (design §4). All-integer by construction: every input field
// (xp-value, archetype.value, gold, tick counts, floor indices) is already an integer, so no
// floating point appears anywhere here. A `voided` run scores `null`, not `0`, and never appears
// on a leaderboard — every other ending is scored as-is, including a mortal death.

import type { Entity, World } from "#engine/world.mts";
import { archetype } from "#engine/archetypes.mts";
import { glyphOf } from "#engine/bilattice.mts";

// RUN_TICK_CAP — bounds replay cost (design §2.2) and is the denominator for the SWIFT bonus.
// Speed is scored in TICKS, never wall-clock milliseconds — see the design doc's callout on why:
// a tick count is the engine's own deterministic counter, computable identically from the log
// alone, with no forgeable-timestamp exploit surface.
export const RUN_TICK_CAP = 6000;

export type EndReason = "cleared" | "mortal-death" | "voided" | "tick-cap";

export function computeScore(world: World, player: Entity, endTick: number, reason: EndReason): number | null {
  if (reason === "voided") return null;

  const depthScore = 100 * world.stats.maxFloorReached + (reason === "cleared" ? 500 : 0);
  const killScore = world.stats.killXp;

  let heldValue = 0;
  for (const itemId of player.inventory) {
    const item = world.entities.get(itemId);
    const a = archetype(item?.archetypeId);
    if (a) heldValue += a.value;
  }
  const treasureScore = player.gold + heldValue;

  let styleScore = 40 * world.stats.floorsFlawless;
  if (glyphOf(player.human) === "⊤") styleScore += 75; // LYCANTHROPE — ever cursed, once is forever
  if (player.relicSpent) styleScore -= 150; // RISEN — the undead-relic continuation, locked in
  if (reason === "cleared") {
    styleScore += Math.floor((200 * (RUN_TICK_CAP - endTick)) / RUN_TICK_CAP); // SWIFT
  }

  const total = depthScore + killScore + treasureScore + styleScore;
  return Math.max(0, total);
}
