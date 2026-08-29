// session — one connected player. It is the seam between a raw WebSocket (qwzspace's http-ws-server
// Conn, wired in server/app.mjs) and
// the world: it spawns the player on join, feeds inputs to that entity for the tick to integrate,
// and every tick streams an INTEREST-FILTERED delta (only entities within VIEW_RADIUS, only what
// changed) plus the combat/chat events the player should see. Authoritative: the client sends
// intents, never positions.

import { MSG, VIEW_RADIUS, COMBAT, KIND, MARK } from "../../shared/constants.mjs";
import * as P from "../../shared/protocol.mjs";
import { encode, decode } from "../../shared/encoding.mjs";
import { spawn, remove, near, get } from "../world/store.mjs";
import { stateGlyph } from "../world/value.mjs";
import { packField } from "../world/field.mjs"; // [field]
import { settledness } from "../world/thermo.mjs"; // [tide]
import { settle as settleMarks } from "../world/marks.mjs"; // [marks]
import { usePower } from "../world/powers.mjs"; // [powers]
import { POWER } from "../../shared/constants.mjs"; // [powers]
import { propose as proposeTrade, accept as acceptTrade, cancel as cancelTrade } from "../world/trade.mjs"; // [economy]
import { inventoryRichness, value as itemValue } from "../world/richness.mjs"; // [economy]
import { forceOf } from "../../shared/illocution.mjs"; // [illocution]
import { WAYS } from "../../shared/codex.mjs"; // [illocution] Keepers teach from the Way they keep
import { open as openDispute, play as playDispute, disputeView } from "../world/dispute.mjs"; // [dispute]
import { nearestAltar, stake as stakeClaim, claimView, claimGlyph } from "../world/claims.mjs"; // [claims] CLAIM ALTARS

export class Session {
  constructor(conn, hub) {
    this.conn = conn;
    this.hub = hub;
    this.world = hub.world;
    this.id = null; // player entity id, once joined
    this.lastView = new Map(); // entity id -> last serialized view string (for delta diffing)
    this.lastSeq = 0;
    this.name = "wanderer";
    this.witnessed = new Set(); // bilattice Ways this player has met (teach-through-play)

    conn.onMessage = (text) => this._recv(text);
    conn.onClose = () => this._leave();
    conn.send(encode(P.hello(null, { tick: this.world.tick })));
  }

  _recv(text) {
    const m = decode(text);
    if (!m) return;
    if (m.k === MSG.join) return this._join(m.name);
    if (!this.id) return; // ignore everything else until joined
    const e = get(this.world, this.id);
    if (!e) return;
    if (m.k === MSG.input) {
      e.input = { f: m.f | 0, s: m.s | 0, y: Number(m.y) || 0, a: m.a | 0 };
      this.lastSeq = m.seq | 0;
    } else if (m.k === MSG.chat) {
      this.hub.broadcastChat(this.name, m.line);
    } else if (m.k === MSG.speak) {
      this._speak(e, m.force);
    } else if (m.k === MSG.settle) {
      this._settle(e);
    } else if (m.k === MSG.power) {
      this._power(e, m.power, m.tg);
    } else if (m.k === MSG.trade) {
      this._trade(e, m);
    } else if (m.k === MSG.parley) { // [dispute]
      this._parley(e, m.tg);
    } else if (m.k === MSG.move) { // [dispute]
      this._move(e, m.force);
    } else if (m.k === MSG.claim) { // [claims]
      this._claim(e, m.force, m.altar);
    }
  }

  // [claims] _claim — STAKE one of the four illocutionary forces at a CLAIM ALTAR. The marks staked
  // move INTO the altar's evidence (conserved); the cell re-settles via the REAL kernel. ASSERT
  // stakes positive, DENY negative, CONTEST both, ABSTAIN retracts the player's own last stake. On
  // a settle to t (sanctuary) / ⊤ (eruption) we announce it so the realm sees the world being authored.
  _claim(e, force, altarId) {
    const altar = (altarId && get(this.world, altarId)) || nearestAltar(this.world, e);
    if (!altar) { this.sendChat("Aletheon", "there is no altar near enough to stake a claim at."); return; }
    const before = altar.claim?.state;
    const out = stakeClaim(this.world, altar, e, force);
    if (!out.ok) {
      if (out.reason === "no-marks") this.sendChat("Aletheon", "you lack the marks to stake that claim.");
      else if (out.reason === "nothing-to-retract") this.sendChat("Aletheon", "you have no stake here to retract.");
      else if (out.reason === "bad-force") this.sendChat("Aletheon", "that is not a force you can stake.");
      return;
    }
    e.dirty = true; // the stake spent (or returned) marks — re-sync the player's count
    if (out.state !== before) {
      if (out.state === "sanctuary") this.hub.broadcastChat("Aletheon", `${altar.name} settles to t — a Sanctuary; the ground calms.`);
      else if (out.state === "erupt") this.hub.broadcastChat("Aletheon", `${altar.name} settles to ⊤ — it ERUPTS; a contradiction will walk.`);
    }
    // send the altar's fresh claim state to everyone who can see it
    for (const s of this.hub.sessions) s.sendAltar(altar);
  }

  // [claims] sendAltar — stream an altar's claim state to this player if the altar is within view.
  sendAltar(altar) {
    if (!this.id || !altar || altar.kind !== KIND.altar || !altar.claim) return;
    const me = get(this.world, this.id);
    if (!me) return;
    const dx = altar.x - me.x, dz = altar.z - me.z;
    if (dx * dx + dz * dz > VIEW_RADIUS * VIEW_RADIUS) return;
    const v = claimView(altar);
    this.conn.send(encode(P.altar(v.id, v.glyph, v.pos, v.neg, v.state, altar.x, altar.z)));
  }

  // [dispute] _parley — OPEN a ludics dispute (a parley) with a target foe. The non-lethal win path:
  // out-argue a foe until it YIELDS (daimon †) and is PACIFIED. Seeds both stances (the target's
  // ground from its hostility, the player's from neutral) and sends the opening state to the player.
  _parley(e, targetId) {
    const target = targetId && get(this.world, targetId);
    if (!target) { this.sendChat("Aletheon", "there is no one there to parley with."); return; }
    const d = openDispute(this.world, e, target);
    if (!d) { this.sendChat("Aletheon", "you cannot open a parley here."); return; }
    this.hub.broadcastChat("Aletheon", `${this.name} opens a parley with ${target.name} — a contest of forces.`);
    this.sendDispute(d, e.id);
  }

  // [dispute] _move — PLAY one of the four illocutionary forces into the active dispute. The kernel
  // charge ops resolve it; the NPC auto-counters; if a side yields (or it stalemates) the effect
  // (pacify / penalty) has already landed. We re-send the live state, and announce a yield.
  _move(e, force) {
    const d = e._dispute;
    if (!d) { this.sendChat("Aletheon", "you are not in a parley."); return; }
    const out = playDispute(this.world, d, e.id, force);
    if (!out.ok) return; // not your turn / bad force / already ended — silently ignored
    if (d.ended) {
      const foe = get(this.world, d.b === e.id ? d.a : d.b);
      if (d.yielded == null) this.hub.broadcastChat("Aletheon", `the parley with ${foe?.name ?? "a foe"} ends in stalemate — both hold ⊤.`);
      else if (d.yielded === e.id) this.hub.broadcastChat("Aletheon", `${this.name} yields the parley (†) — humbled, stunned a moment.`);
      else this.hub.broadcastChat("Aletheon", `${foe?.name ?? "a foe"} yields to ${this.name} (†) — pacified, the hunt laid down.`);
      e.dirty = true; // [dispute] a yield may have changed marks / bound state — re-sync the player
    }
    this.sendDispute(d, e.id);
  }

  // [dispute] sendDispute — stream the live parley state to this player (stances as glyphs, the last
  // outcome, the flow histogram + deep-play count, and whether it ended and who yielded).
  sendDispute(d, viewerId) {
    this.conn.send(encode(P.dispute(disputeView(this.world, d, viewerId))));
  }

  // [economy] _trade — a fiber-exchange action with another player. propose records an offer⇄ask
  // and tells the partner; accept moves marks + items only once BOTH sides have accepted (the
  // dual-filed EAVT move in trade.mjs); cancel drops a live proposal. We re-send each affected
  // player's inventory + quote the swap's richness before/after in the result line.
  _trade(e, m) {
    const partnerId = m.to;
    if (m.op === "propose") {
      const partner = get(this.world, partnerId);
      if (!partner || partner.kind !== KIND.player) return;
      const p = proposeTrade(this.world, e, partner, m.offer ?? {}, m.ask ?? {});
      if (!p) { this.sendChat("Aletheon", "the trade could not be proposed (you lack what you offer)."); return; }
      this.hub.relayTo(partnerId, "chat", { from: "Aletheon", line: `${this.name} proposes a trade — review and accept.` });
    } else if (m.op === "accept") {
      const out = acceptTrade(this.world, e, partnerId);
      if (out.executed && out.result?.ok) {
        const partner = get(this.world, partnerId);
        this.hub.broadcastChat("Aletheon", `${this.name} and ${partner?.name ?? "a wanderer"} trade — fibers exchanged, totals conserved.`);
        this.sendInventory(e); // re-send both sides' inventories + worth
        this.hub.relayTo(partnerId, "inventory", partner);
      } else if (out.reason === "awaiting-partner") {
        this.hub.relayTo(partnerId, "chat", { from: "Aletheon", line: `${this.name} accepts — your acceptance will seal the trade.` });
      } else if (!out.ok) {
        this.sendChat("Aletheon", "the trade could not be sealed.");
      }
    } else if (m.op === "cancel") {
      cancelTrade(this.world, this.id, partnerId);
    }
  }

  // [powers] _power — spend marks to use a K₄ gauge power on a target. powers.usePower applies the
  // real kernel op (negate / conflate / possibilize / necessitate); on success we broadcast its
  // line so every nearby player sees the gauge act, and re-send the caster's lowered mark count.
  _power(e, key, targetId) {
    const out = usePower(this.world, e, key, targetId ?? null);
    if (out.ok && out.line) this.hub.broadcastChat("Aletheon", out.line);
  }

  // [marks] _settle — spend COST marks to POSIT a claim through the real kernel and raise a Cairn
  // at the player's feet. The marks are CONSERVED: they leave the player and stand in the Cairn.
  _settle(e) {
    if ((e.marks || 0) < MARK.settleCost) return; // not enough marks to settle the ground
    const cairn = settleMarks(this.world, e);
    if (!cairn) return; // the kernel did not return a t verdict (or the spend failed)
    e.dirty = true; // re-send the local player's lowered mark count next sync
    this.hub.broadcastChat("Aletheon", `${this.name} settles the ground — a Cairn stands (t).`);
  }

  // [illocution] _speak — the speaker emits one of the four illocutionary forces. We tell every
  // nearby player (within VIEW_RADIUS) that this force was said, with its bilattice glyph so the
  // client paints it in world-truth colour. And — teach-through-play — if the speaker stands close
  // to the Keeper whose Way glyph matches the force, that Keeper teaches a line from its Way.
  _speak(e, force) {
    const f = forceOf(force);
    if (!f) return; // unknown force key — ignore garbage
    const said = P.said(this.name, f.force, f.glyph, e.x, e.z);
    for (const s of this.hub.sessions) s.deliverSaid(said, e.x, e.z);

    // a Keeper of the matching Way, standing within ~4 units, teaches its lesson aloud.
    const keeper = nearestKeeperOfGlyph(this.world, e, f.glyph, 4);
    if (keeper) {
      const way = WAYS[f.glyph];
      this.hub.broadcastChat(keeper.name, `${way.name} — ${way.lesson}`);
    }
  }

  _join(name) {
    if (this.id) return;
    this.name = String(name ?? "wanderer").slice(0, 24) || "wanderer";
    // spawn in the Settled Reach (grade 0, the safe heart at the origin)
    const e = spawn(this.world, { kind: "player", name: this.name, x: 0, z: 0, yaw: 0, maxHp: COMBAT.playerMaxHp });
    e.input = { f: 0, s: 0, y: 0, a: 0 };
    this.id = e.id;
    // full snapshot of what's nearby right now
    const entries = near(this.world, e, VIEW_RADIUS).map((o) => P.view(viewModel(o, o.id === this.id))); // [marks]
    this.conn.send(encode(P.snapshot(this.world.tick, e.id, entries)));
    for (const o of entries) this.lastView.set(o.id, JSON.stringify(o));
    this.hub.broadcastChat("Aletheon", `${this.name} steps out of the Void.`);
    this.witness("⊥"); // you begin in the Unseen — the first Way is granted on arrival
    for (const o of entries) this.witness(o.charge);
    this.sendInventory(e); // [economy] your held items + marks + total worth
    this._invSig = invSig(e); // [economy] remember the inventory state for change detection
    this._altarSig = new Map(); // [claims] last-sent claim signature per altar, for change detection
    for (const o of entries) if (o.kind === KIND.altar) { const a = get(this.world, o.id); if (a) this.sendAltar(a); }
  }

  // sync — called once per tick by the hub. Emits a delta of the visible set and any combat events.
  sync() {
    if (!this.id) return;
    const me = get(this.world, this.id);
    if (!me) return;

    // [powers] REVEAL (possibilize) widens the caster's interest radius for a span — sight raised.
    const radius = (me._revealUntil && Date.now() < me._revealUntil) ? POWER.revealRadius : VIEW_RADIUS;
    const visible = near(this.world, me, radius);
    const changed = [];
    const seen = new Set();
    for (const o of visible) {
      seen.add(o.id);
      const v = P.view(viewModel(o, o.id === this.id)); // [marks]
      const s = JSON.stringify(v);
      if (this.lastView.get(o.id) !== s) { changed.push(v); this.lastView.set(o.id, s); }
    }
    // anything we knew about but no longer see (left radius or world)
    const gone = [];
    for (const id of this.lastView.keys()) if (!seen.has(id)) { gone.push(id); this.lastView.delete(id); }

    if (changed.length || gone.length) {
      this.conn.send(encode(P.delta(this.world.tick, this.lastSeq, changed, gone)));
    }
    for (const o of visible) this.witness(stateGlyph(o.state));

    // [economy] re-send the inventory whenever it (or the mark count) changed — a kill's loot, a
    // sealed trade, a spent power. Cheap signature compare keeps it off the wire most ticks.
    const sig = invSig(me);
    if (sig !== this._invSig) { this._invSig = sig; this.sendInventory(me); }

    // [claims] stream each visible altar's claim state when it changes (cheap signature compare —
    // the claim only changes when someone stakes, erupts, decays, or pays out, not every tick).
    if (!this._altarSig) this._altarSig = new Map();
    const seenAltars = new Set();
    for (const o of visible) {
      if (o.kind !== KIND.altar || !o.claim) continue;
      seenAltars.add(o.id);
      const sig = `${o.claim.state}|${o.claim.pos.length}|${o.claim.neg.length}`;
      if (this._altarSig.get(o.id) !== sig) { this._altarSig.set(o.id, sig); this.sendAltar(o); }
    }
    for (const id of this._altarSig.keys()) if (!seenAltars.has(id)) this._altarSig.delete(id);

    // [field] stream the void-tension field a few times a second (not every tick — it's coarse)
    if (this.world.tick - (this._fieldAt ?? -99) >= 10) {
      this._fieldAt = this.world.tick;
      this.conn.send(encode(P.field(packField(this.world.field), settledness(this.world)))); // [tide] settledness rides the field msg
    }
  }

  // witness — the first time this player meets a Way (a bilattice value), teach it. The whole
  // bilattice is learned by living it: ⊥ on arrival, t/f/⊤ as the world shows them to you.
  witness(glyph) {
    if (!glyph || this.witnessed.has(glyph)) return;
    this.witnessed.add(glyph);
    this.conn.send(encode(P.codex(glyph)));
  }

  // deliver a combat event if it happened near this player (so swings/anomalies animate locally)
  notifyCombat(ev) {
    if (!this.id) return;
    const me = get(this.world, this.id);
    if (!me) return;
    const at = ev.attacker && get(this.world, ev.attacker);
    const tg = ev.target && get(this.world, ev.target);
    const ref = tg || at;
    if (!ref) return;
    const dx = ref.x - me.x, dz = ref.z - me.z;
    if (dx * dx + dz * dz <= VIEW_RADIUS * VIEW_RADIUS) {
      this.conn.send(encode(P.combat(this.world.tick, ev.attacker, ev.target, ev.amount, ev.outcome)));
    }
  }

  sendChat(from, line) {
    this.conn.send(encode(P.chat(from, line)));
  }

  // [economy] sendInventory — send a player THEIR held items + marks + total richness (the worth
  // the HUD's inventory panel reads). Items carry their fiber-richness `value` glyph-number. Called
  // on join and after any change to inventory/marks (a kill's loot, a sealed trade).
  sendInventory(e) {
    if (!e || e.kind !== KIND.player) return;
    const items = (e.inventory ?? []).map((it) => ({ id: it.id, name: it.name, kind: it.kind, value: itemValue(it) }));
    const worth = inventoryRichness(e.inventory ?? [], e.marks ?? 0);
    this.conn.send(encode(P.inventory(items, e.marks ?? 0, worth)));
  }

  // [illocution] deliverSaid — forward a spoken force if it happened within this player's view.
  deliverSaid(msg, x, z) {
    if (!this.id) return;
    const me = get(this.world, this.id);
    if (!me) return;
    const dx = x - me.x, dz = z - me.z;
    if (dx * dx + dz * dz <= VIEW_RADIUS * VIEW_RADIUS) this.conn.send(encode(msg));
  }

  _leave() {
    if (this.id) { remove(this.world, this.id); this.id = null; }
    this.hub.drop(this);
  }
}

// [illocution] keeperGlyphByName — a Keeper's Way glyph from its name (seed.mjs names Keepers from
// WAYS[glyph].keeper). Built once from the codex so the speaker can find the right teacher.
const keeperGlyphByName = new Map(Object.entries(WAYS).map(([g, w]) => [w.keeper, g]));

// [illocution] nearestKeeperOfGlyph — the closest Keeper of the given Way glyph within `range`
// world units of the speaker, or null. Keepers are KIND.keeper; their Way is read from their name.
function nearestKeeperOfGlyph(world, speaker, glyph, range) {
  let best = null, bd = range * range;
  for (const o of near(world, speaker, range)) {
    if (o.kind !== KIND.keeper || keeperGlyphByName.get(o.name) !== glyph) continue;
    const d = (o.x - speaker.x) ** 2 + (o.z - speaker.z) ** 2;
    if (d <= bd) { bd = d; best = o; }
  }
  return best;
}

// viewModel — the renderable projection of an entity: its 3+1 position, facing, hp, and the
// bilattice glyph the client paints (t/f/⊤/⊥). Mortality/anomaly are world-truth, sent as-is.
function viewModel(e, isMe = false) {
  return {
    id: e.id, kind: e.kind, name: e.name,
    x: e.x, y: e.y, z: e.z, yaw: e.yaw,
    hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp,
    // [claims] an altar wears its CLAIM glyph (the player-authored truth), not its own ⊥ life-state.
    charge: e.kind === KIND.altar && e.claim ? claimGlyph(e.claim) : stateGlyph(e.state),
    // [marks] only the player's OWN view carries their mark count (so the HUD can read it).
    // [economy] and the local player's total worth (marks + fiber-richness), for the HUD readout.
    ...(isMe ? { marks: e.marks || 0, worth: inventoryRichness(e.inventory ?? [], e.marks ?? 0) } : {}),
  };
}

// [economy] invSig — a cheap signature of a player's inventory + marks, for change detection. Two
// states with the same item ids (in order) and the same mark count produce the same string.
function invSig(e) {
  return `${e.marks ?? 0}|${(e.inventory ?? []).map((it) => it.id).join(",")}`;
}
