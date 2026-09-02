/**
 * server.mts — casino.561.group's HTTP surface: a static file server for the placeholder lobby
 * (`web/`) plus a small JSON API in front of `CasinoEconomy`. Native `node:http`, zero runtime
 * dependencies beyond the two `@red-cup-engineering/*` packages the economy itself needs —
 * matching parlor-service's/flickering-delve's own "no framework" house style.
 *
 * Identity: bearer-token guest sessions, the same shape flickering-delve-service's
 * `POST /session` already uses on this shelf (`sessions: Map<token, accountId>`, checked via an
 * `Authorization: Bearer <token>` header) — the "simplest coherent guest-token scheme" the task
 * brief asks for where no sibling in *this* game-home tree had picked one yet. Durable-account
 * login is a seam (see accounts.mts's header): every account minted here is a guest.
 *
 * Persistence: `CASINO_SNAPSHOT` (a file path) turns on save-on-interval-and-shutdown via
 * persistence.mts; unset, the service is purely in-memory, which is exactly what every test in
 * this file below relies on. Cloud Run for this service runs `max-instances 1` — see
 * persistence.mts's header for why that makes a single JSON file (or none at all) the right
 * amount of durability for this pass.
 */
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CasinoEconomy } from './economy/casino-economy.mts';
import { loadSnapshot, saveSnapshot } from './persistence.mts';
import { BlackjackTable, type BlackjackSettlement } from './games/blackjack/table.mts';
import { SlotsTable, type SlotsSettlement } from './games/slots/table.mts';
import { resolveSlotsRules } from './games/slots/rules.mts';
import { createFloor } from './floor/floor.mts';
import { startCastResidency } from './floor/cast-residency.mts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // casino-service/ — parent of both src/ and web/
const WEB_ROOT = path.join(ROOT, 'web');
/** `@red-cup-engineering/card-table/svg`'s zero-dependency, zero-DOM card/chip renderer is
 *  plain JS with no `import`s of its own (see that module's header — "loads and is callable
 *  the same way under Node and in a real browser") — it just isn't inside `web/`, since it's a
 *  vendored dependency, not this service's own client code. Serving this one file straight out
 *  of `node_modules` (rather than hand-copying it into `web/js/`, which would drift the moment
 *  card-table's own version bumps) is the smallest seam that lets `web/js/blackjack.mjs` import
 *  the house's real card art. Deliberately scoped to this one exact file, not a directory
 *  passthrough — no path-traversal surface to reason about. */
const CARD_TABLE_SVG_PATH = path.join(ROOT, 'node_modules', '@red-cup-engineering', 'card-table', 'src', 'svg.mjs');

/** The spectacle client's fresh house engines, vendored by DIRECTORY rather than one exact
 *  file (contrast `CARD_TABLE_SVG_PATH` above): unlike `card-table/svg.mjs` ("no imports of its
 *  own"), qwzspace's, resonator's, and music-engineering-services-section's own subpath modules
 *  import EACH OTHER by relative path within their own `src/` tree (`render-loop.mjs` imports
 *  `./project.mjs`, resonator's `game/ambient.mjs` imports `../voice/presets.mjs`, etc.) — serving
 *  one file in isolation would leave the browser unable to resolve those sibling imports. Mapping
 *  `/vendor/<pkg>/<rest>` onto `<package>/src/<rest>` one-for-one lets every one of those relative
 *  imports resolve exactly the way they do inside `node_modules` itself, while `resolveInside`
 *  (the same traversal guard the static lobby file server already uses below) keeps this scoped to
 *  each package's own `src/` directory — no path outside it is ever reachable through this route.
 *  `.mjs` only: these packages ship a `.d.ts` beside every module, and a browser has no use for
 *  either the types or any non-JS file in the tree.
 *
 *  `music-engineering-services-section` is vendored here too, not because the browser imports it
 *  directly, but because resonator's own game kit (`game/ambient.mjs`, `game/library.mjs`,
 *  `game/primitives.mjs`, `game/cue.mjs`, `game/anticipation.mjs`) and `voice/voice.mjs` now
 *  import its `generative/*.mjs` modules by BARE npm specifier
 *  (`@red-cup-engineering/music-engineering-services-section/src/generative/random.mjs` etc. —
 *  the transitive dependency this package's own dedup onto that shelf's generative core left
 *  behind). A browser has no bare-specifier resolution at all; `rewriteVendorImports` below is
 *  the resolve step that turns each such specifier into this same `/vendor/<pkg>/<rest>` route
 *  on the way out, so the transitive import resolves exactly like every other vendored sibling
 *  import already does. */
const VENDOR_ROOTS: Readonly<Record<string, string>> = {
  qwzspace: path.join(ROOT, 'node_modules', '@red-cup-engineering', 'qwzspace', 'src'),
  resonator: path.join(ROOT, 'node_modules', '@red-cup-engineering', 'resonator', 'src'),
  'music-engineering-services-section': path.join(
    ROOT,
    'node_modules',
    '@red-cup-engineering',
    'music-engineering-services-section',
    'src',
  ),
};

/** Matches a bare-specifier `from '@red-cup-engineering/<pkg>/src/<rest>'` (or `"`-quoted) inside
 *  a vendored `.mjs` file's `import`/`export * as` statements. */
const BARE_VENDOR_IMPORT = /(from\s+['"])@red-cup-engineering\/([a-z0-9-]+)\/src\/([^'"]+)(['"])/g;

/**
 * Rewrites bare `@red-cup-engineering/<pkg>/src/<rest>` import specifiers in vendored `.mjs`
 * source text into this server's own `/vendor/<pkg>/<rest>` route, so a transitive npm
 * dependency between two vendored packages resolves in a plain browser exactly as it does
 * under Node. A specifier naming a package that is not itself a `VENDOR_ROOTS` entry is left
 * untouched — this is a targeted resolve step over known vendored siblings, never a general
 * bundler resolution pass.
 * @param {string} source - the `.mjs` file's text content
 * @returns {string} the same text with every resolvable bare vendor import rewritten
 */
function rewriteVendorImports(source: string): string {
  return source.replace(BARE_VENDOR_IMPORT, (whole, prefix: string, pkg: string, rest: string, quote: string) =>
    VENDOR_ROOTS[pkg] === undefined ? whole : `${prefix}/vendor/${pkg}/${rest}${quote}`,
  );
}

const HOST = process.env.HOST ?? '127.0.0.1';
const PORT = Number(process.env.PORT ?? 8880);
const SNAPSHOT_PATH = process.env.CASINO_SNAPSHOT;
const SAVE_INTERVAL_MS = Number(process.env.CASINO_SAVE_INTERVAL_MS ?? 30_000);
const BODY_LIMIT = 64 * 1024;

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
} as const;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function contentTypeFor(filePath: string): string {
  return MIME[path.extname(filePath)] ?? 'application/octet-stream';
}

function resolveInside(base: string, rel: string): string | null {
  const filePath = path.normalize(path.join(base, rel));
  if (filePath !== base && !filePath.startsWith(base + path.sep)) return null; // traversal guard
  return filePath;
}

async function resolveStaticFile(pathname: string): Promise<string | null> {
  const decoded = decodeURIComponent(pathname);
  let rel = decoded;
  if (rel === '/' || rel === '') rel = '/index.html';
  else if (rel.endsWith('/')) rel = `${rel}index.html`;
  return resolveInside(WEB_ROOT, rel);
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > BODY_LIMIT) throw new RangeError('request body too large');
  }
  return raw === '' ? {} : (JSON.parse(raw) as Record<string, unknown>);
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

function bearer(req: IncomingMessage): string | undefined {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  return value === '' ? undefined : value;
}

// ── economy + sessions ────────────────────────────────────────────────────────────────

const restored = await loadSnapshot(SNAPSHOT_PATH);
const economy = restored === null ? new CasinoEconomy() : CasinoEconomy.fromSnapshot(restored);
/** token -> accountId. In-memory only, per this service's "max-instances 1, in-process state
 *  is the house pattern" persistence stance (see persistence.mts) — a session does not survive
 *  a restart even when the economy snapshot does; a client simply calls `POST /session` again
 *  with the same stored `clientKey` and gets the same guest account back. */
const sessions = new Map<string, string>();

/** Cowrie Casino's first table game. One `BlackjackTable` per account, kept in memory for the
 *  life of the process — exactly the same "in-process state is the house pattern" persistence
 *  stance `sessions` above already documents (a table does not survive a restart; a client
 *  simply calls `POST /blackjack/new-table` again). Keyed by accountId, not by session token,
 *  so a player who reconnects with a fresh token (a new `POST /session` call from the same
 *  `clientKey`) finds their table exactly where they left it. */
const blackjackTables = new Map<string, BlackjackTable>();

/** Cowrie Casino's second game, "Tideline Treasures" — one `SlotsTable` per account, the
 *  identical in-process-state stance `blackjackTables` above documents (a machine does not
 *  survive a restart; a client simply calls `POST /slots/new-machine` again). */
const slotsTables = new Map<string, SlotsTable>();

function accountFor(req: IncomingMessage, suppliedToken?: unknown): string | undefined {
  const token = bearer(req) ?? (typeof suppliedToken === 'string' ? suppliedToken : undefined);
  return token === undefined ? undefined : sessions.get(token);
}

/** A short, anonymous, distinguishing tag for a human's win/jackpot feed lines — never the real
 *  accountId (which embeds the client-minted key verbatim; see `accounts.mts#casinoGuestId`), just
 *  enough to tell one guest's win from another's on the floor feed without any real identity. */
function guestLabel(accountId: string): string {
  return `Guest ${accountId.slice(-4).toUpperCase()}`;
}

// ── the realtime social floor (src/floor/) — presence, the cast, win broadcasts, the live jackpot
// ticker. See floor/floor.mts and floor/cast-residency.mts for the architecture writeup. ──────────
const floor = createFloor({ getJackpotBalance: () => economy.jackpotPoolBalance() });
const castResidency = startCastResidency({ economy, floor });

// ── HTTP ──────────────────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const routePath = url.pathname;

    if (req.method === 'GET' && routePath === '/health') {
      json(res, 200, { status: 'ok', sessions: sessions.size, invariants: economy.checkInvariants() });
      return;
    }

    if (req.method === 'POST' && routePath === '/session') {
      const value = await body(req);
      const clientKey = typeof value.clientKey === 'string' && value.clientKey.length > 0 ? value.clientKey : randomUUID();
      const accountId = economy.guestAccount(clientKey);
      const token = randomUUID();
      sessions.set(token, accountId);
      json(res, 200, { token, accountId, clientKey });
      return;
    }

    if (req.method === 'GET' && routePath === '/balances') {
      const accountId = accountFor(req, url.searchParams.get('token') ?? undefined);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      json(res, 200, economy.statusOf(accountId));
      return;
    }

    if (req.method === 'POST' && routePath === '/claim-tickets') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      json(res, 200, economy.claimTickets(accountId));
      return;
    }

    if (req.method === 'POST' && routePath === '/claim-daily-bonus') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      json(res, 200, economy.claimDailyBonus(accountId));
      return;
    }

    if (req.method === 'POST' && routePath === '/buy-in') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      try {
        json(res, 200, economy.buyIntoTable(accountId));
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'GET' && routePath === '/bundles') {
      json(res, 200, { bundles: economy.bundleCatalog() });
      return;
    }

    if (req.method === 'POST' && routePath === '/purchase-bundle') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const value = await body(req);
      if (typeof value.skuId !== 'string') { json(res, 400, { error: 'missing skuId' }); return; }
      const orderId = `ord-${randomUUID()}`;
      try {
        const intent = await economy.beginBundlePurchase(accountId, value.skuId, orderId);
        const result = await economy.settleBundlePurchase(accountId, value.skuId, orderId, intent.provider);
        json(res, 200, { orderId, provider: intent.provider, ...result, status: economy.statusOf(accountId) });
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'GET' && routePath === '/audit') {
      json(res, 200, { journal: economy.auditJournal(), invariants: economy.checkInvariants() });
      return;
    }

    // ── The realtime social floor (src/floor/) ──────────────────────────────────────────────
    if (req.method === 'GET' && routePath === '/floor/summary') {
      // No auth needed (same "public floor fact" shape as `GET /bundles`) — presence count,
      // the live jackpot pool, and the rolling event feed, for a client without a WS connection
      // (or a future play.561.group summary card) to read without ever opening the room.
      json(res, 200, floor.summary());
      return;
    }

    // ── Blackjack — Cowrie Casino's first table game (src/games/blackjack/) ────────────────

    if (req.method === 'POST' && routePath === '/blackjack/new-table') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const value = await body(req);
      const seed = typeof value.seed === 'string' && value.seed.length > 0 ? value.seed : randomUUID();
      const configId = typeof value.configId === 'string' ? value.configId : undefined;
      try {
        const table = new BlackjackTable(economy, accountId, `blackjack-${accountId}`, seed, configId, undefined, (event: BlackjackSettlement) =>
          floor.reportSettlement(guestLabel(accountId), event),
        );
        blackjackTables.set(accountId, table);
        json(res, 200, table.statusAndState());
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'GET' && routePath === '/blackjack/state') {
      const accountId = accountFor(req, url.searchParams.get('token') ?? undefined);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const table = blackjackTables.get(accountId);
      if (table === undefined) { json(res, 404, { error: 'no blackjack table yet — POST /blackjack/new-table first' }); return; }
      json(res, 200, table.statusAndState());
      return;
    }

    if (req.method === 'POST' && routePath === '/blackjack/intent') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const table = blackjackTables.get(accountId);
      if (table === undefined) { json(res, 404, { error: 'no blackjack table yet — POST /blackjack/new-table first' }); return; }
      const value = await body(req);
      if (typeof value.kind !== 'string') { json(res, 400, { error: 'missing intent kind' }); return; }
      try {
        table.apply(value.kind, value.bet);
        json(res, 200, table.statusAndState());
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    // ── Tideline Treasures — Cowrie Casino's second game (src/games/slots/) ─────────────────

    if (req.method === 'GET' && routePath === '/slots/paylines') {
      // Static rules data (no auth needed, same "public catalog fact" shape as `GET /bundles`):
      // the payline row-patterns, so the client can compute which grid cells a given
      // `lineWins[].line` index touches for its own line-trace glow choreography — the server's
      // own `/slots/*` game responses never need to carry this (every line win is already fully
      // resolved server-side), so it isn't duplicated onto every spin response.
      const configId = url.searchParams.get('configId') ?? undefined;
      try {
        json(res, 200, { paylines: resolveSlotsRules(configId).paylines });
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'POST' && routePath === '/slots/new-machine') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const value = await body(req);
      const seed = typeof value.seed === 'string' && value.seed.length > 0 ? value.seed : randomUUID();
      const configId = typeof value.configId === 'string' ? value.configId : undefined;
      try {
        const machine = new SlotsTable(economy, accountId, `slots-${accountId}`, seed, configId, undefined, (event: SlotsSettlement) =>
          floor.reportSettlement(guestLabel(accountId), event),
        );
        slotsTables.set(accountId, machine);
        json(res, 200, machine.statusAndState());
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'GET' && routePath === '/slots/state') {
      const accountId = accountFor(req, url.searchParams.get('token') ?? undefined);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const machine = slotsTables.get(accountId);
      if (machine === undefined) { json(res, 404, { error: 'no slots machine yet — POST /slots/new-machine first' }); return; }
      json(res, 200, machine.statusAndState());
      return;
    }

    if (req.method === 'POST' && routePath === '/slots/spin') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const machine = slotsTables.get(accountId);
      if (machine === undefined) { json(res, 404, { error: 'no slots machine yet — POST /slots/new-machine first' }); return; }
      const value = await body(req);
      try {
        machine.apply('spin', value.betPerLine);
        json(res, 200, machine.statusAndState());
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'POST' && routePath === '/slots/collect') {
      const accountId = accountFor(req);
      if (accountId === undefined) { json(res, 401, { error: 'not logged in — POST /session first' }); return; }
      const machine = slotsTables.get(accountId);
      if (machine === undefined) { json(res, 404, { error: 'no slots machine yet — POST /slots/new-machine first' }); return; }
      try {
        machine.apply('collect');
        json(res, 200, machine.statusAndState());
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === 'GET' && routePath === '/vendor/card-table/svg.mjs') {
      const raw = await readFile(CARD_TABLE_SVG_PATH);
      res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'text/javascript; charset=utf-8' });
      res.end(raw);
      return;
    }

    // ── qwzspace/resonator vendor passthrough — see VENDOR_ROOTS's own header ────────────────
    if (req.method === 'GET' && routePath.startsWith('/vendor/')) {
      const rest = routePath.slice('/vendor/'.length);
      const slash = rest.indexOf('/');
      if (slash > 0) {
        const pkg = rest.slice(0, slash);
        const relPath = decodeURIComponent(rest.slice(slash + 1));
        const root = VENDOR_ROOTS[pkg];
        if (root !== undefined && relPath.endsWith('.mjs')) {
          const filePath = resolveInside(root, relPath);
          if (filePath !== null) {
            try {
              const raw = await readFile(filePath, 'utf8');
              res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'text/javascript; charset=utf-8' });
              res.end(rewriteVendorImports(raw));
              return;
            } catch (err) {
              if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
              // fall through to 404 below
            }
          }
        }
      }
    }

    // Static lobby page + assets — anything not matched by a JSON route above.
    if (req.method === 'GET') {
      const filePath = await resolveStaticFile(routePath);
      if (filePath !== null) {
        try {
          const raw = await readFile(filePath);
          res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': contentTypeFor(filePath) });
          res.end(raw);
          return;
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
          // fall through to 404 below
        }
      }
    }

    json(res, 404, { error: 'not found' });
  } catch (err) {
    const status = err instanceof SyntaxError || err instanceof RangeError ? 400 : 500;
    json(res, status, { error: status === 400 ? (err instanceof Error ? err.message : String(err)) : 'internal error' });
    if (status === 500) process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  }
});

// ── the realtime floor room: real WebSocket upgrades on this same http.Server, no separate port
// or path — see @red-cup-engineering/qwzspace/http-ws-server#attach, which hooks the server's own
// 'upgrade' event unconditionally (this is the only room this service runs, so there is no
// path-based routing to do). ──────────────────────────────────────────────────────────────────
floor.room.attach(server);
floor.room.start();

// ── persistence: save on an interval and at shutdown ────────────────────────────────────

let saveTimer: NodeJS.Timeout | undefined;
if (SNAPSHOT_PATH !== undefined) {
  saveTimer = setInterval(() => {
    void saveSnapshot(SNAPSHOT_PATH, economy.snapshot()).catch((err) => {
      process.stderr.write(`casino-service: snapshot save failed: ${String(err)}\n`);
    });
  }, SAVE_INTERVAL_MS);
  saveTimer.unref();
}

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  if (saveTimer) clearInterval(saveTimer);
  await castResidency.stop();
  floor.room.stop();
  floor.room.destroy();
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  await saveSnapshot(SNAPSHOT_PATH, economy.snapshot());
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void close().then(
      () => process.exit(0),
      (err) => {
        process.stderr.write(`casino-service: shutdown failed: ${String(err)}\n`);
        process.exit(1);
      },
    );
  });
}

await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, HOST, resolve);
});
const address = server.address();
const boundPort = typeof address === 'object' && address !== null ? address.port : PORT;
const shown = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
process.stdout.write(
  `casino-service: Cowrie Casino is open on http://${shown}:${boundPort}/${SNAPSHOT_PATH ? ` (snapshotting to ${SNAPSHOT_PATH})` : ''}\n`,
);

export { server, economy, floor, castResidency };
