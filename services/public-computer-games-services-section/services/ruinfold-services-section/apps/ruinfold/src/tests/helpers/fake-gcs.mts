// fake-gcs — an in-memory node:http double of just the slice of the real GCS JSON/upload API that
// bucket-store.mts's hand-rolled client calls: object metadata GET, object content GET (?alt=media,
// pinned to a specific generation), object list GET (?prefix=), and the conditional upload POST
// (?uploadType=media&ifGenerationMatch=). NOT a general GCS emulator — just enough surface, with the
// same conditional-write semantics (ifGenerationMatch=0 means "must not currently exist"; any other
// value means "must currently be exactly this generation", else 412) to let bucket-store.mts's
// client run unmodified against `apiBase: fake.url` instead of `https://storage.googleapis.com`.
//
// Every past generation of an object is kept (never garbage-collected) so a metadata-GET-then-
// content-GET pair started before a concurrent write lands can still resolve its own generation's
// content correctly — this is what a real un-versioned-but-still-consistent object read behaves
// like for the brief window this client's two-request read needs.

import { createServer } from "node:http";
import type { Server } from "node:http";

// warmUpLocalPort — this sandbox's loopback networking refuses the very FIRST connection attempt to
// a freshly bound ephemeral port (observed directly: identical fetch, retried immediately, always
// succeeds) — some connection-tracking/allow-listing layer that isn't ready for the port until it
// has seen one attempt against it. A newly started fake server "primes" its own port with a
// harmless self-request (swallowing exactly that one expected failure, retried a few times with a
// short backoff) before handing the URL to a test, so no individual test needs to know about this.
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

// localFetch — the same sandbox loopback quirk (above) also surfaces as a sporadic ECONNREFUSED
// under a genuine BURST of near-simultaneous connections to an already-warm port (e.g. a test firing
// a dozen concurrent requests at once) — a transient local-network artifact, not anything
// bucket-store.mts's client needs to handle for the real `storage.googleapis.com`. Tests that create
// real concurrency use this instead of the bare global `fetch` so that artifact doesn't masquerade
// as a correctness failure in the code under test.
export const localFetch: typeof fetch = async (input, init) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      const refused = err instanceof Error && (err.cause as { code?: string } | undefined)?.code === "ECONNREFUSED";
      if (!refused || attempt >= 20) throw err;
      await new Promise((r) => setTimeout(r, 10));
    }
  }
};

interface ObjectState {
  currentGeneration: number;
  versions: Map<number, string>;
}

export interface FakeGcs {
  url: string;
  bucket: string;
  requestLog: string[];
  preconditionFailures: number;
  close(): Promise<void>;
}

export function startFakeGcs(bucket = "test-bucket"): Promise<FakeGcs> {
  const objects = new Map<string, ObjectState>();
  const requestLog: string[] = [];
  const stats = { preconditionFailures: 0 };

  const metaPrefix = `/storage/v1/b/${bucket}/o`;
  const uploadPath = `/upload/storage/v1/b/${bucket}/o`;

  function sendJson(res: import("node:http").ServerResponse, status: number, obj: unknown): void {
    const buf = Buffer.from(JSON.stringify(obj), "utf8");
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(buf);
  }

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    requestLog.push(`${req.method} ${url.pathname}${url.search}`);

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

      // List: /storage/v1/b/:bucket/o?prefix=...
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
        let state = objects.get(name);
        const current = state ? state.currentGeneration : 0;
        if (current !== expected) {
          stats.preconditionFailures += 1;
          return sendJson(res, 412, { error: { code: 412, message: "Precondition Failed" } });
        }
        const newGen = current + 1;
        if (!state) {
          state = { currentGeneration: 0, versions: new Map() };
          objects.set(name, state);
        }
        state.versions.set(newGen, body);
        state.currentGeneration = newGen;
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
          close: () => new Promise<void>((r) => server.close(() => r())),
        });
      })();
    });
  });
}

// fake-metadata-server — a minimal double of the instance metadata server's token endpoint, for
// exercising createGoogleApiRequest()'s in-memory expiry-aware caching without touching a real GCE
// metadata server (which doesn't exist in this sandbox) or a real clock.
export interface FakeMetadataServer {
  url: string;
  requestCount: number;
  close(): Promise<void>;
}

export function startFakeMetadataServer(opts: { token: string; expiresIn: number }): Promise<FakeMetadataServer> {
  let requestCount = 0;
  const server = createServer((req, res) => {
    requestCount += 1;
    if (req.headers["metadata-flavor"] !== "Google") {
      res.writeHead(400, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: "missing Metadata-Flavor header" }));
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ access_token: opts.token, expires_in: opts.expiresIn, token_type: "Bearer" }));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      void (async () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr !== null ? addr.port : 0;
        const url = `http://127.0.0.1:${port}`;
        await warmUpLocalPort(url);
        requestCount = 0; // the warm-up probe itself must not count against a test's assertions
        resolve({
          url,
          get requestCount() {
            return requestCount;
          },
          close: () => new Promise<void>((r) => server.close(() => r())),
        });
      })();
    });
  });
}
