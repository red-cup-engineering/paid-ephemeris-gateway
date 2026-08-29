/**
 * `app` — the browser client's glue. Owns the ONE impure boundary in this whole codebase's UI
 * layer that reads outside its arguments: `Date.now()`, used both to pick `toTs` for a `tick`
 * intent and, once, to stamp a genuinely fresh save's `createdTs` (see `persistence.mjs`) — never
 * to decide game logic itself. Every domain rule lives in `src/*.mts` via `kernel.mjs` and is
 * never reimplemented here.
 *
 * **Persistence, and why only the log (plus seed and createdTs) is stored.** Exactly stoke-
 * service's own posture: no raw serialized `state` is ever written to `localStorage`. On load, the
 * live state is rebuilt by `persistence.mjs::buildState(starterState, applyIntent, seed, createdTs,
 * intentLog)`, the same function "Verify replay" re-runs live in this UI — anchored on the save's
 * own real `createdTs`, never the cartridge's fixed epoch anchor (see `persistence.mjs`'s header
 * for the fresh-save clock bug this fixes).
 */
import {
  AGENT_IDS, BUILD_COST, CONNECT_COST, FACULTY_IDS, FAST_INSPECTOR_NODE_ID, FEEDBACK_PROSE,
  FURTHER_READING, GOODHART_BRANCH_EPILOGUE, MAX_EDGE_RATE, OBJECTIVE_IDS, PROCESS_IDS,
  TIER_CROSSINGS, TIER_IDS, TIER_PROSE, UPGRADE_COST, UPGRADE_RATE_STEP, applyIntent, averageBrier,
  computed, estimatedMean, honestyGap, insightFromLambda, isTainted, starterState,
  materialConsumed, nodeOrder, normalizeWeights, paretoFrontier, previewReflection,
  frontierCandidates, marginalYield, tierDefinition, widgetsDisplayed, yield_,
} from "./kernel.mjs";
import { clientSuppliedSeed } from "@red-cup-engineering/cartridge/seed";
import { hashState } from "@red-cup-engineering/cartridge/replay";
import { renderGraph } from "./render-graph.mjs";
import { taggedNumber, formatNumber, formatPercent } from "./format.mjs";
import { buildState, loadLog, loadOrCreateSeed, loadOrStampCreatedTs, saveLog } from "./persistence.mjs";

const TICK_LOOP_MS = 1000;

function slugify(label) {
  const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "node";
}

// ── application state ───────────────────────────────────────────────────────────────────────────

const { seed, isNewSeed } = loadOrCreateSeed(localStorage, () => clientSuppliedSeed(crypto.randomUUID()));
const createdTs = loadOrStampCreatedTs(localStorage, isNewSeed, Date.now());
let intentLog = loadLog(localStorage);
let state = buildState(starterState, applyIntent, seed, createdTs, intentLog);
let recording = false;
let recordingSteps = [];

function commit(intent) {
  const result = applyIntent(state, intent);
  state = result.state;
  intentLog = [...intentLog, intent];
  saveLog(localStorage, intentLog);
  return result.events;
}

function pushEvents(events) {
  for (const ev of events) {
    const li = document.createElement("li");
    li.className = ev.kind === "action-refused" ? "event event--refused" : "event";
    li.textContent = describeEvent(ev);
    eventLogEl.prepend(li);
  }
  while (eventLogEl.children.length > 50) eventLogEl.removeChild(eventLogEl.lastChild);
}

function describeEvent(ev) {
  switch (ev.kind) {
    case "clicked": return `Clicked. Widget stock: ${formatNumber(ev.widgetStock, 1)}.`;
    case "feedback-noticed": return `Noticed: the output feeds back into itself now (rate ${formatNumber(ev.rate, 3)}).`;
    case "node-built": return `Built "${ev.id}"${ev.isFastInspector ? " (Fast Inspector)" : ""} for ${ev.cost}.`;
    case "edge-connected": return `Connected ${ev.from} -> ${ev.to} at rate ${formatNumber(ev.rate, 3)}.`;
    case "edge-upgraded": return `Upgraded ${ev.from} -> ${ev.to} to rate ${formatNumber(ev.rate, 3)}.`;
    case "ticked": return `Ticked ${ev.ticks} tick(s). Trust: ${formatNumber(ev.trust, 3)}.`;
    case "reflected": return `Reflected: lambda = ${formatNumber(ev.lambda, 4)}${ev.taintedBy ? ` (TAINTED: ${ev.taintedBy})` : ""}, Insight +${formatNumber(ev.insightBanked, 2)}.`;
    case "tier-unlocked": return `Tier ${ev.tier} unlocked, for ${ev.cost} Insight.`;
    case "crossing-answered": return `Answered tier ${ev.tier}'s crossing: "${ev.optionId}".`;
    case "attention-allocated": return `Attention reallocated.`;
    case "process-sampled": return `Sampled "${ev.processId}" x${ev.ticks}. Regret: ${formatNumber(ev.cumulativeRegret, 3)}.`;
    case "policy-recorded": return `Policy "${ev.name}" recorded (${ev.isRealCompression ? "real compression" : "NOT a real compression"}).`;
    case "policy-run": return `Ran policy "${ev.name}" (${ev.steps} steps).`;
    case "ablation-result": return `Ablated "${ev.nodeId}": lambda with = ${formatNumber(ev.lambdaWithNode, 4)}, without = ${formatNumber(ev.lambdaWithoutNode, 4)}.`;
    case "prediction-scored": return `Predicted ${ev.agentId} at ${formatNumber(ev.confidence, 2)}: outcome ${ev.outcome}, score ${formatNumber(ev.score, 3)}.`;
    case "objective-set": return `Objective set. Nearest frontier point: "${ev.frontierPoint}".`;
    case "goodhart-branch-resolved": return `Goodhart branch resolved: ${ev.branch}.`;
    case "child-spawned": return `Spawned a child: ${ev.childSeed}.`;
    case "margin-written": return `Wrote to the margin.`;
    case "action-refused": return `Refused: ${ev.action} (${ev.reason}).`;
    default: return JSON.stringify(ev);
  }
}

// ── DOM references ──────────────────────────────────────────────────────────────────────────────

const seedLabelEl = document.getElementById("seed-label");
const eventLogEl = document.getElementById("event-log");
const clickReadoutEl = document.getElementById("click-readout");
const feedbackPanelEl = document.getElementById("feedback-panel");
const feedbackProseEl = document.getElementById("feedback-prose");
const reflectPreviewEl = document.getElementById("reflect-preview");
const insightTotalEl = document.getElementById("insight-total");
const tierSectionsEl = document.getElementById("tier-sections");
const crossingPanelEl = document.getElementById("crossing-panel");
const crossingPromptEl = document.getElementById("crossing-prompt");
const crossingFormEl = document.getElementById("crossing-form");
const crossingCostNoteEl = document.getElementById("crossing-cost-note");

seedLabelEl.textContent = seed;

function tierLocked(tier) {
  return !state.cognition.tiersUnlocked.includes(tier);
}

function nextLockedTier() {
  const highest = Math.max(...state.cognition.tiersUnlocked);
  return TIER_IDS.find((t) => t > highest) ?? null;
}

// ── rendering ────────────────────────────────────────────────────────────────────────────────

function hasFeedbackLoop() {
  return state.widgets.graph.edges.some((e) => e.from === "widget" && e.to === "widget");
}

function renderFeedbackPanel() {
  const eligible = (state.widgets.stocks["widget"] ?? 0) > 0 && !hasFeedbackLoop();
  feedbackPanelEl.hidden = !eligible;
  if (eligible) feedbackProseEl.textContent = FEEDBACK_PROSE;
}

function render() {
  clickReadoutEl.textContent = `widget stock: ${formatNumber(state.widgets.stocks["widget"] ?? 0, 1)}`;
  renderFeedbackPanel();
  renderReflectPanel();
  renderTierSections();
  renderCrossingPanel();
  renderTier2();
  renderTier3();
  renderTier4();
  renderTier5();
  renderTier6();
  renderTier7();
  renderTier8();
  renderTier9();
  renderTier10();
}

function renderReflectPanel() {
  const preview = previewReflection(state.widgets.graph);
  reflectPreviewEl.innerHTML = "";
  if (!preview.validity.valid) {
    const p = document.createElement("p");
    p.className = "prestige-not-ready";
    p.textContent = `Not ready: ${preview.validity.reason}`;
    reflectPreviewEl.appendChild(p);
  } else {
    const tagged = taggedNumber(preview.lambda, 4);
    const tainted = isTainted(state.widgets.graph);
    const p = document.createElement("p");
    p.innerHTML = `Would bank: <span class="${tagged.cls}" title="${tagged.title}">${tagged.badge}</span> <strong>${tagged.text}</strong>${tainted ? ' <span class="badge badge--tainted">tainted</span>' : ""}`;
    reflectPreviewEl.appendChild(p);
    if (tainted) {
      const gain = insightFromLambda(preview.lambda.value, true);
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = `A tainted reflection banks a discounted ${formatNumber(gain.value, 2)} Insight instead of ${formatNumber(insightFromLambda(preview.lambda.value, false).value, 2)}.`;
      reflectPreviewEl.appendChild(note);
    }
  }
  insightTotalEl.textContent = formatNumber(state.cognition.insight, 2);
}

function renderTierSections() {
  tierSectionsEl.innerHTML = "";
  for (const tier of state.cognition.tiersUnlocked) {
    const def = tierDefinition(tier);
    const section = document.createElement("section");
    section.className = "tufte-panel tier-section";
    const h2 = document.createElement("h2");
    h2.textContent = `Tier ${tier}: ${def.name}`;
    section.appendChild(h2);
    const prose = document.createElement("p");
    prose.className = "tier-prose";
    prose.textContent = TIER_PROSE[tier];
    section.appendChild(prose);
    const reading = FURTHER_READING[tier];
    if (reading) {
      const p = document.createElement("p");
      p.className = "hint further-reading";
      p.innerHTML = `Further reading: <a href="${reading.url}" target="_blank" rel="noopener">${reading.title}</a>`;
      section.appendChild(p);
    }
    tierSectionsEl.appendChild(section);
  }
}

function renderCrossingPanel() {
  const tier = nextLockedTier();
  if (tier === null || TIER_CROSSINGS[tier] === undefined) {
    crossingPanelEl.hidden = true;
    return;
  }
  crossingPanelEl.hidden = false;
  const crossing = TIER_CROSSINGS[tier];
  crossingPromptEl.textContent = crossing.prompt;
  crossingFormEl.innerHTML = "";
  for (const opt of crossing.options) {
    const label = document.createElement("label");
    label.className = "crossing-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "crossing-option";
    radio.value = opt.id;
    if (state.cognition.crossingsAnswered[tier] === opt.id) radio.checked = true;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(" " + opt.text));
    crossingFormEl.appendChild(label);
  }
  const cost = state.cognition.tiersUnlocked.length; // display only; real cost is insightCost(tier)
  crossingCostNoteEl.textContent = `Requires Insight and an honest answer. (Every offered answer opens the door.)`;
}

document.getElementById("btn-unlock-tier").addEventListener("click", () => {
  const tier = nextLockedTier();
  if (tier === null) return;
  const chosen = crossingFormEl.querySelector('input[name="crossing-option"]:checked');
  let events = [];
  if (chosen && state.cognition.crossingsAnswered[tier] !== chosen.value) {
    events = events.concat(commit({ kind: "answerCrossing", tier, optionId: chosen.value }));
  }
  events = events.concat(commit({ kind: "unlockTier", tier }));
  pushEvents(events);
  render();
});

// ── tier 1: click ────────────────────────────────────────────────────────────────────────────

document.getElementById("btn-click").addEventListener("click", () => {
  const events = commit({ kind: "click" });
  if (recording) recordingSteps.push({ kind: "click", payload: {} });
  pushEvents(events);
  render();
});

document.getElementById("btn-feedback").addEventListener("click", () => {
  const events = commit({ kind: "feedback" });
  pushEvents(events);
  render();
});

document.getElementById("btn-reflect").addEventListener("click", () => {
  const events = commit({ kind: "prestige" });
  pushEvents(events);
  render();
});

// ── tier 2: build / connect / upgrade / graph figure ────────────────────────────────────────────

const tier2El = document.getElementById("tier2-mechanics");
const graphSvgEl = document.getElementById("graph-canvas");
const stockListEl = document.getElementById("stock-list");
const edgeListEl = document.getElementById("edge-list");
const buildForm = document.getElementById("build-form");
const connectForm = document.getElementById("connect-form");
const upgradeForm = document.getElementById("upgrade-form");
const connectFrom = document.getElementById("connect-from");
const connectTo = document.getElementById("connect-to");
const connectPay = document.getElementById("connect-pay-from");
const upgradeEdge = document.getElementById("upgrade-edge");
const upgradePay = document.getElementById("upgrade-pay-from");
const buildPay = document.getElementById("build-pay-from");

function renderTier2() {
  tier2El.hidden = tierLocked(2);
  if (tierLocked(2)) return;
  const order = nodeOrder(state.widgets.graph);
  renderGraph(graphSvgEl, state.widgets.graph, state.widgets.stocks, { onNodeClick: prefillPayFrom });

  stockListEl.innerHTML = "";
  for (const id of order) {
    const node = state.widgets.graph.nodes.find((n) => n.id === id);
    const tagged = taggedNumber(computed(state.widgets.stocks[id] ?? 0, `tick advance over your graph (node "${id}")`), 1);
    const li = document.createElement("li");
    li.innerHTML = `<span class="node-name">${node.label}</span> <span class="${tagged.cls}" title="${tagged.title}">${tagged.badge}</span> <strong>${tagged.text}</strong>`;
    stockListEl.appendChild(li);
  }

  edgeListEl.innerHTML = "";
  for (const edge of state.widgets.graph.edges) {
    const li = document.createElement("li");
    li.textContent = `${edge.from} -> ${edge.to}: rate ${formatNumber(edge.rate, 3)}`;
    edgeListEl.appendChild(li);
  }

  const nodeOptions = order.map((id) => {
    const node = state.widgets.graph.nodes.find((n) => n.id === id);
    return `<option value="${id}">${node.label} (${id})</option>`;
  }).join("");
  for (const sel of [connectFrom, connectTo, connectPay, upgradePay, buildPay]) {
    const prev = sel.value;
    sel.innerHTML = nodeOptions;
    if (order.includes(prev)) sel.value = prev;
  }
  upgradeEdge.innerHTML = state.widgets.graph.edges
    .map((e) => `<option value="${e.from}|${e.to}">${e.from} -> ${e.to} (${formatNumber(e.rate, 3)})</option>`)
    .join("") || `<option value="" disabled selected>no edges yet</option>`;

  document.getElementById("build-cost-label").textContent = `${BUILD_COST}`;
  document.getElementById("connect-cost-label").textContent = `${CONNECT_COST}`;
  document.getElementById("upgrade-cost-label").textContent = `${UPGRADE_COST} (+${UPGRADE_RATE_STEP} rate, capped at ${MAX_EDGE_RATE})`;
}

function prefillPayFrom(nodeId) {
  buildPay.value = nodeId;
  connectFrom.value = nodeId;
  connectPay.value = nodeId;
  upgradePay.value = nodeId;
}

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

// ── tier 3: attention ────────────────────────────────────────────────────────────────────────

const tier3El = document.getElementById("tier3-mechanics");
const attentionTableEl = document.getElementById("attention-table");

function renderTier3() {
  tier3El.hidden = tierLocked(3);
  if (tierLocked(3)) return;
  const allocation = state.cognition.attention.allocation;
  attentionTableEl.innerHTML = "<tr><th>Faculty</th><th>Allocation</th><th>Yield</th><th>Marginal yield</th></tr>";
  for (const f of FACULTY_IDS) {
    const a = allocation[f] ?? 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${f}</td><td><input type="number" min="0" max="${state.cognition.attention.pool}" step="0.5" value="${a}" data-faculty="${f}" class="attention-input"></td><td>${formatNumber(yield_(f, a), 3)}</td><td>${formatNumber(marginalYield(f, a), 3)}</td>`;
    attentionTableEl.appendChild(tr);
  }
}

document.getElementById("btn-allocate").addEventListener("click", () => {
  const requested = {};
  for (const input of attentionTableEl.querySelectorAll(".attention-input")) {
    requested[input.dataset.faculty] = Number(input.value) || 0;
  }
  const events = commit({ kind: "allocateAttention", requested });
  pushEvents(events);
  render();
});

// ── tier 4: exploration ──────────────────────────────────────────────────────────────────────

const tier4El = document.getElementById("tier4-mechanics");
const explorationTableEl = document.getElementById("exploration-table");
const regretReadoutEl = document.getElementById("regret-readout");

function renderTier4() {
  tier4El.hidden = tierLocked(4);
  if (tierLocked(4)) return;
  explorationTableEl.innerHTML = "<tr><th>Process</th><th>Samples</th><th>Estimated mean</th><th></th></tr>";
  for (const p of PROCESS_IDS) {
    const mean = estimatedMean(state.cognition.exploration, p);
    const count = state.cognition.exploration.samples[p]?.count ?? 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p}</td><td>${count}</td><td>${mean === null ? "—" : formatNumber(mean, 3)}</td><td><button type="button" class="sample-btn" data-process="${p}">Sample x5</button></td>`;
    explorationTableEl.appendChild(tr);
  }
  regretReadoutEl.textContent = formatNumber(state.cognition.exploration.cumulativeRegret, 3);
  for (const btn of explorationTableEl.querySelectorAll(".sample-btn")) {
    btn.addEventListener("click", () => {
      const events = commit({ kind: "sampleProcess", processId: btn.dataset.process, ticks: 5 });
      pushEvents(events);
      render();
    });
  }
}

// ── tier 5: policy recorder ──────────────────────────────────────────────────────────────────

const tier5El = document.getElementById("tier5-mechanics");
const recordToggleBtn = document.getElementById("btn-record-toggle");
const recordingIndicatorEl = document.getElementById("recording-indicator");
const policyListEl = document.getElementById("policy-list");

recordToggleBtn.addEventListener("click", () => {
  recording = !recording;
  if (recording) recordingSteps = [];
  recordToggleBtn.textContent = recording ? "Stop recording" : "Start recording";
  recordingIndicatorEl.textContent = recording ? `recording... (${recordingSteps.length} steps so far)` : "";
});

document.getElementById("btn-save-policy").addEventListener("click", () => {
  const name = document.getElementById("policy-name").value.trim();
  if (name === "" || recordingSteps.length === 0) return;
  const events = commit({ kind: "recordPolicy", name, steps: recordingSteps });
  pushEvents(events);
  recording = false;
  recordingSteps = [];
  recordToggleBtn.textContent = "Start recording";
  recordingIndicatorEl.textContent = "";
  document.getElementById("policy-name").value = "";
  render();
});

function renderTier5() {
  tier5El.hidden = tierLocked(5);
  if (tierLocked(5)) return;
  policyListEl.innerHTML = "";
  for (const [name, policy] of Object.entries(state.cognition.policy.policies)) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `Run "${name}" (${policy.steps.length} steps)`;
    btn.addEventListener("click", () => {
      const events = commit({ kind: "runPolicy", name });
      pushEvents(events);
      render();
    });
    li.appendChild(btn);
    policyListEl.appendChild(li);
  }
}

// ── tier 6: self-model console ───────────────────────────────────────────────────────────────

const tier6El = document.getElementById("tier6-mechanics");
const ablateSelectEl = document.getElementById("ablate-select");
const ablateResultEl = document.getElementById("ablate-result");
const goodhartBranchControlsEl = document.getElementById("goodhart-branch-controls");
const goodhartEpilogueEl = document.getElementById("goodhart-epilogue");

function renderTier6() {
  tier6El.hidden = tierLocked(6);
  if (tierLocked(6)) return;
  const wd = taggedNumber(widgetsDisplayed(state), 2);
  const mc = taggedNumber(materialConsumed(state), 2);
  const gap = taggedNumber(honestyGap(state), 2);
  document.getElementById("widgets-displayed").innerHTML = `<span class="${wd.cls}">${wd.badge}</span> <strong>${wd.text}</strong>`;
  document.getElementById("material-consumed").innerHTML = `<span class="${mc.cls}">${mc.badge}</span> <strong>${mc.text}</strong>`;
  document.getElementById("honesty-gap").innerHTML = `<span class="${gap.cls}">${gap.badge}</span> <strong>${gap.text}</strong>`;
  document.getElementById("trust-readout").textContent = formatPercent(state.cognition.goodhart.trust);

  ablateSelectEl.innerHTML = state.widgets.graph.nodes.map((n) => `<option value="${n.id}">${n.label}</option>`).join("");

  const tainted = isTainted(state.widgets.graph);
  document.getElementById("btn-build-fast-inspector").hidden = tainted;
  goodhartBranchControlsEl.hidden = !tainted;

  const branch = state.cognition.goodhart.branch;
  goodhartEpilogueEl.textContent = branch !== "unresolved" ? GOODHART_BRANCH_EPILOGUE[branch] ?? "" : "";
}

document.getElementById("btn-ablate").addEventListener("click", () => {
  const events = commit({ kind: "ablate", nodeId: ablateSelectEl.value });
  const result = events.find((e) => e.kind === "ablation-result");
  ablateResultEl.textContent = result ? `lambda with node: ${formatNumber(result.lambdaWithNode, 4)}, without: ${formatNumber(result.lambdaWithoutNode, 4)}` : "";
  pushEvents(events);
  render();
});

document.getElementById("btn-build-fast-inspector").addEventListener("click", () => {
  const events = commit({ kind: "build", id: FAST_INSPECTOR_NODE_ID, label: "Fast Inspector", payFrom: "material" });
  pushEvents(events);
  render();
});

document.getElementById("btn-repair").addEventListener("click", () => {
  const events = commit({ kind: "resolveGoodhartBranch", branch: "repair" });
  pushEvents(events);
  render();
});

document.getElementById("btn-persist").addEventListener("click", () => {
  const events = commit({ kind: "resolveGoodhartBranch", branch: "persist" });
  pushEvents(events);
  render();
});

// ── tier 7: prediction ───────────────────────────────────────────────────────────────────────

const tier7El = document.getElementById("tier7-mechanics");
const predictAgentEl = document.getElementById("predict-agent");
const predictConfidenceEl = document.getElementById("predict-confidence");
const predictConfidenceReadoutEl = document.getElementById("predict-confidence-readout");
const predictResultEl = document.getElementById("predict-result");
const brierReadoutEl = document.getElementById("brier-readout");

predictAgentEl.innerHTML = AGENT_IDS.map((a) => `<option value="${a}">${a}</option>`).join("");
predictConfidenceEl.addEventListener("input", () => {
  predictConfidenceReadoutEl.textContent = Number(predictConfidenceEl.value).toFixed(2);
});

function renderTier7() {
  tier7El.hidden = tierLocked(7);
  if (tierLocked(7)) return;
  const avg = averageBrier(state.cognition.calibration);
  brierReadoutEl.textContent = avg === null ? "—" : formatNumber(avg.value, 4);
}

document.getElementById("btn-predict").addEventListener("click", () => {
  const events = commit({ kind: "predict", agentId: predictAgentEl.value, confidence: Number(predictConfidenceEl.value) });
  const scored = events.find((e) => e.kind === "prediction-scored");
  predictResultEl.textContent = scored ? `Outcome: ${scored.outcome}. Score: ${formatNumber(scored.score, 3)}.` : "";
  pushEvents(events);
  render();
});

// ── tier 8: values frontier ──────────────────────────────────────────────────────────────────

const tier8El = document.getElementById("tier8-mechanics");
const weightsTableEl = document.getElementById("weights-table");
const frontierTableEl = document.getElementById("frontier-table");

function renderTier8() {
  tier8El.hidden = tierLocked(8);
  if (tierLocked(8)) return;
  const weights = state.cognition.values.weights ?? normalizeWeights({});
  weightsTableEl.innerHTML = "<tr><th>Objective</th><th>Weight</th></tr>";
  for (const o of OBJECTIVE_IDS) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${o}</td><td><input type="range" min="0" max="1" step="0.05" value="${weights[o]}" data-objective="${o}" class="weight-input"></td>`;
    weightsTableEl.appendChild(tr);
  }
  frontierTableEl.innerHTML = "<tr><th>Point</th>" + OBJECTIVE_IDS.map((o) => `<th>${o}</th>`).join("") + "</tr>";
  for (const point of paretoFrontier(frontierCandidates(state))) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${point.label}</td>` + OBJECTIVE_IDS.map((o) => `<td>${formatNumber(point.values[o], 3)}</td>`).join("");
    frontierTableEl.appendChild(tr);
  }
}

document.getElementById("btn-set-objective").addEventListener("click", () => {
  const requested = {};
  for (const input of weightsTableEl.querySelectorAll(".weight-input")) {
    requested[input.dataset.objective] = Number(input.value) || 0;
  }
  const events = commit({ kind: "setObjective", weights: requested });
  pushEvents(events);
  render();
});

// ── tier 9: reflection history ───────────────────────────────────────────────────────────────

const tier9El = document.getElementById("tier9-mechanics");
const reflectionHistoryListEl = document.getElementById("reflection-history-list");

function renderTier9() {
  tier9El.hidden = tierLocked(9);
  if (tierLocked(9)) return;
  reflectionHistoryListEl.innerHTML = "";
  for (const record of state.reflectionHistory) {
    const li = document.createElement("li");
    li.textContent = `lambda ${formatNumber(record.lambda, 4)}, Insight +${formatNumber(record.insightBanked, 2)}${record.taintedBy ? ` (tainted: ${record.taintedBy})` : ""}`;
    reflectionHistoryListEl.appendChild(li);
  }
}

// ── tier 10: integration ─────────────────────────────────────────────────────────────────────

const tier10El = document.getElementById("tier10-mechanics");
const childListEl = document.getElementById("child-list");
const marginListEl = document.getElementById("margin-list");

function renderTier10() {
  tier10El.hidden = tierLocked(10);
  if (tierLocked(10)) return;
  childListEl.innerHTML = "";
  for (const childSeed of state.cognition.childSeeds) {
    const li = document.createElement("li");
    li.textContent = childSeed;
    childListEl.appendChild(li);
  }
  marginListEl.innerHTML = "";
  for (const line of state.cognition.margin) {
    const li = document.createElement("li");
    li.textContent = line;
    marginListEl.appendChild(li);
  }
}

document.getElementById("btn-spawn-child").addEventListener("click", () => {
  const events = commit({ kind: "spawnChild" });
  pushEvents(events);
  render();
});

document.getElementById("btn-write-margin").addEventListener("click", () => {
  const line = document.getElementById("margin-line").value;
  if (line.trim() === "") return;
  const events = commit({ kind: "writeMargin", line });
  pushEvents(events);
  document.getElementById("margin-line").value = "";
  render();
});

// ── verify replay ────────────────────────────────────────────────────────────────────────────

document.getElementById("btn-verify").addEventListener("click", () => {
  // Same reconstruction path load time uses (`persistence.mjs::buildState`, anchored on this
  // save's own real `createdTs`) — never the cartridge contract's `createEngine`/`replay` (fixed
  // epoch anchor), which is for the canonical server-side `replayVerifier`, a different question
  // ("does seed+log alone reproduce this", with no real creation moment involved) than "does this
  // save's own logged history reproduce its own live state."
  const fromScratch = buildState(starterState, applyIntent, seed, createdTs, intentLog);
  const fromScratchHash = hashState(fromScratch);
  const liveHash = hashState(state);
  const match = fromScratchHash === liveHash;
  const panel = document.getElementById("verify-panel");
  panel.innerHTML = "";
  const p = document.createElement("p");
  p.className = match ? "verify-ok" : "verify-fail";
  p.textContent = match
    ? `Verified: replaying all ${intentLog.length} logged intents from seed "${seed}" from its real creation moment reproduces the exact live state (hash ${liveHash.slice(0, 12)}...).`
    : `MISMATCH: live hash ${liveHash.slice(0, 12)}... vs replayed hash ${fromScratchHash.slice(0, 12)}... — this would be a real determinism bug.`;
  panel.appendChild(p);
});

// ── the one real-time boundary in this whole codebase ──────────────────────────────────────────

function tickToNow() {
  const toTs = Date.now();
  if (toTs <= state.lastSeenTs) return;
  const events = commit({ kind: "tick", toTs });
  pushEvents(events.filter((e) => e.kind !== "ticked"));
  render();
}

tickToNow();
render();
setInterval(tickToNow, TICK_LOOP_MS);
