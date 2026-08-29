// connection — the browser side of the wire. Opens one WebSocket to the authoritative server,
// speaks the shared protocol, and keeps a map of entities whose RENDER positions ease toward the
// server's authoritative targets (snapshot + per-tick deltas at 15 Hz, smoothed to 60 fps). The
// client sends only intents; it never asserts a position. Uses the browser-native WebSocket — the
// one piece of networking we don't hand-roll, because the browser already provides it.

import { MSG } from "../../shared/constants.mjs";
import * as P from "../../shared/protocol.mjs";
import { encode, decode } from "../../shared/encoding.mjs";

export function connect({ name, onChat, onCombat, onState, onCodex, onField, onSaid, onInventory, onDispute, onAltar }) {
  const url = (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host + "/";
  const ws = new WebSocket(url);
  const entities = new Map();
  let meId = null;
  let seq = 0;
  let fieldGrid = null; // [field] latest void-tension grid { dim, v: Float32Array }
  let settledness = 0; // [tide] the world's calm in [0,1], streamed alongside the field
  let inv = { items: [], marks: 0, worth: 0 }; // [economy] the local player's held items + worth
  const altars = new Map(); // [claims] altar id -> latest claim state { id, glyph, pos, neg, state, x, z }

  const api = {
    get meId() { return meId; },
    me() { return meId ? entities.get(meId) : null; },
    entities() { return [...entities.values()]; },
    field() { return fieldGrid; }, // [field]
    settledness() { return settledness; }, // [tide] the world's calm in [0,1]
    inventory() { return inv; }, // [economy] the local player's held items + marks + worth
    ready: false,
    sendInput(f, s, yaw, attack) {
      if (ws.readyState === 1 && meId) ws.send(encode(P.input(++seq, f, s, yaw, attack)));
    },
    sendChat(line) { if (ws.readyState === 1) ws.send(encode(P.chat(name, line))); },
    // [illocution] speak — emit one of the four illocutionary forces toward an optional target.
    speak(force, targetId = null) { if (ws.readyState === 1 && meId) ws.send(encode(P.speak(force, targetId))); },
    // [marks] settle — spend marks to POSIT a claim and raise a Cairn at your feet.
    settle() { if (ws.readyState === 1 && meId) ws.send(encode(P.settle())); },
    // [powers] power — spend marks to use a K₄ gauge power on an optional target entity.
    power(key, targetId = null) { if (ws.readyState === 1 && meId) ws.send(encode(P.power(key, targetId))); },
    // [economy] trade — propose/accept/cancel a fiber-exchange with another player.
    trade(op, to, offer = null, ask = null) { if (ws.readyState === 1 && meId) ws.send(encode(P.trade(op, to, offer, ask))); },
    // [dispute] parley — OPEN a ludics dispute (a parley) with a target foe.
    parley(targetId) { if (ws.readyState === 1 && meId) ws.send(encode(P.parley(targetId))); },
    // [dispute] move — PLAY one of the four illocutionary forces into the active dispute.
    move(force) { if (ws.readyState === 1 && meId) ws.send(encode(P.move(force))); },
    // [claims] claim — STAKE a force at a CLAIM ALTAR (the nearest one if altarId is null).
    claim(force, altarId = null) { if (ws.readyState === 1 && meId) ws.send(encode(P.claim(force, altarId))); },
    altars() { return [...altars.values()]; }, // [claims] the known altar claim states
    interpolate,
  };

  ws.onopen = () => {};
  ws.onclose = () => { onState?.("disconnected"); };
  ws.onerror = () => { onState?.("error"); };
  ws.onmessage = (ev) => {
    const m = decode(ev.data);
    if (!m) return;
    switch (m.k) {
      case MSG.hello: ws.send(encode(P.join(name))); onState?.("joining"); break;
      case MSG.snapshot: {
        meId = m.you; entities.clear();
        for (const e of m.e) upsert(e, true);
        api.ready = true; onState?.("playing");
        break;
      }
      case MSG.delta:
        for (const e of m.c) upsert(e, false);
        for (const id of m.g) entities.delete(id);
        break;
      case MSG.combat: onCombat?.(m); break;
      case MSG.chat: onChat?.(m.from, m.line); break;
      case MSG.codex: onCodex?.(m.glyph); break;
      case MSG.said: onSaid?.(m); break; // [illocution] a nearby player spoke a force
      case MSG.field: { // [field] unpack the digit string into a normalized grid
        const dim = m.dim, v = new Float32Array(dim * dim);
        for (let k = 0; k < v.length; k++) v[k] = (m.q.charCodeAt(k) - 48) / 9;
        fieldGrid = { dim, v };
        if (typeof m.s === "number") settledness = m.s; // [tide] the world's calm rides the field msg
        onField?.(fieldGrid);
        break;
      }
      case MSG.inventory: // [economy] your held items + marks + total worth
        inv = { items: m.items || [], marks: m.marks | 0, worth: m.worth | 0 };
        onInventory?.(inv);
        break;
      case MSG.dispute: onDispute?.(m); break; // [dispute] the live parley state
      case MSG.altar: // [claims] a nearby altar's claim state (glyph, pos/neg, settled face)
        altars.set(m.id, { id: m.id, glyph: m.glyph, pos: m.pos, neg: m.neg, state: m.state, x: m.x, z: m.z });
        onAltar?.(m);
        break;
      case MSG.bye: entities.delete(m.id); altars.delete(m.id); break;
    }
  };

  function upsert(e, snap) {
    let cur = entities.get(e.id);
    if (!cur) {
      cur = { id: e.id, kind: e.kind, name: e.name, x: e.x, y: e.y, z: e.z, yaw: e.yaw,
        tx: e.x, ty: e.y, tz: e.z, tyaw: e.yaw, hp: e.hp, maxHp: e.maxHp, charge: e.charge,
        marks: e.marks }; // [marks] carried only on the local player's own view
      entities.set(e.id, cur);
      return;
    }
    cur.kind = e.kind; cur.name = e.name; cur.hp = e.hp; cur.maxHp = e.maxHp; cur.charge = e.charge;
    if (e.marks != null) cur.marks = e.marks; // [marks]
    cur.tx = e.x; cur.ty = e.y; cur.tz = e.z; cur.tyaw = e.yaw;
    if (snap) { cur.x = e.x; cur.y = e.y; cur.z = e.z; cur.yaw = e.yaw; }
  }

  // interpolate — ease render coords toward authoritative targets. The local avatar snaps quickly
  // (responsiveness); everyone else glides (hides the 15 Hz step). Frame-rate independent.
  function interpolate(dt) {
    for (const e of entities.values()) {
      const rate = e.id === meId ? 22 : 11;
      const k = 1 - Math.exp(-rate * dt);
      e.x += (e.tx - e.x) * k;
      e.y += (e.ty - e.y) * k;
      e.z += (e.tz - e.z) * k;
      e.yaw += shortAngle(e.yaw, e.tyaw) * k;
    }
  }

  return api;
}

function shortAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
