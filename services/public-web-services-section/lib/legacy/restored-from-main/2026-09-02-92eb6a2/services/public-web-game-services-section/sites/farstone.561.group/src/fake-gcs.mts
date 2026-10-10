// fake-gcs — vendored from ruinfold's `src/tests/helpers/fake-gcs.mts` (the sibling
// `ruinfold-services-section` app in this same estate), 2026-08-19, by claude-fable-5, for
// exercising `gcs-client.mts`/`world-store.mts` without a real bucket. Kept logic-identical
// to the ruinfold original (only this header and the export list were trimmed — ruinfold's
// own comments describing its own JSONL append use case were generic enough to keep
// verbatim below since they describe the fake server, not ruinfold-specific behavior).
//
// An in-memory node:http double of just the slice of the real GCS JSON/upload API that
// gcs-client.mts's hand-rolled client calls: object metadata GET, object content GET
// (?alt=media, pinned to a specific generation), and the conditional upload POST
// (?uploadType=media&ifGenerationMatch=). NOT a general GCS emulator — just enough surface,
// with the same conditional-write semantics (ifGenerationMatch=0 means "must not currently
// exist"; any other value means "must currently be exactly this generation", else 412) to
// let gcs-client.mts's client run unmodified against `apiBase: fake.url` instead of
// `https://storage.googleapis.com`.
//
// UNVERSIONED-BUCKET SEMANTICS (fixed 2026-08-20, alongside the gcs-client.mts getObject fix):
// only the CURRENT generation's content is ever retrievable, matching a real bucket with
// Object Versioning off — an overwrite makes the previous generation's content gone, not just
// superseded. (This file used to keep every past generation forever, which meant this double
// could never reproduce the metadata-GET-then-content-GET race gcs-client.mts's getObject had:
// the stale generation a slow second call pinned was always still there. That silently masked
// the bug in this suite; see `interleaveNextMatchingRequest` below for how tests now inject the
// interleaving directly instead.)

import { createServer } from "node:http";
import type { Server } from "node:http";

// warmUpLocalPort — this sandbox's loopback networking refuses the very FIRST connection
// attempt to a freshly bound ephemeral port (observed directly: identical fetch, retried
// immediately, always succeeds) — some connection-tracking/allow-listing layer that isn't
// ready for the port until it has seen one attempt against it. A newly started fake server
// "primes" its own port with a harmless self-request (swallowing exactly that one expected
// failure, retried a few times with a short backoff) before handing the URL to a test, so no
// individual test needs to know about this.
async function warmUpLocalPort(url: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

interface ObjectState {
  currentGeneration: number;
  versions: Map<number, string>;
}

export interface FakeGcs {
  url: string;
  bucket: string;
  requestLog: string[];
  preconditionFailures: number;
  /** DIVERGENCE from the ruinfold original this file was vendored from, added 2026-08-19 for
   *  the GCS-retry work (`gcs-retry.mts`): fail the next N requests before letting the real
   *  handler run, so a test can exercise "transient failure then recovery" and "permanent
   *  failure surfaced loudly" against the real `gcs-client.mts` retry path, not a hand-rolled
   *  mock. Deliberately NOT propagated back upstream to ruinfold's own copy in this pass — see
   *  the deploy runbook's GCS-retry section: the two trees' bucket-store layers are separate
   *  vendored copies today, unifying them is the architect's rails-extraction docket item, not
   *  this lane's job.
   *  `mode: "throw"` makes the underlying fetch itself reject (simulates a network-level
   *  failure, e.g. the live `fetch failed` errors the runbook recorded). `mode: "503"` (the
   *  default) returns a real HTTP 503 response instead, exercising the status-code retry path
   *  separately from the thrown-error path. Set count to `Infinity` for "never recovers", to
   *  test that permanent failure is surfaced, not silently swallowed. */
  failNextRequests(count: number, mode?: "throw" | "503"): void;
  /** Arms a ONE-SHOT interleave: the next request this fake server receives that matches
   *  `match(method, pathname, search)` triggers a direct, synchronous, unconditional write of
   *  `write.name`/`write.text` (bumping the generation, replacing the object's content exactly
   *  as a real concurrent writer's already-successful overwrite would) BEFORE that matched
   *  request is itself handled — then disarms. Lets a test inject a concurrent overwrite at an
   *  exact point in a multi-request sequence (e.g. between gcs-client.mts's old metadata GET and
   *  content GET) without any real second process or timing races. */
  interleaveNextMatchingRequest(
    match: (method: string, pathname: string, search: URLSearchParams) => boolean,
    write: { name: string; text: string },
  ): void;
  close(): Promise<void>;
}

export function startFakeGcs(bucket = "test-bucket"): Promise<FakeGcs> {
  const objects = new Map<string, ObjectState>();
  const requestLog: string[] = [];
  const stats = { preconditionFailures: 0 };
  const failure = { remaining: 0, mode: "503" as "throw" | "503" };
  let pendingInterleave:
    | { match: (method: string, pathname: string, search: URLSearchParams) => boolean; write: { name: string; text: string } }
    | undefined;

  const metaPrefix = `/storage/v1/b/${bucket}/o`;
  const uploadPath = `/upload/storage/v1/b/${bucket}/o`;

  function sendJson(res: import("node:http").ServerResponse, status: number, obj: unknown): void {
    const buf = Buffer.from(JSON.stringify(obj), "utf8");
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(buf);
  }

  // unversionedWrite — the same "replace, don't append" semantics a real bucket with Object
  // Versioning off applies to every write, whether it came through the normal conditional-POST
  // route below or was injected directly by a test's `interleaveNextMatchingRequest`.
  function unversionedWrite(name: string, text: string): number {
    const state = objects.get(name);
    const newGen = (state ? state.currentGeneration : 0) + 1;
    objects.set(name, { currentGeneration: newGen, versions: new Map([[newGen, text]]) });
    return newGen;
  }

  const server: Server = createServer((req, res) => {
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

    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const method = req.method ?? "GET";

      // Single-object metadata / content GET: /storage/v1/b/:bucket/o/:encodedName
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

      // List: /storage/v1/b/:bucket/o?prefix=... (not used by world-store.mts, kept for parity)
      if (method === "GET" && url.pathname === metaPrefix) {
        const prefix = url.searchParams.get("prefix") ?? "";
        const items = [...objects.entries()]
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, state]) => ({ name, generation: String(state.currentGeneration) }));
        return sendJson(res, 200, { items });
      }

      // Conditional upload: POST /upload/storage/v1/b/:bucket/o?uploadType=media&name=&ifGenerationMatch=
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
          close: () => new Promise<void>((r) => server.close(() => r())),
        });
      })();
    });
  });
}
