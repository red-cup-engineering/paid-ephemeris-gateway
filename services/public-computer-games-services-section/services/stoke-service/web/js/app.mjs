/**
 * `app` — the browser client's glue. Owns the ONE impure boundary this whole codebase has: the
 * real-time loop that reads `Date.now()` and turns it into a `tick` intent. Every domain rule
 * (what a tick DOES, what building/connecting/upgrading/prestiging DO) lives in `src/*.mts`
 * (via `kernel.mjs`) and is never reimplemented here — this file only decides WHEN to call those
 * pure functions and how to paint their output.
 *
 * **Persistence model, and why it's the honest one for a cartridge-native game.** Only `seed` and
 * the full `intentLog` are ever written to `localStorage` — never a raw serialized `state`. On
 * load, the live state is rebuilt by `replay(seed, intentLog)`, exactly the same function
 * `cartridge.test.mts`'s determinism tests call, on the exact same log a "replay to verify"
 * button re-runs live in this UI (see `runVerify` below). If persisted state and persisted log
 * could ever silently disagree, that would be a real, if boring, bug; storing only the log makes
 * that class of bug structurally impossible — there is only ever one source of truth.
 */
import {
  BUILD_COST, CONNECT_COST, MAX_EDGE_RATE, UPGRADE_COST, UPGRADE_RATE_STEP,
  TICK_INTERVAL_MS, applyIntent, computed, createEngine, nodeOrder, previewPrestige, replay,
} from "./kernel.mjs";
import { clientSuppliedSeed } from "@red-cup-engineering/cartridge/seed";
import { hashState } from "@red-cup-engineering/cartridge/replay";
import { renderGraph } from "./render-graph.mjs";
import { taggedNumber, formatNumber, formatPercent } from "./format.mjs";

const STORAGE_SEED_KEY = "stoke-seed-v1";
const STORAGE_LOG_KEY = "stoke-intent-log-v1";
const TICK_LOOP_MS = 1000;

function loadOrCreateSeed() {
  const existing = localStorage.getItem(STORAGE_SEED_KEY);
  if (existing) return existing;
  const raw = crypto.randomUUID();
  const seed = clientSuppliedSeed(raw);
  localStorage.setItem(STORAGE_SEED_KEY, seed);
  return seed;
}

function loadLog() {
  try {
    const raw = localStorage.getItem(STORAGE_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLog(log) {
  localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(log));
}

function slugify(label) {
  const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "node";
}

// ── application state (module-level, single instance — this file IS the composition root) ─────

const seed = loadOrCreateSeed();
let intentLog = loadLog();
let state = intentLog.length > 0 ? replay(seed, intentLog).finalState : createEngine(seed);

function commit(intent) {
  const result = applyIntent(state, intent);
  state = result.state;
  intentLog = [...intentLog, intent];
  saveLog(intentLog);
  return result.events;
}

function pushEvents(events) {
  for (const ev of events) {
    const li = document.createElement("li");
    li.className = ev.kind === "action-refused" ? "event event--refused" : "event";
    li.textContent = describeEvent(ev);
    eventLogEl.prepend(li);
  }
  while (eventLogEl.children.length > 40) eventLogEl.removeChild(eventLogEl.lastChild);
}

function describeEvent(ev) {
  switch (ev.kind) {
    case "node-built": return `Built "${ev.id}" for ${ev.cost} (paid from ${ev.payFrom}).`;
    case "edge-connected": return `Connected ${ev.from} -> ${ev.to} at rate ${ev.rate} for ${ev.cost}.`;
    case "edge-upgraded": return `Upgraded ${ev.from} -> ${ev.to} to rate ${formatNumber(ev.rate, 3)} for ${ev.cost}.`;
    case "prestiged": return `Prestiged: lambda = ${formatNumber(ev.lambda, 4)} (computed), mixture banked.`;
    case "ticked": return `Ticked ${ev.ticks} tick(s).`;
    case "action-refused": return `Refused: ${ev.action} (${ev.reason}).`;
    default: return JSON.stringify(ev);
  }
}

// ── DOM references ──────────────────────────────────────────────────────────────────────────

const seedLabelEl = document.getElementById("seed-label");
const graphSvgEl = document.getElementById("graph-canvas");
const stockListEl = document.getElementById("stock-list");
const edgeListEl = document.getElementById("edge-list");
const eventLogEl = document.getElementById("event-log");
const prestigePanelEl = document.getElementById("prestige-panel");
const verifyPanelEl = document.getElementById("verify-panel");
const buildForm = document.getElementById("build-form");
const connectForm = document.getElementById("connect-form");
const upgradeForm = document.getElementById("upgrade-form");
const prestigeButton = document.getElementById("btn-prestige");
const verifyButton = document.getElementById("btn-verify");
const connectFrom = document.getElementById("connect-from");
const connectTo = document.getElementById("connect-to");
const connectPay = document.getElementById("connect-pay-from");
const upgradeEdge = document.getElementById("upgrade-edge");
const upgradePay = document.getElementById("upgrade-pay-from");
const buildPay = document.getElementById("build-pay-from");

seedLabelEl.textContent = seed;

// ── rendering ────────────────────────────────────────────────────────────────────────────────

function render() {
  const order = nodeOrder(state.graph);

  renderGraph(graphSvgEl, state.graph, state.stocks, { onNodeClick: (id) => prefillPayFrom(id) });

  stockListEl.innerHTML = "";
  for (const id of order) {
    const node = state.graph.nodes.find((n) => n.id === id);
    const tagged = taggedNumber(computed(state.stocks[id] ?? 0, `tick advance over your graph (node "${id}")`), 1);
    const li = document.createElement("li");
    li.innerHTML = `<span class="node-name">${node.label}</span> <span class="${tagged.cls}" title="${tagged.title}">${tagged.badge}</span> <strong>${tagged.text}</strong>`;
    stockListEl.appendChild(li);
  }

  edgeListEl.innerHTML = "";
  for (const edge of state.graph.edges) {
    const li = document.createElement("li");
    li.textContent = `${edge.from} -> ${edge.to}: rate ${formatNumber(edge.rate, 3)}`;
    edgeListEl.appendChild(li);
  }

  // Node option lists, shared by build/connect/upgrade forms.
  const nodeOptions = order.map((id) => {
    const node = state.graph.nodes.find((n) => n.id === id);
    return `<option value="${id}">${node.label} (${id})</option>`;
  }).join("");
  for (const sel of [connectFrom, connectTo, connectPay, upgradePay, buildPay]) {
    const prev = sel.value;
    sel.innerHTML = nodeOptions;
    if (order.includes(prev)) sel.value = prev;
  }
  upgradeEdge.innerHTML = state.graph.edges
    .map((e) => `<option value="${e.from}|${e.to}">${e.from} -> ${e.to} (${formatNumber(e.rate, 3)})</option>`)
    .join("") || `<option value="" disabled selected>no edges yet</option>`;

  renderPrestigePanel();
  renderCostLabels();
}

function renderCostLabels() {
  document.getElementById("build-cost-label").textContent = `${BUILD_COST}`;
  document.getElementById("connect-cost-label").textContent = `${CONNECT_COST}`;
  document.getElementById("upgrade-cost-label").textContent = `${UPGRADE_COST} (+${UPGRADE_RATE_STEP} rate, capped at ${MAX_EDGE_RATE})`;
}

function renderPrestigePanel() {
  const preview = previewPrestige(state.graph);
  prestigePanelEl.innerHTML = "";
  if (!preview.validity.valid) {
    const p = document.createElement("p");
    p.className = "prestige-not-ready";
    p.textContent = `Prestige not available: ${preview.validity.reason}`;
    prestigePanelEl.appendChild(p);
    prestigeButton.disabled = true;
    return;
  }
  prestigeButton.disabled = false;
  const lambdaTagged = taggedNumber(preview.lambda, 5);
  const lambdaP = document.createElement("p");
  lambdaP.innerHTML = `Growth rate (lambda): <span class="${lambdaTagged.cls}" title="${lambdaTagged.title}">${lambdaTagged.badge}</span> <strong>${lambdaTagged.text}</strong>`;
  prestigePanelEl.appendChild(lambdaP);

  const mixtureTitle = document.createElement("p");
  mixtureTitle.textContent = "Prestige loadout (the mixture you'd hold fixed):";
  prestigePanelEl.appendChild(mixtureTitle);
  const ul = document.createElement("ul");
  ul.className = "mixture-list";
  const mixtureValue = preview.mixture.value;
  for (const [id, share] of Object.entries(mixtureValue)) {
    const node = state.graph.nodes.find((n) => n.id === id);
    const li = document.createElement("li");
    li.innerHTML = `${node?.label ?? id}: <span class="badge badge--computed" title="${preview.mixture.label}">computed</span> <strong>${formatPercent(share)}</strong>`;
    ul.appendChild(li);
  }
  prestigePanelEl.appendChild(ul);
  const history = document.createElement("p");
  history.className = "prestige-history-note";
  history.textContent = `Resets so far: ${state.prestigeHistory.length}. Each reset banks its own lambda; the starting-stock bonus on your next run is a designer-authored curve (see the "authored" badge after you reset), never blended into lambda itself.`;
  prestigePanelEl.appendChild(history);
}

function prefillPayFrom(nodeId) {
  buildPay.value = nodeId;
  connectFrom.value = nodeId;
  connectPay.value = nodeId;
  upgradePay.value = nodeId;
}

// ── form wiring ──────────────────────────────────────────────────────────────────────────────

buildForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const label = document.getElementById("build-label").value.trim();
  if (label === "") return;
  const id = slugify(label);
  const events = commit({ kind: "build", id, label, payFrom: buildPay.value });
  pushEvents(events);
  document.getElementById("build-label").value = "";
  render();
});

connectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const events = commit({ kind: "connect", from: connectFrom.value, to: connectTo.value, payFrom: connectPay.value });
  pushEvents(events);
  render();
});

upgradeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const [from, to] = (upgradeEdge.value || "").split("|");
  if (!from || !to) return;
  const events = commit({ kind: "upgrade", from, to, payFrom: upgradePay.value });
  pushEvents(events);
  render();
});

prestigeButton.addEventListener("click", () => {
  const events = commit({ kind: "prestige" });
  pushEvents(events);
  render();
});

verifyButton.addEventListener("click", () => {
  const fromScratch = replay(seed, intentLog);
  const liveHash = hashState(state);
  const match = fromScratch.stateHash === liveHash;
  verifyPanelEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = match ? "verify-ok" : "verify-fail";
  p.textContent = match
    ? `Verified: replaying all ${intentLog.length} logged intents from seed "${seed}" from scratch reproduces the exact live state (hash ${liveHash.slice(0, 12)}...).`
    : `MISMATCH: live hash ${liveHash.slice(0, 12)}... vs replayed hash ${fromScratch.stateHash.slice(0, 12)}... — this would be a real determinism bug.`;
  verifyPanelEl.appendChild(p);
});

// ── the one real-time boundary in this whole codebase ──────────────────────────────────────────

function tickToNow() {
  const toTs = Date.now();
  if (toTs <= state.lastSeenTs) return;
  const events = commit({ kind: "tick", toTs });
  pushEvents(events.filter((e) => e.kind !== "ticked")); // the routine per-second tick isn't worth a log line; refusals still are
  render();
}

// Catch up once immediately (covers "reopened the tab after N days" in exactly the one call
// tick.mts's advance() is built for), then keep ticking once a second while the tab is open.
tickToNow();
render();
setInterval(tickToNow, TICK_LOOP_MS);
