// cache-control.mts — the Cache-Control field (RFC 9111 §5.2).
//
// Semantic value: a response cache policy. Wire form: the directive
// list. The pair is a RETRACTION onto the directives CacheControl can
// state: parseCacheControl ∘ cacheControl = id on policies, and the
// parser drops extension directives and malformed arguments.

import { parseDirectiveList } from "./header-value.mjs";

export type CacheControl = {
  visibility?: "public" | "private";
  maxAge?: number;
  sMaxage?: number;
  noStore?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
};

function seconds(name: string, value: number | undefined): string | null {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return String(value);
}

export function cacheControl(policy: CacheControl | string): string {
  if (typeof policy === "string") return policy;
  const directives: string[] = [];
  if (policy.noStore) directives.push("no-store");
  if (policy.noCache) directives.push("no-cache");
  if (policy.visibility) directives.push(policy.visibility);
  const maxAge = seconds("maxAge", policy.maxAge);
  if (maxAge !== null) directives.push(`max-age=${maxAge}`);
  const sMaxage = seconds("sMaxage", policy.sMaxage);
  if (sMaxage !== null) directives.push(`s-maxage=${sMaxage}`);
  if (policy.mustRevalidate) directives.push("must-revalidate");
  if (policy.proxyRevalidate) directives.push("proxy-revalidate");
  if (policy.immutable) directives.push("immutable");
  const staleWhileRevalidate = seconds("staleWhileRevalidate", policy.staleWhileRevalidate);
  if (staleWhileRevalidate !== null) directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  const staleIfError = seconds("staleIfError", policy.staleIfError);
  if (staleIfError !== null) directives.push(`stale-if-error=${staleIfError}`);
  return directives.join(", ");
}

function nonnegativeSeconds(argument: true | string | undefined): number | undefined {
  if (argument === undefined || argument === true) return undefined;
  const value = parseInt(argument, 10);
  return Number.isSafeInteger(value) && value >= 0 && String(value) === argument.trim() ? value : undefined;
}

export function parseCacheControl(value: string | readonly string[] | null | undefined): CacheControl {
  const directives = parseDirectiveList(value ?? undefined);
  const policy: CacheControl = {};
  if (directives["public"] === true) policy.visibility = "public";
  if (directives["private"] === true) policy.visibility = "private";
  if (directives["no-store"] === true) policy.noStore = true;
  if (directives["no-cache"] === true) policy.noCache = true;
  if (directives["must-revalidate"] === true) policy.mustRevalidate = true;
  if (directives["proxy-revalidate"] === true) policy.proxyRevalidate = true;
  if (directives["immutable"] === true) policy.immutable = true;
  const maxAge = nonnegativeSeconds(directives["max-age"]);
  if (maxAge !== undefined) policy.maxAge = maxAge;
  const sMaxage = nonnegativeSeconds(directives["s-maxage"]);
  if (sMaxage !== undefined) policy.sMaxage = sMaxage;
  const staleWhileRevalidate = nonnegativeSeconds(directives["stale-while-revalidate"]);
  if (staleWhileRevalidate !== undefined) policy.staleWhileRevalidate = staleWhileRevalidate;
  const staleIfError = nonnegativeSeconds(directives["stale-if-error"]);
  if (staleIfError !== undefined) policy.staleIfError = staleIfError;
  return policy; // extension directives are outside the policy language
}
