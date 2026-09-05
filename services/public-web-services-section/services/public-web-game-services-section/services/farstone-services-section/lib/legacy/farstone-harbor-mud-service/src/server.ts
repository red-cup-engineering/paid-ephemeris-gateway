/**
 * farstone.561.group — the live persistent harbor, playable in a browser.
 *
 * Farstone is the world; FizzOS is the kernel. This boots the FizzOS live text-MUD
 * server (`@red-cup-engineering/fizzos/mud-server`, on the upstream session carrier) over the Farstone
 * harbor bible (`world/harbor.json`) and serves the browser client at `/`: log in by
 * name, sail the harbor, trade, craft, talk. State persists durably to `FARSTONE_SAVE`.
 */
import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type App, type Repr, htmlRepr, installGracefulShutdown, mergeApps, start } from "@red-cup-engineering/http-server";
import { createFizzosMud } from "@red-cup-engineering/fizzos/mud-server";
import { CLIENT_HTML } from "@red-cup-engineering/fizzos/client";
import { checkpoint, fileStore } from "@red-cup-engineering/fizzos/persistence";
import type { SceneSnapshot } from "@red-cup-engineering/fizzos/scene";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18_793;

function port(): number {
  const raw = process.env.FARSTONE_PORT ?? process.env.PORT;
  if (raw === undefined) return DEFAULT_PORT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) throw new Error(`Invalid FARSTONE_PORT: ${raw}`);
  return parsed;
}

const host = process.env.FARSTONE_HOST ?? process.env.HOST ?? DEFAULT_HOST;
const savePath = process.env.FARSTONE_SAVE;

const bible = JSON.parse(readFileSync(fileURLToPath(new URL("../world/harbor.json", import.meta.url)), "utf8"));
const store = savePath === undefined ? undefined : fileStore<SceneSnapshot>(savePath);
const restored = store?.load() ?? undefined;
const farstone = createFizzosMud(bible, restored === null || restored === undefined ? {} : { snapshot: restored });

const clientApp: App = {
  resources: [{
    match: (path: string) => path === "/" || path === "/index.html",
    methods: ["GET"],
    produces: ["text/html"],
    handler: async (): Promise<Repr> => htmlRepr(CLIENT_HTML),
  }],
};
const app = mergeApps(clientApp, farstone.app);

if (store !== undefined) {
  const checkpointer = checkpoint<SceneSnapshot>(() => farstone.snapshot(), store, 30_000);
  process.on("exit", () => checkpointer.flush());
}

const result = await start(app, { host, port: port() });
installGracefulShutdown(result, {});
farstone.start();
const shown = host === "0.0.0.0" ? "127.0.0.1" : host;
process.stdout.write(`farstone harbor live on http://${shown}:${port()}/  — play in the browser${savePath ? `, saving to ${savePath}` : ""}\n`);
