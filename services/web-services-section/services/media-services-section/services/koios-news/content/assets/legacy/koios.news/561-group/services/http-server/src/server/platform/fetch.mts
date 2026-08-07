// platform/fetch.ts — Instrumented fetch with retry, timeout, and UtteranceLog telemetry.
//
// Each outbound request is a Meme. Observed success/failure folds to a MEMETICS
// charge value: potential succeeds, active retries/fails.
// Integrates with the circuit breaker concept but at the fetch layer.

import * as http from "node:http";
import * as https from "node:https";
import { witness, UtteranceLog } from "../internal/witness.mjs";

export type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;          // default 30_000
  retries?: number;            // default 0
  retryDelayMs?: number;       // default 1000
  retryOn?: (status: number) => boolean;  // default: status >= 500
  followRedirects?: number;    // max redirects (default 5)
};

export type FetchResponse = {
  status: number;
  headers: Record<string, string>;
  body(): Promise<Buffer>;
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
};

const store = new UtteranceLog();

async function doFetch(
  url: string,
  opts: FetchOptions,
  redirectsLeft: number,
): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === "https:" ? https : http;
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body) headers["Content-Length"] = String(Buffer.byteLength(opts.body));

    const req = mod.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: opts.method ?? "GET",
      headers,
    }, (res) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && redirectsLeft > 0) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume();
        const nextMethod = res.statusCode === 302 || res.statusCode === 301 ? (opts.method ?? "GET") : (opts.method ?? "GET");
        doFetch(nextUrl, { ...opts, method: nextMethod }, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      const h: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) {
        if (typeof v === "string") h[k] = v;
        else if (Array.isArray(v)) h[k] = v.join(", ");
      }

      let bodyPromise: Promise<Buffer> | null = null;
      const getBody = (): Promise<Buffer> => {
        if (bodyPromise) return bodyPromise;
        bodyPromise = new Promise<Buffer>((r, rej) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => r(Buffer.concat(chunks)));
          res.on("error", rej);
        });
        return bodyPromise;
      };

      resolve({
        status: res.statusCode ?? 0,
        headers: h,
        body: getBody,
        async json<T>() { return JSON.parse((await getBody()).toString("utf8")) as T; },
        async text() { return (await getBody()).toString("utf8"); },
      });
    });

    if (opts.timeoutMs) req.setTimeout(opts.timeoutMs, () => req.destroy(new Error("fetch timeout")));
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

export async function fetch(url: string, opts: FetchOptions = {}): Promise<FetchResponse> {
  const retries = opts.retries ?? 0;
  const retryDelayMs = opts.retryDelayMs ?? 1000;
  const retryOn = opts.retryOn ?? ((s) => s >= 500);
  const followRedirects = opts.followRedirects ?? 5;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: FetchResponse | null = null;
    let fetchErr: unknown = null;

    try {
      response = await doFetch(url, { ...opts, timeoutMs: opts.timeoutMs ?? 30_000 }, followRedirects);
    } catch (err) {
      fetchErr = err;
    }

    const status = response?.status ?? 0;
    const success = response !== null && !retryOn(status);

    const memeCharge = success ? "potential" : "active";
    witness(store, { subject: url, predicate: "fetch", object: memeCharge }, success ? [true, false] : [false, true]);

    if (memeCharge === "potential") return response!;

    if (attempt < retries) {
      await new Promise<void>((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      continue;
    }

    if (fetchErr) throw fetchErr;
    return response!;
  }

  throw new Error(`fetch failed after ${retries + 1} attempts: ${url}`);
}

/** Fetch with JSON body shorthand. */
export async function fetchJson<T = unknown>(
  url: string,
  body: unknown,
  opts: Omit<FetchOptions, "body"> = {},
): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    method: opts.method ?? "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  return res.json<T>();
}
