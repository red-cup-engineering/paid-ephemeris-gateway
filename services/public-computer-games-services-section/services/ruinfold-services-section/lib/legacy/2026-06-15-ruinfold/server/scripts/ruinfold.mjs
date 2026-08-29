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

import buildWorld from "#server/scripts/seed.mjs";
import { createHub } from "#server/sse.mjs";
import { createQueue } from "#server/actions.mjs";
import { createSnapshot } from "#engine/snapshot.mjs";
import { startLoop } from "#server/loop.mjs";
import { createHandler } from "#server/http.mjs";

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
const hub = createHub();
const queue = createQueue();
const snapshot = createSnapshot(ROOT);
const players = new Set();
const loop = await startLoop({ root: ROOT, hub, snapshot, queue, players });
const server = createHttpServer(createHandler({ hub, queue, snapshot, clientDir: CLIENT_DIR, tickNow: loop.tickNow }));

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
