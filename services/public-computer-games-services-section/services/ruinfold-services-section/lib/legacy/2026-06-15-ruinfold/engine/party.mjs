// party — players band into a group that shares xp and owns a chat scope. A party is NOT its own
// entity in the trace: it is a relation woven across the players themselves. Each member carries
// two FUNCTIONAL predicates (declared in engine/functional.mjs):
//
//   party-id      the SHARED group id — by convention the LEADER's own id. Every member of one
//                 party carries the identical party-id, so the party "is" that set of players.
//   party-leader  who leads. v0 keeps this == party-id (the leader leads their own party); it is a
//                 separate cell so a future hand-off can move leadership without rewriting party-id.
//
// Because both are FUNCTIONAL, joining/leaving is just `changing` (latest-t wins) and disbanding is
// `retract` (the cell folds away, member has no party). There is no membership list stored anywhere:
// the roster is RECOVERED by scanning the player subjects for a matching party-id (membersOf). At
// ruinfold's scale (a handful of co-located players) a scan is cheaper than maintaining a list cell
// that two concurrent joins could clobber — the trace stays the single source of truth.
//
//   create(root, leader, t, dirty)            -> { partyId }     leader founds a party of one (self)
//   join(root, player, partyId, t, dirty)     -> { joined }      player adopts an existing party-id
//   leave(root, player, t, dirty)             -> { left }        player exits; leader leaving disbands
//   partyOf(root, player)                     -> partyId | null  the player's current party-id
//   membersOf(root, partyId)                  -> [playerId, ...] everyone carrying that party-id
//   shareTargets(root, killer)                -> [playerId, ...] party-mates co-located w/ the killer
//
//   t     : a () => string clock thunk (orders sub-events within the tick)
//   dirty : a Set the caller collects touched subjects in (for the snapshot)

import changing from "#changing";
import { retract } from "#doing";
import { view, valOf, posOf, dist2, zoneOf } from "#engine/_world.mjs";

// SHARE_RADIUS — horizontal range (world units) within which a party-mate counts as "present" for
// shared xp on a kill. dist2 returns SQUARED distance, so the gate compares against SHARE_RADIUS².
// Mirrors the engine's no-sqrt convention (see _world.dist2): all range math is scalar compares.
export const SHARE_RADIUS = 30;

// create — found a new party led by `leader`. The party-id IS the leader's own id (the group "is"
// the leader's circle). Sets both cells on the leader; with no other members yet, membersOf will
// report just [leader] until others join. Idempotent in effect: re-creating just re-stamps the cells.
export async function create(root, leader, t, dirty) {
  await changing({ root, subject: leader, predicate: "party-id", object: leader, t: t() });
  await changing({ root, subject: leader, predicate: "party-leader", object: leader, t: t() });
  dirty.add(leader);
  return { partyId: leader };
}

// join — `player` adopts an existing party. We do NOT verify the party exists or that the inviter
// consented: v0 is a DIRECT join (an invite/accept handshake is a thin wrapper that would call this
// only after the leader's invite was accepted). The player takes the shared party-id and records the
// same leader (== party-id by our convention) so leave() can recognise a leader vs a rank member.
export async function join(root, player, partyId, t, dirty) {
  await changing({ root, subject: player, predicate: "party-id", object: partyId, t: t() });
  await changing({ root, subject: player, predicate: "party-leader", object: partyId, t: t() });
  dirty.add(player);
  return { joined: true };
}

// leave — `player` exits their party. Retract their two party cells so they fold away (no held-false
// residue, just absence — partyOf then reads null). If the LEAVER WAS THE LEADER, the whole party
// DISBANDS: we scan the roster and retract every remaining member's party cells too. v0 chooses
// disband over leadership hand-off to keep the rule one-line-simple; a future version can instead
// pick a successor and re-stamp party-leader without touching anyone's party-id.
export async function leave(root, player, t, dirty) {
  const partyId = await partyOf(root, player);
  const wasLeader = partyId !== null && partyId === player;

  if (wasLeader) {
    // Disband: clear EVERY member (including the leader) so no orphan carries a dead party-id.
    for (const member of await membersOf(root, partyId)) {
      await retract({ root, subject: member, predicate: "party-id", t: t() });
      await retract({ root, subject: member, predicate: "party-leader", t: t() });
      dirty.add(member);
    }
  } else {
    await retract({ root, subject: player, predicate: "party-id", t: t() });
    await retract({ root, subject: player, predicate: "party-leader", t: t() });
    dirty.add(player);
  }

  return { left: true };
}

// partyOf — the player's current party-id, or null if they are not in a party. Reads the settled
// (latest-t) party-id cell; a retracted cell folds to absent, so valOf's fallback (null) is the
// authoritative "no party" answer.
export async function partyOf(root, player) {
  return valOf(await view(root, player), "party-id", null);
}

// membersOf — recover the party roster by SCANNING the player subjects for a matching party-id.
// No membership list is stored; the trace is the source of truth. We enumerate kind:player subjects
// (monsters, items, zones can never carry a party-id, but filtering to players keeps the scan honest
// and cheap). Dynamic import of subjects mirrors death.resolveRespawns — avoids a static cycle and
// keeps this module's static imports to the world helpers only.
export async function membersOf(root, partyId) {
  if (partyId == null) return [];
  const { subjects } = await import("#substrate");
  const out = [];
  for (const s of await subjects(root)) {
    const thing = await view(root, s);
    if (valOf(thing, "kind") !== "player") continue;
    if (valOf(thing, "party-id", null) === partyId) out.push(s);
  }
  return out;
}

// shareTargets — who shares the xp from `killer`'s kill: the killer plus every party-mate standing
// in the SAME zone within SHARE_RADIUS. A solo player (no party) shares with just themselves. The
// zone gate first (zoneOf is e-filtered, correct even while carrying items), then the squared-radius
// gate, so a far-flung member in the same zone is excluded. The killer is ALWAYS included even if
// they somehow fail their own gates — you never lose xp for your own kill.
export async function shareTargets(root, killer) {
  const partyId = await partyOf(root, killer);
  if (partyId == null) return [killer];

  const killerZone = await zoneOf(root, killer);
  const killerPos = posOf(await view(root, killer));
  const r2 = SHARE_RADIUS * SHARE_RADIUS;

  const out = [];
  for (const member of await membersOf(root, partyId)) {
    if (member === killer) {
      out.push(member); // killer always shares in their own kill
      continue;
    }
    const memberZone = await zoneOf(root, member);
    if (memberZone !== killerZone) continue; // different zone — out of range by definition
    const memberPos = posOf(await view(root, member));
    if (dist2(killerPos, memberPos) <= r2) out.push(member);
  }
  return out;
}
