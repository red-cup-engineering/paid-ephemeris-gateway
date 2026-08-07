// edge/rewrite.ts — URL rewriting and redirect middleware.
//
// Rules are evaluated in order and first match wins.

import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { Middleware, Context } from "../types.mjs";

export type RewriteRule = {
  /** Incoming path pattern. String = exact or :param, RegExp = captures. */
  from: string | RegExp;
  /** Target path. Can reference captures: "$0", "$1", "$uri" for RegExp; ":param" for string patterns. */
  to: string | ((path: string, match: RegExpExecArray | Record<string, string>) => string);
  /** If true, send an HTTP redirect instead of rewriting internally (default false). */
  redirect?: boolean | 301 | 302 | 307 | 308;
  /** Redirect status code (301/302/307/308, default 301). */
  status?: 301 | 302 | 307 | 308;
  /** Only apply if query string matches this pattern. */
  queryMatch?: RegExp | ((search: string) => boolean);
  /** Only apply for these methods (default: all). */
  methods?: string[];
};

function substitute(template: string, match: RegExpExecArray): string {
  const whole = match[0] ?? "";
  return template
    .replace(/\$\$/g, "\0")
    .replace(/\$uri\b/g, whole)
    .replace(/\$(\d)/g, (_all, digit: string) => {
      const index = Number(digit);
      return index === 0 ? whole : match[index] ?? "";
    })
    .replace(/\0/g, "$");
}

function applyRewrite(
  rule: RewriteRule,
  path: string,
  match: RegExpExecArray | Record<string, string>,
): string {
  if (typeof rule.to === "function") return rule.to(path, match);
  if (Array.isArray(match)) {
    // RegExp capture groups: replace $1, $2, ... and named groups
    let result = substitute(rule.to, match);
    if (match.groups) {
      for (const [k, v] of Object.entries(match.groups)) {
        result = result.replace(new RegExp(`:${k}`, "g"), v ?? "");
      }
    }
    return result;
  }
  // String-pattern :param substitution
  let result = rule.to;
  for (const [k, v] of Object.entries(match as Record<string, string>)) {
    result = result.replace(new RegExp(`:${k}`, "g"), v);
  }
  return result;
}

function matchRule(
  rule: RewriteRule,
  path: string,
  method: string,
  search: string,
): RegExpExecArray | Record<string, string> | false {
  if (rule.methods && !rule.methods.includes(method)) return false;
  if (rule.queryMatch) {
    const qok = typeof rule.queryMatch === "function"
      ? rule.queryMatch(search)
      : rule.queryMatch.test(search);
    if (!qok) return false;
  }

  if (rule.from instanceof RegExp) {
    const m = rule.from.exec(path);
    return m ?? false;
  }

  // String pattern matching (same logic as pipeline.ts matchResource)
  const fromParts = rule.from.split("/");
  const pathParts = path.split("/");
  if (fromParts.length !== pathParts.length) return false;
  const params: Record<string, string> = {};
  for (let i = 0; i < fromParts.length; i++) {
    const f = fromParts[i] ?? "";
    const p = pathParts[i] ?? "";
    if (f.startsWith(":")) params[f.slice(1)] = decodeURIComponent(p);
    else if (f !== p) return false;
  }
  return params;
}

export function rewrite(rules: RewriteRule[]): Middleware {
  const store = new UtteranceLog();

  for (let i = 0; i < rules.length; i++) {
    witness(store, { subject: `rule:${i}`, predicate: "rewrite", object: "registered" }, [true, false]);
  }

  return (ctx) => {
    const { req, res } = ctx;
    const path = ctx.url.pathname;
    const method = req.method ?? "GET";
    const search = ctx.url.search;

    let firstMatchIndex = -1;
    let firstMatch: RegExpExecArray | Record<string, string> | null = null;

    for (let i = 0; i < rules.length; i++) {
      const m = matchRule(rules[i]!, path, method, search);
      if (m !== false) {
        if (firstMatchIndex === -1) { firstMatchIndex = i; firstMatch = m; }
      }
    }

    if (firstMatchIndex < 0) return Promise.resolve(undefined); // no rule matched

    const rule = rules[firstMatchIndex]!;
    const newPath = applyRewrite(rule, path, firstMatch!);
    const withQuery = newPath.includes("?") ? newPath : newPath + search;

    if (rule.redirect) {
      const status = typeof rule.redirect === "number" ? rule.redirect : rule.status ?? 301;
      const location = withQuery;
      res.setHeader("Location", location);
      res.writeHead(status, { location, "content-type": "text/plain; charset=utf-8" }).end(`Redirecting to ${location}`);
      return Promise.resolve(true as const);
    }

    // Internal rewrite: update ctx.url and req.url
    const newUrl = new URL(withQuery, ctx.url.origin);
    ctx.url = newUrl;
    (req as unknown as { url: string }).url = withQuery;

    return Promise.resolve(undefined);
  };
}

/** Convenience: redirect all HTTP → HTTPS. */
export function httpsRedirect(statusCode: 301 | 302 = 301): Middleware {
  return (ctx) => {
    const proto = ctx.req.headers["x-forwarded-proto"];
    if (proto && String(proto).split(",")[0]?.trim() === "https") return Promise.resolve(undefined);
    const host = ctx.req.headers["host"] ?? "localhost";
    const target = `https://${host}${ctx.url.pathname}${ctx.url.search}`;
    ctx.res.setHeader("Location", target);
    ctx.res.writeHead(statusCode).end();
    return Promise.resolve(true as const);
  };
}

/** Enforce HTTPS, honoring X-Forwarded-Proto for TLS-terminating proxies. */
export function forceHttps({
  status = 308,
  hsts,
}: {
  status?: 301 | 302 | 307 | 308;
  hsts?: true | string;
} = {}): Middleware {
  const hstsValue = hsts === true ? "max-age=31536000; includeSubDomains" : hsts;
  return (ctx) => {
    const proto = ctx.req.headers["x-forwarded-proto"] || ((ctx.req.socket as { encrypted?: boolean }).encrypted ? "https" : "http");
    if (String(proto).split(",")[0]?.trim() === "https") {
      if (hstsValue) ctx.res.setHeader("strict-transport-security", hstsValue);
      return;
    }
    const host = ctx.req.headers.host ?? "";
    const location = `https://${host}${ctx.req.url || "/"}`;
    ctx.res.writeHead(status, { location, "content-type": "text/plain; charset=utf-8" }).end(`Redirecting to ${location}`);
    return true;
  };
}

/**
 * redirect(location, status=308) — build a representation that sends a Location redirect.
 * 308/307 preserve the method+body; 301/302 are the classic GET redirects.
 */
export function redirect(
  location: string,
  status = 308,
): { status: number; type: string; body: string; headers: { location: string } } {
  return { status, type: "text/plain; charset=utf-8", body: `Redirecting to ${location}`, headers: { location } };
}

/**
 * location(matcher, mw) — scope a middleware (or array of middlewares) to a subset of paths,
 * the way nginx `location` scopes its directives. Returns a middleware that runs the inner
 * middleware(s) ONLY when `ctx.url.pathname` matches `matcher`, falling through otherwise.
 *
 *   • string  → path prefix ("/api" matches "/api", "/api/", "/api/x")
 *   • RegExp  → tested against the pathname
 *   • function (path, ctx) => boolean
 */
export function location(
  matcher: string | RegExp | ((path: string, ctx: Context) => boolean),
  mw: Middleware | Middleware[],
): Middleware {
  const matches: (path: string, ctx: Context) => boolean =
    typeof matcher === "function"
      ? matcher
      : matcher instanceof RegExp
        ? (path) => matcher.test(path)
        : (path) => {
            const prefix = String(matcher);
            const bounded = prefix.endsWith("/") ? prefix : prefix + "/";
            return path === prefix || path.startsWith(bounded);
          };

  const chain = Array.isArray(mw) ? mw : [mw];

  return async (ctx) => {
    if (!matches(ctx.url.pathname, ctx)) return undefined;
    for (const fn of chain) {
      const result = await fn(ctx);
      if (result === true) return true as const;
    }
    return undefined;
  };
}

/** Convenience: strip trailing slashes (redirect to canonical URL). */
export function trailingSlash(mode: "remove" | "add" = "remove"): Middleware {
  return (ctx) => {
    const { pathname, search } = ctx.url;
    if (mode === "remove" && pathname.length > 1 && pathname.endsWith("/")) {
      const target = pathname.slice(0, -1) + search;
      ctx.res.setHeader("Location", target);
      ctx.res.writeHead(301).end();
      return Promise.resolve(true as const);
    }
    if (mode === "add" && !pathname.endsWith("/")) {
      const target = pathname + "/" + search;
      ctx.res.setHeader("Location", target);
      ctx.res.writeHead(301).end();
      return Promise.resolve(true as const);
    }
    return Promise.resolve(undefined);
  };
}
