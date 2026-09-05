// main — the browser game loop: fixed 60Hz simulation ticks (matching movement.mts's own TICK_HZ,
// the same discretization every determinism/replay test in this repo is built on) driven off
// requestAnimationFrame's real timestamp via an accumulator, each tick calling the SAME
// `applyIntent(state, intent)` the cartridge replay contract calls — the browser is not a special
// code path, it is one more caller of the deterministic core.

import { createEngine, applyIntent, levelFor } from "/src/cartridge.mts";
import { valueOf as lootValueOf } from "/src/economy.mts";
import { camera, render } from "@red-cup-engineering/abrash/raycaster";
import { worldFromRows, grid as abrashGrid } from "@red-cup-engineering/abrash/world";
import { dailySeed } from "@red-cup-engineering/cartridge/seed";
import { renderFrame } from "./render.mjs";
import { createInput, loadKeymap, saveKeymap, resetKeymap } from "./input.mjs";
import { ACTIONS, validateKeymap } from "/src/keymap.mts";

// buildGrid — the ONE place this browser face touches abrash's own world/grid construction. Reuses
// abrash's real `worldFromRows`/`grid`, never reimplemented; memoized per (seed,tier) by main()'s own
// gridCache below, exactly like cartridge.mts's own staticGridFor — never rebuilt per frame.
function buildGrid(level) {
  return abrashGrid(worldFromRows(level.rows));
}

const TICK_HZ = 60;
const TICK_MS = 1000 / TICK_HZ;
const MAX_CATCHUP_TICKS = 8; // a stalled tab shouldn't try to replay minutes of ticks on refocus

const BESTIARY_TEXT = {
  unwitnessed: "THE UNWITNESSED — moves only when unobserved. Watch it and it holds still; look away and it closes distance.",
  hum: "THE HUM — hears through walls. Sprinting and firing are loud; crouching is silent. Once it commits, it beelines to where it last heard you, not to you.",
  warden: "THE WARDEN — territorial. Hostile only inside its ground; leaves you alone the moment you clear it (with a short margin).",
  toll: "THE TOLL — passive until its guarded prize is taken. Then: unconditional, no losing it by hiding — only a long clean break, or extraction, ends it.",
};

function qs(id) {
  return document.getElementById(id);
}

function resolveSeed() {
  const url = new URL(window.location.href);
  const explicit = url.searchParams.get("seed");
  if (explicit) return explicit;
  return dailySeed("be-not-so-fearful", new Date());
}

function main() {
  const canvas = qs("frame");
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");

  const seed = resolveSeed();
  qs("seed-display").textContent = `seed: ${seed}`;
  let state = createEngine(seed, "default");

  const input = createInput(canvas, { keymap: loadKeymap() });
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const amenities = {
    fov: 75,
    sensitivity: 0.35,
    reducedFlash: false,
    reducedMotion: prefersReducedMotion,
  };
  input.setSensitivity(amenities.sensitivity);

  const revealed = new Set();
  const runLogEntries = [];
  let priorInteract = false;
  let phase = 0;

  function pushRunLog(text) {
    runLogEntries.unshift(`[${(state.tick / TICK_HZ).toFixed(1)}s] ${text}`);
    if (runLogEntries.length > 12) runLogEntries.length = 12;
    qs("run-log").innerHTML = runLogEntries.map((e) => `<div class="entry">${e}</div>`).join("");
  }

  function showMessage(text, ms = 2200) {
    const el = qs("message-banner");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(showMessage._t);
    showMessage._t = setTimeout(() => { el.hidden = true; }, ms);
  }

  function updateBestiary() {
    const level = levelFor(state.seed, state.tier);
    for (const slot of level.anomalySlots) {
      if (revealed.has(slot.kind)) continue;
      const dist = Math.hypot(slot.x - state.player.x, slot.z - state.player.z);
      if (dist <= 9) {
        revealed.add(slot.kind);
        pushRunLog(`bestiary: ${slot.kind} entry unlocked`);
      }
    }
    qs("bestiary").innerHTML = [...revealed]
      .map((kind) => `<div class="entry">${BESTIARY_TEXT[kind]}</div>`)
      .join("") || '<div class="entry">nothing learned yet — proximity reveals a bestiary entry</div>';
  }

  function updateHud() {
    qs("hud-tier").textContent = String(state.tier);
    qs("hud-carrying").textContent = String(state.economy.carrying.length);
    const score = state.economy.carrying.reduce((s, i) => s + lootValueOf(i), 0);
    qs("hud-score").textContent = String(score);
    const totalSeconds = Math.floor(state.tick / TICK_HZ);
    qs("hud-time").textContent = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function handleEvents(events) {
    for (const ev of events) {
      if (ev.kind === "died") { showMessage(`YOU DIED — ${ev.cause}. Nothing unbanked survives.`, 5000); pushRunLog(`died: ${ev.cause}`); }
      else if (ev.kind === "extracted") { showMessage(`EXTRACTED — run over, banked.`, 5000); pushRunLog(`extracted at tier ${ev.tier}`); }
      else if (ev.kind === "picked-up") pushRunLog(`picked up ${ev.rarity} loot`);
      else if (ev.kind === "pickup-failed" && ev.reason !== "too-far") pushRunLog(`pickup failed: ${ev.reason}`);
      else if (ev.kind === "toll-triggered") { showMessage("something now knows you took that.", 3000); pushRunLog("The Toll: triggered"); }
      else if (ev.kind === "descended") { showMessage(`Descending to tier ${ev.tier}...`, 2000); pushRunLog(`descended to tier ${ev.tier}`); }
      else if (ev.kind === "extract-failed" && ev.reason !== "not-at-beacon") pushRunLog(`extract failed: ${ev.reason}`);
      else if (ev.kind === "transition-failed" && ev.reason === "no-deeper-tier") pushRunLog("no deeper tier from here");
    }
  }

  function step() {
    const rawIntent = input.intent();
    const interactEdge = rawIntent.interact && !priorInteract;
    priorInteract = rawIntent.interact;

    const tickResult = applyIntent(state, {
      kind: "tick",
      forward: rawIntent.forward,
      strafe: rawIntent.strafe,
      turn: rawIntent.turn,
      jump: rawIntent.jump,
      fire: rawIntent.fire,
      altFire: rawIntent.altFire,
      sprint: rawIntent.sprint,
      crouch: rawIntent.crouch,
    });
    state = tickResult.state;
    handleEvents(tickResult.events);

    if (interactEdge && !state.economy.ended) {
      const level = levelFor(state.seed, state.tier);
      const near = (p) => Math.hypot(p.x - state.player.x, p.z - state.player.z) <= 1.4;
      const loot = level.lootSlots.find((s) => near(s) && !state.economy.carrying.some((i) => i.id === s.id) && !state.economy.banked.some((i) => i.id === s.id));
      const atBeacon = level.extractionBeacons.some(near);
      const atTransition = level.transition && near(level.transition);
      let r;
      if (loot) r = applyIntent(state, { kind: "pickup", lootId: loot.id });
      else if (atBeacon) r = applyIntent(state, { kind: "extract" });
      else if (atTransition) r = applyIntent(state, { kind: "transition" });
      if (r) {
        state = r.state;
        handleEvents(r.events);
      }
    }
  }

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    let dt = now - last;
    last = now;
    if (dt > 250) dt = 250; // a stalled/backgrounded tab shouldn't dump a huge catch-up burst
    accumulator += dt;
    let ticks = 0;
    while (accumulator >= TICK_MS && ticks < MAX_CATCHUP_TICKS) {
      step();
      accumulator -= TICK_MS;
      ticks++;
      phase++;
    }

    const level = levelFor(state.seed, state.tier);
    const cam = camera({
      x: state.player.x, z: state.player.z, angle: state.player.angle,
      fov: (amenities.fov * Math.PI) / 180, width: canvas.width, height: canvas.height, maxDist: 32,
    });
    const frameResult = render(gridBuiltFor(level), cam, { phase });
    renderFrame(ctx, canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height, frameResult.fb, {
      zHeight: state.player.zHeight,
      reducedMotion: amenities.reducedMotion,
      reducedFlash: amenities.reducedFlash,
    });

    updateHud();
    updateBestiary();
    qs("pointer-lock-prompt").classList.toggle("hidden", input.isLocked());

    requestAnimationFrame(frame);
  }

  // gridBuiltFor — memoized per (seed,tier) exactly like cartridge.mts's own staticGridFor, but built
  // browser-side from the same real, unmodified `worldFromRows`/`grid` abrash exports (import cost is
  // trivial to duplicate once per tier change; NOT rebuilt per frame).
  const gridCache = new Map();
  function gridBuiltFor(level) {
    const key = `${level.seed}:${level.tier}`;
    let g = gridCache.get(key);
    if (!g) {
      g = buildGrid(level);
      gridCache.set(key, g);
    }
    return g;
  }

  requestAnimationFrame(frame);

  // ── amenities wiring ──────────────────────────────────────────────────────────────────────────
  qs("settings-toggle").addEventListener("click", () => {
    const panel = qs("settings-panel");
    panel.hidden = !panel.hidden;
  });
  qs("opt-fov").addEventListener("input", (e) => {
    amenities.fov = Number(e.target.value);
    qs("opt-fov-value").textContent = String(amenities.fov);
  });
  qs("opt-sens").addEventListener("input", (e) => {
    amenities.sensitivity = Number(e.target.value);
    qs("opt-sens-value").textContent = amenities.sensitivity.toFixed(2);
    input.setSensitivity(amenities.sensitivity);
  });
  qs("opt-reduced-flash").addEventListener("change", (e) => { amenities.reducedFlash = e.target.checked; });
  qs("opt-reduced-motion").addEventListener("change", (e) => { amenities.reducedMotion = e.target.checked; });
  qs("opt-reduced-motion").checked = prefersReducedMotion;
  amenities.reducedMotion = prefersReducedMotion;
  qs("keymap-reset").addEventListener("click", () => {
    const fresh = resetKeymap();
    input.setKeymap(fresh);
    renderKeymapList();
    showMessage("keybinds reset to default");
  });

  // ── remap-by-click: click an action's button, press any key, it rebinds — validated through the
  // SAME keymap.mts#validateKeymap the CI-checked completeness test runs, never a separate ad hoc
  // browser-only check. A clash (the new key already bound elsewhere) is refused with a message
  // rather than silently shadowing another action.
  function renderKeymapList() {
    const map = input.getKeymap();
    qs("keymap-list").innerHTML = ACTIONS.map((action) => `<button type="button" data-action="${action}">${action}: ${map[action]}</button>`).join("");
  }
  let listeningFor = null;
  qs("keymap-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    if (listeningFor) return; // already mid-rebind
    listeningFor = btn.dataset.action;
    btn.classList.add("listening");
    btn.textContent = `${listeningFor}: press any key…`;
  });
  function captureRebindKey(code) {
    if (!listeningFor) return false;
    const map = { ...input.getKeymap(), [listeningFor]: code };
    const result = validateKeymap(map);
    if (!result.valid) {
      showMessage(`can't bind "${code}" — ${result.errors[0]}`);
    } else {
      input.setKeymap(map);
      saveKeymap(map);
    }
    listeningFor = null;
    renderKeymapList();
    return true;
  }
  window.addEventListener("keydown", (e) => {
    if (listeningFor) { e.preventDefault(); e.stopPropagation(); captureRebindKey(e.code); }
  }, { capture: true });
  canvas.addEventListener("mousedown", (e) => {
    if (listeningFor) { e.preventDefault(); e.stopPropagation(); captureRebindKey({ 0: "Mouse0", 1: "Mouse1", 2: "Mouse2" }[e.button] ?? "Mouse0"); }
  }, { capture: true });
  renderKeymapList();

  canvas.addEventListener("click", () => input.requestLock());
}

main();
