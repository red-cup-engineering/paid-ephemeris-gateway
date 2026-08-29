// main — boot the client: build the renderer + camera, gate on a name, open the connection, and
// run the frame loop (interpolate → follow → send intent → draw → HUD). All input is intent: WASD
// and the look-yaw go to the server, which is authoritative. No game logic lives here.

import { makeRenderer } from "./gl/renderer.mjs";
import { makeView2D } from "./view2d.mjs";
import { makeCamera, cameraMouse, cameraZoom, cameraFollow } from "./gl/camera.mjs";
import { connect } from "./net/connection.mjs";
import { createHud } from "./ui/hud.mjs";
import { ORDER as FORCE_ORDER } from "../shared/illocution.mjs"; // [illocution] 1=Assert 2=Deny 3=Abstain 4=Contest
import { POWERS } from "../shared/powers.mjs"; // [powers] the K₄ gauge as player powers (Z X R B)

// [powers] keybind → power key (Z=Reflect X=Banish R=Reveal B=Bind — keys not taken by other systems)
const POWER_KEYS = { KeyZ: "reflect", KeyX: "banish", KeyR: "reveal", KeyB: "bind" };

const canvas = document.getElementById("view");
const gate = document.getElementById("gate");
const gateStatus = document.getElementById("gate-status");

// renderer selection: WebGL2 by default, a top-down Canvas2D fallback otherwise. The fallback is
// also reachable on demand (press V), so the game is playable with or without a GPU.
let renderer = null, use2d = false;
function buildRenderer() {
  if (!use2d) {
    try { return makeRenderer(canvas); }
    catch (e) { use2d = true; gateStatus.textContent = `WebGL2 unavailable — using the 2D fallback. (${e.message})`; }
  }
  return makeView2D(canvas);
}
renderer = buildRenderer();
function toggleRenderer() {
  use2d = !use2d;
  renderer = buildRenderer();
  hud.line(`view → ${renderer.is2D ? "2D fallback (top-down)" : "WebGL2 (3D)"}`, "sys");
}

const cam = makeCamera();
const hud = createHud();
const keys = new Set();
let conn = null, attackHeld = false, chatOpen = false, lastSent = 0;

// ---- start gate ------------------------------------------------------------------------------
document.getElementById("gate-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!renderer) return;
  const name = (document.getElementById("name-input").value || "wanderer").trim().slice(0, 24) || "wanderer";
  start(name);
});

function start(name) {
  gate.classList.add("hidden");
  hud.show();
  conn = connect({
    name,
    onChat: (from, line) => hud.chat(from, line),
    onCombat: (m) => hud.combat(m, conn),
    onCodex: (glyph) => hud.codex(glyph),
    onSaid: (m) => hud.said(m), // [illocution] a nearby player spoke a force
    onInventory: (inv) => hud.inventory(inv), // [economy] held items + marks + worth
    onDispute: (m) => hud.dispute(m), // [dispute] the live parley state (stances/flow/yielded)
    onAltar: (m) => hud.altar(m), // [claims] a nearby CLAIM ALTAR's claim state (glyph, pos/neg, face)
    onState: (s) => { if (s === "disconnected") hud.line("the connection to Aletheon was lost.", "slain"); },
  });
  hud.buildForces((force) => conn.speak(force, hud.target())); // [illocution] clickable speak palette
  hud.buildPowers((key) => conn.power(key, hud.target())); // [powers] clickable K₄ power bar
  hud.buildParley((force) => conn.move(force)); // [dispute] clickable parley force palette → play a move
  hud.buildClaim((force) => conn.claim(force, hud.altarTarget())); // [claims] clickable claim force palette → stake
  bindInput();
  hud.line(`view: ${renderer.is2D ? "2D fallback (top-down)" : "WebGL2 (3D)"} — press V to switch`, "sys");
  requestAnimationFrame(loop);
}

// ---- input -----------------------------------------------------------------------------------
function bindInput() {
  addEventListener("keydown", (e) => {
    if (e.key === "Enter") { toggleChat(); return; }
    if (chatOpen) return;
    if (e.code === "KeyV") { toggleRenderer(); return; }
    if (e.code === "KeyC") { hud.toggleCodex(); return; }
    if (e.code === "KeyI") { hud.toggleInventory(); return; } // [economy] open the inventory panel
    if (e.code === "KeyT") { openTrade(); return; } // [economy] propose a trade to the nearest player
    if (e.code === "KeyF") { conn?.settle(); return; } // [marks] spend marks to raise a Cairn
    if (e.code === "KeyP") { openParley(); return; } // [dispute] open a parley with the nearest hostile NPC
    if (e.code === "KeyK") { stakeClaim(); return; } // [claims] stake the focused force at the nearest altar
    // [powers] Z/X/R/B spend marks to use a K₄ gauge power on the current target (or the area).
    if (POWER_KEYS[e.code]) { conn?.power(POWER_KEYS[e.code], hud.target()); return; }
    // [illocution] keys 1–4 speak an illocutionary force — OR, while a parley is live, PLAY that
    // force into the dispute (the same four forces are the parley's moves; agon reuses the palette).
    if (e.code >= "Digit1" && e.code <= "Digit4") {
      const force = FORCE_ORDER[e.code.charCodeAt(5) - 49]; // Digit1 -> 0 .. Digit4 -> 3
      if (force && conn) { if (hud.parleyActive()) conn.move(force); else conn.speak(force, hud.target()); }
      return;
    }
    if (e.code === "Space") attackHeld = true;
    keys.add(e.code);
  });
  addEventListener("keyup", (e) => { if (e.code === "Space") attackHeld = false; keys.delete(e.code); });

  canvas.addEventListener("mousedown", (e) => {
    if (chatOpen) return;
    if (document.pointerLockElement !== canvas) { canvas.requestPointerLock(); return; }
    if (e.button === 0) attackHeld = true;
  });
  addEventListener("mouseup", (e) => { if (e.button === 0) attackHeld = false; });
  addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) cameraMouse(cam, e.movementX, e.movementY);
  });
  canvas.addEventListener("wheel", (e) => { cameraZoom(cam, e.deltaY); e.preventDefault(); }, { passive: false });

  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  chatForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = chatInput.value.trim();
    if (text) conn.sendChat(text);
    chatInput.value = ""; closeChat();
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && chatOpen) closeChat(); });
}

function toggleChat() {
  const form = document.getElementById("chat-form");
  chatOpen = !chatOpen;
  form.classList.toggle("open", chatOpen);
  if (chatOpen) { keys.clear(); document.getElementById("chat-input").focus(); if (document.pointerLockElement) document.exitPointerLock(); }
}
function closeChat() { chatOpen = false; document.getElementById("chat-form").classList.remove("open"); }

// ---- frame loop ------------------------------------------------------------------------------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const aspect = renderer.resize();
  conn.interpolate(dt);

  const me = conn.me();
  if (me) {
    cameraFollow(cam, me.x, me.y, me.z, aspect, dt);
    sendIntent(now);
  }
  renderer.render(cam, conn.entities(), conn.meId, now / 1000, conn.field()); // [field] 2D view paints it
  if (me) hud.update(conn, cam);
  requestAnimationFrame(loop);
}

function sendIntent(now) {
  if (now - lastSent < 33) return; // ~30 Hz intent rate; the server ticks at 15 Hz
  lastSent = now;
  let f = 0, s = 0;
  if (!chatOpen) {
    if (keys.has("KeyW")) f += 1;
    if (keys.has("KeyS")) f -= 1;
    if (keys.has("KeyD")) s += 1;
    if (keys.has("KeyA")) s -= 1;
  }
  conn.sendInput(f, s, cam.yaw, attackHeld ? 1 : 0);
}

// [dispute] openParley — find the nearest HOSTILE NPC (brigand / ⊤ anomaly) and open a ludics
// dispute (a parley) against it — the NON-LETHAL win path: out-argue a foe until it YIELDS and is
// pacified. The server seeds both stances; the panel (P toggles it closed) shows the contest.
function openParley() {
  const me = conn?.me();
  if (!me) return;
  if (hud.parleyActive()) { hud.closeParley(); return; } // P again closes an open parley panel
  let best = null, bd = Infinity;
  for (const e of conn.entities()) {
    if (e.id === me.id) continue;
    const hostile = e.kind === "brigand" || e.kind === "anomaly" || e.charge === "⊤";
    if (!hostile || e.charge === "f") continue;
    const d = (e.x - me.x) ** 2 + (e.z - me.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) { hud.line("no hostile foe is near enough to parley with.", "sys"); return; }
  conn.parley(best.id);
}

// [claims] stakeClaim — STAKE the claim panel's FOCUSED force at the nearest CLAIM ALTAR. The altar
// must be near (the server enforces reach too); the four-glyph claim palette (or 1–4 if no parley is
// open) sets the focused force. ASSERT/DENY/CONTEST spend marks into the altar; ABSTAIN retracts.
function stakeClaim() {
  const me = conn?.me();
  if (!me) return;
  const altar = nearestAltarEntity(me);
  if (!altar) { hud.line("no altar is near enough to stake a claim at.", "sys"); return; }
  conn.claim(hud.claimForce(), altar.id);
}

// nearestAltarEntity — the nearest KIND.altar entity within staking reach (the entity carries the
// position; the claim state rides the separate altar message the HUD panel reads).
function nearestAltarEntity(me) {
  let best = null, bd = 8 * 8; // STAKE_RANGE in claims.mjs
  for (const e of conn.entities()) {
    if (e.kind !== "altar") continue;
    const d = (e.x - me.x) ** 2 + (e.z - me.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// [economy] openTrade — find the nearest OTHER player and open a minimal trade prompt against them.
// The prompt's buttons send propose/accept/cancel; the offer is a small goodwill swap (1 mark),
// the tasteful entry point to fiber exchange (the full propose⇄ask payload rides the same protocol).
function openTrade() {
  const me = conn?.me();
  if (!me) return;
  let best = null, bd = Infinity;
  for (const e of conn.entities()) {
    if (e.id === me.id || e.kind !== "player") continue;
    const d = (e.x - me.x) ** 2 + (e.z - me.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) { hud.line("no other wanderer is near enough to trade with.", "sys"); return; }
  hud.showTradePrompt(best.id, best.name, (op, partnerId) => {
    if (op === "propose") conn.trade("propose", partnerId, { marks: 1, items: [] }, { marks: 0, items: [] });
    else if (op === "accept") conn.trade("accept", partnerId);
    else if (op === "cancel") conn.trade("cancel", partnerId);
  });
}
