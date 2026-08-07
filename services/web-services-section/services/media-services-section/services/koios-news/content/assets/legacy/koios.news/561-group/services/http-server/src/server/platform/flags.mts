// platform/flags.ts — Feature flags with injected evaluator.
//
// Each flag decision is a Meme. Observed evaluator output folds to a MEMETICS
// charge value: potential enables, active disables.
//
// The evaluator is pluggable: pass a LaunchDarkly client, a local JSON file,
// a remote config service, or a simple Map.

import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { Middleware, Context } from "../types.mjs";

export type FlagContext = {
  key: string;        // flag key
  userId?: string;    // for targeting
  attrs?: Record<string, unknown>;
};

export type FlagValue = unknown;
export type FlagEvaluator = (ctx: FlagContext) => boolean | Promise<boolean>;
export type FlagSource = FlagValue | ((ctx: Context) => FlagValue | Promise<FlagValue>);
export type FlagMapEvaluator = (
  ctx: Context,
  base: Record<string, FlagValue>,
) => Record<string, FlagValue> | Promise<Record<string, FlagValue>>;

export type FeatureFlagsOptions = {
  evaluate?: FlagEvaluator | FlagMapEvaluator;
  /** Flags to resolve per request. */
  flags?: string[] | Record<string, FlagSource>;
  /** Put resolved flags on ctx.locals under this key (default "flags"). */
  localsKey?: string;
  /** User ID extractor for targeting (default: IP). */
  userId?: (ctx: Context) => string;
  /** TTL for flag evaluations in ms (default 30_000). Skip if 0. */
  cacheTtlMs?: number;
  /** Fail-closed: disabled if evaluator throws (default true). */
  failClosed?: boolean;
};

type FlagCache = { value: boolean; expiresAt: number };

export function featureFlags(opts: FeatureFlagsOptions): Middleware {
  if (!opts.flags && typeof opts.evaluate !== "function") {
    throw new Error("featureFlags: provide `flags` and/or an `evaluate` function");
  }
  const store = new UtteranceLog();
  const localsKey = opts.localsKey ?? "flags";
  const cacheTtlMs = opts.cacheTtlMs ?? 30_000;
  const failClosed = opts.failClosed !== false;
  const cache = new Map<string, FlagCache>();

  return async (ctx) => {
    const userId = opts.userId ? opts.userId(ctx) : (ctx.req.socket?.remoteAddress ?? "anon");
    const resolved: Record<string, FlagValue> = {};

    if (!Array.isArray(opts.flags)) {
      try {
        for (const [key, source] of Object.entries(opts.flags ?? {})) {
          resolved[key] = typeof source === "function" ? await (source as (ctx: Context) => FlagValue | Promise<FlagValue>)(ctx) : source;
        }
        const full = typeof opts.evaluate === "function"
          ? await (opts.evaluate as FlagMapEvaluator)(ctx, resolved)
          : resolved;
        ctx.locals[localsKey] = full ?? resolved;
      } catch {
        ctx.locals[localsKey] = {};
      }
      return;
    }

    if (typeof opts.evaluate !== "function") {
      throw new Error("featureFlags: array flags require an `evaluate` function");
    }

    for (const flag of opts.flags) {
      const cacheKey = `${flag}:${userId}`;
      const cached = cache.get(cacheKey);

      let value: boolean;
      if (cached && Date.now() < cached.expiresAt) { // law-allow: wall-clock-as-data — flag cache TTL/freshness bookkeeping (eviction timing), not event ordering
        value = cached.value;
      } else {
        try {
          value = await (opts.evaluate as FlagEvaluator)({ key: flag, userId, attrs: ctx.locals as Record<string, unknown> });
          if (cacheTtlMs > 0) cache.set(cacheKey, { value, expiresAt: Date.now() + cacheTtlMs }); // law-allow: wall-clock-as-data — cache TTL/freshness bookkeeping (eviction timing), not event ordering
        } catch {
          value = !failClosed; // fail-closed = false on error
        }
      }

      const memeCharge = value ? "potential" : "active";
      const settled = memeCharge === "potential";

      witness(store, { subject: flag, predicate: "flag", object: userId }, settled ? [true, false] : [false, true]);

      resolved[flag] = settled;
    }

    ctx.locals[localsKey] = resolved;
  };
}

/** Read a flag from ctx.locals. */
export function getFlag<T = boolean>(ctx: Context, flag: string, localsKey = "flags", fallback?: T): T {
  const flags = ctx.locals[localsKey] as Record<string, T> | undefined;
  return flags && flag in flags ? flags[flag]! : ((fallback ?? false) as T);
}

/** Build an evaluator from a static Record<flag, boolean>. */
export function staticFlags(flags: Record<string, boolean>): FlagEvaluator {
  return (ctx) => flags[ctx.key] ?? false;
}

/** Build an evaluator that fetches from a remote JSON endpoint. */
export function remoteFlagsEvaluator(url: string, ttlMs = 60_000): FlagEvaluator {
  let cache: Record<string, boolean> = {};
  let lastFetch = 0;

  return async (ctx) => {
    if (Date.now() - lastFetch > ttlMs) { // law-allow: wall-clock-as-data — cache TTL/freshness bookkeeping (eviction timing), not event ordering
      try {
        const res = await fetch(url);
        cache = await res.json() as Record<string, boolean>;
        lastFetch = Date.now(); // law-allow: wall-clock-as-data — cache TTL/freshness bookkeeping (eviction timing), not event ordering
      } catch { /* use stale */ }
    }
    return cache[ctx.key] ?? false;
  };
}
