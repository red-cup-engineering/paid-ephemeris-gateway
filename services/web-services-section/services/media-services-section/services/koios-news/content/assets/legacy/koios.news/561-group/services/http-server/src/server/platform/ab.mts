// platform/ab.ts — A/B testing with consistent hash assignment and HMAC-signed cookies.
//
// Each experiment assigns a user to a bucket via FNV-1a hash of (experimentId + userId).
// The assignment is stored as a Meme and signed into a cookie so it's sticky across requests.
// The MPU settles whether the stored assignment is still valid (matches the live config).

import { createHmac, timingSafeEqual } from "node:crypto";
import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { Middleware, Context } from "../types.mjs";
import { parseCookieHeader, serializeSetCookie, signCookieValue, unsignCookieValue } from "@emsenn/computing-with-http/codecs/cookie";
import { appendSetCookie } from "../cookies.mjs";

export type Bucket<N extends string = string> = {
  name: N;
  weight: number;   // relative weight (e.g. 50 vs 50, or 90 vs 10)
};

export type AbExperiment<N extends string = string> = {
  id: string;
  buckets: Bucket<N>[];
  /** Extract a stable user identifier. Default: client IP. */
  userId?: (ctx: Context) => string;
  /** Cookie name for sticky assignment (default: "ab_" + id). */
  cookieName?: string;
  /** HMAC secret to sign/verify cookie assignments. If omitted, no signing (dev only). */
  secret?: string;
  /** Cookie max-age in seconds (default 86400). */
  maxAge?: number;
  /** Put bucket name on ctx.locals under this key (default: id). */
  localsKey?: string;
};

// FNV-1a 32-bit
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function selectBucket<N extends string>(buckets: Bucket<N>[], hash: number): N {
  const total = buckets.reduce((s, b) => s + b.weight, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("abTest: bucket weights must sum to a positive number");
  let r = hash % total;
  for (const b of buckets) {
    r -= b.weight;
    if (r < 0) return b.name;
  }
  return buckets[buckets.length - 1]!.name;
}

function cookieSet(name: string, value: string, maxAge: number, signed?: string): string {
  const v = signed ? `${value}.${signed}` : value;
  return serializeSetCookie(name, v, { path: "/", maxAge, sameSite: "Lax", httpOnly: true });
}

function parseCookie(header: string | string[] | undefined, name: string): string | null {
  return parseCookieHeader(header)[name] ?? null;
}

function signedBucket(value: string, secret: string, cookieName: string): string {
  return signCookieValue(value, secret, cookieName);
}

function verifiedBucket(raw: string, secret: string, cookieName: string): string {
  const current = unsignCookieValue(raw, secret, cookieName);
  if (current !== null) return current;
  const [value, legacySignature] = raw.split(".", 2);
  if (!value || !legacySignature) return "";
  return verifyLegacySignature(value, legacySignature, secret) ? value : "";
}

function verifyLegacySignature(value: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(value).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function abTest<N extends string>(experiment: AbExperiment<N>): Middleware {
  if (!experiment.id) throw new Error("abTest: experiment id is required");
  if (!experiment.buckets.length) throw new Error("abTest: buckets must be non-empty");
  for (const bucket of experiment.buckets) {
    if (!bucket.name) throw new Error("abTest: bucket name is required");
    if (!Number.isFinite(bucket.weight) || bucket.weight <= 0) throw new Error("abTest: bucket weights must be positive");
  }
  const store = new UtteranceLog();
  const cookieName = experiment.cookieName ?? `ab_${experiment.id}`;
  const localsKey = experiment.localsKey ?? experiment.id;
  const maxAge = experiment.maxAge ?? 86400;

  return (ctx) => {

    // Check existing cookie
    const cookieRaw = parseCookie(ctx.req.headers["cookie"], cookieName);
    if (cookieRaw) {
      let bucketName = cookieRaw;
      if (experiment.secret) {
        bucketName = verifiedBucket(cookieRaw, experiment.secret, cookieName);
      }
      if (bucketName && experiment.buckets.some((b) => b.name === bucketName)) {
        ctx.locals[localsKey] = bucketName as N;
        return Promise.resolve(undefined);
      }
    }

    // Fresh assignment
    const userId = experiment.userId ? experiment.userId(ctx) : (ctx.req.socket?.remoteAddress ?? "anon");
    const hash = fnv1a(`${experiment.id}:${userId}`);
    const bucket = selectBucket(experiment.buckets, hash);

    witness(store, { subject: experiment.id, predicate: "ab", object: bucket }, [true, false]);

    ctx.locals[localsKey] = bucket;

    const signed = experiment.secret ? signedBucket(bucket, experiment.secret, cookieName) : undefined;
    appendSetCookie(ctx.res, signed ? cookieSet(cookieName, signed, maxAge) : cookieSet(cookieName, bucket, maxAge));

    return Promise.resolve(undefined);
  };
}

/** Read the bucket assigned to an experiment from ctx.locals. */
export function getBucket<N extends string>(ctx: Context, experimentId: string): N | undefined {
  return ctx.locals[experimentId] as N | undefined;
}
