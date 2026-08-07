// edge/auth.ts — Authentication and authorization middleware.
//
// Credential verification is modeled as MPU settlement:
//   potential = authenticated/authorized (admit)
//   active    = denied (401/403)
//   stable    = contradicted credential (held, 503)
//
// Supported: Bearer JWT (HS256/RS256 structural validation), Basic, API key,
// and a generic verify() escape hatch. Claims from verified tokens are written
// as trace entries so downstream middleware and handlers can read them.

import { timingSafeEqual } from "node:crypto";
import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { Middleware, Context } from "../types.mjs";
import type { ChargeValueName } from "@emsenn/relating";
import {
  settleRequestTrace,
  type RequestAdmissionJudgment,
  type RequestTrace,
  type RequestTraceEntry,
  type RequestTraceSettlement,
} from "../request.mjs";

export type JwtOptions = {
  secret: string | (() => string | Promise<string>);
  algorithms?: string[];     // default ["HS256"]
  issuer?: string;
  audience?: string;
  clockSkewMs?: number;      // default 30_000
  tokenFrom?: (ctx: Context) => string | undefined;
};

export type BasicAuthOptions = {
  verify: (user: string, pass: string, ctx: Context) => boolean | Promise<boolean>;
  realm?: string;
};

export type BasicAuthMiddlewareOptions = {
  users?: Record<string, string>;
  verify?: (user: string, pass: string, ctx: Context) => boolean | Promise<boolean>;
  realm?: string;
};

export type BearerAuthOptions = {
  verify: (token: string, ctx: Context) => boolean | Record<string, unknown> | Promise<boolean | Record<string, unknown>>;
  realm?: string;
  scope?: string;
};

export type ApiKeyOptions = {
  keys: string[] | Set<string> | ((key: string, ctx: Context) => boolean | Promise<boolean>);
  header?: string;           // default "X-Api-Key"
  query?: string;            // also check this query param
};

export type AuthOptions = {
  jwt?: JwtOptions;
  basic?: BasicAuthOptions;
  apiKey?: ApiKeyOptions;
  verify?: (ctx: Context) => boolean | Promise<boolean>;
  onDeny?: (ctx: Context, reason: string) => void | Promise<void>;
  claimsAttribute?: string;  // trace-entry attribute to write claims under (default "auth.claims")
};

export type AuthEvidence = Readonly<{
  source: "jwt" | "basic" | "api-key" | "verify" | "missing";
  admitted: boolean;
  reason?: string;
  claims?: JwtPayload;
}>;

export type AuthAdmissionInput = Readonly<{
  trace: RequestTrace;
  evidence: readonly AuthEvidence[];
  claimsAttribute?: string;
  now?: unknown;
}>;

export type AuthAdmissionReport = Readonly<{
  trace: RequestTrace;
  settled: RequestTraceSettlement;
  judgments: readonly RequestAdmissionJudgment[];
  value: ChargeValueName;
  admitted: boolean;
  denied: boolean;
  contradicted: boolean;
  reason: string;
  claims: JwtPayload | null;
  entries: readonly RequestTraceEntry[];
}>;

// ── JWT structural decode (no crypto — structural checks only) ────────────────
// Full HMAC/RSA verification requires a crypto library; we validate structure and expiry
// and expose claims. For production, pair with a verify() callback that calls a real JWT lib.

function base64urlDecode(s: string): string {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

type JwtPayload = Record<string, unknown>;

function decodeJwt(token: string): { header: Record<string, unknown>; payload: JwtPayload } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64urlDecode(parts[0]!)) as Record<string, unknown>;
    const payload = JSON.parse(base64urlDecode(parts[1]!)) as JwtPayload;
    return { header, payload };
  } catch {
    return null;
  }
}

function extractBearer(req: Context["req"]): string | undefined {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) return undefined;
  return auth.slice(7).trim();
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  const probe = right.length === left.length ? right : Buffer.alloc(left.length);
  return timingSafeEqual(left, probe) && left.length === right.length;
}

function authParam(name: string, value: unknown): string | null {
  if (value == null) return null;
  return `${name}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function challenge(ctx: Context, scheme: "Basic" | "Bearer", params: Record<string, unknown>, body = "Unauthorized"): true {
  const rendered = Object.entries(params)
    .map(([name, value]) => authParam(name, value))
    .filter((value): value is string => value !== null);
  ctx.res.setHeader("WWW-Authenticate", rendered.length ? `${scheme} ${rendered.join(", ")}` : scheme);
  ctx.res.writeHead(401, { "content-type": "text/plain; charset=utf-8" }).end(body);
  return true;
}

function parseBasicHeader(ctx: Context): { user: string; pass: string } | null {
  const header = ctx.req.headers.authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^Basic\s+(.+)$/i.exec(value.trim());
  if (!match) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(match[1]!, "base64").toString("utf8");
  } catch {
    return null;
  }
  const split = decoded.indexOf(":");
  if (split === -1) return null;
  return { user: decoded.slice(0, split), pass: decoded.slice(split + 1) };
}

function setPrincipal(ctx: Context, principal: Record<string, unknown>): void {
  ctx.locals.principal = principal;
  (ctx as unknown as { principal?: Record<string, unknown> }).principal = principal;
}

function authValue(evidence: readonly AuthEvidence[]): ChargeValueName {
  const admitted = evidence.some((item) => item.admitted);
  const denied = evidence.some((item) => !item.admitted);
  if (admitted && denied) return "stable";
  if (admitted) return "potential";
  return "active";
}

function authReason(evidence: readonly AuthEvidence[], value: ChargeValueName): string {
  if (value === "potential") return "authentication admitted";
  if (value === "stable") return "contradicted authentication evidence";
  return evidence.find((item) => !item.admitted && item.reason)?.reason ?? "unauthorized";
}

function authClaims(evidence: readonly AuthEvidence[]): JwtPayload | null {
  const claims = evidence.find((item) => item.admitted && item.claims !== undefined)?.claims;
  return claims ? Object.freeze({ ...claims }) : null;
}

function authEntries(trace: RequestTrace, claims: JwtPayload | null, claimsAttribute: string, t: unknown): readonly RequestTraceEntry[] {
  if (!claims) return Object.freeze([]);
  return Object.freeze(Object.entries(claims).map(([k, v]) => Object.freeze({
    e: trace.id,
    a: `${claimsAttribute}.${k}`,
    v: String(v),
    t,
  } satisfies RequestTraceEntry)));
}

function chargeBits(value: ChargeValueName): [boolean, boolean] {
  if (value === "potential") return [true, false];
  if (value === "active") return [false, true];
  if (value === "stable") return [true, true];
  return [false, false];
}

export function authAdmissionJudgments(input: AuthAdmissionInput): readonly RequestAdmissionJudgment[] {
  const value = authValue(input.evidence);
  const reason = authReason(input.evidence, value);
  return Object.freeze([{
    name: "auth",
    value,
    reason,
    path: input.trace.id,
  }]);
}

export function authAdmissionReport(input: AuthAdmissionInput): AuthAdmissionReport {
  const judgments = authAdmissionJudgments(input);
  const settled = settleRequestTrace(input.trace, judgments);
  const value = settled.value;
  const claims = value === "potential" ? authClaims(input.evidence) : null;
  const entries = authEntries(input.trace, claims, input.claimsAttribute ?? "auth.claims", input.now ?? Date.now()); // law-allow: wall-clock-as-data — injectable clock seam default; callers may pass now; claim entry timestamps are testimony
  return Object.freeze({
    trace: input.trace,
    settled,
    judgments,
    value,
    admitted: value === "potential",
    denied: value === "active",
    contradicted: value === "stable",
    reason: authReason(input.evidence, value),
    claims,
    entries,
  });
}

export function basicAuth(opts: BasicAuthMiddlewareOptions = {}): Middleware {
  if (!opts.verify && !opts.users) throw new Error("basicAuth: provide `users` or `verify`");
  const realm = opts.realm ?? "restricted";
  const users = opts.users ?? {};

  return async (ctx) => {
    const credentials = parseBasicHeader(ctx);
    if (!credentials) return challenge(ctx, "Basic", { realm, charset: "UTF-8" });

    const ok = opts.verify
      ? await opts.verify(credentials.user, credentials.pass, ctx)
      : Object.prototype.hasOwnProperty.call(users, credentials.user)
        && constantTimeEqual(credentials.pass, users[credentials.user] ?? "");

    if (!ok) return challenge(ctx, "Basic", { realm, charset: "UTF-8" });
    setPrincipal(ctx, { name: credentials.user });
    return;
  };
}

function parseBearerHeader(ctx: Context): string | null {
  const header = ctx.req.headers.authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^Bearer\s+([A-Za-z0-9\-._~+/]+=*)\s*$/.exec(value.trim());
  return match?.[1] ?? null;
}

export function bearerAuth(opts: BearerAuthOptions): Middleware {
  if (typeof opts.verify !== "function") throw new Error("bearerAuth: `verify` must be a function");
  const realm = opts.realm ?? "restricted";

  return async (ctx) => {
    const token = parseBearerHeader(ctx);
    const base = { realm, scope: opts.scope };
    if (!token) return challenge(ctx, "Bearer", base);

    let principal: boolean | Record<string, unknown>;
    try {
      principal = await opts.verify(token, ctx);
    } catch {
      principal = false;
    }
    if (!principal) return challenge(ctx, "Bearer", { ...base, error: "invalid_token" });
    setPrincipal(ctx, principal === true ? { token } : principal);
    return;
  };
}

// ── Auth middleware ───────────────────────────────────────────────────────────

export function authenticate(opts: AuthOptions = {}): Middleware {
  const store = new UtteranceLog();
  const claimsAttr = opts.claimsAttribute ?? "auth.claims";

  return async (ctx) => {
    const t = String(Date.now()); // law-allow: wall-clock-as-data — witness timestamp testimony on ledger evidence, not ordering; store append order is the trace
    const evidence: AuthEvidence[] = [];
    let admittedClaims: JwtPayload | null = null;

    // ── JWT ───────────────────────────────────────────────────────────────────
    if (opts.jwt) {
      const jwtOpts = opts.jwt;
      const token = jwtOpts.tokenFrom ? jwtOpts.tokenFrom(ctx) : extractBearer(ctx.req);
      if (token) {
        const decoded = decodeJwt(token);
        if (!decoded) {
          evidence.push({ source: "jwt", admitted: false, reason: "malformed JWT" });
        } else {
          const { payload } = decoded;
          const now = Date.now(); // law-allow: wall-clock-as-data — JWT exp/nbf validation is protocol testimony (RFC 7519)
          const skew = jwtOpts.clockSkewMs ?? 30_000;

          const expOk = !payload["exp"] || (payload["exp"] as number) * 1000 + skew > now;
          const nbfOk = !payload["nbf"] || (payload["nbf"] as number) * 1000 - skew <= now;
          const issOk = !jwtOpts.issuer || payload["iss"] === jwtOpts.issuer;
          const audOk = !jwtOpts.audience || payload["aud"] === jwtOpts.audience ||
            (Array.isArray(payload["aud"]) && (payload["aud"] as string[]).includes(jwtOpts.audience));

          if (expOk && nbfOk && issOk && audOk) {
            evidence.push({ source: "jwt", admitted: true, claims: payload });
            admittedClaims = payload;
          } else {
            evidence.push({
              source: "jwt",
              admitted: false,
              reason: !expOk ? "token expired" : !nbfOk ? "token not yet valid" :
                !issOk ? "issuer mismatch" : "audience mismatch",
            });
          }
        }
      }
    }

    // ── Basic ─────────────────────────────────────────────────────────────────
    if (opts.basic && !admittedClaims) {
      const auth = ctx.req.headers["authorization"];
      if (auth?.startsWith("Basic ")) {
        const creds = Buffer.from(auth.slice(6), "base64").toString("utf8");
        const sep = creds.indexOf(":");
        const user = creds.slice(0, sep);
        const pass = creds.slice(sep + 1);
        const ok = await opts.basic.verify(user, pass, ctx);
        if (ok) {
          admittedClaims = { sub: user };
          evidence.push({ source: "basic", admitted: true, claims: admittedClaims });
        } else {
          evidence.push({ source: "basic", admitted: false, reason: "invalid credentials" });
        }
      }
    }

    // ── API Key ───────────────────────────────────────────────────────────────
    if (opts.apiKey && !admittedClaims) {
      const keyOpts = opts.apiKey;
      const header = keyOpts.header ?? "X-Api-Key";
      let key = ctx.req.headers[header.toLowerCase()] as string | undefined;
      if (!key && keyOpts.query) key = ctx.url.searchParams.get(keyOpts.query) ?? undefined;
      if (key) {
        const ok = typeof keyOpts.keys === "function"
          ? await keyOpts.keys(key, ctx)
          : keyOpts.keys instanceof Set
          ? keyOpts.keys.has(key)
          : (keyOpts.keys as string[]).includes(key);
        if (ok) {
          admittedClaims = { key };
          evidence.push({ source: "api-key", admitted: true, claims: admittedClaims });
        } else {
          evidence.push({ source: "api-key", admitted: false, reason: "invalid API key" });
        }
      }
    }

    // ── Generic verify ────────────────────────────────────────────────────────
    if (opts.verify) {
      const ok = await opts.verify(ctx);
      evidence.push(ok
        ? { source: "verify", admitted: true }
        : { source: "verify", admitted: false, reason: "unauthorized" });
    }

    const report = authAdmissionReport({
      trace: ctx.trace,
      evidence,
      claimsAttribute: claimsAttr,
      now: t,
    });
    const memeCharge = report.value;
    const denialReason = evidence.length ? report.reason : "";

    // Record in store
    witness(
      store,
      { subject: ctx.url.pathname, predicate: "auth", object: memeCharge },
      chargeBits(memeCharge),
    );

    if (report.admitted) {
      return [...report.entries];
    }

    if (report.contradicted) {
      await opts.onDeny?.(ctx, "contradiction");
      ctx.res.writeHead(503).end("Service Unavailable");
      return true;
    }

    await opts.onDeny?.(ctx, denialReason);

    if (opts.basic && !ctx.req.headers["authorization"]) {
      ctx.res.setHeader("WWW-Authenticate", `Basic realm="${opts.basic.realm ?? "Restricted"}"`);
      ctx.res.writeHead(401).end("Unauthorized");
    } else if (denialReason) {
      ctx.res.writeHead(401).end("Unauthorized");
    } else {
      ctx.res.writeHead(403).end("Forbidden");
    }
    return true;
  };
}

// ── Capability gate ───────────────────────────────────────────────────────────
// After authenticate(), check that claims include a required capability.

export function requireClaim(
  attribute: string,
  value: string | ((v: string) => boolean),
  opts: { claimsAttribute?: string } = {},
): Middleware {
  const claimsAttr = opts.claimsAttribute ?? "auth.claims";
  const fullAttr = `${claimsAttr}.${attribute}`;

  return (ctx) => {
    const entry = ctx.trace.entries.find((item) => item.a === fullAttr);
    const val = entry?.v;

    const ok = val !== undefined && (
      typeof value === "function" ? value(String(val)) : String(val) === value
    );

    if (!ok) {
      ctx.res.writeHead(403).end("Forbidden");
      return Promise.resolve(true as const);
    }
    return Promise.resolve(undefined);
  };
}
