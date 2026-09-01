#!/usr/bin/env node
// TRANSPORT NOTE (2026-08-20, found running this bot against the real live deploy): connects via
// `./ws-transport.mjs`'s `connectRoomOverAnyScheme`, not qwzspace's own `connectRoom` — see that
// file's header for the real bug this works around (qwzspace's `client-node` transport cannot
// actually do `wss://`, so this bot would silently never play against any real TLS deployment).
//
// reference-bot — the executable proof the agent protocol suffices for a PROGRAM, no LLM call
// anywhere in this file (design §5.3 — "mirroring the stopped lane's own explicit ask"). It
// speaks tidepool.protocol.v1 exactly the way any client does: connect, read the perception
// frame handed back as its own qwzspace entity (design §2.1), parse
// `frame.subjects[].affordances` (design §2.2's in-band affordance enumeration), pick ONE legal
// verb, submit it as `{ command }` via the wire-identical `sendIntent("command", { command })`
// path (design §2.3), and react to `frame.recentEvents`. Every decision below is either
// deterministic or a plain `Math.random()` pick — nothing here is a model call, and nothing
// here needs one: this is the load-bearing evidence that the wire protocol itself, not an LLM's
// judgment, is what makes the world playable.
//
// TURN PACING: the bot acts AT MOST ONCE PER FRAME UPDATE — it waits for its own next "me" event
// before submitting another intent, the same one-decision-per-turn discipline an LLM agent would
// need (a model call is slow; nothing here should assume it can spam intents faster than a real
// turn). ACTION_DELAY_MS adds a further pause on top, so a running bot's log is legible to a
// human watching it play, not a flood.
//
// THE HEALTH-CHECK NUDGE, disclosed: Tidepool's world only advances on `preRequestCatchUp()`
// (http-wiring.mts), fired by an incoming HTTP request or a WS upgrade — never on its own timer
// (design §3: "the harbor sleeps between visitors"). A bot that only ever sends WS intents,
// after its one upgrade-time catch-up, would sit forever with its own commands queued but never
// applied — nothing else would ever visit to advance the clock. In a real deployment this is a
// non-issue (Cloud Run health probes and real user traffic are themselves "visitors"); a
// standalone bot has no such traffic, so it supplies its own, honestly (see NUDGE_MS below): a
// periodic `GET /health` alongside its normal play — exactly the same kind of request an uptime
// checker already sends in production, not a hidden protocol-level mechanism.
//
// === HOW A REAL LLM AGENT DRIVES THIS SAME SURFACE (the "thin adapter", documented per the
// design brief) ===
//   1. On every "me" frame update (exactly what `client.view.on("me", ...)` hands this bot
//      below), serialize the frame's `place`, `occupants`, `subjects[].cells`/`.affordances`,
//      `clock`, and `recentEvents` as structured context — the frame is already JSON, so this is
//      literally `JSON.stringify(frame)` or a light prose transcription of it.
//   2. Prompt the model once per turn: "here is what you perceive; here is what you may do to
//      each thing you see (each subject's own affordances array); reply with exactly one command
//      string." No tool schema is needed beyond "emit text matching one of the enumerated
//      affordances as a verb, optionally with an argument" — the same one-grammar, human-
//      typeable-and-program-emittable string this bot itself sends (design §2.3).
//   3. Submit the model's reply exactly as this bot submits its own picks below:
//      `client.sendIntent("command", { command: modelReply.trim() })`. `gameValidate` and
//      feltos's own capability handlers already refuse anything malformed or impossible with a
//      `message()` event back to the actor (this file's own `logEvents` already renders those the
//      same as any other event) — an LLM's occasional bad guess costs nothing more than a normal
//      player's typo would.
//   4. Optionally feed `recentEvents` from the NEXT frame back into the model's running context
//      as "what happened since your last turn" — exactly what this bot's own `logEvents` prints.
//   That is the entire adapter: no other integration surface exists, or is needed, between the
//   protocol and a model.

import process from "node:process";
import { connectRoomOverAnyScheme as connectRoom } from "./ws-transport.mjs";

const HOST = process.env["TIDEPOOL_HOST"] ?? "127.0.0.1";
const PORT = process.env["TIDEPOOL_PORT"] ?? "18830";
const NAME = process.argv[2] ?? process.env["TIDEPOOL_BOT_NAME"] ?? "tidebot";
const ACTION_DELAY_MS = Number(process.env["TIDEPOOL_BOT_DELAY_MS"] ?? 1500);
const MAX_TURNS = Number(process.env["TIDEPOOL_BOT_MAX_TURNS"] ?? Number.POSITIVE_INFINITY);
const NUDGE_MS = Number(process.env["TIDEPOOL_BOT_NUDGE_MS"] ?? Math.max(500, ACTION_DELAY_MS));

// TIDEPOOL_WS_URL / TIDEPOOL_HTTP_URL: full-URL overrides for a real deployed host (wss:// on
// 443, no explicit port) — additive only, HOST/PORT keep working unchanged for local dev.
const url = process.env["TIDEPOOL_WS_URL"] ?? `ws://${HOST}:${PORT}/`;
const healthUrl = process.env["TIDEPOOL_HTTP_URL"] ?? `http://${HOST}:${PORT}/health`;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const seenEventKeys = new Set();
function logEvents(frame) {
  for (const ev of frame.recentEvents ?? []) {
    const key = `${ev.tick}:${ev.channel}:${ev.text}`;
    if (seenEventKeys.has(key)) continue;
    seenEventKeys.add(key);
    process.stdout.write(`[tick ${ev.tick}] (${ev.channel}) ${ev.text}\n`);
  }
}

// choosePolicy — the bot's ENTIRE decision procedure. A real agent's model call replaces exactly
// this function's job (frame -> one command string); nothing else in this file changes for that
// swap (see the header's adapter notes).
function choosePolicy(frame) {
  const here = (frame.subjects ?? []).find((s) => s.id === frame.place?.id);
  const affordances = new Set(here?.affordances ?? []);

  // words (marks left by other play) left in this room: sometimes stop and unfold one — this is
  // literally "residue another agent's play produced, that this agent's own play can encounter".
  const words = (frame.subjects ?? []).filter((s) => s.affordances.includes("unfold"));
  if (words.length > 0 && Math.random() < 0.35) return `unfold ${words[0].id}`;

  if (affordances.has("harvest") && Math.random() < 0.6) return "harvest";
  if (affordances.has("tend") && Math.random() < 0.5) return "tend";
  if (affordances.has("dive") && Math.random() < 0.4) return "dive";
  if (affordances.has("surface") && Math.random() < 0.5) return "surface";
  if (affordances.has("trade") && Math.random() < 0.3) return "trade quote fish";
  if (affordances.has("build") && Math.random() < 0.2) return "build kelp-line";

  if (Math.random() < 0.12) return "listen";
  if (Math.random() < 0.1) return `mark left by ${NAME}, ${new Date().toISOString()}`;
  if (Math.random() < 0.08) return "emote looks around";

  const exits = frame.place?.exits ?? [];
  if (exits.length > 0) return `go ${pick(exits)}`;
  return "look";
}

let turns = 0;
let acting = false;

// RECONNECT NOTE (found running this bot live through a deliberate Cloud Run churn-restart,
// 2026-08-20): a full instance teardown invalidates qwzspace's Tier-1 resume token (it lives in
// the old process's in-memory delta ring buffer). `onState` correctly reports "resume-failed",
// but nothing automatically falls back to a fresh connection -- since this bot only ever acts
// from `view.on("me", ...)`, a dead client with no further "me" events means the bot silently
// stops playing forever, with no crash and no further log output. A real deployed LLM agent
// WILL outlive at least one host churn over any long session, so this is a real gap, not a
// theoretical one. Fixed the same way tools/human-session.mjs and tools/agent-b-session.mjs are:
// on "resume-failed", close the dead client and open a fresh one under the same name (Tier-2
// identity resolution — confirmed live to land the actor exactly where it was left).
let client = null;
let reconnecting = false;

function connect() {
  process.stdout.write(`reference-bot: connecting to ${url} as "${NAME}"\n`);
  const c = connectRoom(url, {
    name: NAME,
    onState(state) {
      process.stdout.write(`reference-bot: connection state -> ${state}\n`);
      if (state === "resume-failed" && !reconnecting) {
        reconnecting = true;
        process.stdout.write("reference-bot: resume failed (real host churn) -- opening a fresh connection under the same name\n");
        try { c.close(); } catch { /* already dead */ }
        setTimeout(() => { reconnecting = false; client = connect(); }, 1000);
      }
    },
  });
  c.view.on("me", ({ snap }) => {
    if (!snap || snap.kind !== "tidepool.perception.v1") return;
    logEvents(snap);
    if (acting || turns >= MAX_TURNS) return;
    acting = true;
    setTimeout(() => {
      const command = choosePolicy(snap);
      process.stdout.write(`reference-bot: [turn ${turns + 1}] @ ${snap.place?.id ?? "?"} -> "${command}"\n`);
      c.sendIntent("command", { command });
      turns += 1;
      acting = false;
      if (turns >= MAX_TURNS) {
        process.stdout.write(`reference-bot: reached TIDEPOOL_BOT_MAX_TURNS=${MAX_TURNS}, closing.\n`);
        setTimeout(shutdown, ACTION_DELAY_MS);
      }
    }, ACTION_DELAY_MS);
  });
  return c;
}
client = connect();

// the health-check nudge (see header) — a plain GET, same as any uptime checker; failures are
// logged, never fatal (the bot keeps playing off whatever frames it already has).
const nudgeTimer = setInterval(() => {
  fetch(healthUrl).catch((error) => {
    process.stderr.write(`reference-bot: health nudge failed (non-fatal): ${error instanceof Error ? error.message : String(error)}\n`);
  });
}, NUDGE_MS);
if (typeof nudgeTimer.unref === "function") nudgeTimer.unref();

function shutdown() {
  clearInterval(nudgeTimer);
  client.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
