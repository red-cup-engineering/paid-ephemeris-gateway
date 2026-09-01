// fake-gcs — vendored from Farstone's `src/fake-gcs.mts` (the sibling `farstone-services-section`
// site in this same estate), 2026-08-19, by claude-fable-5, itself vendored from ruinfold's
// `src/tests/helpers/fake-gcs.mts` — for exercising gcs-client.mjs/log-store.mjs without a real
// bucket. Ported from TypeScript to plain ESM (no build step in this package); logic identical.
//
// An in-memory node:http double of just the slice of the real GCS JSON/upload API that
// gcs-client.mjs's hand-rolled client calls: object metadata GET, object content GET
// (?alt=media, pinned to a specific generation), and the conditional upload POST
// (?uploadType=media&ifGenerationMatch=). NOT a general GCS emulator — just enough surface,
// with the same conditional-write semantics (ifGenerationMatch=0 means "must not currently
// exist"; any other value means "must currently be exactly this generation", else 412) to
// let gcs-client.mjs's client run unmodified against `apiBase: fake.url` instead of
// `https://storage.googleapis.com`.
//
// UNVERSIONED-BUCKET SEMANTICS (fixed 2026-08-20, alongside the gcs-client.mjs getObject fix):
// only the CURRENT generation's content is ever retrievable, matching a real bucket with
// Object Versioning off — an overwrite makes the previous generation's content gone, not just
// superseded. (This file used to keep every past generation forever, which meant this double
// could never reproduce the metadata-GET-then-content-GET race gcs-client.mjs's getObject had:
// the stale generation a slow second call pinned was always still there. That silently masked
// the bug in this suite; see `interleaveNextMatchingRequest` below for how tests now inject the
// interleaving directly instead.)
//
// failNextRequests(count, mode) — vendored from Farstone's `src/fake-gcs.mts` (the sibling
// `farstone-services-section` site in this same estate) 2026-08-19, alongside gcs-retry.mjs:
// injects `count` consecutive transient failures (mode "503" — a real HTTP 503 response, or
// "throw" — an abrupt socket reset, so the client's own `fetch()` rejects with no response at
// all) into the NEXT `count` requests this fake server receives, then reverts to normal
// behavior. `count: Infinity` means "never recovers" — the permanent-failure test shape.

import { createServer } from "node:http";

// warmUpLocalPort — some sandboxes refuse the very FIRST connection attempt to a freshly bound
// ephemeral port (a connection-tracking/allow-listing layer not yet primed for it) even though
// an identical retried fetch always succeeds. A newly started fake server "primes" its own port
// with a harmless self-request (swallowing exactly that one expected failure, retried a few
// times with a short backoff) before handing the URL to a test, so no test needs to know about
// this. Harmless no-op on sandboxes that never hit it.
async function warmUpLocalPort(url) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

export function startFakeGcs(bucket = "test-bucket") {
  const objects = new Map();
  const requestLog = [];
  const stats = { preconditionFailures: 0 };
  const failure = { remaining: 0, mode: "503" };
  let pendingInterleave;

  const metaPrefix = `/storage/v1/b/${bucket}/o`;
  const uploadPath = `/upload/storage/v1/b/${bucket}/o`;

  function sendJson(res, status, obj) {
    const buf = Buffer.from(JSON.stringify(obj), "utf8");
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(buf);
  }

  // unversionedWrite — the same "replace, don't append" semantics a real bucket with Object
  // Versioning off applies to every write, whether it came through the normal conditional-POST
  // route below or was injected directly by a test's `interleaveNextMatchingRequest`.
  function unversionedWrite(name, text) {
    const state = objects.get(name);
    const newGen = (state ? state.currentGeneration : 0) + 1;
    objects.set(name, { currentGeneration: newGen, versions: new Map([[newGen, text]]) });
    return newGen;
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    requestLog.push(`${req.method} ${url.pathname}${url.search}`);

    if (pendingInterleave && pendingInterleave.match(req.method ?? "GET", url.pathname, url.searchParams)) {
      const { name, text } = pendingInterleave.write;
      pendingInterleave = undefined;
      unversionedWrite(name, text);
    }

    if (failure.remaining > 0) {
      failure.remaining -= 1;
      if (failure.mode === "throw") {
        req.socket.destroy(); // abrupt reset -> the client's fetch() rejects, no response ever sent
        return;
      }
      return sendJson(res, 503, { error: { code: 503, message: "fake-gcs: injected transient failure" } });
    }

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const method = req.method ?? "GET";

      if (method === "GET" && url.pathname.startsWith(`${metaPrefix}/`)) {
        const encodedName = url.pathname.slice(metaPrefix.length + 1);
        const name = decodeURIComponent(encodedName);
        const state = objects.get(name);

        if (url.searchParams.get("alt") === "media") {
          if (!state) return sendJson(res, 404, { error: { code: 404, message: "not found" } });
          const genParam = url.searchParams.get("generation");
          const gen = genParam ? Number(genParam) : state.currentGeneration;
          const text = state.versions.get(gen);
          if (text === undefined) return sendJson(res, 404, { error: { code: 404, message: "generation not found" } });
          res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "x-goog-generation": String(gen) });
          return res.end(text);
        }

        if (!state) return sendJson(res, 404, { error: { code: 404, message: "not found" } });
        return sendJson(res, 200, { name, bucket, generation: String(state.currentGeneration) });
      }

      if (method === "GET" && url.pathname === metaPrefix) {
        const prefix = url.searchParams.get("prefix") ?? "";
        const items = [...objects.entries()]
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, state]) => ({ name, generation: String(state.currentGeneration) }));
        return sendJson(res, 200, { items });
      }

      if (method === "POST" && url.pathname === uploadPath) {
        const name = url.searchParams.get("name");
        const ifGenerationMatch = url.searchParams.get("ifGenerationMatch");
        if (!name || ifGenerationMatch === null) {
          return sendJson(res, 400, { error: { code: 400, message: "missing name/ifGenerationMatch" } });
        }
        const expected = Number(ifGenerationMatch);
        const state = objects.get(name);
        const current = state ? state.currentGeneration : 0;
        if (current !== expected) {
          stats.preconditionFailures += 1;
          return sendJson(res, 412, { error: { code: 412, message: "Precondition Failed" } });
        }
        const newGen = unversionedWrite(name, body);
        return sendJson(res, 200, { name, bucket, generation: String(newGen) });
      }

      sendJson(res, 404, { error: { code: 404, message: `no fake-gcs route for ${method} ${url.pathname}` } });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      void (async () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr !== null ? addr.port : 0;
        const url = `http://127.0.0.1:${port}`;
        await warmUpLocalPort(url);
        requestLog.length = 0; // the warm-up probe itself isn't part of any test's request log
        resolve({
          url,
          bucket,
          requestLog,
          get preconditionFailures() {
            return stats.preconditionFailures;
          },
          failNextRequests: (count, mode = "503") => {
            failure.remaining = count;
            failure.mode = mode;
          },
          interleaveNextMatchingRequest: (match, write) => {
            pendingInterleave = { match, write };
          },
          close: () => new Promise((r) => server.close(() => r())),
        });
      })();
    });
  });
}
