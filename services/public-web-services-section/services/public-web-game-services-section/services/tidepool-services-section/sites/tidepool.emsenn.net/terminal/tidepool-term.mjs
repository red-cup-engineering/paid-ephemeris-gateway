#!/usr/bin/env node
// tidepool-term — the terminal face (design §5.2), a small `stack()` of arnold's own published
// shelf primitives (Screen, layout.stack, widgets.text/list/input/statusLine) over qwzspace's
// Node client SDK (`client-node.mjs`'s `connectRoom`). Consumes arnold's PUBLISHED surface only —
// never touches arnold's own tree, matching the concurrent terminal-flagship lane's boundary
// (per the task's own instruction).
//
// Layout, top to bottom, exactly as design §5.2 lays it out:
//   top:    text       — room name + description (from the perception frame)
//   middle: list       — occupants and their affordances
//   bottom: statusLine — tick/tide/weather/season (from frame.clock)
//   input row: input/editInput — the command line, submitted via client-node.mjs's client

import process from "node:process";
import { Screen } from "@red-cup-engineering/arnold/app";
import { stack, inset } from "@red-cup-engineering/arnold/layout";
import { box, input as drawInput, editInput, list, statusLine, text } from "@red-cup-engineering/arnold/widgets";
// TRANSPORT NOTE (2026-08-20, found running the live-deploy mixed session): connects via
// `../agents/ws-transport.mjs`, not qwzspace's own `client-node` `connectRoom` directly — that
// transport cannot actually do `wss://` (see that file's header for the real bug), which would
// have made this terminal face, exactly as originally shipped, unable to reach any real TLS
// deployment (Cloud Run included) despite being a documented human-facing surface.
import { connectRoomOverAnyScheme as connectRoom } from "../agents/ws-transport.mjs";

const HOST = process.env["TIDEPOOL_HOST"] ?? "127.0.0.1";
const PORT = process.env["TIDEPOOL_PORT"] ?? "18830";
const NAME = process.argv[2] ?? process.env["TIDEPOOL_NAME"] ?? `guest-${Math.random().toString(36).slice(2, 6)}`;
// TIDEPOOL_WS_URL: full-URL override for a real deployed host (wss:// on 443) — additive only,
// HOST/PORT keep working unchanged for local dev.
const url = process.env["TIDEPOOL_WS_URL"] ?? `ws://${HOST}:${PORT}/`;

// --- mutable app state (arnold's own `run()` expects a synchronous reducer; this app's real
// state changes arrive asynchronously off the websocket, so it drives arnold's lower-level
// Screen directly — start/onKey/render/paint — and re-renders on EITHER a keystroke or a fresh
// frame, whichever comes first, per app.d.ts's own documented surface). ------------------------
const state = {
  frame: null,
  inputState: { value: "", cursor: 0 },
  history: [],
  historyIndex: 0,
  log: [],
  seenEventKeys: new Set(),
  connStatus: "connecting",
};

function pushLog(line) {
  state.log.push(line);
  while (state.log.length > 200) state.log.shift();
}

function ingestFrame(frame) {
  if (!frame || frame.kind !== "tidepool.perception.v1") return;
  state.frame = frame;
  for (const ev of frame.recentEvents ?? []) {
    const key = `${ev.tick}:${ev.channel}:${ev.text}`;
    if (state.seenEventKeys.has(key)) continue;
    state.seenEventKeys.add(key);
    pushLog(`(${ev.channel}) ${ev.text}`);
  }
  render();
}

// --- rendering -------------------------------------------------------------------------------
const screen = new Screen();

function render() {
  screen.render((buf, rect) => {
    const rows = stack(rect, [3, null, 1, 3]); // top text, middle (flexible) list, statusLine, input
    const [topRect, midRect, statusRect, inputRect] = rows;

    box(buf, topRect, { title: state.frame?.place?.name ?? "Tidepool" });
    const topInner = inset(topRect, 1, 1, 1, 1);
    const description = state.frame?.place?.description ?? "Connecting to the shore…";
    const exitsLine = state.frame?.place?.exits?.length
      ? `Exits: ${state.frame.place.exits.join(", ")}`
      : "";
    text(buf, topInner, [description, exitsLine].filter(Boolean));

    box(buf, midRect, { title: "here / you can / log" });
    const midInner = inset(midRect, 1, 1, 1, 1);
    const here = (state.frame?.subjects ?? []).find((s) => s.id === state.frame?.place?.id);
    const occupantLines = (state.frame?.occupants ?? []).map((o) => `who: ${o.name}`);
    const affordanceLines = (here?.affordances ?? []).map((a) => `can: ${a}`);
    const logLines = state.log.slice(-40).map((line) => `· ${line}`);
    const items = [...occupantLines, ...affordanceLines, "", ...logLines];
    list(buf, midInner, items.length > 0 ? items : ["(nothing yet)"], { selected: -1 });

    const clock = state.frame?.clock;
    statusLine(buf, statusRect, {
      left: `tick ${state.frame?.tick ?? 0}`,
      center: clock ? `${clock.phase}, ${clock.season} · tide ${clock.tide} · ${clock.weather}` : "…",
      right: state.connStatus,
    });

    box(buf, inputRect, {});
    drawInput(buf, inset(inputRect, 1, 1, 1, 1), state.inputState, { prompt: `${NAME}> ` });
  });
}

// --- connection --------------------------------------------------------------------------------
const client = connectRoom(url, {
  name: NAME,
  onState(s) {
    state.connStatus = s;
    render();
  },
});
client.view.on("me", ({ snap }) => ingestFrame(snap));

// --- input handling ------------------------------------------------------------------------------
screen.onKey((key) => {
  if (key.name === "return" || key.name === "enter") {
    const value = state.inputState.value.trim();
    if (value.length > 0) {
      client.sendIntent("command", { command: value });
      pushLog(`> ${value}`);
      state.history.push(value);
      state.historyIndex = state.history.length;
    }
    state.inputState = { value: "", cursor: 0 };
    render();
    return;
  }
  if (key.name === "up") {
    if (state.historyIndex > 0) {
      state.historyIndex -= 1;
      state.inputState = { value: state.history[state.historyIndex], cursor: state.history[state.historyIndex].length };
    }
    render();
    return;
  }
  if (key.name === "down") {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex += 1;
      state.inputState = { value: state.history[state.historyIndex], cursor: state.history[state.historyIndex].length };
    } else {
      state.historyIndex = state.history.length;
      state.inputState = { value: "", cursor: 0 };
    }
    render();
    return;
  }
  if ((key.name === "c" && key.ctrl) || key.name === "escape") {
    shutdown();
    return;
  }
  state.inputState = editInput(state.inputState, key);
  render();
});

screen.onInterrupt(() => shutdown());
screen.onResize(() => render());

function shutdown() {
  client.close();
  screen.stop();
  process.exit(0);
}

screen.start();
render();
process.stdout.write(""); // keep stdout flushed before the alt-screen paints
