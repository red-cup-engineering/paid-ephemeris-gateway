// hud — the overlay logic: vitals, a target frame, a void-ring minimap, and the combat/chat log.
// It reads the connection's entity map each frame; it never simulates. The bilattice glyph is the
// motif throughout — your own charge, your target's, and every dot on the map carries its truth.

import { VIEW_RADIUS, KIND, MARK } from "../../shared/constants.mjs";
import { ringRadius } from "../../shared/worldgen.mjs";
import { entityColor, itemColor, css } from "../../shared/palette.mjs"; // [economy] itemColor for the inventory panel
import { WAYS, WAY_ORDER } from "../../shared/codex.mjs";
import { FORCES, ORDER as FORCE_ORDER } from "../../shared/illocution.mjs"; // [illocution]
import { POWERS, ORDER as POWER_ORDER } from "../../shared/powers.mjs"; // [powers] the K₄ power bar

const CHARGE_CLASS = { t: "t", f: "f", "⊤": "top", "⊥": "bot" };

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $("hud"), charge: $("charge"), meName: $("me-name"), hpFill: $("hp-fill"), hpText: $("hp-text"),
    marks: $("marks"), // [marks] the player's conserved marks + settle hint
    settledness: $("settledness"), // [tide] the world's calm readout
    target: $("target"), tCharge: $("t-charge"), tName: $("t-name"), tFill: $("t-fill"),
    log: $("log"), minimap: $("minimap"),
    codex: $("codex"), codexCards: $("codex-cards"),
    forces: $("forces"), // [illocution] the four-glyph speak palette
    powers: $("powers"), // [powers] the four-glyph K₄ power bar
    worth: $("worth"), // [economy] the player's total worth (marks + fiber richness) readout
    inv: $("inventory"), invItems: $("inv-items"), invWorth: $("inv-worth"), // [economy] the inventory panel
    trade: $("trade-prompt"), tradeBody: $("trade-body"), // [economy] the minimal trade prompt
    parley: $("parley"), parleyBody: $("parley-body"), parleyForces: $("parley-forces"), // [dispute] the Parley panel
    claim: $("claim"), claimBody: $("claim-body"), claimForces: $("claim-forces"), // [claims] the Claim Altar panel
  };
  const mm = el.minimap.getContext("2d");
  let logLines = [];
  let targetId = null; // [illocution] the foe currently shown in the target frame (speak target)
  let inv = { items: [], marks: 0, worth: 0 }; // [economy] latest inventory from the server
  let tradePartner = null; // [economy] a player id we have an open trade prompt with, or null
  let parleyOn = false; // [dispute] is a Parley panel currently open?
  const altars = new Map(); // [claims] altar id -> latest claim state from the server
  let claimForce = "assert"; // [claims] the focused force the K key / claim panel stakes
  let nearAltarId = null; // [claims] the altar the claim panel is currently showing (nearest in view)
  const witnessed = new Set(); // bilattice Ways this player has met (the Codex unlocks as you live them)

  function show() { el.hud.hidden = false; }

  // [illocution] buildForces — render the four-glyph speak palette (1=Assert 2=Deny 3=Abstain
  // 4=Contest), each glyph in its bilattice colour. Clicking a glyph calls back with its force key
  // (the keyboard 1–4 path lives in main.mjs); the palette is just the visible, clickable mirror.
  function buildForces(onForce) {
    el.forces.innerHTML = FORCE_ORDER.map((key, i) => {
      const f = FORCES[key];
      const color = glyphColor(f.glyph);
      return `<button class="force" data-force="${key}" title="${escape(f.name)} — ${escape(f.gloss)}">` +
        `<kbd>${i + 1}</kbd><span class="fg" style="color:${color}">${escape(f.glyph)}</span></button>`;
    }).join("");
    for (const b of el.forces.querySelectorAll(".force")) {
      b.addEventListener("click", () => onForce?.(b.dataset.force));
    }
  }

  // [powers] buildPowers — render the four-glyph K₄ power bar (Z=Reflect X=Banish R=Reveal B=Bind),
  // each glyph the gauge mark with its mark cost. Clicking a glyph calls back with its power key
  // (the keyboard Z/X/R/B path lives in main.mjs); update() dims the ones you can't yet afford.
  const POWER_KEYCAP = { reflect: "Z", banish: "X", reveal: "R", bind: "B" };
  function buildPowers(onPower) {
    if (!el.powers) return;
    el.powers.innerHTML = POWER_ORDER.map((key) => {
      const p = POWERS[key];
      return `<button class="power" data-power="${key}" title="${escape(p.name)} — ${escape(p.gloss)}">` +
        `<kbd>${POWER_KEYCAP[key] || ""}</kbd><span class="pg">${escape(p.glyph)}</span>` +
        `<span class="pcost">${p.cost}</span></button>`;
    }).join("");
    for (const b of el.powers.querySelectorAll(".power")) {
      b.addEventListener("click", () => onPower?.(b.dataset.power));
    }
  }

  function line(text, cls = "sys", color = null) {
    logLines.push({ text, cls, color });
    if (logLines.length > 12) logLines.shift();
    el.log.innerHTML = logLines
      .map((l) => `<div class="${l.cls}"${l.color ? ` style="color:${l.color}"` : ""}>${escape(l.text)}</div>`)
      .join("");
  }

  function combat(m, conn) {
    const me = conn.meId;
    const at = name(conn, m.at), tg = name(conn, m.tg);
    if (m.out === "corrupted") return line(`✦ ${tg} rises Corrupted — a contradiction walks!`, "anom");
    if (m.out === "slain") {
      if (m.tg === me) return line(`${at} strikes you down. The Void takes its due.`, "slain");
      if (m.at === me) return line(`You settle ${tg} to f — slain.`, "you");
      return line(`${at} slays ${tg}.`, "slain");
    }
    if (m.out === "hit") {
      if (m.tg === me) return line(`${at} hits you for ${m.dmg}.`, "slain");
      if (m.at === me) return line(`You strike ${tg} for ${m.dmg}.`, "you");
    }
  }

  function chat(from, text) { line(`${from}: ${text}`, from === "Aletheon" ? "sys" : ""); }

  // [illocution] said — a nearby player spoke an illocutionary force. Show a brief line coloured by
  // the force's bilattice glyph, and float a transient glyph badge in that same world-truth colour.
  function said(m) {
    const f = FORCES[m.force];
    const color = glyphColor(m.glyph);
    const verb = f ? f.verb : m.force;
    line(`${m.from} ${verb}s ${m.glyph}`, "said", color);
    floatBadge(m.glyph, color);
  }

  // floatBadge — a single glyph rising and fading at screen centre, in its bilattice colour.
  function floatBadge(glyph, color) {
    const b = document.createElement("div");
    b.className = "force-badge";
    b.textContent = glyph;
    b.style.color = color;
    el.hud.appendChild(b);
    setTimeout(() => b.remove(), 1100);
  }

  // codex — the server tells us, the first time, that this player has WITNESSED a Way (bilattice
  // value). Mark it learned, toast it into the log, and refresh the panel if it happens to be open.
  function codex(glyph) {
    const way = WAYS[glyph];
    if (!way) return;
    const fresh = !witnessed.has(glyph);
    witnessed.add(glyph);
    if (fresh) line(`You witness ${way.name} — ${way.way}`, "codex");
    if (!el.codex.hidden) renderCodex();
  }

  // toggleCodex — show/hide the Codex panel; (re)render the four Ways when it opens.
  function toggleCodex() {
    const open = el.codex.hidden;
    el.codex.hidden = !open;
    if (open) renderCodex();
  }

  // renderCodex — all four Ways as cards in WAY_ORDER. A Way not yet witnessed is shown LOCKED:
  // dimmed, its lore and lesson withheld until you have met it in play.
  function renderCodex() {
    el.codexCards.innerHTML = WAY_ORDER.map((g) => {
      const w = WAYS[g];
      const seen = witnessed.has(g);
      const color = glyphColor(g); // the same palette hue the world paints this value with
      const head =
        `<div class="head"><span class="cx-glyph" style="color:${color}">${escape(w.glyph)}</span>` +
        `<span><div class="cx-name">${escape(w.name)}</div><div class="cx-way">${escape(w.way)}</div></span></div>`;
      const body = seen
        ? `<p class="cx-lore">${escape(w.lore)}</p><p class="cx-lesson">${escape(w.lesson)}</p>`
        : `<p class="cx-locked">— not yet witnessed —</p>`;
      return `<div class="codex-card${seen ? "" : " locked"}">${head}${body}</div>`;
    }).join("");
  }

  // [economy] inventory — the server sent the local player's held items + marks + total worth.
  // Keep it, and refresh the panel if it happens to be open.
  function inventory(payload) {
    inv = payload || { items: [], marks: 0, worth: 0 };
    if (el.inv && !el.inv.hidden) renderInventory();
  }

  // [economy] toggleInventory — show/hide the inventory panel (key I); render its items on open.
  function toggleInventory() {
    if (!el.inv) return;
    const open = el.inv.hidden;
    el.inv.hidden = !open;
    if (open) renderInventory();
  }

  // [economy] renderInventory — list each held item with its name, kind, and its fiber-richness
  // VALUE glyph (a small worth-number in the item's kind colour). Items ARE value-as-richness, so
  // the number beside each is its worth (server/world/richness.mjs); the footer quotes the total.
  function renderInventory() {
    if (!el.invItems) return;
    if (!inv.items.length) {
      el.invItems.innerHTML = `<li class="inv-empty">— you hold nothing yet (slay a creature for loot) —</li>`;
    } else {
      el.invItems.innerHTML = inv.items.map((it) => {
        const color = css(itemColor(it.kind));
        return `<li class="inv-item"><span class="inv-name">${escape(it.name)}</span>` +
          `<span class="inv-kind">${escape(it.kind)}</span>` +
          `<span class="inv-val" style="color:${color}" title="fiber richness — value(item)">◈ ${it.value}</span></li>`;
      }).join("");
    }
    if (el.invWorth) el.invWorth.textContent = `worth: ${inv.worth} (marks ${inv.marks} + items)`;
  }

  // [economy] showTradePrompt — a minimal propose/accept prompt against the current target player.
  // `onTrade(op, partnerId)` sends the action (the offer is, for this minimal UI, "1 mark for a
  // friendly handshake" — propose then accept; the panel is the tasteful entry point, not a full
  // bartering table). Opens against the nearest player target if there is one.
  function showTradePrompt(partnerId, partnerName, onTrade) {
    if (!el.trade || !partnerId) return;
    tradePartner = partnerId;
    el.trade.hidden = false;
    el.tradeBody.innerHTML =
      `<p>Trade with <b>${escape(partnerName || "a wanderer")}</b>?</p>` +
      `<div class="trade-btns">` +
      `<button data-op="propose">Propose (1 mark ⇄ goodwill)</button>` +
      `<button data-op="accept">Accept</button>` +
      `<button data-op="cancel">Close</button></div>`;
    for (const b of el.tradeBody.querySelectorAll("button")) {
      b.addEventListener("click", () => {
        const op = b.dataset.op;
        if (op === "cancel") { closeTrade(); onTrade?.("cancel", partnerId); return; }
        onTrade?.(op, partnerId);
        if (op === "propose") line(`you propose a trade to ${partnerName || "a wanderer"}.`, "sys");
      });
    }
  }
  function closeTrade() { if (el.trade) el.trade.hidden = true; tradePartner = null; }

  // [dispute] buildParley — render the four-glyph FORCE palette INSIDE the Parley panel (the same
  // illocution palette/colours as the speak bar). Clicking a glyph calls back with its force key;
  // the keyboard 1–4 path (while a dispute is live) lives in main.mjs. Built once on start.
  function buildParley(onMove) {
    if (!el.parleyForces) return;
    el.parleyForces.innerHTML = FORCE_ORDER.map((key, i) => {
      const f = FORCES[key];
      return `<button class="force pf-force" data-force="${key}" title="${escape(f.name)} — ${escape(f.gloss)}">` +
        `<kbd>${i + 1}</kbd><span class="fg" style="color:${glyphColor(f.glyph)}">${escape(f.glyph)}</span></button>`;
    }).join("");
    for (const b of el.parleyForces.querySelectorAll(".pf-force")) {
      b.addEventListener("click", () => onMove?.(b.dataset.force));
    }
  }

  // [dispute] dispute — the server sent the live parley state. Open the panel and paint it: the two
  // STANCES as bilattice glyphs (in their world-truth colours), the last outcome, the FLOW meter
  // (the four-glyph histogram), the DEEP-PLAY ⊤-count, and — once ended — who yielded.
  function dispute(m) {
    if (!el.parley) return;
    parleyOn = !m.ended;
    el.parley.hidden = false;
    if (el.parleyForces) el.parleyForces.classList.toggle("await", !m.yourTurn || m.ended);

    const stance = (g, who, turn) =>
      `<div class="pf-stance${turn ? " pf-turn" : ""}"><span class="pf-glyph" style="color:${glyphColor(g)}">${escape(g)}</span>` +
      `<span class="pf-who">${escape(who)}</span></div>`;
    const lastLine = m.last
      ? `<div class="pf-last">${m.last.by === "you" ? "you" : "foe"} ${escape((FORCES[m.last.force]?.verb) || m.last.force)} → ` +
        `<b style="color:${glyphColor(m.last.glyph)}">${escape(m.last.glyph)}</b></div>`
      : `<div class="pf-last">— open with a force —</div>`;

    // the FLOW meter: a tiny bar per glyph, height ~ its count; "in flow" lights when ≥3 kinds show.
    const order = ["t", "f", "⊤", "⊥"];
    const max = Math.max(1, ...order.map((g) => m.flow?.[g] || 0));
    const meter = order.map((g) =>
      `<span class="pf-fl" title="${escape(g)}: ${m.flow?.[g] || 0}">` +
      `<i style="height:${Math.round(((m.flow?.[g] || 0) / max) * 100)}%;background:${glyphColor(g)}"></i>` +
      `<em>${m.flow?.[g] || 0}</em></span>`).join("");

    let foot;
    if (m.ended) {
      foot = m.yielded == null
        ? `<div class="pf-end stalemate">stalemate — both held ⊤. <kbd>P</kbd> to close.</div>`
        : m.yielded === "you"
          ? `<div class="pf-end lost">you yielded (†) — humbled. <kbd>P</kbd> to close.</div>`
          : `<div class="pf-end won">${escape(m.foeName)} yields (†) — pacified! <kbd>P</kbd> to close.</div>`;
    } else {
      foot = `<div class="pf-turnline">${m.yourTurn ? "your move — speak a force (1–4)" : "the foe answers…"}</div>`;
    }

    el.parleyBody.innerHTML =
      `<div class="pf-stances">${stance(m.you, m.youName, m.yourTurn && !m.ended)}` +
      `<span class="pf-vs">⊙</span>${stance(m.foe, m.foeName, false)}</div>` +
      lastLine +
      `<div class="pf-flowrow"><span class="pf-fllabel">flow${m.inFlow ? " <b>active</b>" : ""}</span>` +
      `<div class="pf-meter">${meter}</div>` +
      `<span class="pf-deep" title="deep play — ⊤ moves held">⊤×${m.deepPlay || 0}</span></div>` +
      foot;
  }
  function closeParley() { if (el.parley) el.parley.hidden = true; parleyOn = false; }
  function parleyActive() { return parleyOn; } // [dispute] main.mjs routes 1–4 into the dispute while active

  // [claims] buildClaim — render the four-glyph FORCE palette inside the Claim Altar panel (the same
  // illocution palette/colours as the speak bar). Clicking a glyph FOCUSES that force AND stakes it
  // (the K key stakes the focused force). Built once on start.
  function buildClaim(onStake) {
    if (!el.claimForces) return;
    el.claimForces.innerHTML = FORCE_ORDER.map((key, i) => {
      const f = FORCES[key];
      return `<button class="force cf-force" data-force="${key}" title="${escape(f.name)} — ${escape(f.gloss)}">` +
        `<kbd>${i + 1}</kbd><span class="fg" style="color:${glyphColor(f.glyph)}">${escape(f.glyph)}</span></button>`;
    }).join("");
    for (const b of el.claimForces.querySelectorAll(".cf-force")) {
      b.addEventListener("click", () => { claimForce = b.dataset.force; onStake?.(b.dataset.force); });
    }
  }

  // [claims] altar — the server sent a nearby altar's claim state. Keep it; the panel refreshes from
  // the nearest altar in update(). pos/neg are the evidence counts (the two bars), glyph the settled
  // bilattice mark (t sanctuary / ⊤ eruption / f / ⊥), state the settled face name.
  function altar(m) { altars.set(m.id, m); }

  // [claims] renderClaim — paint the Claim Altar panel for the altar the player stands by: its
  // settled glyph (in bilattice colour), the POSITIVE and NEGATIVE evidence bars, the settled face,
  // and the four forces as stakes (the same palette as the speak bar; the focused force is marked).
  function renderClaim(a) {
    if (!el.claim) return;
    if (!a) { el.claim.hidden = true; nearAltarId = null; return; }
    el.claim.hidden = false;
    nearAltarId = a.id;
    const total = Math.max(1, a.pos + a.neg);
    const FACE = { sanctuary: "Sanctuary (t)", erupt: "Eruption (⊤)", dormant: "dormant (f)", unknown: "unclaimed (⊥)" };
    el.claimBody.innerHTML =
      `<div class="cl-head"><span class="cl-glyph" style="color:${glyphColor(a.glyph)}">${escape(a.glyph)}</span>` +
      `<span class="cl-face">${escape(FACE[a.state] || a.state)}</span></div>` +
      `<div class="cl-bars">` +
      `<div class="cl-barrow"><span class="cl-lbl" style="color:${glyphColor("t")}">assert t</span>` +
      `<span class="cl-bar"><i style="width:${Math.round((a.pos / total) * 100)}%;background:${glyphColor("t")}"></i></span><em>${a.pos}</em></div>` +
      `<div class="cl-barrow"><span class="cl-lbl" style="color:${glyphColor("f")}">deny f</span>` +
      `<span class="cl-bar"><i style="width:${Math.round((a.neg / total) * 100)}%;background:${glyphColor("f")}"></i></span><em>${a.neg}</em></div>` +
      `</div>`;
    if (el.claimForces) {
      for (const b of el.claimForces.querySelectorAll(".cf-force")) {
        b.classList.toggle("cf-focus", b.dataset.force === claimForce);
      }
    }
  }

  // update — vitals, the nearest-foe target frame, and the minimap. Called every rendered frame.
  function update(conn, cam) {
    const me = conn.me();
    if (!me) return;
    setBar(el.charge, el.hpFill, el.hpText, me, true);
    el.meName.textContent = me.name;

    // [marks] the conserved mark count + the settle hint (F raises a Cairn when you have enough).
    if (el.marks) {
      const n = me.marks || 0, ready = n >= MARK.settleCost;
      el.marks.textContent = `marks: ${n}`;
      el.marks.classList.toggle("ready", ready);
      el.marks.title = ready
        ? `F: settle a Cairn (${n}/${MARK.settleCost})`
        : `F: settle a Cairn (${n}/${MARK.settleCost}) — gather more marks`;
      el.marks.setAttribute("data-hint", `F: settle a Cairn (${n}/${MARK.settleCost})`);
    }

    // [tide] the world's settledness (1 − void-tension): the arrow of time, rising toward calm.
    if (el.settledness) {
      const pctCalm = Math.round((conn.settledness?.() ?? 0) * 100);
      el.settledness.textContent = `settledness: ${pctCalm}%`;
    }

    // [economy] the player's total worth (marks + the fiber-richness of held items). Value is not a
    // number stamped on things — it is how richly their fibers compose; this quotes the sum. (I: open.)
    if (el.worth) {
      const worth = conn.inventory?.().worth ?? (me.worth ?? 0);
      el.worth.textContent = `worth: ${worth}`;
      el.worth.setAttribute("data-hint", "I: inventory");
    }

    // [powers] dim each K₄ power you cannot yet afford (its mark cost exceeds your conserved marks).
    if (el.powers) {
      const have = me.marks || 0;
      for (const b of el.powers.querySelectorAll(".power")) {
        b.classList.toggle("unaffordable", (POWERS[b.dataset.power]?.cost || 0) > have);
      }
    }

    // [claims] the Claim Altar panel: show the nearest altar in staking reach (its claim state rides
    // the separate altar message; the altar's POSITION comes from the entity in view). Hidden if none.
    const altarEnt = nearestAltarInReach(conn, me);
    renderClaim(altarEnt ? altars.get(altarEnt.id) : null);

    const foe = nearestFoe(conn, me);
    targetId = foe ? foe.id : null; // [illocution] expose the current target for speak
    if (foe) {
      el.target.hidden = false;
      el.tName.textContent = foe.name;
      el.tCharge.textContent = foe.charge;
      el.tCharge.className = "charge g-" + (CHARGE_CLASS[foe.charge] || "bot");
      el.tCharge.style.color = glyphColor(foe.charge);
      el.tFill.style.width = pct(foe) + "%";
    } else el.target.hidden = true;

    drawMinimap(conn, me, cam);
  }

  function setBar(chargeEl, fill, text, e, withText) {
    chargeEl.textContent = e.charge;
    chargeEl.style.color = glyphColor(e.charge);
    fill.style.width = pct(e) + "%";
    if (withText) text.textContent = `${e.hp} / ${e.maxHp}`;
  }

  function drawMinimap(conn, me, cam) {
    const W = el.minimap.width, H = el.minimap.height, cx = W / 2, cy = H / 2;
    const span = VIEW_RADIUS * 1.4; // world units across half the map
    const scale = (W / 2) / span;
    mm.clearRect(0, 0, W, H);
    // void grade-rings centered on the world origin, drawn relative to the player
    mm.lineWidth = 1;
    for (let g = 0; g <= 5; g++) {
      const rr = ringRadius(g) * scale;
      const ox = cx - me.x * scale, oy = cy - me.z * scale;
      mm.beginPath(); mm.arc(ox, oy, rr, 0, Math.PI * 2);
      mm.strokeStyle = g >= 3 ? "rgba(196,92,255,0.30)" : "rgba(150,150,180,0.18)"; mm.stroke();
    }
    // entities
    for (const e of conn.entities()) {
      const dx = (e.x - me.x) * scale, dz = (e.z - me.z) * scale;
      if (Math.hypot(dx, dz) > W / 2 - 3) continue;
      mm.fillStyle = e.id === me.id ? "#ffe08a" : glyphColor(e.charge, e.kind);
      mm.beginPath(); mm.arc(cx + dx, cy + dz, e.id === me.id ? 3.5 : 2.4, 0, Math.PI * 2); mm.fill();
    }
    // facing wedge
    mm.strokeStyle = "#ffe08a"; mm.beginPath(); mm.moveTo(cx, cy);
    mm.lineTo(cx + Math.sin(cam.yaw) * 9, cy + Math.cos(cam.yaw) * 9); mm.stroke();
  }

  return {
    show, update, combat, chat, line, codex, toggleCodex, said, buildForces, buildPowers,
    inventory, toggleInventory, showTradePrompt, closeTrade, // [economy]
    buildParley, dispute, closeParley, parleyActive, // [dispute] the Parley panel + force palette
    buildClaim, altar, // [claims] the Claim Altar panel + its force palette
    claimForce: () => claimForce, // [claims] the focused force the K key stakes
    altarTarget: () => nearAltarId, // [claims] the altar the claim panel is currently showing
    target: () => targetId,
    tradePartner: () => tradePartner, // [economy] the player the trade prompt is currently against
  };
}

function nearestFoe(conn, me) {
  let best = null, bd = VIEW_RADIUS * VIEW_RADIUS;
  for (const e of conn.entities()) {
    const foe = e.kind === KIND.brigand || e.kind === KIND.anomaly || e.charge === "⊤";
    if (!foe || e.charge === "f") continue;
    const d = (e.x - me.x) ** 2 + (e.z - me.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// [claims] nearestAltarInReach — the nearest KIND.altar entity within staking reach of the player,
// or null. The panel only shows when you stand by an altar (the same 8-unit reach the server uses).
function nearestAltarInReach(conn, me) {
  let best = null, bd = 8 * 8;
  for (const e of conn.entities()) {
    if (e.kind !== KIND.altar) continue;
    const d = (e.x - me.x) ** 2 + (e.z - me.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

const pct = (e) => Math.max(0, Math.min(100, (e.hp / Math.max(1, e.maxHp)) * 100));
const name = (conn, id) => { if (!id) return "something"; const e = conn.entities().find((x) => x.id === id); return e ? e.name : "something"; };
const glyphColor = (charge, kind) => css(entityColor(kind, charge));
const escape = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
