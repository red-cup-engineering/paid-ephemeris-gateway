// main — the browser face's composition root: the ONE module that touches the DOM, `document`, and
// `requestAnimationFrame`. Everything it calls (game(), spawnDemon(), tick(), status()) is pure — this
// is the thin imperative shell the house rule asks for, and `requestAnimationFrame` is the one
// legitimate timing boundary the render loop gets (durante's own engine.mjs/game.mjs `run()` drivers,
// by contrast, are kept for a headless/test driver and are NOT used here).
//
// Everything this module imports from "@red-cup-engineering/abrash/..." resolves through the browser
// import map in index.html, which points those bare specifiers at /vendor/abrash/<name> — the exact
// installed npm package's own src/*.mjs files, served as-is by server.mjs (see that file's header).
// Everything imported via a relative "../src/*.mjs" path is durante's OWN pure game logic, served
// directly from this app's src/ directory — no bundler, no build step, anywhere in this app.

import { worldFromRows } from "@red-cup-engineering/abrash/world";
import { game, spawnDemon, tick, status } from "../src/game.mjs";
import { VITAL } from "../src/demon.mjs";
import { BLOOD_MERGE_ROWS } from "../src/seed-rows.mjs";
import { createInput, paintFrame } from "./canvas-screen.mjs";
import { createDailyEngine } from "../src/cartridge.mjs";
import { recordMove, encodeRun } from "../src/run-recorder.mjs";
import { DAILY_TICK_CAP } from "../src/score.mjs";

// the internal render resolution — a deliberately low-res software-raycaster raster (matching the
// legacy terminal demo's own small pixel sizes, e.g. 168x96/180x96), scaled UP by CSS to fill the
// canvas element crisply-pixelated rather than blurred. Keeps the pure JS raycaster's per-frame column
// count (and therefore its per-frame cost) small regardless of the visitor's display size.
const RENDER_WIDTH = 240;
const RENDER_HEIGHT = 150;

// AMMO_START — a BROWSER-FACE-ONLY display mechanic, not part of the ported deterministic core. The
// legacy engine's hitscan weapon has no ammo model at all (grepped: nothing in combat.mjs/game.mjs
// tracks a bullet count) — see DESIGN.md's "ammo is a browser-face HUD addition" section for why this
// is implemented here, client-side, rather than invented inside the pure game/combat modules.
const AMMO_START = 40;

function loadGame() {
  const world = worldFromRows(BLOOD_MERGE_ROWS);
  let state = game({
    world,
    player: { x: 7.5, z: 2.5, angle: Math.PI / 2 },
    demons: [{ id: 0 }, { id: 1 }],
    cam: { fov: Math.PI / 3, maxDist: 24 },
  });
  // BLOOD_MERGE_ROWS already carries both demons' spawn rows (alive/at/toughness/speed) — spawnDemon()
  // is not called again here (that would double-admit, harmlessly deduped, but the demons list above
  // already names both ids, matching the legacy bin's own newGame(), which never called spawnDemon()
  // either — see the legacy durante/scripts/durante.mjs's own comment on this).
  return state;
}

function vitalLabel(vital) {
  if (vital === VITAL.ALIVE) return "hunting";
  if (vital === VITAL.WOUNDED) return "WOUNDED ⊤";
  if (vital === VITAL.DEAD) return "dead";
  return "—";
}

// ── the daily tournament entry point (spec §5c: "daily QUAKE tournaments that AI play when their
// owners aren't looking") — play TODAY'S seeded arena instead of the fixed blood-merge one, record the
// house intent log alongside every tick (recordMove, orthogonal to rendering — see run-recorder.mjs's
// header), and submit through the SAME public POST /runs route the reference entrant (agents/
// reference-entrant.mjs) uses. If GET /daily is unreachable (offline demo, dev without `npm start`
// serving the daily routes) this degrades to the ORIGINAL fixed-arena mode untouched — minimal surface
// change: the existing single-player proof of concept still works exactly as it always did.

const ACTOR_KEY = "durante-actor-id";
function getOrCreateActorId() {
  try {
    let id = window.localStorage.getItem(ACTOR_KEY);
    if (!id) {
      id = `human-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(ACTOR_KEY, id);
    }
    return id;
  } catch {
    return `human-${Math.random().toString(36).slice(2, 10)}`; // localStorage unavailable — still playable
  }
}

async function fetchDaily() {
  const res = await fetch("/daily");
  if (!res.ok) throw new Error(`GET /daily -> HTTP ${res.status}`);
  return res.json();
}

async function renderLeaderboard(date, el) {
  try {
    const res = await fetch(`/leaderboard/${encodeURIComponent(date)}`);
    if (!res.ok) return;
    const { entries } = await res.json();
    if (entries.length === 0) { el.textContent = "leaderboard: no scored runs yet today."; return; }
    el.textContent = `leaderboard (${date}):\n` + entries
      .slice(0, 10)
      .map((e) => `  #${e.rank}  ${e.score}  ${e.actor} [${e.entrantKind}]`)
      .join("\n");
  } catch {
    // leaderboard display is best-effort — never blocks play.
  }
}

async function main() {
  const canvas = document.getElementById("frame");
  canvas.width = RENDER_WIDTH;
  canvas.height = RENDER_HEIGHT;
  const ctx = canvas.getContext("2d");

  const hudHealth = document.getElementById("hud-health");
  const hudAmmo = document.getElementById("hud-ammo");
  const hudDemons = document.getElementById("hud-demons");
  const hudCensus = document.getElementById("hud-census");
  const hudMessage = document.getElementById("hud-message");
  const hudDaily = document.getElementById("hud-daily");
  const dailyStatusEl = document.getElementById("daily-status");
  const dailyLeaderboardEl = document.getElementById("daily-leaderboard");

  // daily mode is the DEFAULT — GET /daily's failure (no server-side daily route reachable) is the
  // ONLY thing that falls back to the original fixed blood-merge arena, per this module's header.
  let daily = null;
  try {
    daily = await fetchDaily();
    hudDaily.textContent = `${daily.date} (${daily.mode})`;
    dailyStatusEl.textContent = `Playing today's daily (${daily.date}, seed ${daily.seed}). Clear every demon or the ${DAILY_TICK_CAP}-tick cap ends the run; your run auto-submits on completion.`;
    renderLeaderboard(daily.date, dailyLeaderboardEl);
  } catch {
    hudDaily.textContent = "offline (fixed arena)";
    dailyStatusEl.textContent = "GET /daily unreachable — playing the original fixed blood-merge arena instead (no submission).";
  }

  const actor = getOrCreateActorId();
  const input = createInput(window);
  let ammo = AMMO_START;
  let state = daily ? createDailyEngine(daily.date) : loadGame();
  let runLog = [];
  let ended = false;
  let submitted = false;

  async function submitDailyRun(reason) {
    if (submitted || !daily) return;
    submitted = true;
    dailyStatusEl.textContent = `Run ended (${reason}) — submitting ${runLog.length} moves as ${actor}…`;
    try {
      const body = encodeRun({ date: daily.date, actor, entrantKind: "human", mode: daily.mode, intentLog: runLog });
      const res = await fetch("/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await res.json();
      if (res.ok) {
        dailyStatusEl.textContent = `Submitted: ${result.endedAt.reason}, score ${result.score}. ${result.leaderboardEligible ? "On the leaderboard." : ""}`;
        renderLeaderboard(daily.date, dailyLeaderboardEl);
      } else {
        dailyStatusEl.textContent = `Submission rejected: ${result.rejected}`;
      }
    } catch {
      dailyStatusEl.textContent = "Submission failed (network error) — your local result still stands above.";
    }
  }

  function render() {
    const held = input.heldIntent();
    const wantsFire = input.consumeFire();
    const fire = wantsFire && ammo > 0;
    if (fire) ammo -= 1;

    const move = { ...held, fire };
    state = tick(state, move, { width: RENDER_WIDTH, height: RENDER_HEIGHT });
    if (daily && !ended) runLog = recordMove(runLog, move); // append-only, orthogonal to rendering
    paintFrame(ctx, state.frame);

    const st = status(state);
    // health is a BROWSER-FACE display transform over the real `hurt` counter (ticks spent in a
    // demon's grasp) — not a new engine mechanic; see DESIGN.md. 100 at hurt=0, floored at 0.
    const health = Math.max(0, 100 - state.player.hurt * 4);
    hudHealth.textContent = `${health}`;
    hudAmmo.textContent = wantsFire && !fire ? "0 (empty!)" : `${ammo}`;
    // per-demon vitality straight from this tick's report (t/⊤/f, the direct trace readout).
    hudDemons.textContent = state.demons
      .map((d) => {
        const v = state.report?.demons?.find((r) => r.id === d.id);
        return `demon:${d.id} ${v ? vitalLabel(v.vital) : "hunting"}`;
      })
      .join("  ");
    hudCensus.textContent = `walls t:${st.arena.t} f:${st.arena.f} ⊤:${st.arena.top}  |  hunting:${st.hunting} wounded:${st.wounded} dead:${st.dead}  |  hurt:${st.hurt}`;

    if (!ended && st.dead === state.demons.length && state.demons.length > 0) {
      ended = true;
      hudMessage.textContent = "All demons settled to DEAD. Refresh to replay.";
      submitDailyRun("cleared");
    } else if (daily && !ended && runLog.length >= DAILY_TICK_CAP) {
      ended = true;
      hudMessage.textContent = `Reached the ${DAILY_TICK_CAP}-tick daily cap. Refresh to replay.`;
      submitDailyRun("tick-cap");
    } else if (!daily && !ended && health <= 0) {
      ended = true;
      hudMessage.textContent = "Grasped to 0 health. Refresh to replay.";
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
