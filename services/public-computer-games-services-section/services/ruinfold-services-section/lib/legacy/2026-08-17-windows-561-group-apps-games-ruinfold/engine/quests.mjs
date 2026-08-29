// quests — the player's single active BOUNTY: accept it from a quest-giver, tick it forward on
// each matching kill, and turn it in for coin, xp, and gear. A bounty is not a separate entity; it
// is a fistful of FUNCTIONAL predicates living on the PLAYER (see RUIN_FUNCTIONAL): `active-bounty`
// (the quest id) plus its denormalized terms — `bounty-progress`, `bounty-goal`,
// `bounty-target-kind` (the species to slay), `bounty-reward-gold/-xp/-item`, and `bounty-giver`.
// Because each is functional, latest-t wins: progress is just `changing` the running count, and
// CLEARING the quest is `retract`-ing every cell so it folds away (the player has no active bounty
// rather than an active-bounty held false).
//
// The OFFER itself lives on the giver as one structured `offers` object (the seed files
// `offers: {id,name,species,goal,rewardGold,rewardXp,rewardItem}`); accept() copies those terms
// onto the player so the rest of the quest never has to re-read the npc.
//
// Contracts here follow the engine convention: mutations are (root, ...args, t, dirty) where `t`
// is a () => string clock thunk and `dirty` is a Set the caller collects touched subjects in.

import changing from "#changing";
import { retract } from "#doing";
import { view, valOf, numOf } from "#engine/_world.mjs";
import { awardXp } from "#engine/progression.mjs";
import { grantItem } from "#engine/items.mjs";

// accept — take the giver's offered bounty onto the player. Refuses if the player already carries
// an active bounty (one at a time, v0) or if this npc offers nothing. On success it copies the
// offer's terms into the player's bounty cells and zeroes progress.
export async function accept(root, player, npcId, t, dirty) {
  const me = await view(root, player);
  if (valOf(me, "active-bounty") != null) return { accepted: false, reason: "busy" };

  const offers = valOf(await view(root, npcId), "offers");
  if (!offers) return { accepted: false, reason: "no-offer" };

  await changing({ root, subject: player, predicate: "active-bounty", object: offers.id, t: t() });
  await changing({ root, subject: player, predicate: "bounty-progress", object: 0, t: t() });
  await changing({ root, subject: player, predicate: "bounty-goal", object: offers.goal, t: t() });
  await changing({ root, subject: player, predicate: "bounty-target-kind", object: offers.species, t: t() });
  await changing({ root, subject: player, predicate: "bounty-reward-gold", object: offers.rewardGold, t: t() });
  await changing({ root, subject: player, predicate: "bounty-reward-xp", object: offers.rewardXp, t: t() });
  await changing({ root, subject: player, predicate: "bounty-reward-item", object: offers.rewardItem, t: t() });
  await changing({ root, subject: player, predicate: "bounty-giver", object: npcId, t: t() });
  dirty.add(player);
  return { accepted: true, quest: offers.id };
}

// onKill — call when the player slays something. If the player holds a bounty whose target species
// matches the victim's AND it is not already full, advance progress by one and report it. A kill
// that does not match (wrong species, no bounty, already complete) writes nothing and returns null.
export async function onKill(root, player, victimSpecies, t, dirty) {
  const me = await view(root, player);
  if (valOf(me, "active-bounty") == null) return null;
  if (valOf(me, "bounty-target-kind") !== victimSpecies) return null;

  const progress = numOf(me, "bounty-progress", 0);
  const goal = numOf(me, "bounty-goal", 0);
  if (progress >= goal) return null; // already done; don't over-count

  const next = progress + 1;
  await changing({ root, subject: player, predicate: "bounty-progress", object: next, t: t() });
  dirty.add(player);
  return { progress: next, complete: next >= goal };
}

// turnIn — hand a COMPLETE bounty back to the giver who set it. Only if the player's active bounty
// was given by this npc and progress has reached the goal. On success it pays the reward — gold
// added to the running total, xp through awardXp (which may level), and the reward item minted into
// the pack if one is named — then CLEARS the bounty by retracting every cell so it folds away.
export async function turnIn(root, player, npcId, t, dirty) {
  const me = await view(root, player);
  if (valOf(me, "active-bounty") == null) return { turnedIn: false, reason: "no-bounty" };
  if (valOf(me, "bounty-giver") !== npcId) return { turnedIn: false, reason: "wrong-giver" };

  const progress = numOf(me, "bounty-progress", 0);
  const goal = numOf(me, "bounty-goal", 0);
  if (progress < goal) return { turnedIn: false, reason: "incomplete" };

  const rewardGold = numOf(me, "bounty-reward-gold", 0);
  const rewardXp = numOf(me, "bounty-reward-xp", 0);
  const rewardItem = valOf(me, "bounty-reward-item", null);

  // credit gold onto the running total (gold is functional → latest-t wins)
  const newGold = numOf(me, "gold", 0) + rewardGold;
  await changing({ root, subject: player, predicate: "gold", object: newGold, t: t() });
  dirty.add(player);

  // award xp (may level the player and heal to full — handled inside progression)
  await awardXp(root, player, rewardXp, t, dirty);

  // mint the reward item, if any, straight into the player's pack
  let item = null;
  if (rewardItem) {
    const res = await grantItem(root, player, rewardItem, t, dirty);
    if (res.granted) item = res.item;
  }

  // CLEAR the bounty: retract every cell so the quest folds away (no held-false residue)
  for (const p of [
    "active-bounty",
    "bounty-progress",
    "bounty-goal",
    "bounty-target-kind",
    "bounty-reward-gold",
    "bounty-reward-xp",
    "bounty-reward-item",
    "bounty-giver",
  ]) {
    await retract({ root, subject: player, predicate: p, t: t() });
  }
  dirty.add(player);

  return { turnedIn: true, reward: { gold: rewardGold, xp: rewardXp, item } };
}

// activeBountyOf — a small read of the player's current bounty, or null if none. The UI uses this
// to draw the tracker; it carries only the live terms, not the rewards.
export async function activeBountyOf(root, player) {
  const me = await view(root, player);
  const id = valOf(me, "active-bounty", null);
  if (id == null) return null;
  return {
    id,
    progress: numOf(me, "bounty-progress", 0),
    goal: numOf(me, "bounty-goal", 0),
    targetKind: valOf(me, "bounty-target-kind", null),
    giver: valOf(me, "bounty-giver", null),
  };
}
