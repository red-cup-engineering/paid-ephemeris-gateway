// app-index.mjs — wires index.html: today's dungeon name (seed-derived), a countdown to the next
// UTC daily, today's leaderboard, and the practice-date picker. This file is UI glue only — the
// countdown's `new Date()` reads are display-clock bookkeeping (same "impure boundary" allowance
// server.mts's own header documents for its bookkeeping timestamps), never fed into engine state.

import { getDaily, getLeaderboard } from "./api.mjs";
import { dungeonName, parseHexSeed } from "./dungeon-name.mjs";
import { getActorId } from "./identity.mjs";

const actorId = getActorId();
document.getElementById("actor-id").textContent = actorId;
document.getElementById("reset-identity").addEventListener("click", (e) => {
  e.preventDefault();
  if (!confirm("Start a new wanderer identity in this browser? Your current one keeps its history server-side, but this browser will stop tracking it.")) return;
  localStorage.removeItem("ruinfold:actor-id");
  location.reload();
});

function fmtHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function startCountdown() {
  const tick = () => {
    const now = new Date();
    const nextUTCMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
    document.getElementById("countdown").textContent = fmtHMS(nextUTCMidnight - now.getTime());
  };
  tick();
  setInterval(tick, 1000);
}

async function loadDaily() {
  try {
    const daily = await getDaily();
    const seed = parseHexSeed(daily.seed);
    document.getElementById("dungeon-name").textContent = dungeonName(seed);
    document.getElementById("dungeon-sub").textContent =
      `${daily.date} · ${daily.floorCount} floors · seed ${daily.seed}`;
    return daily;
  } catch (err) {
    document.getElementById("dungeon-name").textContent = "Couldn't load today's daily";
    document.getElementById("dungeon-sub").textContent = String(err.message ?? err);
    return null;
  }
}

async function loadLeaderboard(date) {
  const body = document.getElementById("leaderboard-body");
  try {
    const lb = await getLeaderboard(date);
    if (lb.entries.length === 0) {
      body.innerHTML = "<tr><td colspan=\"5\">No scored runs yet today — be the first.</td></tr>";
      return;
    }
    body.innerHTML = "";
    for (const entry of lb.entries.slice(0, 20)) {
      const tr = document.createElement("tr");
      if (entry.actor === actorId) tr.className = "me";
      const rankClass = entry.rank <= 3 ? ` class="rank-${entry.rank}"` : "";
      tr.innerHTML = `
        <td${rankClass}>${entry.rank}</td>
        <td>${escapeHtml(entry.actor)}</td>
        <td>${entry.score}</td>
        <td>${entry.endedAtTick}</td>
        <td><a href="/watch?run=${encodeURIComponent(entry.runId)}">watch</a></td>
      `;
      body.appendChild(tr);
    }
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5">Couldn't load the leaderboard: ${escapeHtml(String(err.message ?? err))}</td></tr>`;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.getElementById("practice-date").max = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
document.getElementById("practice-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = document.getElementById("practice-date").value;
  if (!d) return;
  location.href = `/play?date=${encodeURIComponent(d)}`;
});

startCountdown();
loadDaily().then((daily) => {
  if (daily) loadLeaderboard(daily.date);
});
