// gcs-client — vendored from Farstone's `src/gcs-client.mts` (the sibling
// `farstone-services-section` site in this same estate), 2026-08-19, by claude-fable-5, which
// itself vendored the generic HTTP/auth layer from ruinfold's `src/server/bucket-store.mts`
// (`createGoogleApiRequest()` + `createGcsClient()` only — ruinfold's own JSONL runs/scores
// layout and Farstone's own single-blob world-snapshot layout were both left behind; Aletheon's
// own object shape — a growing newline-delimited EAVT log — lives in `log-store.mjs` next to
// this file, the Aletheon-specific layer built on top of this client).
//
// Ported from TypeScript to plain ESM (this package has no build step and ships no other .mts
// files) — logic kept byte-identical to the Farstone/ruinfold originals; only the `interface`/
// type-annotation lines were dropped, so this is still trivially diffable against either source.

import { withGcsRetry } from "./gcs-retry.mjs";
//
// Auth — ambient workload identity ONLY (house policy: no key file, no credential env var,
// ever): every request is authenticated by a bearer token fetched from the instance metadata
// server, cached in memory until ~60s before its declared expiry.
//
// Retry — every storage-API call this client makes (getObject's metadata GET, getObject's
// content GET, putObject's conditional write) is wrapped in `gcs-retry.mjs`'s bounded, jittered
// retry by default (see that module's own header for the full policy and why 412 is deliberately
// never retried here). This was NOT true before 2026-08-19: the 2026-08-19 deploy runbook
// recorded a live `autosave flush failed: fetch failed` error on this tree's own autosave path
// with no retry at all, and flagged the gap explicitly ("a failed *read* ahead of the write does
// not appear to be retried the same way; confirm and fix if so" — item 2 under "Fixes, named,
// not applied in this pass"). Pass `retry: false` to disable entirely (tests that want to
// observe one raw failure without waiting out real backoff timers use this).

const DEFAULT_METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const DEFAULT_API_BASE = "https://storage.googleapis.com";
const TOKEN_SAFETY_MARGIN_MS = 60_000; // refresh a bit before the token actually expires

// createGoogleApiRequest — a fetch wrapper that attaches a bearer token (fresh, or cached if
// not near expiry) from the metadata server to every outgoing request. `fetchImpl`/`now`/
// `metadataUrl` are all injectable so tests never touch a real metadata server or a real
// clock. Token state is closed over per call to this factory (not module-global), so
// independent stores/tests never share a cache.
export function createGoogleApiRequest(opts = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const metadataUrl = opts.metadataUrl ?? DEFAULT_METADATA_TOKEN_URL;

  let cachedToken;
  let cachedExpiresAt = 0;

  return async function googleApiRequest(url, init = {}) {
    if (cachedToken === undefined || now() >= cachedExpiresAt - TOKEN_SAFETY_MARGIN_MS) {
      const res = await fetchImpl(metadataUrl, { headers: { "Metadata-Flavor": "Google" } });
      if (!res.ok) throw new Error(`metadata-server token fetch failed: HTTP ${res.status}`);
      const token = await res.json();
      if (typeof token.access_token !== "string" || token.access_token === "" || !Number.isFinite(token.expires_in)) {
        throw new Error("metadata-server token response is malformed");
      }
      cachedToken = token.access_token;
      cachedExpiresAt = now() + token.expires_in * 1000;
    }
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${cachedToken}`);
    return fetchImpl(url, { ...init, headers });
  };
}

function encodeObjectPath(name) {
  return encodeURIComponent(name);
}

// createGcsClient — the hand-rolled GCS JSON API surface: nothing more. No SDK, plain fetch,
// matching the real `storage.googleapis.com` JSON/upload API shapes exactly (so the same code
// runs against the real bucket in production and against a fake-GCS double in tests — only
// `apiBase`/`request` differ).
export function createGcsClient(opts) {
  const bucket = opts.bucket;
  const apiBase = opts.apiBase ?? DEFAULT_API_BASE;
  const rawRequest = opts.request ?? createGoogleApiRequest(opts.googleApiRequestOptions);
  const request = opts.retry === false ? rawRequest : withGcsRetry(rawRequest, opts.retry ?? {});
  const storageRoot = `${apiBase}/storage/v1/b/${encodeURIComponent(bucket)}/o`;
  const uploadRoot = `${apiBase}/upload/storage/v1/b/${encodeURIComponent(bucket)}/o`;

  // getObject — a SINGLE `alt=media` request, generation read off the response's own
  // `x-goog-generation` header. Fixed 2026-08-20: this used to be a metadata GET (to learn the
  // current generation) followed by a SEPARATE content GET pinned to that generation. On this
  // (unversioned) bucket, a concurrent overwrite landing in the window between those two calls
  // deletes the exact generation the metadata GET just pinned — the follow-up content GET then
  // 404s, and gcs-retry deliberately never retries a 404 (it's legitimately indistinguishable
  // from "object doesn't exist" — see that module's policy comment), so the read failed outright
  // instead of just observing whichever generation happened to be current. Reading content and
  // generation off the SAME response removes the window entirely: there is no second request
  // left for a concurrent write to land inside of, so the read is atomic by construction no
  // matter when a concurrent writer's overwrite lands.
  async function getObject(name) {
    const res = await request(`${storageRoot}/${encodeObjectPath(name)}?alt=media`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`gcs content get failed for ${name}: HTTP ${res.status}`);
    const generation = res.headers.get("x-goog-generation");
    if (typeof generation !== "string" || generation === "") {
      throw new Error(`gcs content get for ${name} missing x-goog-generation response header`);
    }
    const text = await res.text();
    return { text, generation };
  }

  // putObject — conditional write. `ifGenerationMatch` follows real GCS semantics exactly:
  // "0" means "create only if the object does not currently exist"; any other value means
  // "overwrite only if the object's CURRENT generation is exactly this". A 412 is returned to
  // the caller as `{ ok: false }` rather than thrown — losing a conditional write is an
  // expected, handled outcome here (a retry loop), not an error.
  async function putObject(name, text, ifGenerationMatch) {
    const url =
      `${uploadRoot}?uploadType=media&name=${encodeObjectPath(name)}` +
      `&ifGenerationMatch=${encodeURIComponent(ifGenerationMatch)}`;
    const res = await request(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: text,
    });
    if (res.status === 412) return { ok: false, status: 412 };
    if (!res.ok) throw new Error(`gcs write failed for ${name}: HTTP ${res.status}`);
    const written = await res.json();
    if (typeof written.generation !== "string" || written.generation === "") {
      throw new Error(`gcs write for ${name} did not return a generation`);
    }
    return { ok: true, generation: written.generation };
  }

  return { getObject, putObject };
}
