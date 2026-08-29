// playertrade — a safe, two-sided ESCROW trade between two players. Neither side gives anything
// up until BOTH have staged an offer (items + gold) and BOTH have pressed confirm; only then does
// the swap happen atomically, in one settled instant. This is the MMO trust feature: you can SEE
// what you're getting, you can't be made to pay before the other side commits, and any edit to
// either offer re-opens confirmation so no one can swap the goods out from under a confirmed peer.
//
// State lives entirely in three functional cells on EACH player (already in RUIN_FUNCTIONAL):
//   trade-with      — the other party's id (the session link; both point at each other)
//   trade-offer     — a JSON object {items:[itemId...], gold:number} (the staged offer)
//   trade-confirmed — boolean (this player has pressed confirm)
// A live session is "both players' trade-with point at each other". Clearing the session is
// retracting all three on both sides.
//
// Gold is a single functional `gold` cell (latest value wins) — we move it by writing the NEW
// absolute purse value, never a delta (mirrors vendor.buy/sell). Items are instances whose
// `located-in` is their owner; moving one is `changing` that relation to the new owner (mirrors
// items.pickup). The execute step is just a batch of those two kinds of write under one clock.
//
// Contract for every mutating fn: (root, ...args, t, dirty). `t` is a ()=>string clock thunk —
// CALL it for each row so seq advances and rows order. `dirty` is a Set of entity ids the caller
// will re-settle/broadcast; add every id we touch.

import changing from "#changing";
import { retract } from "#doing";
import { locationOf } from "#substrate";
import { inventoryOf } from "#engine/items.mjs";
import { view, valOf, numOf } from "#engine/_world.mjs";

const EMPTY_OFFER = { items: [], gold: 0 };

// parseOffer — read a player's staged trade-offer cell back into an object. The cell stores a JSON
// object; depending on how it was filed it may already be parsed or still be a string, so handle
// both. Falls back to the empty offer when there's nothing staged.
function parseOffer(thing) {
  const raw = valOf(thing, "trade-offer", null);
  if (raw == null) return { ...EMPTY_OFFER };
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return { ...EMPTY_OFFER };
    }
  }
  // already an object
  return { items: Array.isArray(raw.items) ? raw.items : [], gold: Number(raw.gold) || 0 };
}

// confirmedOf — read a player's trade-confirmed boolean. Stored as a real boolean object; treat a
// truthy non-"false" string defensively too.
function confirmedOf(thing) {
  const v = valOf(thing, "trade-confirmed", false);
  return v === true || v === "true";
}

// clearSession — retract all three trade cells on BOTH players so no live session remains. Used by
// both cancel and the tail of a successful execute. Idempotent: retracting an absent cell is fine.
async function clearSession(root, a, b, t, dirty) {
  for (const who of [a, b]) {
    await retract({ root, subject: who, predicate: "trade-with", t: t() });
    await retract({ root, subject: who, predicate: "trade-offer", t: t() });
    await retract({ root, subject: who, predicate: "trade-confirmed", t: t() });
    dirty.add(who);
  }
}

// resetBothConfirmed — set BOTH parties' trade-confirmed back to false. Any change to either offer
// re-opens confirmation (you must re-agree to the new terms), so this is called whenever an offer
// is (re)staged.
async function resetBothConfirmed(root, a, b, t, dirty) {
  for (const who of [a, b]) {
    await changing({ root, subject: who, predicate: "trade-confirmed", object: false, t: t() });
    dirty.add(who);
  }
}

// open — start a fresh escrow session between players a and b. Links them (each trade-with the
// other), stages empty offers, and clears confirmation on both. Refuses to trade with yourself.
// The caller (action/tick intent) is responsible for the in-range / same-zone gate before this.
export async function open(root, a, b, t, dirty) {
  if (a === b) return { opened: false, reason: "self-trade" };
  for (const [me, them] of [[a, b], [b, a]]) {
    await changing({ root, subject: me, predicate: "trade-with", object: them, t: t() });
    await changing({ root, subject: me, predicate: "trade-offer", object: JSON.stringify(EMPTY_OFFER), t: t() });
    await changing({ root, subject: me, predicate: "trade-confirmed", object: false, t: t() });
    dirty.add(me);
  }
  return { opened: true };
}

// setOffer — stage (or restage) the actor's side of the deal. Validates that the actor is in a
// session, actually HOLDS each offered item instance (its located-in is the actor right now), and
// owns at least the offered gold. On success the offer is stored and BOTH confirmations reset
// (re-opening agreement). Returns {ok} or {ok:false, reason}.
export async function setOffer(root, actor, { items = [], gold = 0 }, t, dirty) {
  const me = await view(root, actor);
  const other = valOf(me, "trade-with", null);
  if (!other) return { ok: false, reason: "no-trade" };

  const wantGold = Number(gold) || 0;
  if (wantGold < 0) return { ok: false, reason: "negative-gold" };
  if (numOf(me, "gold", 0) < wantGold) return { ok: false, reason: "insufficient-gold" };

  // Each offered instance must be presently located-in the actor. Reject the WHOLE offer if any
  // item isn't held — escrow must never stage something the actor can't actually deliver.
  const wantItems = [];
  for (const itemId of items) {
    if ((await locationOf(root, itemId)) !== actor) return { ok: false, reason: "not-held", item: itemId };
    wantItems.push(itemId);
  }

  const offer = { items: wantItems, gold: wantGold };
  await changing({ root, subject: actor, predicate: "trade-offer", object: JSON.stringify(offer), t: t() });
  dirty.add(actor);
  // any change re-opens confirmation for BOTH sides
  await resetBothConfirmed(root, actor, other, t, dirty);
  return { ok: true };
}

// confirm — the actor presses confirm. If the OTHER side is also already confirmed, this is the
// closing confirm: we EXECUTE the swap atomically (under one clock burst) and then clear the
// session. Otherwise we just record this side's confirmation and wait. Returns {executed}.
export async function confirm(root, actor, t, dirty) {
  const me = await view(root, actor);
  const other = valOf(me, "trade-with", null);
  if (!other) return { executed: false, reason: "no-trade" };

  await changing({ root, subject: actor, predicate: "trade-confirmed", object: true, t: t() });
  dirty.add(actor);

  // Re-read the OTHER party fresh to see if they're confirmed (they may have confirmed earlier).
  const them = await view(root, other);
  if (!confirmedOf(them)) return { executed: false }; // waiting on the other side

  // BOTH confirmed → execute. Re-read both offers from their settled cells.
  const myOffer = parseOffer(await view(root, actor));
  const theirOffer = parseOffer(them);

  // --- atomic swap -----------------------------------------------------------------------------
  // Move each side's offered items to the OTHER party by rewriting located-in (matches pickup).
  for (const itemId of myOffer.items) {
    await changing({ root, subject: itemId, predicate: "located-in", object: other, t: t() });
    dirty.add(itemId);
  }
  for (const itemId of theirOffer.items) {
    await changing({ root, subject: itemId, predicate: "located-in", object: actor, t: t() });
    dirty.add(itemId);
  }
  // Adjust gold both ways. Gold is a single functional cell, so compute each new purse from the
  // current values and write the absolute result: actor pays its offer and is paid the peer's.
  const actorPurse = numOf(await view(root, actor), "gold", 0);
  const otherPurse = numOf(await view(root, other), "gold", 0);
  const actorNew = actorPurse - myOffer.gold + theirOffer.gold;
  const otherNew = otherPurse - theirOffer.gold + myOffer.gold;
  await changing({ root, subject: actor, predicate: "gold", object: actorNew, t: t() });
  await changing({ root, subject: other, predicate: "gold", object: otherNew, t: t() });
  dirty.add(actor);
  dirty.add(other);

  // tear the session down — the deal is done
  await clearSession(root, actor, other, t, dirty);
  return { executed: true };
}

// cancel — either party walks away. Clears the session on both sides; nothing is exchanged. Safe
// to call even when only the actor's link is set (it retracts both ids it can find).
export async function cancel(root, actor, t, dirty) {
  const me = await view(root, actor);
  const other = valOf(me, "trade-with", null);
  if (!other) {
    await clearSession(root, actor, actor, t, dirty);
    return { cancelled: true };
  }
  await clearSession(root, actor, other, t, dirty);
  return { cancelled: true };
}

// tradeStateOf — a read-only snapshot of the actor's live trade from their POV (for the UI / intent
// gating). Returns null when there's no session. `myOffer`/`theirOffer` are {items,gold} objects.
export async function tradeStateOf(root, actor) {
  const me = await view(root, actor);
  const other = valOf(me, "trade-with", null);
  if (!other) return null;
  const them = await view(root, other);
  return {
    with: other,
    myOffer: parseOffer(me),
    theirOffer: parseOffer(them),
    iConfirmed: confirmedOf(me),
    theyConfirmed: confirmedOf(them),
  };
}
