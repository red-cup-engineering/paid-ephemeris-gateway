#!/usr/bin/env node
import { serveWorldHost } from "@red-cup-engineering/world-hosting/serve";
import { TIDEPOOL_GAME } from "./tidepool-game.mts";
import { createTidepoolRoom } from "./tidepool-room.mts";
import { renderTidepoolPage, tidepoolStaticFiles } from "./tidepool-tufte.mts";

// Tidepool's own parameterization of world-hosting's generic serveWorldHost (world-host-runtime
// note, 2026-09-01): the qwzspace room (tidepool-room.mts, wired straight to feltos's own
// createEngine/join/submit/step — no MudServer, see that file's own header) and the TUFTE page/
// static assets are tidepool-specific; persistence, request-driven catch-up, and the outer HTTP
// server are the shared runtime. `clockKind` pins the pre-consolidation tag so an already-
// persisted clock file stays byte-compatible. `liveRoom` closes over the one live room instance
// so `health` can report real tick/member counts (world-hosting's `createRoom` seam returns
// `{room, liveEngine}` for a site with no MudServer — see http-wiring.mjs's own header).
let liveRoom: ReturnType<typeof createTidepoolRoom>["room"] | null = null;

await serveWorldHost({
  gameModule: TIDEPOOL_GAME,
  createRoom: (bootEngine, opts) => {
    const { room, liveEngine } = createTidepoolRoom(bootEngine as never, { intervalMs: opts.intervalMs });
    liveRoom = room;
    return { room, liveEngine };
  },
  pageHtml: renderTidepoolPage(),
  staticFiles: tidepoolStaticFiles(),
  health: () => ({ ok: true, tick: liveRoom?.tickNow() ?? 0, members: liveRoom?.members().size ?? 0 }),
  clockKind: "tidepool.world-clock.v1",
  processLabel: "Tidepool",
  defaultPort: 18830,
  defaultTickIntervalMs: 300_000, // 5 real minutes/tick — a tidal pace (design §3)
  defaultMaxCatchUpTicksPerRequest: 50,
});
