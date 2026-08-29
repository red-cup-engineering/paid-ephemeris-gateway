// server.test.mts — proves the zero-dependency static server's routing: the page, the app's own src/
// modules, the vendored engine package files (the browser import map's targets), the world seed, and
// the safe-name guard that makes path traversal structurally impossible (see server.mjs's header). One
// server is started for the whole file (before/after) rather than one per test, so every test shares a
// single stable base URL.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./server.mjs";

let app: ReturnType<typeof createApp>;
let base: string;

before(async () => {
  app = createApp();
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", () => resolve()));
  const addr = app.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => app.close(() => resolve()));
});

test("GET / serves the HTML shell with the canvas element and the import map", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /<canvas id="frame"/);
  assert.match(text, /importmap/);
  assert.match(text, /@red-cup-engineering\/abrash/);
});

test("GET /health reports ok, plus today's UTC date (the daily route's own clock read, disclosed here too)", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.match(body.today, /^\d{4}-\d{2}-\d{2}$/);
});

test("GET /web/main.mjs serves the browser entrypoint as JavaScript", async () => {
  const res = await fetch(`${base}/web/main.mjs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /javascript/);
  const text = await res.text();
  assert.match(text, /requestAnimationFrame/);
});

test("GET /src/game.mjs serves this app's own pure game logic", async () => {
  const res = await fetch(`${base}/src/game.mjs`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /export function tick/);
});

test("GET /vendor/abrash/world.mjs serves the INSTALLED @red-cup-engineering/abrash package's own file", async () => {
  const res = await fetch(`${base}/vendor/abrash/world.mjs`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /export function worldFromRows/);
});

test("GET /world/blood-merge.jsonl serves the on-disk seed", async () => {
  const res = await fetch(`${base}/world/blood-merge.jsonl`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /voxel:4,4/);
});

test("GET /DESIGN.md and /README.md are both served", async () => {
  const design = await fetch(`${base}/DESIGN.md`);
  const readme = await fetch(`${base}/README.md`);
  assert.equal(design.status, 200);
  assert.equal(readme.status, 200);
});

test("an unknown route 404s", async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
});

test("SAFE_NAME guard: a path-traversal attempt against /src/ never escapes src/ (404, not a leaked file)", async () => {
  const res = await fetch(`${base}/src/${encodeURIComponent("../package.json")}`);
  assert.equal(res.status, 404);
});

test("SAFE_NAME guard: an existing-but-wrong-root filename under /vendor/abrash/ 404s (route reads only inside src/)", async () => {
  // package.json's extension (.json) IS allowed by SAFE_NAME, but package.json lives at the abrash
  // package's ROOT, not inside its src/ directory — proving the route only ever reads src/, not the
  // package root, regardless of extension.
  const res = await fetch(`${base}/vendor/abrash/package.json`);
  assert.equal(res.status, 404);
});

// ── the GENERIC vendor route (/vendor/<scope>/<pkg>/<realPath>) — added because abrash's own world.mjs
// statically imports @561-group/computer's eavt-substrate, which the /vendor/abrash/ single-directory
// route above cannot serve (it lives in a DIFFERENT installed package, with its own internal relative-
// import graph). Without this route the browser's import map has nowhere to point those specifiers, and
// the whole game fails to load with a module-resolution error before a single frame ever renders — see
// DESIGN.md's "the browser import gap" section for the full account (found by an actual frontdoor crawl,
// not by running the browser code inside Node, where node_modules resolution papers over the exact gap
// a real browser hits).

test("GET /vendor/@561-group/computer/posix-holography/src/substrate.mjs serves the real dependency file the import map points at", async () => {
  const res = await fetch(`${base}/vendor/@561-group/computer/posix-holography/src/substrate.mjs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /javascript/);
  const text = await res.text();
  assert.match(text, /export function settle/);
});

test("GET /vendor/@lenticule-science/metrologic/bilattice/src/index.mjs serves a sibling package's file, including its own relative imports", async () => {
  const res = await fetch(`${base}/vendor/@lenticule-science/metrologic/bilattice/src/index.mjs`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /joinKnowledge/);
  // and the relative import this file makes ("./charge.mjs") must itself resolve through the same route
  const sibling = await fetch(`${base}/vendor/@lenticule-science/metrologic/bilattice/src/charge.mjs`);
  assert.equal(sibling.status, 200);
});

test("generic vendor route: an unlisted scope (not @561-group or @red-cup-engineering) 404s, not just anything under node_modules", async () => {
  const res = await fetch(`${base}/vendor/@some-other-scope/whatever/index.mjs`);
  assert.equal(res.status, 404);
});

test("generic vendor route: a path-traversal attempt (encoded ..) 404s rather than escaping the package root", async () => {
  const res = await fetch(`${base}/vendor/@561-group/computer/${encodeURIComponent("../../../../etc/passwd")}`);
  assert.equal(res.status, 404);
});

test("generic vendor route: a non-.mjs file (e.g. package.json) is refused even inside an allowed package", async () => {
  const res = await fetch(`${base}/vendor/@561-group/computer/package.json`);
  assert.equal(res.status, 404);
});

test("GET /web/node-crypto-shim.mjs serves the browser-safe sha256 stand-in the import map maps node:crypto to", async () => {
  const res = await fetch(`${base}/web/node-crypto-shim.mjs`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /export function createHash/);
});

test("web/index.html's import map maps every bare specifier abrash's dependency chain actually uses (no browser-resolution gap)", async () => {
  const res = await fetch(`${base}/`);
  const text = await res.text();
  const im = text.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(im, "index.html must declare an import map");
  const map = JSON.parse(im[1]).imports;
  for (const specifier of [
    "@561-group/computer/posix-holography/eavt-substrate",
    "@561-group/computer/typed-resource-catalog/eavt",
    "#jcs",
    "@lenticule-science/metrologic/bilattice",
    "@lenticule-science/metrologic/bilattice/charge",
    "@lenticule-science/metrologic/chu",
    "@lenticule-science/metrologic/chu/four",
    "node:crypto",
  ]) {
    assert.ok(specifier in map, `import map is missing "${specifier}"`);
    const target = await fetch(`${base}${map[specifier]}`);
    assert.equal(target.status, 200, `import map entry for "${specifier}" -> ${map[specifier]} must actually resolve`);
  }
});

test("POST is rejected with 405 on a route other than /runs (this server's static routes stay read-only)", async () => {
  const res = await fetch(`${base}/health`, { method: "POST" });
  assert.equal(res.status, 405);
});

// ── the daily face's browser import-map gap: web/main.mjs now imports ../src/cartridge.mjs (for
// createDailyEngine), which in turn imports @red-cup-engineering/cartridge/intent-log and @red-cup-engineering/cartridge/
// replay — two bare specifiers cartridge.mjs already needed but the browser NEVER had to resolve
// before this task, since nothing in web/ imported cartridge.mjs until now (see cartridge.mjs's own
// header: "fully wired and tested... but zero callers"). Proves the same class of gap
// server.test.mts's own "import map maps every bare specifier" test already guards against, for the
// two entries this task's daily wiring newly requires.

test("import map: @red-cup-engineering/cartridge/intent-log and /replay resolve, so cartridge.mjs actually loads in a browser", async () => {
  const res = await fetch(`${base}/`);
  const text = await res.text();
  const im = JSON.parse(text.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const specifier of ["@red-cup-engineering/cartridge/intent-log", "@red-cup-engineering/cartridge/replay"]) {
    assert.ok(specifier in im, `import map is missing "${specifier}"`);
    const target = await fetch(`${base}${im[specifier]}`);
    assert.equal(target.status, 200, `import map entry for "${specifier}" -> ${im[specifier]} must actually resolve`);
  }
});

test("GET /src/cartridge.mjs, /src/daily.mjs, /src/daily-arena.mjs, /src/run-recorder.mjs, /src/score.mjs all serve (the daily face's own new imports)", async () => {
  for (const file of ["cartridge.mjs", "daily.mjs", "daily-arena.mjs", "run-recorder.mjs", "score.mjs"]) {
    const res = await fetch(`${base}/src/${file}`);
    assert.equal(res.status, 200, `/src/${file} must serve (the browser daily face imports it)`);
  }
});
