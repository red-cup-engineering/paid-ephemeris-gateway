// app-play.mjs — wires play.html: fetch /daily, run the SAME engine modules locally (via
// session.mjs) for immediate responsive feedback, render every frame (render.mjs, driven by this
// file's own requestAnimationFrame loop — never Date.now()), accumulate the move-log as the
// player acts, and on death/void/clear (or the player's own "bank score" choice) submit the whole
// log to POST /runs for the server's independent, authoritative replay. What this file shows
// during play and what the server ultimately scores are the same computation run twice, on the
// same seed and the same log — that agreement is the entire point (design §6.1).

import { getDaily, submitRun } from "./api.mjs";
import { getActorId } from "./identity.mjs";
import { GameSession } from "./session.mjs";
import { projectWorld } from "./projection.mjs";
import { TileRenderer } from "./render.mjs";
import { bindKeyboard, isTouchCapable, mountTouchDpad, Announcer } from "./input.mjs";
import { dungeonName, parseHexSeed } from "./dungeon-name.mjs";

const actorId = getActorId();
const params = new URLSearchParams(location.search);
const requestedDate = params.get("date") || undefined;

const canvas = document.getElementById("stage-canvas");
const renderer = new TileRenderer(canvas, { reducedMotion: prefersReducedMotion() });
const announcer = new Announcer(document.getElementById("announcer"));

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", (e) => renderer.setReducedMotion(e.matches));

let session = null;
let lastModel = null;
let unbindKeyboard = null;
let unmountDpad = null;
let running = false;
let idleCounter = 0;
const IDLE_TICK_EVERY_N_FRAMES = 20; // ~1 world tick every ~1/3s at 60fps while the player is idle

function nearestHostile() {
  if (!lastModel || !lastModel.player) return null;
  let best = null;
  let bestD = Infinity;
  for (const t of lastModel.tiles) {
    if (t.kind !== "monster") continue;
    const dx = t.x - lastModel.player.x;
    const dz = t.z - lastModel.player.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = t.id;
    }
  }
  return best;
}

function nearestGroundItem() {
  if (!lastModel || !lastModel.player) return null;
  let best = null;
  let bestD = Infinity;
  for (const t of lastModel.tiles) {
    if (t.kind !== "item") continue;
    const dx = t.x - lastModel.player.x;
    const dz = t.z - lastModel.player.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = t.id;
    }
  }
  return best;
}

// ---- HUD -----------------------------------------------------------------------------------

function renderHud(model) {
  if (!model.player) return;
  const p = model.player;
  const hud = model.hud;
  document.getElementById("hp-label").textContent = `${p.health} / ${p.maxHealth}`;
  document.getElementById("hp-bar").style.width = `${clampPct((p.health / p.maxHealth) * 100)}%`;
  document.getElementById("sta-label").textContent = `${p.stamina} / ${p.maxStamina}`;
  document.getElementById("sta-bar").style.width = `${clampPct((p.stamina / p.maxStamina) * 100)}%`;
  document.getElementById("level-label").textContent = `${p.level} (${p.xp} xp)`;
  document.getElementById("gold-label").textContent = String(p.gold);
  document.getElementById("floor-label").textContent = `${hud.floorIndex} / ${hud.floorCount}${hud.zoneName ? " — " + hud.zoneName : ""}`;
  document.getElementById("zone-label").textContent = hud.zoneName;

  const statusRow = document.getElementById("status-row");
  const statusLabel = document.getElementById("status-label");
  if (p.risen || p.cursed) {
    statusRow.hidden = false;
    statusLabel.textContent = [p.risen ? "RISEN (relic spent)" : null, p.cursed ? "LYCANTHROPE" : null].filter(Boolean).join(" · ");
  } else {
    statusRow.hidden = true;
  }

  for (const btn of document.querySelectorAll(".abilities button")) {
    const ability = btn.dataset.ability;
    const readyIn = hud.cooldownReadyIn[ability] ?? 0;
    btn.disabled = readyIn > 0;
    btn.textContent = readyIn > 0 ? `${btn.dataset.label} (${readyIn})` : btn.dataset.label;
  }

  const inv = document.getElementById("inventory-list");
  inv.innerHTML = "";
  if (hud.inventory.length === 0) {
    inv.innerHTML = "<li><em>empty</em></li>";
  } else {
    for (const item of hud.inventory) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${item.equipped ? "▸ " : ""}${escapeHtml(item.name)}</span><span class="rarity-${item.slot ? "common" : "junk"}">${item.value}g</span>`;
      inv.appendChild(li);
    }
  }
}

function clampPct(n) {
  return Math.max(0, Math.min(100, n));
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- event narration (a11y + log region) ----------------------------------------------------
// A simple diff of consecutive projected models — this is presentation-layer narration, not
// engine logic; it reads facts the engine already computed, never decides any of them.

let prevSummary = null;

function summarize(model) {
  if (!model.player) return null;
  return {
    health: model.player.health,
    killXp: model.hud.stats.killXp,
    floorsFlawless: model.hud.stats.floorsFlawless,
    maxFloorReached: model.hud.stats.maxFloorReached,
    inventoryCount: model.hud.inventory.length,
    risen: model.player.risen,
    cursed: model.player.cursed,
    floorIndex: model.hud.floorIndex,
  };
}

function narrate(model) {
  const cur = summarize(model);
  if (!cur) return;
  if (prevSummary) {
    const lines = [];
    if (cur.health < prevSummary.health) lines.push(`You take ${prevSummary.health - cur.health} damage. (${cur.health} HP left)`);
    if (cur.health > prevSummary.health && prevSummary.health > 0) lines.push(`You recover ${cur.health - prevSummary.health} health.`);
    if (cur.killXp > prevSummary.killXp) lines.push(`You slay a foe. (+${cur.killXp - prevSummary.killXp} xp)`);
    if (cur.inventoryCount > prevSummary.inventoryCount) lines.push("You pick something up.");
    if (cur.floorIndex > prevSummary.floorIndex) lines.push(`You descend to floor ${cur.floorIndex}.`);
    if (cur.floorsFlawless > prevSummary.floorsFlawless) lines.push("Flawless floor — no damage taken.");
    if (cur.risen && !prevSummary.risen) lines.push("The Heart of the Hollow rises you from death. You are RISEN.");
    if (cur.cursed && !prevSummary.cursed) lines.push("A cursed foe's death marks you. You are LYCANTHROPE, permanently.");
    for (const line of lines) logLine(line);
  }
  prevSummary = cur;
}

function logLine(text) {
  announcer.say(text);
  const region = document.getElementById("log-region");
  const p = document.createElement("p");
  p.textContent = text;
  region.appendChild(p);
  region.scrollTop = region.scrollHeight;
}

// ---- game loop -------------------------------------------------------------------------------

function handleIntent(intentWithoutActor) {
  if (!session || session.ended) return;
  const result = session.act(intentWithoutActor);
  if (!result) return; // invalid/no-op intent — nothing changed
  onAfterTick(result);
}

function onAfterTick(result) {
  idleCounter = 0;
  lastModel = projectWorld(session.world, actorId, session.tick);
  renderHud(lastModel);
  narrate(lastModel);
  if (result.ended) endRun(result.ended);
}

function frameLoop() {
  if (!running) return;
  if (session && !session.ended) {
    idleCounter += 1;
    if (idleCounter >= IDLE_TICK_EVERY_N_FRAMES) {
      idleCounter = 0;
      const r = session.idle();
      if (r) {
        lastModel = projectWorld(session.world, actorId, session.tick);
        renderHud(lastModel);
        narrate(lastModel);
        if (r.ended) endRun(r.ended);
      }
    }
  }
  renderer.resize();
  if (lastModel) renderer.frame(lastModel);
  requestAnimationFrame(frameLoop);
}

// ---- lifecycle -------------------------------------------------------------------------------

async function boot() {
  const startBtn = document.getElementById("start-btn");
  const startDesc = document.getElementById("start-desc");
  try {
    const daily = await getDaily(requestedDate);
    document.getElementById("start-title").textContent = dungeonName(parseHexSeed(daily.seed));
    startDesc.textContent = `${daily.date} · ${daily.floorCount} floors · ${daily.mode === "scored" ? "this is your ONE scored attempt today" : "practice run, never scored"}`;
    document.getElementById("mode-badge").textContent = daily.mode === "scored" ? "SCORED" : "PRACTICE";
    document.getElementById("mode-badge").classList.add(daily.mode);
    startBtn.disabled = false;
    startBtn.addEventListener("click", () => startRun(daily), { once: true });
  } catch (err) {
    startDesc.textContent = `Couldn't load the daily: ${err.message ?? err}`;
  }
}

function startRun(daily) {
  document.getElementById("start-overlay").hidden = true;
  session = new GameSession(parseHexSeed(daily.seed), daily.date, actorId);
  session._mode = daily.mode;
  lastModel = projectWorld(session.world, actorId, session.tick);
  renderHud(lastModel);
  prevSummary = summarize(lastModel);
  logLine(`You step through the gate into ${dungeonName(parseHexSeed(daily.seed))}.`);

  unbindKeyboard = bindKeyboard(handleIntent, { nearestHostile, nearestGroundItem });
  if (isTouchCapable()) unmountDpad = mountTouchDpad(document.getElementById("dpad-mount"), handleIntent, { nearestHostile });

  for (const btn of document.querySelectorAll(".abilities button")) {
    btn.dataset.label = btn.textContent;
    btn.addEventListener("click", () => handleIntent({ kind: "ability", ability: btn.dataset.ability, target: nearestHostile() }));
  }
  document.getElementById("end-run-btn").addEventListener("click", () => {
    if (session && !session.ended) endRun({ reason: "tick-cap", tick: session.tick - 1, banked: true });
  });

  running = true;
  requestAnimationFrame(frameLoop);
}

let ended = false;
function endRun(endedInfo) {
  if (ended) return;
  ended = true;
  running = false;
  if (unbindKeyboard) unbindKeyboard();
  if (unmountDpad) unmountDpad();

  const overlay = document.getElementById("end-overlay");
  overlay.hidden = false;
  const titleByReason = {
    "mortal-death": "You have died.",
    voided: "The floor swallows the attempt whole.",
    cleared: "You cleared the keep!",
    "tick-cap": endedInfo.banked ? "Run banked." : "Run ended.",
  };
  document.getElementById("end-title").textContent = titleByReason[endedInfo.reason] ?? "Run ended.";
  document.getElementById("end-reason").textContent =
    endedInfo.reason === "voided" ? "The void hazard un-made this attempt — no score, but the day's one attempt is still spent." : "";

  submitFlow(endedInfo);
}

async function submitFlow(endedInfo) {
  const statusEl = document.getElementById("submit-status");
  const scoreGrid = document.getElementById("score-grid");
  let clientClaimedScore = null;
  try {
    const local = session.localReplay(session._mode);
    if (!local.rejected) clientClaimedScore = local.score;
  } catch {
    // advisory only — a failure here never blocks submission
  }

  try {
    const result = await submitRun({
      player: actorId,
      date: session.date,
      seed: `0x${session.seed.toString(16).padStart(8, "0")}`,
      moves: session.moves,
      clientClaimedScore,
    });
    statusEl.textContent = result.leaderboardEligible
      ? "Verified and on the leaderboard."
      : result.mode === "practice"
        ? "Practice run recorded (never scored)."
        : "Recorded — this attempt did not score (see reason above).";
    scoreGrid.innerHTML = `
      <span>Your client's estimate</span><span>${clientClaimedScore ?? "—"}</span>
      <span class="total">Server (authoritative)</span><span class="total">${result.score ?? "— (voided)"}</span>
    `;
    if (result.runId) {
      const link = document.getElementById("watch-link");
      link.href = `/watch?run=${encodeURIComponent(result.runId)}`;
      link.hidden = false;
    }
  } catch (err) {
    statusEl.textContent = `Submission failed: ${err.body?.rejected ?? err.message ?? err}`;
  }
}

boot();
