/**
 * `web/test/frontdoor.test.mts` — regression coverage for the production front-door bug (and,
 * with it, the "clicking today's deal errors" report it actually caused).
 *
 * The repro, exactly as found live: `web/index.html`'s own asset references (`css/style.css`,
 * `js/landing.mjs`) and its daily-play link (`table.html?variant=...&daily=1`) are written
 * path-relative, with no leading slash — correct only when the document's own URL is
 * `/web/index.html`. `web/server.mjs` used to serve that exact document's bytes at the URL `/`
 * too, as an internal rewrite with no HTTP redirect. A browser visiting the real front door
 * (`solitaire.561.group/`, i.e. `/` on this server) therefore resolved `js/landing.mjs` against
 * `/`, not `/web/`, got a 404 whose body is plain-text `not found`, and — because a browser
 * rejects a non-JavaScript-MIME module script outright — `landing.mjs` never ran. Since
 * `landing.mjs` never ran, `#daily-play-link`'s href was never rewritten from its static
 * default, so clicking "Play today's deal" navigated to `/table.html?...`, which also 404s.
 * That whole chain is what the owner saw as "it errors on playing today's deal."
 *
 * This test walks the exact same path a real browser does — start at `/`, follow the redirect,
 * resolve every relative reference in the document that lands against the document's OWN URL
 * (not against `/`) — against a real running `web/server.mjs`, so a regression here fails CI
 * loudly instead of shipping silently to production again.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // solitaire-service/
const PORT = 8791;
// IPv6 loopback — see crucible-service/web/test/importmap.test.mts's comment on this same
// choice: some sandboxed CI network stacks refuse IPv4 loopback connects from Node's own
// fetch/net.connect even though curl and the server itself are both fine with it.
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

/** Every local `href`/`src` in a page, EXCLUDING already-absolute ones (leading `/`, a scheme,
 *  or `#...`) — exactly the class of reference this bug broke. */
function relativeRefs(html: string): string[] {
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)].map((m) => m[1] as string);
  return refs.filter((r) => !/^([a-z]+:)?\/\//i.test(r) && !r.startsWith('/') && !r.startsWith('#'));
}

test('GET / is a real HTTP redirect to /web/index.html, not a same-URL internal rewrite', async () => {
  const res = await fetch(`${BASE}/`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/web/index.html');
});

test('following the front-door redirect lands on the real document, and every path-relative reference it contains resolves from THAT document\'s own URL', async () => {
  const res = await fetch(`${BASE}/`); // default: follow redirects, like a real browser
  assert.equal(res.status, 200);
  assert.equal(res.url, `${BASE}/web/index.html`, 'front door must resolve (via redirect) to the real document URL');
  const html = await res.text();
  assert.match(html, /<title>solitaire\.561\.group<\/title>/);

  const refs = relativeRefs(html);
  assert.ok(refs.length >= 2, 'expected at least css/style.css and js/landing.mjs as relative refs');
  for (const ref of refs) {
    const resolved = new URL(ref, res.url); // resolves against /web/index.html, per real browser semantics
    const assetRes = await fetch(resolved);
    assert.equal(assetRes.status, 200, `${ref} resolved to ${resolved} and responded ${assetRes.status}`);
    const contentType = assetRes.headers.get('content-type') ?? '';
    assert.ok(!/text\/plain/.test(contentType), `${ref} at ${resolved} came back as ${contentType} (a 404 body), not a real asset`);
  }
});

test('the actual daily-deal click path — table.html at its real deep URL — resolves to a real 200 page, not the 404 dead end the owner hit', async () => {
  // This is the literal href baked into web/index.html's #daily-play-link (its static default,
  // before landing.mjs ever rewrites it) — the exact URL a browser lands on once landing.mjs is
  // finally allowed to run, resolved against the document's real URL.
  const indexRes = await fetch(`${BASE}/`);
  const html = await indexRes.text();
  const match = html.match(/id="daily-play-link"[^>]+href="([^"]+)"/);
  assert.ok(match, 'expected #daily-play-link in web/index.html');
  const resolved = new URL(match[1] as string, indexRes.url);

  const res = await fetch(resolved);
  assert.equal(res.status, 200, `daily-deal link resolved to ${resolved} and responded ${res.status}`);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const body = await res.text();
  assert.match(body, /<title>/);
});

test('a genuinely missing path still 404s (the redirect fix did not weaken the traversal/404 guard)', async () => {
  const res = await fetch(`${BASE}/does-not-exist-xyz`);
  assert.equal(res.status, 404);
  const traversalRes = await fetch(`${BASE}/../../../etc/passwd`);
  assert.notEqual(traversalRes.status, 200);
});
