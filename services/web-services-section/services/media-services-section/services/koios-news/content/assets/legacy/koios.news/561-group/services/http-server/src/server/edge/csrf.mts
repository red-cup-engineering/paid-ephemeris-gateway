import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Middleware, Context } from "../types.mjs";
import type { CookieOptions } from "@emsenn/computing-with-http/codecs/cookie";
import { unsignCookieValue } from "@emsenn/computing-with-http/codecs/cookie";
import { getSignedCookie, setSignedCookie } from "../cookies.mjs";

export type CsrfOptions = Readonly<{
  secret: string;
  cookieName?: string;
  headerName?: string;
  methods?: readonly string[];
  tokenBytes?: number;
  cookie?: CookieOptions;
  localsKey?: string;
  tokenFrom?: (ctx: Context) => string | null | undefined;
  onDeny?: (ctx: Context, reason: string) => void | Promise<void>;
}>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export function csrfProtection(options: CsrfOptions): Middleware {
  if (!options.secret) throw new TypeError("csrfProtection: secret is required");
  const cookieName = options.cookieName ?? "__Host-csrf";
  const headerName = (options.headerName ?? "x-csrf-token").toLowerCase();
  const tokenBytes = Math.max(16, Math.trunc(options.tokenBytes ?? 32));
  const protectedMethods = options.methods
    ? new Set(options.methods.map((method) => method.toUpperCase()))
    : null;
  const localsKey = options.localsKey ?? "csrfToken";
  const cookieOptions: CookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: cookieName.startsWith("__Host-"),
    ...options.cookie,
  };

  return async (ctx) => {
    const method = (ctx.req.method ?? "GET").toUpperCase();
    let token = getSignedCookie(ctx.req, cookieName, options.secret);
    if (!token) {
      token = newToken(tokenBytes);
      setSignedCookie(ctx.res, cookieName, token, options.secret, cookieOptions);
    }
    ctx.locals[localsKey] = token;

    const protect = protectedMethods ? protectedMethods.has(method) : !SAFE_METHODS.has(method);
    if (!protect) return;

    const presented = requestToken(ctx, headerName, options.tokenFrom);
    if (presented && tokenMatches(presented, token, options.secret, cookieName)) return;
    if (options.onDeny) await options.onDeny(ctx, presented ? "token-mismatch" : "missing-token");
    if (!ctx.res.headersSent) {
      ctx.res.writeHead(403, { "content-type": "text/plain; charset=utf-8" }).end("Forbidden");
    }
    return true;
  };
}

export { csrfProtection as csrf };

function requestToken(
  ctx: Context,
  headerName: string,
  tokenFrom: CsrfOptions["tokenFrom"],
): string | null {
  const custom = tokenFrom?.(ctx);
  if (typeof custom === "string" && custom) return custom;
  const header = ctx.req.headers[headerName];
  if (Array.isArray(header)) return header[0] ?? null;
  if (typeof header === "string" && header) return header;
  const query = ctx.url.searchParams.get("_csrf");
  return query && query.length <= 4096 ? query : null;
}

function tokenMatches(presented: string, token: string, secret: string, cookieName: string): boolean {
  if (safeEqual(presented, token)) return true;
  const unsigned = unsignCookieValue(presented, secret, cookieName);
  return unsigned !== null && safeEqual(unsigned, token);
}

function newToken(size: number): string {
  return randomBytes(size).toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  const probe = b.length === a.length ? b : Buffer.alloc(a.length);
  return timingSafeEqual(a, probe) && a.length === b.length;
}
