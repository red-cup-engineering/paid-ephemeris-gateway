// app.js — Tidepool's web face (design §5.1): zero framework, no build step, native ESM straight
// off the page. The whole rendering job really is what the design promises: on every "me" update
// (this connection's own qwzspace entity, which IS a tidepool.perception.v1 frame — see
// src/perception.mts's own header), redraw one text pane from frame.place.description,
// frame.occupants, frame.subjects[].affordances, and read frame.recentEvents for the scrolling
// log. The input box calls client.sendIntent("command", { command: inputValue }) — the exact
// same wire shape a human's terminal client or the reference bot send, per the design's "one
// grammar, human-typeable and program-emittable identically" claim.

import { connectRoom } from "./vendor/qwzspace/client-browser.mjs";

const NAME_KEY = "tidepool.name";
const THEME_KEY = "tidepool.theme";

function storedName() {
  let name = localStorage.getItem(NAME_KEY);
  if (!name) {
    name = "wanderer-" + Math.random().toString(36).slice(2, 7);
    localStorage.setItem(NAME_KEY, name);
  }
  return name;
}

// --- theme toggle (light / dark / system) ------------------------------------------------------
const THEME_CYCLE = ["system", "light", "dark"];
function applyTheme(mode) {
  if (mode === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem(THEME_KEY, mode);
}
let themeMode = localStorage.getItem(THEME_KEY) ?? "system";
applyTheme(themeMode);
document.getElementById("theme-toggle").addEventListener("click", () => {
  themeMode = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length];
  applyTheme(themeMode);
});

// --- connection ----------------------------------------------------------------------------------
const wsUrl = (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host + "/";
const connEl = document.getElementById("conn");
const logEl = document.getElementById("log");
const placeNameEl = document.getElementById("place-name");
const exitsEl = document.getElementById("exits");
const clockEl = document.getElementById("clock-line");
const occupantsEl = document.getElementById("occupants");
const affordancesEl = document.getElementById("affordances");
const input = document.getElementById("cmd-input");
const form = document.getElementById("cmd");

let lastRenderedTick = -1;
const seenEventKeys = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function appendLogLine(channel, text) {
  const line = el("div", `entry ${channel}`, text);
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function render(frame) {
  if (!frame || typeof frame !== "object" || frame.kind !== "tidepool.perception.v1") return;

  if (frame.place) {
    placeNameEl.textContent = frame.place.name;
    placeNameEl.title = frame.place.description;
    exitsEl.textContent = frame.place.exits.length ? `Exits: ${frame.place.exits.join(", ")}` : "No exits.";
  }

  if (frame.clock) {
    const c = frame.clock;
    clockEl.textContent = `${c.phase}, ${c.season} · tide ${c.tide} · ${c.weather}` +
      (c.dryStreak > 0 ? ` · ${c.dryStreak}t since rain` : "");
  }

  occupantsEl.replaceChildren();
  for (const occ of frame.occupants ?? []) occupantsEl.appendChild(el("li", null, occ.name));
  if ((frame.occupants ?? []).length === 0) occupantsEl.appendChild(el("li", null, "no one else here"));

  const here = (frame.subjects ?? []).find((s) => s.id === frame.place?.id);
  affordancesEl.replaceChildren();
  for (const affordance of here?.affordances ?? []) affordancesEl.appendChild(el("li", null, affordance));

  // a fresh room description appears once per tick the place changes/loads — logged like a `look`.
  if (frame.tick !== lastRenderedTick && frame.place) {
    lastRenderedTick = frame.tick;
  }

  for (const ev of frame.recentEvents ?? []) {
    const key = `${ev.tick}:${ev.channel}:${ev.text}`;
    if (seenEventKeys.has(key)) continue;
    seenEventKeys.add(key);
    appendLogLine(ev.channel, ev.text);
  }
}

const client = connectRoom(wsUrl, {
  name: storedName(),
  onState(state) {
    connEl.textContent = state === "playing" ? "connected" : state;
  },
});

client.view.on("me", ({ snap }) => render(snap));

// --- input: keyboard-first, Enter submits, Up/Down recalls history ------------------------------
const history = [];
let historyIndex = -1;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (value.length === 0) return;
  client.sendIntent("command", { command: value });
  appendLogLine("echo", `> ${value}`);
  history.push(value);
  historyIndex = history.length;
  input.value = "";
});

input.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    if (historyIndex > 0) { historyIndex -= 1; input.value = history[historyIndex]; }
    event.preventDefault();
  } else if (event.key === "ArrowDown") {
    if (historyIndex < history.length - 1) { historyIndex += 1; input.value = history[historyIndex]; }
    else { historyIndex = history.length; input.value = ""; }
    event.preventDefault();
  }
});

input.focus();
document.addEventListener("click", () => input.focus());
