#!/usr/bin/env node
// reference-bot — proves the agent protocol suffices for a PROGRAM, no LLM call anywhere here
// (design §5.3). Connects, reads its own perception frame, picks ONE legal verb from
// `frame.subjects[].affordances` (§2.2), submits it via `sendIntent("command", { command })`
// (§2.3), reacts to `frame.recentEvents` — every choice below is deterministic or Math.random().
// Acts at most once per "me" frame update (paced by ACTION_DELAY_MS) and self-nudges with a
// periodic GET /health, since the world only advances on request-driven catch-up (§3) and a
// WS-only bot alone would never trigger one. An LLM adapter over this surface: serialize the
// frame, prompt for one command string, submit it exactly as this bot submits its own picks.

import process from "node:process";
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node";

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
