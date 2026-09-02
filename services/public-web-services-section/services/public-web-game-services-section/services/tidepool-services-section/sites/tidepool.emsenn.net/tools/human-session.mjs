#!/usr/bin/env node
// human-session — a scripted stand-in for the "connect as a human via the web face" leg of a
// mixed-session deploy test. Speaks the IDENTICAL wire protocol the real browser client speaks
// (src/web/tidepool-client.mjs's own `client.sendIntent("command", { command })`) — no headless
// browser available in this environment, so this is disclosed as protocol-identical scripted
// play, not literal DOM automation. A fixed narrative script (deliberate pacing, not a policy
// function) — the "human" player of a mixed session, distinct from the zero-LLM reference bots.

import process from "node:process";
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node";

const NAME = process.argv[2] ?? process.env["TIDEPOOL_HUMAN_NAME"] ?? "morgan";
const url = process.env["TIDEPOOL_WS_URL"] ?? "ws://127.0.0.1:18830/";
const healthUrl = process.env["TIDEPOOL_HTTP_URL"] ?? "http://127.0.0.1:18830/health";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ts() {
  return new Date().toISOString();
}

const seenEventKeys = new Set();
function logEvents(frame) {
  for (const ev of frame.recentEvents ?? []) {
    const key = `${ev.tick}:${ev.channel}:${ev.text}`;
    if (seenEventKeys.has(key)) continue;
    seenEventKeys.add(key);
    process.stdout.write(`[${ts()}] [tick ${ev.tick}] (${ev.channel}) ${ev.text}\n`);
  }
}

let lastFrame = null;
// TWO real gaps found running this live (2026-08-20), both fixed here (this script only, never
// qwzspace's tree):
//
// 1. A command sent while the socket has reopened but the room-level resume handshake
//    ("resuming" -> "resumed") hasn't finished yet can be silently dropped -- the underlying
//    WebSocket is already OPEN (so send() transmits) but the server hasn't yet re-bound the
//    connection to the actor, so the intent never lands and no error comes back. Reproduced
//    live: a `go east` sent during exactly that window never took effect, and the actor was
//    left stuck one room off-route for a while (harmless -- every follow-up command just got
//    graceful "no exit"/"nothing here" totality responses). Fixed by tracking connection state
//    and holding sends until it settles to "playing" or "resumed".
//
// 2. A FULL instance teardown (the deliberate churn-restart test) invalidates qwzspace's Tier-1
//    resume token (it lives in the old process's in-memory delta ring buffer -- gone with the
//    container). The client correctly reports this (`onState` fires "resume-failed"), but
//    NEVER falls back to a fresh connection on its own -- it just sits there, permanently
//    stuck, with nothing else printed. This is real and load-bearing: Tier 2 identity
//    (docs/PROTOCOL.md's own "reconnect under the same display name and you resolve to the
//    same persisted feltos actor") is genuine and verified working (confirmed live with a
//    throwaway one-shot reference-bot connection under the same name, landing exactly where
//    the old actor was left) -- but nothing makes a STUCK client actually take that path. Fixed
//    by tearing the dead client down and calling connectRoom() again (a real new connection,
//    same actor name) on "resume-failed", exactly the manual recovery a real deployed LLM agent
//    would need to perform after any host churn.
let connState = "connecting";
let client = null;
let reconnecting = false;
async function waitUntilConnected(maxMs = 20000) {
  const start = Date.now();
  while (connState !== "playing" && connState !== "resumed") {
    if (Date.now() - start > maxMs) return false;
    await sleep(250);
  }
  return true;
}
function connect() {
  process.stdout.write(`human-session: connecting to ${url} as "${NAME}"\n`);
  const c = connectRoom(url, {
    name: NAME,
    onState(state) {
      connState = state;
      process.stdout.write(`[${ts()}] human-session: connection state -> ${state}\n`);
      if (state === "resume-failed" && !reconnecting) {
        reconnecting = true;
        process.stdout.write(`[${ts()}] human-session: resume failed (real host churn, not a bug in the world) -- opening a fresh connection under the same name for Tier-2 identity resolution\n`);
        try { c.close(); } catch { /* already dead */ }
        setTimeout(() => { reconnecting = false; client = connect(); }, 1000);
      }
    },
  });
  c.view.on("me", ({ snap }) => {
    if (!snap || snap.kind !== "tidepool.perception.v1") return;
    lastFrame = snap;
    logEvents(snap);
  });
  return c;
}
client = connect();

// The health-check nudge, same pattern as reference-bot.mjs — a plain GET, keeps the
// catch-up-on-request clock moving between this script's own deliberate action pacing.
const nudgeTimer = setInterval(() => {
  fetch(healthUrl).catch(() => {});
}, 4000);
if (typeof nudgeTimer.unref === "function") nudgeTimer.unref();

// The narrative script: [waitMsBeforeSending, command, note-for-the-log]. Pacing totals roughly
// 20-24 real minutes end to end, deliberately human-slow (reading a room description, deciding)
// rather than bot-fast.
const STEPS = [
  [3000, "look", "get bearings at the drift line"],
  [15000, "go south", "head toward the shingle beach"],
  [15000, "go south", "on to the weir"],
  [12000, "look", "read the weir's dispute"],
  [15000, "propose shared-harvest-rights", "propose settling the harvest-rights dispute by common law"],
  [15000, "signal come support the harvest-rights proposal at the weir", "call for support across the shore"],
  [45000, "enact shared-harvest-rights", "first enact attempt -- likely short of quorum, that's honest"],
  [30000, "listen", "check the tide/season/who's nearby while waiting on support"],
  [45000, "enact shared-harvest-rights", "second enact attempt, after giving another agent time to arrive and support"],
  [15000, "go north", "back to the shingle beach"],
  [15000, "go west", "toward the sand flat"],
  [15000, "go west", "reach the spring -- the water-quality dispute"],
  [12000, "look", "read the spring's two disagreeing signs"],
  [12000, "mark the spring tasted clean to me today, for what that's worth", "leave a mark -- residue another player can later unfold"],
  [15000, "go east", "back to the sand flat"],
  [15000, "go north", "up to the mussel shelf, a working harvest cell"],
  [12000, "harvest", "take only what regrows"],
  [15000, "go west", "over to the anemone pool"],
  [15000, "go north", "up to the kelp fringe"],
  [12000, "look", "check whether the tide allows a dive from here"],
  [10000, "dive", "try diving if the tide is high or rising -- a graceful refusal is fine if not"],
  [12000, "look", "see where the dive landed"],
  [10000, "surface", "come back up if underwater -- a graceful no-op on dry land"],
  [15000, "go south", "back toward the anemone pool"],
  [15000, "go east", "back to the mussel shelf"],
  [15000, "go south", "back to the sand flat"],
  [15000, "go east", "back to the shingle beach"],
  [15000, "go east", "on to the landing, the market"],
  [12000, "trade quote fish", "check the going rate before buying"],
  [12000, "trade buy fish", "buy in, if there's coin and stock for it"],
  [15000, "go north", "up to the driftwood shed"],
  [12000, "build kelp-line", "try building something from what the shore gives up"],
  [12000, "ask harvest-rights", "check what's been shared about the dispute"],
  [12000, "share the-weir: quorum is close, come lend your support", "put word out for anyone still listening"],
  [15000, "go south", "back to the landing"],
  [15000, "go west", "back to the shingle beach"],
  [15000, "go south", "back to the weir, one more time"],
  [12000, "enact shared-harvest-rights", "final enact attempt for this session"],
  [10000, "emote waves at the shore", "sign off"],
  [8000, "look", "one last look before closing"],
];

async function run() {
  for (const [waitMs, command, note] of STEPS) {
    await sleep(waitMs);
    const ok = await waitUntilConnected();
    if (!ok) {
      process.stdout.write(`[${ts()}] human-session: [${NAME}] still not reconnected after 20s -- skipping "${command}"\n`);
      continue;
    }
    process.stdout.write(`[${ts()}] human-session: [${NAME}] @ ${lastFrame?.place?.id ?? "?"} -> "${command}"  // ${note}\n`);
    client.sendIntent("command", { command });
  }
  process.stdout.write(`[${ts()}] human-session: script complete, holding connection open 20s for trailing events.\n`);
  await sleep(20000);
  clearInterval(nudgeTimer);
  client.close();
  process.stdout.write(`[${ts()}] human-session: done.\n`);
  process.exit(0);
}

run();

process.once("SIGINT", () => { clearInterval(nudgeTimer); client.close(); process.exit(0); });
process.once("SIGTERM", () => { clearInterval(nudgeTimer); client.close(); process.exit(0); });
