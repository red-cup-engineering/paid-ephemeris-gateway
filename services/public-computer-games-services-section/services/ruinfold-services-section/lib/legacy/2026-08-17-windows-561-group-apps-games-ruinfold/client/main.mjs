// main — the client orchestrator. It owns the three.js renderer/scene/camera, the SSE connection,
// core input, and the frame loop; everything else is a MODULE that gets a shared `ctx` and renders
// one surface (world, entities, hud, actionbar, panels, chat, audio). Modules never parse the
// network — they subscribe to the state store's semantic events. The server owns truth; the client
// owns sight, sound, and feel.

import * as THREE from "three";
import { createState } from "./state.mjs";
import * as audio from "./audio.mjs";
import * as world from "./world.mjs";
import * as entities from "./entities.mjs";
import * as hud from "./hud.mjs";
import * as actionbar from "./actionbar.mjs";
import * as panels from "./panels.mjs";
import * as chat from "./chat.mjs";

// --- identity ----------------------------------------------------------------------------------
const ME = localStorage.getItem("ruinfold-actor") || `wanderer-${Math.random().toString(36).slice(2, 8)}`;
localStorage.setItem("ruinfold-actor", ME);

async function send(intent) {
  try {
    await fetch("/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...intent, actor: ME }) });
  } catch { /* dropped POST — the world catches up next tick */ }
}

// --- three.js core -----------------------------------------------------------------------------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// --- state + ctx -------------------------------------------------------------------------------
const state = createState(ME);
const dom = {
  mount(id) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("div"); el.id = id; el.className = "mount"; document.getElementById("ui").appendChild(el); }
    return el;
  },
};
const ctx = { THREE, scene, camera, renderer, state, send, ME, dom, on: state.on, emit: state.emit };

// --- modules -----------------------------------------------------------------------------------
const MODULES = [audio, world, entities, hud, actionbar, panels, chat];
const frames = [];
for (const m of MODULES) {
  try {
    m.init?.(ctx);
    if (m.frame) frames.push(m.frame);
  } catch (e) {
    console.error("[main] module init failed:", e);
  }
}

// --- SSE ---------------------------------------------------------------------------------------
function connect() {
  const es = new EventSource("/events");
  es.onmessage = (m) => { try { state.apply(JSON.parse(m.data)); } catch { /* skip bad frame */ } };
  es.onerror = () => { /* EventSource auto-reconnects */ };
}

// --- core input (movement / abilities / targeting / interaction) -------------------------------
const KEYDIR = { w: "n", s: "s", a: "w", d: "e", ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e" };
const ABILITIES = ["heavy", "cleave", "bolt", "second-wind"];

function typing() { const el = document.activeElement; return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA"); }
const isFoe = (s) => s && s.kind === "monster" && s.zone === state.currentZone() && s.aliveGlyph !== "f" && s.aliveGlyph !== "⊥" && s.status !== "slain" && s.status !== "vanished";
function nearest(pred, range = 999) {
  const me = state.me(); if (!me) return null;
  let best = null, bestD = range * range;
  for (const s of state.inZone()) {
    if (s.id === ME || !pred(s)) continue;
    const d = (s.x - me.x) ** 2 + (s.z - me.z) ** 2;
    if (d <= bestD) { bestD = d; best = s; }
  }
  return best;
}
function useAbility(name) {
  const t = name === "second-wind" ? null : state.target() ?? nearest(isFoe, 16)?.id ?? null;
  send({ kind: "ability", ability: name, target: t });
  ctx.emit("fx-cast", { id: ME, ability: name });
}
function cycleTarget() {
  const foes = state.inZone().filter(isFoe);
  if (!foes.length) return state.setTarget(null);
  const i = foes.findIndex((f) => f.id === state.target());
  state.setTarget(foes[(i + 1) % foes.length].id);
}

addEventListener("keydown", (e) => {
  if (typing()) return;
  const me = state.me();
  if (e.key === "Enter") return ctx.emit("focus-chat");
  if (e.key === "Escape") return ctx.emit("close-panels");
  if (KEYDIR[e.key]) { send({ kind: "move", dir: KEYDIR[e.key] }); e.preventDefault(); return; }
  if (e.key >= "1" && e.key <= "4") return useAbility(ABILITIES[Number(e.key) - 1]);
  if (e.key === "Tab") { e.preventDefault(); return cycleTarget(); }
  if (e.key === "i" || e.key === "I") return ctx.emit("toggle-panel", "inventory");
  if (e.key === "c" || e.key === "C") return ctx.emit("toggle-panel", "character");
  if (e.key === "g" || e.key === "G") { const it = nearest((s) => s.kind === "item", 5); if (it) { send({ kind: "pickup", item: it.id }); ctx.emit("toast", `grab ${it.name}`); } return; }
  if (e.key === "f" || e.key === "F") { const npc = nearest((s) => s.kind === "npc", 6); if (npc) ctx.emit("interact-npc", { id: npc.id }); return; }
  if (e.key === "e" || e.key === "E") { const z = state.zone(state.currentZone()); const dir = z?.exits && Object.keys(z.exits)[0]; if (dir) { send({ kind: "portal", dir }); ctx.emit("toast", `go ${dir}`); } return; }
  if (e.key === "r" || e.key === "R") { if (me && me.status === "ghost") send({ kind: "respawn" }); return; }
});

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener("pointerdown", (e) => {
  ndc.x = (e.clientX / innerWidth) * 2 - 1;
  ndc.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  // entity pick: any mesh tagged with userData.entityId (set by the entities module)
  const hit = ray.intersectObjects(scene.children, true).find((h) => entityIdOf(h.object));
  if (hit) {
    const id = entityIdOf(hit.object);
    const s = state.get(id);
    if (s && isFoe(s)) { state.setTarget(id); send({ kind: "attack", target: id }); ctx.emit("fx-swing", { id: ME }); return; }
    if (s && s.kind === "npc") { ctx.emit("interact-npc", { id }); return; }
    if (s && s.kind === "item") { send({ kind: "pickup", item: id }); return; }
  }
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, p)) send({ kind: "move", x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 });
});
function entityIdOf(obj) {
  let o = obj;
  while (o) { if (o.userData && o.userData.entityId) return o.userData.entityId; o = o.parent; }
  return null;
}

// --- camera (smooth follow + hit shake) --------------------------------------------------------
const CAM_OFFSET = new THREE.Vector3(0, 25, 27);
let shake = 0;
state.on("damage", ({ id }) => { if (id === ME) shake = Math.min(1, shake + 0.6); });
state.on("died", ({ id }) => { if (id === ME) shake = 1; });
const focus = new THREE.Vector3(0, 0, 0);

// --- death overlay -----------------------------------------------------------------------------
document.getElementById("respawn-btn").addEventListener("click", () => send({ kind: "respawn" }));
state.on("me", ({ snap }) => {
  const dead = snap.status === "ghost";
  document.getElementById("death").style.display = dead ? "flex" : "none";
  if (dead) document.getElementById("death-text").textContent = "Your body lies where you fell. Walk your ghost to a pale shrine to return — or enter the light.";
});

// --- frame loop --------------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const k = 1 - Math.pow(0.001, dt);

  const me = state.me();
  if (me) focus.lerp(new THREE.Vector3(me.x, 0, me.z), k);
  const want = focus.clone().add(CAM_OFFSET);
  if (shake > 0) { want.x += (Math.random() - 0.5) * shake * 2.2; want.y += (Math.random() - 0.5) * shake * 1.4; shake = Math.max(0, shake - dt * 2.5); }
  camera.position.lerp(want, k);
  camera.lookAt(focus.x, 1.2, focus.z);

  for (const f of frames) { try { f(dt, now); } catch (e) { console.error("[main] frame", e); } }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// --- go ----------------------------------------------------------------------------------------
send({ kind: "join" });
connect();
requestAnimationFrame(frame);
ctx.emit("toast", "you step through the gate…");
