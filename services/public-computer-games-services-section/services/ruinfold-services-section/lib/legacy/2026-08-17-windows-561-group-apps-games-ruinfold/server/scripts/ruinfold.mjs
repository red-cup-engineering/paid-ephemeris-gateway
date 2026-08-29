// ruinfold — the server entry. Boots the realtime server and ticks the world. The fixed-tick
// server, the SSE wire, the intent queue, the snapshot cache, and the interest-filtered delta are
// ALL provided by @561-group/qwzspace (the shared realtime webapp-game engine); this entry injects
// ruinfold's DOMAIN — its world snapOf, its subjectsOf, its intent validator, and its single-writer
// runTick — and qwzspace assembles the queue / snapshot-manager / broadcast-hub / SSE transport /
// tick-driver around them. `npm start` runs this; it assumes a seeded world under ./world (run
// `npm run seed` first, or `npm run dev` to do both).
//
//   node server/scripts/ruinfold.mjs            # serve ./world on $RUINFOLD_PORT|$PORT|8787
//
// Open the printed URL in two browser tabs to see the MMO part: both are players in one world.

import { createServer as createHttpServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createServer as createGameServer } from "@561-group/qwzspace/create-server";

import buildWorld from "#server/scripts/seed.mjs";
import { subjects } from "#substrate";
import { view, numOf, valOf } from "#engine/_world.mjs";
import { createSnapshot } from "#engine/snapshot.mjs";
import { validate } from "#engine/intents.mjs";
import { runTick } from "#engine/tick.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "world");
const CLIENT_DIR = join(HERE, "..", "..", "client");
const PORT = Number(process.env.RUINFOLD_PORT || process.env.PORT || 8787);

// A world must exist to serve. If none has been seeded, build the default one so `start` works
// out of the box (the trace IS the world; seeding just lays down its first layer).
if (!existsSync(ROOT)) {
  console.log("[ruinfold] no world found — seeding the default keep…");
  await buildWorld(ROOT);
}

// `players` is a mutable Set the tick reads (who moves by intent, not AI) and writes (a `join`
// intent enrolls a player). qwzspace owns the queue/cache/wire; ruinfold owns this domain state.
const players = new Set();
const { snapOf, subjectsOf } = createSnapshot(ROOT);

const game = createGameServer({
  transport: "sse",
  clientDir: CLIENT_DIR,
  // runTick — the SINGLE WRITER. qwzspace hands us (tick, intents); we close over ROOT + players
  // and map ruinfold's { dirty, chats } onto qwzspace's { dirty, events }: each chat becomes a
  // discrete event the hub broadcasts AFTER the delta (so positions are fresh when a line lands).
  async runTick(tick, intents) {
    const { dirty, chats } = await runTick(ROOT, tick, intents, players);
    const events = (chats ?? []).map((c) => ({ type: "chat", tick, from: c.from, zone: c.zone, text: c.text }));
    return { dirty, events };
  },
  // the snapshot-manager boundary: read the settled trace, project ONE entity's render state.
  subjectsOf,
  snapOf,
  // the intent-queue trust boundary: ruinfold's ~20 known intents.
  validate,
  // bootstrap — resume from the trace: the current tick is the dimension's heartbeat, and any
  // players already in the world (a restart over a live world) are re-enrolled so the AI keeps
  // hunting them. Returns the starting tick.
  async bootstrap() {
    for (const s of await subjects(ROOT)) {
      if (valOf(await view(ROOT, s), "kind") === "player") players.add(s);
    }
    return numOf(await view(ROOT, "ruinfold"), "tick", 0);
  },
});

const loop = await game.start();

const server = createHttpServer(game.handler);

// HOST defaults to all interfaces for local dev; set RUINFOLD_HOST=127.0.0.1 behind a reverse
// proxy (nginx) so the port is not exposed to the network directly.
const HOST = process.env.RUINFOLD_HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`[ruinfold] the keep is open at http://${HOST}:${PORT}  (tick ${loop.tickNow()}, 5 Hz)`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log("\n[ruinfold] closing the gate…");
    loop.stop();
    server.close(() => process.exit(0));
  });
}
