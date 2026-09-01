import { connectRoom } from "/vendor/qwzspace/client-browser.mjs";
import { createTufteRoomModel } from "/vendor/qwzspace/tufte.mjs";
import { applyTufteProjectionPatch, diffTufteProjection, normalizeTufteModel } from "/vendor/tufte/tufte-browser.mjs";
import { connectTufteWorkspace } from "/vendor/tufte/tufte-topology.mjs";
import { farstoneRoomOptions } from "./farstone-view.mjs";

const root = document.querySelector("[data-tufte]");
// User-driven tiling: drag the splitters, arrow-key resize on a focused
// splitter, Alt+Shift+Arrow to swap panes; the arrangement persists locally.
const workspaceHandle = connectTufteWorkspace(root, { storageKey: "farstone.workspace" });
let client = null;
let frame = null;
let name = "";
let connection = "disconnected";
let transcript = [];
let seenEvents = new Set();
let lastPlace = null;
const history = [];
let historyIndex = 0;
let projection = normalizeTufteModel(createTufteRoomModel(farstoneRoomOptions(null, { transcript })));

function append(text, kind = "output") {
  for (const line of String(text ?? "").split("\n")) transcript.push({ text: line, kind });
  if (transcript.length > 500) transcript = transcript.slice(-500);
}

function describePlace(nextFrame) {
  const place = nextFrame?.place;
  if (!place || place.id === lastPlace) return;
  lastPlace = place.id;
  append(place.name ?? "Somewhere", "room-name");
  append(place.description ?? "");
  const occupants = (nextFrame.occupants ?? []).map(({ name: occupant }) => occupant).filter(Boolean);
  if (occupants.length) append(`Also here: ${occupants.join(", ")}.`);
  const exits = place.exits ?? [];
  append(`Obvious exits: ${exits.length ? exits.join(", ") : "none"}.`, "exits");
}

function absorbFrame(nextFrame) {
  frame = nextFrame ?? frame;
  if (!frame) return;
  describePlace(frame);
  const occurrences = new Map();
  for (const event of (frame.recentEvents ?? [])) {
    const signature = `${event.tick ?? ""}\u0000${event.channel ?? ""}\u0000${event.text ?? ""}`;
    const occurrence = occurrences.get(signature) ?? 0;
    occurrences.set(signature, occurrence + 1);
    const key = `${signature}\u0000${occurrence}`;
    if (seenEvents.has(key)) continue;
    seenEvents.add(key);
    append(event.text);
  }
}

function render() {
  const next = normalizeTufteModel(createTufteRoomModel(farstoneRoomOptions(frame, { connection, name, transcript })));
  applyTufteProjectionPatch(root, diffTufteProjection(projection, next));
  projection = next;
  workspaceHandle.refresh?.();
  const log = document.querySelector("#farstone-transcript");
  if (log) log.scrollTop = log.scrollHeight;
}

async function settleTick() {
  const response = await fetch("/qwzspace/tick", { method: "POST" });
  if (!response.ok) {
    connection = "error";
    render();
  }
  return response;
}

function start(nextName) {
  client?.close();
  name = nextName;
  transcript = [];
  seenEvents = new Set();
  lastPlace = null;
  append(`Connecting as ${name}…`, "system");
  connection = "joining";
  render();
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  client = connectRoom(`${scheme}//${location.host}/`, {
    name,
    onState(state) {
      connection = state;
      if (state === "joining") void settleTick();
      if (state === "snapshot" || state === "delta" || state === "playing") {
        absorbFrame(client?.view.me());
      }
      // Joining settles presence first; the following tick produces the first perception frame.
      if (state === "playing" && !frame) void settleTick();
      render();
    },
  });
  client.view.on("snapshot", () => {
    absorbFrame(client.view.me());
    connection = "playing";
    if (!transcript.some(({ text }) => text === `Connected as ${name}.`)) {
      transcript.splice(1, 0, { text: `Connected as ${name}.`, kind: "system" });
      append("Type help for commands.", "system");
    }
    render();
  });
}

async function send(command) {
  const value = String(command ?? "").trim();
  if (!client || !value) return;
  append(`> ${value}`, "command");
  history.push(value);
  historyIndex = history.length;
  render();
  client.sendIntent("command", { command: value });
  await settleTick();
}

document.addEventListener("submit", (event) => {
  if (event.target?.id === "farstone-connect") {
    event.preventDefault();
    start(new FormData(event.target).get("name")?.toString().trim() || "wanderer");
  }
  if (event.target?.id === "farstone-command") {
    event.preventDefault();
    const input = event.target.elements.namedItem("command");
    void send(input?.value);
    if (input) input.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target?.id !== "farstone-command-text" || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  historyIndex = event.key === "ArrowUp"
    ? Math.max(0, historyIndex - 1)
    : Math.min(history.length, historyIndex + 1);
  event.target.value = history[historyIndex] ?? "";
  event.target.setSelectionRange(event.target.value.length, event.target.value.length);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-farstone-command]");
  if (button) void send(button.dataset.farstoneCommand);
});
