#!/usr/bin/env node
// durante-terminal — durante's TERMINAL FACE: the same deterministic game()/tick() loop the browser
// face (web/main.mjs) drives, rendered through the ported @red-cup-engineering/daleske instead of a
// <canvas>. This is the fleet's agent-native surface: an AI player, or a human over bare SSH, reaches
// the exact same game a browser gets, from a terminal. Ported pattern from the legacy
// 2026-08-17-vps-561-group archive's apps/tools/abrash/scripts/abrash.mjs (which drove daleske's
// PixelScreen directly) — this is that same shape, one level up the stack, over durante's own three-
// twist game loop instead of abrash's bare engine.
//
// THREE MODES, capability-detected (daleske's own probe(), no guessing):
//   kitty/sixel TTY  — daleske's PixelScreen: the raycast frame blitted as real pixels, raw-mode
//                      keyboard input (WASD/arrows move+turn, Q/E strafe, space fires, q/Ctrl-C quits).
//   plain TTY        — the SAME raw-mode keyboard loop, but the graceful ASCII downsample this
//                      package's src/terminal-ascii.mjs defines (the legacy README's "kitty/sixel
//                      with an ASCII fallback") — every terminal, however bare, can still see and
//                      play the level.
//   non-TTY/--headless — no keyboard (there is no terminal to read raw mode from): walk a fixed,
//                      deterministic scripted intent log and print each tick's ASCII frame — the same
//                      headless proof shape src/terminal-ascii.test.mts asserts on, runnable by a
//                      human or CI without a real terminal at all.
//
// Run:  node scripts/durante-terminal.mjs             # interactive (kitty/sixel/ASCII, capability-detected)
//       node scripts/durante-terminal.mjs --headless   # scripted walk, ASCII frames, no input needed
//       node scripts/durante-terminal.mjs --pixel      # force the pixel path even over a plain pipe (demo)
//       node scripts/durante-terminal.mjs --daily      # play TODAY'S daily tournament arena instead of the
//                                                   # fixed one; submits your run on quit/clear through
//                                                   # the SAME public POST /runs route the browser face
//                                                   # and agents/reference-entrant.mjs both use — a
//                                                   # human over bare SSH is a peer entrant too.
//         --base <url>    # the durante server to fetch/submit against (default http://localhost:8788,
//                          # or DURANTE_BASE_URL)
//         --actor <id>    # this terminal player's actor id (default DURANTE_ACTOR or "terminal-player")

import { worldFromRows } from "@red-cup-engineering/abrash/world";
import { PixelScreen } from "@red-cup-engineering/daleske/screen";
import { Keyboard } from "@red-cup-engineering/daleske/input";
import { probe } from "@red-cup-engineering/daleske/capability";
import { game, tick, status } from "../src/game.mjs";
import { VITAL } from "../src/demon.mjs";
import { BLOOD_MERGE_ROWS } from "../src/seed-rows.mjs";
import { frameToAscii, toDaleskeFramebuffer } from "../src/terminal-ascii.mjs";
import { createDailyEngine } from "../src/cartridge.mjs";
import { recordMove, encodeRun } from "../src/run-recorder.mjs";
import { DAILY_TICK_CAP } from "../src/score.mjs";

const ESC = "\x1b";

function newGame() {
  const world = worldFromRows(BLOOD_MERGE_ROWS);
  return game({
    world,
    player: { x: 7.5, z: 2.5, angle: Math.PI / 2 },
    demons: [{ id: 0 }, { id: 1 }],
    cam: { fov: Math.PI / 3, maxDist: 24 },
  });
}

function vitalLabel(vital) {
  if (vital === VITAL.ALIVE) return "hunting";
  if (vital === VITAL.WOUNDED) return "WOUNDED⊤";
  if (vital === VITAL.DEAD) return "dead";
  return "—";
}

function statusLine(state) {
  const st = status(state);
  const demons = state.demons
    .map((d) => {
      const r = state.report?.demons?.find((x) => x.id === d.id);
      return `demon:${d.id} ${r ? vitalLabel(r.vital) : "hunting"}`;
    })
    .join("  ");
  return `durante  walls t:${st.arena.t} ⊤:${st.arena.top}  |  ${demons}  |  hurt:${state.player.hurt}  [WASD/arrows] move  [Q/E] strafe  [space] fire  [q] quit`;
}

// ── deterministic scripted walk (used by --headless and as the fallback when stdin isn't a TTY) ──
const RING = [
  { turn: 0.5 }, { turn: 0.5 }, { forward: 1 }, { forward: 1 },
  { turn: -0.3 }, { forward: 1 }, { strafe: 1, fire: true }, { turn: -0.4 },
];

function runHeadless(frames = 8) {
  let state = newGame();
  for (let n = 0; n < frames; n++) {
    state = tick(state, RING[n % RING.length], { width: 168, height: 96 });
    const ascii = frameToAscii(state.frame.fb, 56, 22);
    console.log(`\n── frame ${n} ──  player (${state.player.x.toFixed(2)},${state.player.z.toFixed(2)}) ∠${state.player.angle.toFixed(2)}`);
    console.log(ascii);
    console.log(statusLine(state));
  }
}

// ── the daily tournament: fetch today's seed from the LIVE API, build the SAME arena locally
// (createDailyEngine(date) — deterministic from the date alone, never trusting anything else the
// server returned), and submit the recorded run through the public POST /runs route on quit/clear.
async function fetchDaily(base) {
  const res = await fetch(`${base}/daily`);
  if (!res.ok) throw new Error(`GET /daily -> HTTP ${res.status}`);
  return res.json();
}

async function submitDailyRun(base, daily, actor, runLog, reason) {
  const body = encodeRun({ date: daily.date, actor, entrantKind: "human", mode: daily.mode, intentLog: runLog });
  const res = await fetch(`${base}/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await res.json();
  console.log(`\ndurante-terminal: run ended (${reason}), submitted ${runLog.length} moves as ${actor} -> HTTP ${res.status}`);
  console.log(res.ok ? result : `rejected: ${result.rejected}`);
  if (res.ok) {
    try {
      const lb = await fetch(`${base}/leaderboard/${encodeURIComponent(daily.date)}`);
      const { entries } = await lb.json();
      console.log(`\nleaderboard (${daily.date}):`);
      for (const e of entries.slice(0, 10)) console.log(`  #${e.rank}  ${e.score}  ${e.actor} [${e.entrantKind}]`);
      if (entries.length === 0) console.log("  (no scored runs yet)");
    } catch {
      // leaderboard fetch is best-effort — the submission result above already printed.
    }
  }
}

// ── interactive: raw-mode keyboard, either daleske's pixel blit (kitty/sixel) or the ASCII fallback
// (plain TTY) — same key handling, same tick(), only the paint differs.
async function runInteractive({ forcePixel = false, daily: dailyOpts = null } = {}) {
  const cap = probe(process.stdout, process.env);
  const usePixel = forcePixel || cap.encoder !== "none";

  let daily = null;
  if (dailyOpts) {
    try {
      daily = await fetchDaily(dailyOpts.base);
      console.log(`durante-terminal: playing daily ${daily.date} (seed ${daily.seed}, mode ${daily.mode})`);
    } catch (err) {
      console.log(`durante-terminal: --daily requested but GET /daily failed (${err.message}) — falling back to the fixed arena, no submission.`);
    }
  }
  let state = daily ? createDailyEngine(daily.date) : newGame();
  let runLog = [];
  let intent = {};
  let running = true;
  let submitted = false;

  async function maybeEndDaily(reason) {
    if (!daily || submitted) return;
    submitted = true;
    await submitDailyRun(dailyOpts.base, daily, dailyOpts.actor, runLog, reason);
  }

  const screen = usePixel ? new PixelScreen({ encoder: forcePixel ? (cap.encoder === "none" ? "kitty" : cap.encoder) : undefined }) : null;
  const keyboard = usePixel ? null : new Keyboard(process.stdin);

  // key bindings: WASD/arrows move+turn, space fires (all matching the browser face's README table).
  // ONE deliberate divergence from the browser: this terminal face repurposes 'q' for QUIT (the
  // legacy abrash terminal bin's own convention — see this file's header) rather than "strafe left",
  // so strafe-left moves to 'z' here (strafe-right stays 'e'). Documented, not silent.
  const applyKey = (k) => {
    if (k.name === "char" && k.char === "q") { quit(); return; }
    if (k.name === "char" && k.char === "w") intent = { ...intent, forward: 1 };
    else if (k.name === "up") intent = { ...intent, forward: 1 };
    else if (k.name === "char" && k.char === "s") intent = { ...intent, forward: -1 };
    else if (k.name === "down") intent = { ...intent, forward: -1 };
    else if (k.name === "char" && k.char === "a") intent = { ...intent, turn: -1 };
    else if (k.name === "left") intent = { ...intent, turn: -1 };
    else if (k.name === "char" && k.char === "d") intent = { ...intent, turn: 1 };
    else if (k.name === "right") intent = { ...intent, turn: 1 };
    else if (k.name === "char" && k.char === "z") intent = { ...intent, strafe: -1 };
    else if (k.name === "char" && k.char === "e") intent = { ...intent, strafe: 1 };
    else if (k.name === "space") intent = { ...intent, fire: true };
  };

  async function quit() {
    running = false;
    if (screen) screen.stop(); else keyboard?.stop();
    if (!screen) process.stdout.write(`${ESC}[?25h`);
    await maybeEndDaily("quit");
    process.exit(0);
  }

  if (screen) {
    screen.start();
    screen.onKey(applyKey);
    screen.onInterrupt(quit);
  } else {
    process.stdout.write(`${ESC}[?1049h${ESC}[?25l`);
    keyboard.start();
    keyboard.on("key", applyKey);
    keyboard.on("interrupt", quit);
  }

  const paint = async () => {
    if (!running) return;
    const width = screen ? screen.width : 336;
    const height = screen ? screen.height : 192;
    state = tick(state, intent, { width, height });
    if (daily && !submitted) runLog = recordMove(runLog, intent); // append-only, orthogonal to rendering
    intent = {}; // one-shot per tick, matching the legacy bin's own convention

    if (screen) {
      const dfb = toDaleskeFramebuffer(state.frame.fb);
      screen.paint(dfb);
      process.stdout.write(`${ESC}[${(process.stdout.rows || 24)};1H${statusLine(state)}`);
    } else {
      process.stdout.write(`${ESC}[H${ESC}[2J`);
      process.stdout.write(frameToAscii(state.frame.fb, Math.min(process.stdout.columns || 80, 100), (process.stdout.rows || 24) - 2));
      process.stdout.write(`\n${statusLine(state)}`);
    }

    const st = status(state);
    if (daily && st.dead === state.demons.length && state.demons.length > 0) {
      await maybeEndDaily("cleared");
      running = false;
      if (screen) screen.stop(); else keyboard?.stop();
      process.exit(0);
    } else if (daily && runLog.length >= DAILY_TICK_CAP) {
      await maybeEndDaily("tick-cap");
      running = false;
      if (screen) screen.stop(); else keyboard?.stop();
      process.exit(0);
    } else {
      setTimeout(paint, 90);
    }
  };
  paint();
}

function main() {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
  };
  const headless = args.includes("--headless") || !process.stdin.isTTY;
  const forcePixel = args.includes("--pixel");
  const daily = args.includes("--daily")
    ? { base: flag("base", process.env.DURANTE_BASE_URL ?? "http://localhost:8788"), actor: flag("actor", process.env.DURANTE_ACTOR ?? "terminal-player") }
    : null;
  if (headless) runHeadless();
  else runInteractive({ forcePixel, daily });
}

main();
