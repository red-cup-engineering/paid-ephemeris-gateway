// web-static — build-report item 6's "server static-serving of the client verified with fetch."
// Two things are proven here, both over a real node:http server (createApp) on an ephemeral port:
//
//   1. The web/ client's own static files (HTML/CSS/JS) are served correctly, and path-traversal
//      attempts against both the static route and the engine-module route are rejected.
//   2. The engine-module route (/engine/*.mts) doesn't just return SOME bytes with the right
//      content-type — the stripped source is actually loadable and runnable as a plain ES module.
//      This is proven the same way a browser would consume it: every engine module is fetched
//      over HTTP, written into a scratch directory under its own filename with a package.json
//      "imports" map standing in for the browser's <script type="importmap"> (design §6.1's
//      "served as ES modules" claim, made concrete), and then dynamically imported — a real
//      buildDaily -> spawnPlayer -> runTick sequence runs against the HTTP-fetched, type-stripped
//      code, not the original .mts source.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { createApp } from "../server.mts";

let server: Server;
let base: string;
let dataDir: string;

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "ruinfold-static-http-"));
  server = createApp(dataDir);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dataDir, { recursive: true, force: true });
});

// ---- the client's own static files -------------------------------------------------------------

test("GET / serves the client's index page", async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") ?? "", /text\/html/);
  const text = await r.text();
  assert.match(text, /Ruinfold/);
  assert.match(text, /importmap/); // the browser-side #engine/ -> /engine/ remap
});

test("GET /play and GET /watch serve their own pages", async () => {
  const play = await fetch(`${base}/play`);
  assert.equal(play.status, 200);
  assert.match(await play.text(), /app-play\.mjs/);

  const watch = await fetch(`${base}/watch`);
  assert.equal(watch.status, 200);
  assert.match(await watch.text(), /app-watch\.mjs/);
});

test("GET /web/* serves nested client assets with the right content-type", async () => {
  const css = await fetch(`${base}/web/css/style.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type") ?? "", /text\/css/);

  const js = await fetch(`${base}/web/js/session.mjs`);
  assert.equal(js.status, 200);
  assert.match(js.headers.get("content-type") ?? "", /javascript/);
  assert.match(await js.text(), /GameSession/);
});

test("an unknown static path 404s cleanly", async () => {
  const r = await fetch(`${base}/web/js/does-not-exist.mjs`);
  assert.equal(r.status, 404);
});

test("a path-traversal attempt against /web/ never escapes the web root", async () => {
  const r = await fetch(`${base}/web/../src/server.mts`);
  // The URL parser itself normalizes "..", so this either 404s (normalized outside /web/*, no
  // route matches) or is refused by readStatic's own containment check — either way, never 200.
  assert.notEqual(r.status, 200);
});

// ---- the engine-module route --------------------------------------------------------------------

test("GET /engine/world.mts returns type-stripped, browser-loadable source", async () => {
  const r = await fetch(`${base}/engine/world.mts`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") ?? "", /javascript/);
  const text = await r.text();
  assert.doesNotMatch(text, /\binterface\b/); // TypeScript-only syntax must be gone
  assert.doesNotMatch(text, /:\s*BilatticeCell/); // a type annotation specifically, not just the word
  assert.match(text, /export function dist2/); // the actual runtime code survives intact
});

test("the engine-module route rejects a filename outside the safe allowlist", async () => {
  const traversal = await fetch(`${base}/engine/..%2f..%2fpackage.json`);
  assert.notEqual(traversal.status, 200);

  const badExt = await fetch(`${base}/engine/world.mts.evil.js`);
  assert.equal(badExt.status, 400);

  const missing = await fetch(`${base}/engine/nonexistent-module.mts`);
  assert.equal(missing.status, 404);
});

test("daily.mts (node:crypto — server-only) is still servable as bytes but is never linked from the client", async () => {
  // Not a security boundary (the source has no secrets in it) — just documenting that the route
  // is generic over "any engine module," and the client's own import graph (proven below) simply
  // never reaches this one.
  const r = await fetch(`${base}/engine/daily.mts`);
  assert.equal(r.status, 200);
});

// ---- the full browser-simulation round trip ------------------------------------------------------

test("the engine's full tick.mts dependency graph, fetched over HTTP and reassembled with a bare-specifier import map, runs a real buildDaily -> spawnPlayer -> runTick sequence", async () => {
  const engineDir = new URL("../engine/", import.meta.url);
  const filenames = readdirSync(engineDir).filter((f) => f.endsWith(".mts") && f !== "daily.mts");

  const scratch = mkdtempSync(join(tmpdir(), "ruinfold-browser-sim-"));
  mkdirSync(join(scratch, "engine"));
  // This package.json's "imports" field is the Node-side stand-in for the browser's
  // <script type="importmap"> — both remap the bare "#engine/" specifier prefix the served
  // source still contains to a same-directory location, nothing more.
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ type: "module", imports: { "#engine/*": "./engine/*" } }));

  for (const filename of filenames) {
    const r = await fetch(`${base}/engine/${filename}`);
    assert.equal(r.status, 200, `fetching ${filename}`);
    writeFileSync(join(scratch, "engine", filename), await r.text());
  }

  try {
    const tickMod = (await import(pathToFileURL(join(scratch, "engine", "tick.mts")).href)) as typeof import("#engine/tick.mts");
    const dungeonMod = (await import(pathToFileURL(join(scratch, "engine", "dungeon.mts")).href)) as typeof import("#engine/dungeon.mts");
    const zonesMod = (await import(pathToFileURL(join(scratch, "engine", "zones.mts")).href)) as typeof import("#engine/zones.mts");

    const world = dungeonMod.buildDaily(0xc0ffee);
    zonesMod.spawnPlayer(world, "hero-http-fetched");
    const player = world.entities.get("hero-http-fetched");
    assert.ok(player, "spawnPlayer (fetched over HTTP) actually stood a player up");
    assert.equal(player!.health, player!.maxHealth);

    const result = tickMod.runTick(world, 0, [{ kind: "move", actor: "hero-http-fetched", dir: "n" }], "hero-http-fetched");
    assert.deepEqual(result, { clearedBoss: false, playerFatal: false });
    assert.equal(player!.pos.z, 8); // gate spawn z=10, one "n" nudge of SPEED=2 -> z=8
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
