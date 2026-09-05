/**
 * `web/test/frontdoor.test.mts` — regression coverage for the production front-door bug found
 * by walking the real front door (`/`) the way a browser actually does, not by curling
 * `/web/index.html` directly (a URL where this bug happens to be invisible).
 *
 * `web/index.html`'s own references (`css/style.css`, `css/shelf-chrome.css`, `js/app.mjs`) are
 * path-relative with no leading slash — correct only when the document's own URL is
 * `/web/index.html`. `web/server.mjs` used to serve that document's bytes at the URL `/` too,
 * as a same-URL internal rewrite with no HTTP redirect, so a browser visiting the real front
 * door resolved those refs against `/` and 404'd on all of them (solitaire-service's
 * `web/server.mjs` module doc carries the full production repro of this exact bug class).
 *
 * This test walks the real module graph from the real front door against a live server — start
 * at `/`, follow the redirect, resolve every relative HTML reference against the DOCUMENT's own
 * URL, then BFS the real ES module graph from `js/app.mjs` (import specifiers resolved against
 * the IMPORTING MODULE's own URL, bare specifiers resolved through the page's real importmap,
 * exactly like a browser's module loader) and confirm every reachable module actually loads.
 * `web/test/importmap.test.mts` already covers the importmap's own three URLs in isolation —
 * this test's job is specifically the front door, which that one does not touch at all.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // crucible-service/
const PORT = 8792;
// IPv6 loopback — see this directory's importmap.test.mts comment on this same choice.
const BASE = `http://[::1]:${PORT}`;

let serverProcess: ReturnType<typeof spawn> | undefined;

before(async () => {
  serverProcess = spawn(process.execPath, [path.join(ROOT, 'web', 'server.mjs'), String(PORT)], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 5000);
    serverProcess?.stdout?.on('data', (chunk) => {
      if (chunk.toString().includes('serving')) {
        clearTimeout(timer);
        resolve();
      }
    });
    serverProcess?.on('error', reject);
  });
});

after(() => {
  serverProcess?.kill();
});

function relativeRefs(html: string): string[] {
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)].map((m) => m[1] as string);
  return refs.filter((r) => !/^([a-z]+:)?\/\//i.test(r) && !r.startsWith('/') && !r.startsWith('#'));
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
    if (key.endsWith('/') && spec.startsWith(key) && (best === undefined || key.length > best.length)) {
      best = key;
    }
  }
  return best === undefined ? undefined : importMap[best] + spec.slice(best.length);
}

function isBareSpecifier(spec: string): boolean {
  return !/^[a-z]+:/i.test(spec) && !spec.startsWith('.') && !spec.startsWith('/');
}

/** Strips block and line comments before import-specifier scanning — a doc comment quoting an
 *  example import (e.g. `// import { x } from "@scope/pkg/sub"`) is real prose, not a real
 *  specifier, and must not be walked as one. This is the exact false positive the front-door
 *  walker in the original repro hit on its first draft and had to fix; the same fix belongs
 *  here so this regression test doesn't reintroduce it. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

test('GET / is a real HTTP redirect to /web/index.html, not a same-URL internal rewrite', async () => {
  const res = await fetch(`${BASE}/`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/web/index.html');
});

test('following the front-door redirect lands on the real document, and every path-relative reference it contains resolves from THAT document\'s own URL', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  assert.equal(res.url, `${BASE}/web/index.html`);
  const html = await res.text();
  assert.match(html, /<title>crucible\.561\.group<\/title>/);

  const refs = relativeRefs(html);
  assert.ok(refs.length >= 3, 'expected at least css/style.css, css/shelf-chrome.css, js/app.mjs as relative refs');
  for (const ref of refs) {
    const resolved = new URL(ref, res.url);
    const assetRes = await fetch(resolved);
    assert.equal(assetRes.status, 200, `${ref} resolved to ${resolved} and responded ${assetRes.status}`);
    assert.ok(!/text\/plain/.test(assetRes.headers.get('content-type') ?? ''), `${ref} at ${resolved} looks like a 404 body`);
  }
});

test('the full ES module graph reachable from js/app.mjs, walked from the real front door, loads with no dead import anywhere in it', async () => {
  const indexRes = await fetch(`${BASE}/`);
  const html = await indexRes.text();
  const importMap = extractImportMap(html);
  assert.ok(Object.keys(importMap).length >= 3, 'expected the three @lenticule-science/metrologic importmap entries');

  const entryUrl = new URL('js/app.mjs', indexRes.url).href;
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
      assert.ok(!spec.startsWith('node:'), `module graph: ${url} imports unfetchable "${spec}"`);

      let resolved: string;
      if (isBareSpecifier(spec)) {
        const mapped = resolveBareSpecifier(spec, importMap);
        assert.ok(mapped !== undefined, `module graph: ${url} imports bare specifier "${spec}" with no importmap entry`);
        resolved = new URL(mapped as string, `${BASE}/`).href;
      } else if (/^[a-z]+:/i.test(spec)) {
        continue;
      } else {
        resolved = new URL(spec, url).href;
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  assert.ok(modulesWalked >= 5, `expected to walk a real module graph, only saw ${modulesWalked} module(s)`);
});

test('a genuinely missing path still 404s (the redirect fix did not weaken the traversal/404 guard)', async () => {
  const res = await fetch(`${BASE}/does-not-exist-xyz`);
  assert.equal(res.status, 404);
});
