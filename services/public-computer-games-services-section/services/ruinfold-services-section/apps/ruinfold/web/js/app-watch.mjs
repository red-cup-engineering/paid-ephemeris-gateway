// app-watch.mjs — wires watch.html: fetch a stored run (GET /replay/:runId) or browse a date's
// leaderboard to pick one, then step it through ReplaySession (the SAME engine, same tick loop)
// at a chosen speed and render each step with the same renderer/projection play.html uses.

import { getReplay, getLeaderboard } from "./api.mjs";
import { ReplaySession } from "./replay-session.mjs";
import { projectWorld } from "./projection.mjs";
import { TileRenderer } from "./render.mjs";
import { dungeonName, parseHexSeed } from "./dungeon-name.mjs";

const params = new URLSearchParams(location.search);
const initialRunId = params.get("run");

document.getElementById("run-id-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("run-id-input").value.trim();
  if (id) loadRun(id);
});

document.getElementById("date-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("lb-date-input").value;
  if (!date) return;
  const board = document.getElementById("picker-board");
  const body = document.getElementById("picker-body");
  try {
    const lb = await getLeaderboard(date);
    body.innerHTML = "";
    if (lb.entries.length === 0) {
      body.innerHTML = "<tr><td colspan=\"5\">No scored runs that day.</td></tr>";
    }
    for (const entry of lb.entries) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${entry.rank}</td><td>${escapeHtml(entry.actor)}</td><td>${entry.score}</td><td>${entry.endedAtTick}</td><td><a href="#" data-run="${entry.runId}">watch</a></td>`;
      body.appendChild(tr);
    }
    board.hidden = false;
    board.addEventListener("click", (ev) => {
      const a = ev.target.closest("a[data-run]");
      if (a) {
        ev.preventDefault();
        loadRun(a.dataset.run);
      }
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5">${escapeHtml(String(err.message ?? err))}</td></tr>`;
  }
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- playback --------------------------------------------------------------------------------

let replaySession = null;
let renderer = null;
let playing = true;
let speed = 1; // ticks advanced per animation frame at 1x, scaled up by the speed buttons
let frameAcc = 0;

function stepsPerFrameFor(s) {
  // 1x ~= roughly one world-tick every 4 frames (a readable pace); higher speeds just multiply.
  return s / 4;
}

async function loadRun(runId) {
  document.getElementById("picker-panel").hidden = true;
  document.getElementById("viewer").hidden = false;
  document.getElementById("run-label").textContent = `Replay: ${runId}`;

  const record = await getReplay(runId);
  const seed = parseHexSeed(record.seed);
  replaySession = new ReplaySession(seed, record.actor, record.moves);
  document.getElementById("v-actor").textContent = record.actor;
  document.getElementById("v-date").textContent = `${record.date} — ${dungeonName(seed)}`;
  document.getElementById("v-score").textContent = record.score ?? "— (voided)";
  document.getElementById("v-ended").textContent = record.endedAt ? `${record.endedAt.reason} @ tick ${record.endedAt.tick}` : "—";

  const canvas = document.getElementById("stage-canvas");
  renderer = new TileRenderer(canvas, { reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches });
  playing = true;
  document.getElementById("v-playpause").textContent = "Pause";
  requestAnimationFrame(loop);
}

function loop() {
  if (!replaySession) return;
  if (playing && !replaySession.done) {
    frameAcc += stepsPerFrameFor(speed);
    while (frameAcc >= 1 && !replaySession.done) {
      replaySession.step();
      frameAcc -= 1;
    }
  }
  renderer.resize();
  const model = projectWorld(replaySession.world, replaySession.actorId, replaySession.tick);
  renderer.frame(model);
  document.getElementById("v-tick").textContent = `${replaySession.tick} / ${replaySession.maxTick}`;
  if (replaySession.done) {
    playing = false;
    document.getElementById("v-playpause").textContent = "Play";
  }
  requestAnimationFrame(loop);
}

document.getElementById("v-playpause").addEventListener("click", () => {
  if (!replaySession) return;
  playing = !playing;
  document.getElementById("v-playpause").textContent = playing ? "Pause" : "Play";
});
document.getElementById("v-restart").addEventListener("click", () => {
  if (!replaySession) return;
  replaySession.restart();
  frameAcc = 0;
  playing = true;
  document.getElementById("v-playpause").textContent = "Pause";
});
for (const btn of document.querySelectorAll("[data-speed]")) {
  btn.addEventListener("click", () => {
    speed = Number(btn.dataset.speed);
  });
}

if (initialRunId) loadRun(initialRunId);
