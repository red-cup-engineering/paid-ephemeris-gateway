// [economy] trade — fiber exchange between two players via DUAL-FILED EAVT moves. Grounded in
// tab's trade.mjs (development/lab/tab/being/doing/changing/trading/scripts/trade.mjs) and the
// economy note: "Trade IS fiber exchange. When two entities trade, predicates move between fibers."
//
// A leg of a trade is one `held-by` move on an item to its new holder. Because `held-by` is
// FUNCTIONAL (an item is held by exactly one entity; the latest-t row wins) the move SUPERSEDES the
// item's prior holder, and because it is RELATIONAL it is dual-filed at the new holder's anchor.
// That dual filing IS the double-entry the economy wants — my inventory debits the item, yours
// credits it — with NO ledger object and NO mutation of history. The accounting IS the EAVT: the
// append is the move. We also move MARKS (the conserved currency) the same way. Conserved: the
// combined (marks + items) of the two players is identical before and after — nothing is created
// or destroyed, only re-filed. We QUOTE richness before/after so the swap is legible.
//
// A proposal lives between two players until BOTH accept; only then does executeTrade move anything.

import { append } from "./store.mjs";
import { inventoryRichness } from "./richness.mjs";

// proposal store. A proposal is keyed by the pair {from, to} and remembers each side's offer and
// whether they have accepted. Kept on the world so it survives across ticks (and replays cleanly —
// a pending proposal is transient, not history). We store at most one live proposal per ordered
// pair; a fresh propose from the same proposer supersedes it.
export function tradeStore(world) {
  if (!world._trades) world._trades = new Map(); // key "from→to" -> proposal
  return world._trades;
}

const key = (a, b) => `${a}→${b}`;

// propose — `from` offers `offer` (what FROM gives) in exchange for `ask` (what FROM wants from TO).
// offer/ask are `{ marks, items: [itemId...] }`. Records the proposal as not-yet-accepted by either
// side. Returns the stored proposal, or null if the offer is not currently fundable by FROM.
export function propose(world, from, to, offer = {}, ask = {}) {
  if (!from || !to || from.id === to.id) return null;
  const o = normalize(offer), a = normalize(ask);
  if (!canFund(from, o)) return null; // FROM cannot currently back what it offers to give
  const p = { from: from.id, to: to.id, offer: o, ask: a, accepted: new Set(), t: world.tick };
  tradeStore(world).set(key(from.id, to.id), p);
  return p;
}

// accept — `who` accepts the proposal between the pair (in either direction). When BOTH the proposer
// and the responder have accepted, the trade EXECUTES and the proposal is cleared. Returns
// { ok, executed, result?, reason? }.
export function accept(world, who, partnerId) {
  const store = tradeStore(world);
  const p = store.get(key(partnerId, who.id)) ?? store.get(key(who.id, partnerId));
  if (!p) return { ok: false, executed: false, reason: "no-proposal" };
  p.accepted.add(who.id);
  if (!(p.accepted.has(p.from) && p.accepted.has(p.to))) {
    return { ok: true, executed: false, reason: "awaiting-partner" };
  }
  const result = executeTrade(world, p);
  store.delete(key(p.from, p.to));
  return { ok: result.ok, executed: result.ok, result, reason: result.reason };
}

// cancel — drop any live proposal between the pair (either direction).
export function cancel(world, aId, bId) {
  const store = tradeStore(world);
  return store.delete(key(aId, bId)) || store.delete(key(bId, aId));
}

// executeTrade — perform the two-sided fiber exchange for an accepted proposal. FROM gives `offer`
// and receives `ask`; TO gives `ask` and receives `offer`. Each item move is one dual-filed held-by
// row; marks move as a conserved currency. Re-validates fundability at execution (state may have
// changed since propose). Returns { ok, reason?, richnessBefore, richnessAfter }.
export function executeTrade(world, p) {
  const from = world.entities.get(p.from);
  const to = world.entities.get(p.to);
  if (!from || !to) return { ok: false, reason: "gone" };
  // re-validate: both sides must still hold what they promised (no double-spend across ticks).
  if (!canFund(from, p.offer) || !canFund(to, p.ask)) return { ok: false, reason: "unfunded" };

  const richnessBefore = quote(from, to);

  // FROM gives offer to TO, TO gives ask to FROM. Order is irrelevant to conservation (a closed
  // swap), but we move offer then ask so the trace reads as two clean halves.
  moveLeg(world, from, to, p.offer);
  moveLeg(world, to, from, p.ask);

  const richnessAfter = quote(from, to);
  return { ok: true, richnessBefore, richnessAfter };
}

// moveLeg — move `parcel` (marks + items) from `giver` to `taker`. Marks decrement/increment (the
// conserved currency); each item is removed from the giver's inventory, pushed onto the taker's,
// and its NEW holder filed as a dual-filed held-by row (the supersedes-and-credits double-entry).
function moveLeg(world, giver, taker, parcel) {
  if (parcel.marks) {
    giver.marks = (giver.marks || 0) - parcel.marks;
    taker.marks = (taker.marks || 0) + parcel.marks;
    giver.dirty = true; taker.dirty = true;
  }
  for (const itemId of parcel.items) {
    const idx = giver.inventory.findIndex((it) => it.id === itemId);
    if (idx < 0) continue; // re-validated above; defensive
    const [item] = giver.inventory.splice(idx, 1);
    taker.inventory.push(item);
    append(world, { e: item.id, a: "held-by", v: taker.id }); // the dual-filed move — the accounting
    giver.dirty = true; taker.dirty = true;
  }
}

// canFund — does `holder` currently hold every mark and item in `parcel`?
function canFund(holder, parcel) {
  if (!holder || !Array.isArray(holder.inventory)) return false;
  if ((holder.marks || 0) < (parcel.marks || 0)) return false;
  for (const itemId of parcel.items) {
    if (!holder.inventory.some((it) => it.id === itemId)) return false;
  }
  return true;
}

// normalize — coerce a raw offer/ask into `{ marks:int, items:[id...] }`.
function normalize(parcel = {}) {
  return {
    marks: Math.max(0, parcel.marks | 0),
    items: Array.isArray(parcel.items) ? parcel.items.filter(Boolean).map(String) : [],
  };
}

// quote — the two traders' current worth (marks + fiber richness of their inventories), keyed by id.
function quote(a, b) {
  return {
    [a.id]: inventoryRichness(a.inventory, a.marks),
    [b.id]: inventoryRichness(b.inventory, b.marks),
  };
}
