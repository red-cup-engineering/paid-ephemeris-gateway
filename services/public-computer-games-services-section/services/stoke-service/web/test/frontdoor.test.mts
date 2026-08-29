/**
 * `web/test/frontdoor.test.mts` — regression coverage for the production front-door bug found
 * by walking the real front door (`/`) the way a browser actually does, not by curling
 * `/web/index.html` directly (a URL where this bug happens to be invisible).
 *
 * `web/index.html`'s own references (`css/style.css`, `js/app.mjs`) are path-relative with no
 * leading slash — correct only when the document's own URL is `/web/index.html`. `web/server.mjs`
 * used to serve that document's bytes at the URL `/` too, as a same-URL internal rewrite with no
 * HTTP redirect, so a browser visiting the real front door resolved those refs against `/` and
 * 404'd on all of them (crucible-service's/solitaire-service's `web/server.mjs` module docs carry
 * the full production repro of this exact bug class — stoke shipped the identical bug, caught
 * here before its first deploy).
 *
 * This test walks the real module graph from the real front door against a live server — start
 * at `/`, follow the redirect, resolve every relative HTML reference against the DOCUMENT's own
 * URL, then BFS the real ES module graph from `js/app.mjs` (import specifiers resolved against
 * the IMPORTING MODULE's own URL, bare specifiers resolved through the page's real importmap,
 * exactly like a browser's module loader) and confirm every reachable module actually loads.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", ".."); // stoke-service/
const PORT = 8795;
// IPv6 loopback — stoke's server.mjs listen()s with no explicit host (IPv6 wildcard default);
// some sandboxed test environments route IPv4 127.0.0.1 and the IPv6 wildcard inconsistently
// (see web/test/server.test.mts's waitUntilReachable comment for the same quirk observed there).
const BASE = `http://[::1]:${PORT}`;

let serverProcess: ReturnType<typeof spawn> | undefined;

async function waitUntilReachable(attempts = 20, delayMs = 50): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(`${BASE}/`, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

before(async () => {
  serverProcess = spawn(process.execPath, [path.join(ROOT, "web", "server.mjs"), String(PORT)], {
    cwd: ROOT,
    stdio: "pipe",
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start in time")), 5000);
    serverProcess?.stdout?.on("data", (chunk) => {
      if (chunk.toString().includes("serving")) {
        clearTimeout(timer);
        resolve();
      }
    });
    serverProcess?.on("error", reject);
  });
  await waitUntilReachable();
});

after(() => {
  serverProcess?.kill();
});

function relativeRefs(html: string): string[] {
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)].map((m) => m[1] as string);
  return refs.filter((r) => !/^([a-z]+:)?\/\//i.test(r) && !r.startsWith("/") && !r.startsWith("#"));
}

function extractImportMap(html: string): Record<string, string> {
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!match) return {};
  return (JSON.parse(match[1] as string).imports ?? {}) as Record<string, string>;
}

function resolveBareSpecifier(spec: string, importMap: Record<string, string>): string | undefined {
  if (importMap[spec] !== undefined) return importMap[spec];
  let best: string | undefined;
  for (const key of Object.keys(importMap)) {
    if (key.endsWith("/") && spec.startsWith(key) && (best === undefined || key.length > best.length)) {
      best = key;
    }
  }
  return best === undefined ? undefined : importMap[best] + spec.slice(best.length);
}

function isBareSpecifier(spec: string): boolean {
  return !/^[a-z]+:/i.test(spec) && !spec.startsWith(".") && !spec.startsWith("/");
}

/** A real browser's module resolution checks the import map for an exact/prefix match BEFORE
 *  deciding an absolute-looking specifier (an actual URL scheme, or a Node built-in like
 *  "node:crypto") is unresolvable — the exact ordering bug this house's own frontdoor-walk.mjs
 *  was found and fixed for (see the deploy log's "durante and abrash" section: it used to check
 *  "node:crypto" as a literal absolute specifier without ever consulting the import map first).
 *  This mirrors that fix here so this test doesn't reintroduce the same false negative. */
function isAbsoluteLooking(spec: string): boolean {
  return /^[a-z]+:/i.test(spec);
}

/** Strips block and line comments before import-specifier scanning — a doc comment quoting an
 *  example import is real prose, not a real specifier, and must not be walked as one. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

test("GET / is a real HTTP redirect to /web/index.html, not a same-URL internal rewrite", async () => {
  const res = await fetch(`${BASE}/`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/web/index.html");
});

test("following the front-door redirect lands on the real document, and every path-relative reference it contains resolves from THAT document's own URL", async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  assert.equal(res.url, `${BASE}/web/index.html`);
  const html = await res.text();
  assert.match(html, /<title>Stoke/);

  const refs = relativeRefs(html);
  assert.ok(refs.length >= 2, "expected at least css/style.css, js/app.mjs as relative refs");
  for (const ref of refs) {
    const resolved = new URL(ref, res.url);
    const assetRes = await fetch(resolved);
    assert.equal(assetRes.status, 200, `${ref} resolved to ${resolved} and responded ${assetRes.status}`);
    assert.ok(!/text\/plain/.test(assetRes.headers.get("content-type") ?? ""), `${ref} at ${resolved} looks like a 404 body`);
  }
});

test("the full ES module graph reachable from js/app.mjs, walked from the real front door, loads with no dead import anywhere in it", async () => {
  const indexRes = await fetch(`${BASE}/`);
  const html = await indexRes.text();
  const importMap = extractImportMap(html);
  assert.ok(Object.keys(importMap).length >= 4, "expected the four @red-cup-engineering/cartridge importmap entries");

  const entryUrl = new URL("js/app.mjs", indexRes.url).href;
  const visited = new Set<string>();
  const queue = [entryUrl];
  let modulesWalked = 0;

  while (queue.length > 0) {
    const url = queue.shift() as string;
    if (visited.has(url)) continue;
    visited.add(url);

    const res = await fetch(url);
    assert.equal(res.status, 200, `module graph: ${url} responded ${res.status}`);
    const source = stripComments(await res.text());
    modulesWalked++;

    const specifiers = [
      ...source.matchAll(/\bimport(?:\s+type)?\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g),
      ...source.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g),
    ].map((m) => m[1] as string);

    for (const spec of specifiers) {
      let resolved: string;
      const mapped = resolveBareSpecifier(spec, importMap);
      if (mapped !== undefined) {
        // Import-map hit takes priority over the specifier's own shape — see isAbsoluteLooking's
        // doc comment above (this is exactly what lets "node:crypto" resolve to the real shim).
        resolved = new URL(mapped, `${BASE}/`).href;
      } else if (isAbsoluteLooking(spec)) {
        assert.ok(false, `module graph: ${url} imports unfetchable, unmapped absolute specifier "${spec}"`);
        continue;
      } else if (isBareSpecifier(spec)) {
        assert.ok(false, `module graph: ${url} imports bare specifier "${spec}" with no importmap entry`);
        continue;
      } else {
        resolved = new URL(spec, url).href;
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  assert.ok(modulesWalked >= 4, `expected to walk a real module graph, only saw ${modulesWalked} module(s)`);
});

test("a genuinely missing path still 404s (the redirect fix did not weaken the traversal/404 guard)", async () => {
  const res = await fetch(`${BASE}/does-not-exist-xyz`);
  assert.equal(res.status, 404);
});
