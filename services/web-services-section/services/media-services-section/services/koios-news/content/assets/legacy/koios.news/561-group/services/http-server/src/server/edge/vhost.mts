// edge/vhost.ts — Virtual host routing: dispatch by Host header.
//
// Each vhost is a Meme. Host match evidence decides which app handles the request:
//   potential = matched host (admit)
//   active    = no match (pass through or 421 Misdirected Request)
//   stable    = contradicted match (two apps claim the same host — held as 503)

import { witness, UtteranceLog } from "../internal/witness.mjs";
import { chargeValueFromBits } from "../admission.mjs";
import type { App, Context, Middleware } from "../types.mjs";
import { handler } from "../pipeline.mjs";
import type { IncomingMessage, ServerResponse } from "node:http";

export type VhostEntry = {
  /** Exact hostname, glob pattern ("*.example.com"), or RegExp. */
  host: string | RegExp;
  app: App;
};

function matchHost(pattern: string | RegExp, host: string): boolean {
  if (pattern instanceof RegExp) return pattern.test(host);
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".example.com"
    return host.endsWith(suffix) || host === pattern.slice(2);
  }
  return pattern === host;
}

export function vhost(entries: VhostEntry[]): Middleware {
  const store = new UtteranceLog();

  // Seed Memes for each vhost entry
  for (const entry of entries) {
    const key = String(entry.host);
    witness(store, { subject: key, predicate: "vhost", object: "registered" }, [true, false]);
  }

  // Build per-app handlers (lazy, keyed by index)
  const appHandlers = new Map<number, (req: IncomingMessage, res: ServerResponse) => void>();

  return async (ctx) => {
    const { req, res } = ctx;
    const host = (req.headers["host"] ?? "").split(":")[0]?.toLowerCase() ?? "";

    let matchedIndex = -1;
    let matchCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (matchHost(entry.host, host)) {
        matchCount++;
        matchedIndex = i;
      }
    }

    const overallMemeCharge = chargeValueFromBits(matchCount > 0, matchCount !== 1);

    if (overallMemeCharge === "stable") {
      res.writeHead(503).end(JSON.stringify({ error: "contradicted vhost" }));
      return true;
    }

    if (overallMemeCharge !== "potential" || matchedIndex < 0) return; // pass through

    // Dispatch to matched app's handler
    if (!appHandlers.has(matchedIndex)) {
      appHandlers.set(matchedIndex, handler(entries[matchedIndex]!.app));
    }
    const h = appHandlers.get(matchedIndex)!;
    await new Promise<void>((resolve) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      h(req, res);
    });
    return true;
  };
}

/** Build a single App that routes by Host header across multiple sub-Apps. */
export function mergeByHost(entries: VhostEntry[]): App {
  return {
    middlewares: [vhost(entries)],
    resources: [],
  };
}

/** Map-style virtual-host router for Host-header dispatch. */
export function vhosts(map: Record<string, App>, { fallback }: { fallback?: App } = {}): App {
  const exact = new Map<string, (req: IncomingMessage, res: ServerResponse) => void>();
  const wild: Array<{ suffix: string; handler: (req: IncomingMessage, res: ServerResponse) => void }> = [];
  let star: ((req: IncomingMessage, res: ServerResponse) => void) | undefined;

  for (const [host, app] of Object.entries(map)) {
    const h = handler(app);
    if (host === "*") star = h;
    else if (host.startsWith("*.")) wild.push({ suffix: host.slice(1).toLowerCase(), handler: h });
    else exact.set(host.toLowerCase(), h);
  }
  const fallbackHandler = fallback ? handler(fallback) : star;

  const pick = (hostHeader: unknown): ((req: IncomingMessage, res: ServerResponse) => void) | undefined => {
    const host = String(hostHeader || "").split(":")[0]?.toLowerCase() ?? "";
    const direct = exact.get(host);
    if (direct) return direct;
    for (const entry of wild) if (host.endsWith(entry.suffix)) return entry.handler;
    return fallbackHandler;
  };

  return {
    middlewares: [async (ctx) => {
      const h = pick(ctx.req.headers.host);
      if (!h) return;
      await new Promise<void>((resolve) => {
        ctx.res.on("finish", resolve);
        ctx.res.on("close", resolve);
        h(ctx.req, ctx.res);
      });
      return true;
    }],
  };
}
