#!/usr/bin/env node
// agent-b-session — the SECOND of the two concurrent agent players for the mixed-session deploy
// test, run alongside the stock, zero-LLM `agents/reference-bot.mjs` (which proves the protocol
// suffices for a program driven by affordances ALONE). This one is deliberately DIFFERENT: it
// knows about `propose`/`support`/`enact` (cap-governance.mts) even though — a real finding,
// see the deploy report's thinness list — those commands are NOT enumerated in
// `frame.subjects[].affordances` the way every other verb is (perception.mts never lists them).
// A pure affordance-driven player (the stock reference-bot, or an LLM given ONLY the frame)
// could never discover governance exists at all. This script stands in for an LLM agent that
// was given the verb list out of band (e.g. in a system prompt, per the design brief's own
// documented adapter), same as this file was written from reading the source, not the frame —
// which is exactly the gap being demonstrated, not hidden. Still zero LLM calls: fixed script,
// same protocol, same `sendIntent("command", { command })` wire shape as every other client.

import process from "node:process";
import { connectRoomOverAnyScheme as connectRoom } from "../agents/ws-transport.mjs";

const NAME = process.argv[2] ?? process.env["TIDEPOOL_BOT_NAME"] ?? "orrin";
const url = process.env["TIDEPOOL_WS_URL"] ?? "ws://127.0.0.1:18830/";
const healthUrl = process.env["TIDEPOOL_HTTP_URL"] ?? "http://127.0.0.1:18830/health";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function ts() { return new Date().toISOString(); }

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
// Same two transport-resilience fixes as tools/human-session.mjs -- see its header for the real
// gaps found running this live: (1) a command sent during the "resuming" window can be silently
// dropped even though the socket is already OPEN; (2) a full instance teardown (the deliberate
// churn-restart test) invalidates the Tier-1 resume token, and the client reports
// "resume-failed" but never falls back to a fresh connection on its own -- fixed by tearing the
// dead client down and reconnecting under the same name for Tier-2 identity resolution.
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
  process.stdout.write(`agent-b-session: connecting to ${url} as "${NAME}"\n`);
  const c = connectRoom(url, {
    name: NAME,
    onState(state) {
      connState = state;
      process.stdout.write(`[${ts()}] agent-b-session: connection state -> ${state}\n`);
      if (state === "resume-failed" && !reconnecting) {
        reconnecting = true;
        process.stdout.write(`[${ts()}] agent-b-session: resume failed (real host churn) -- opening a fresh connection under the same name\n`);
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

const nudgeTimer = setInterval(() => { fetch(healthUrl).catch(() => {}); }, 4000);
if (typeof nudgeTimer.unref === "function") nudgeTimer.unref();

// A directed route: head straight for the weir (find and support the human's proposal), then
// wander the ecology/trade verbs, unfolding any mark left by another player when it sees one --
// the cross-agent "residue" moment reference-bot.mjs's own header names.
const STEPS = [
  [4000, "look", "get bearings"],
  [10000, "go south", "toward the shingle beach"],
  [10000, "go south", "on to the weir"],
  [10000, "look", "check for a proposal to support"],
  [30000, "support shared-harvest-rights", "first support attempt -- may be too early, that's honest (feltos's own 'law is not proposed' refusal)"],
  [30000, "support shared-harvest-rights", "second support attempt, after giving the human time to propose"],
  [15000, "enact shared-harvest-rights", "try enacting once support looks like quorum"],
  [12000, "go north", "back to the shingle beach"],
  [12000, "go west", "sand flat"],
  [12000, "go north", "mussel shelf"],
  [10000, "harvest", "take only what regrows"],
  [12000, "go west", "anemone pool"],
  [12000, "go north", "kelp fringe"],
  [10000, "look", "check the tide"],
  [10000, "dive", "try diving if the tide allows"],
  [10000, "surface", "come back up if underwater"],
  [12000, "go south", "anemone pool"],
  [12000, "go east", "mussel shelf"],
  [12000, "go south", "sand flat"],
  [12000, "go west", "the spring"],
  [10000, "look", "see if there's a mark left here to unfold"],
  [12000, "listen", "check who's nearby and what the tide's doing"],
  [15000, "go east", "sand flat"],
  [15000, "go east", "shingle beach"],
  [15000, "go east", "the landing"],
  [10000, "trade quote fish", "check the market"],
  [12000, "emote studies the tideline", "a quiet beat"],
  [12000, "ask harvest-rights", "check what's been shared about the dispute"],
  [12000, "go west", "back to the shingle beach"],
  [10000, "go south", "back to the weir"],
  [10000, "enact shared-harvest-rights", "final enact attempt for this session"],
];

async function run() {
  for (const [waitMs, command, note] of STEPS) {
    await sleep(waitMs);
    const ok = await waitUntilConnected();
    if (!ok) {
      process.stdout.write(`[${ts()}] agent-b-session: [${NAME}] still not reconnected after 20s -- skipping "${command}"\n`);
      continue;
    }
    // While at the-weir, unfold any mark this agent can now see, before running its scripted step.
    const unfoldable = (lastFrame?.subjects ?? []).find((s) => (s.affordances ?? []).includes("unfold"));
    if (unfoldable && Math.random() < 0.5) {
      process.stdout.write(`[${ts()}] agent-b-session: [${NAME}] @ ${lastFrame?.place?.id ?? "?"} -> "unfold ${unfoldable.id}"  // found a mark, unfolding it\n`);
      client.sendIntent("command", { command: `unfold ${unfoldable.id}` });
      await sleep(4000);
    }
    process.stdout.write(`[${ts()}] agent-b-session: [${NAME}] @ ${lastFrame?.place?.id ?? "?"} -> "${command}"  // ${note}\n`);
    client.sendIntent("command", { command });
  }
  process.stdout.write(`[${ts()}] agent-b-session: script complete, holding connection open 20s.\n`);
  await sleep(20000);
  clearInterval(nudgeTimer);
  client.close();
  process.stdout.write(`[${ts()}] agent-b-session: done.\n`);
  process.exit(0);
}

run();

process.once("SIGINT", () => { clearInterval(nudgeTimer); client.close(); process.exit(0); });
process.once("SIGTERM", () => { clearInterval(nudgeTimer); client.close(); process.exit(0); });
