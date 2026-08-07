// edge/hints.ts — HTTP Early Hints (103) and Link preload header injection.

import type { Middleware } from "../types.mjs";

export type HintEntry = {
  url?: string;
  href?: string;
  rel: "preload" | "prefetch" | "preconnect" | "dns-prefetch" | "modulepreload" | "prerender" | (string & {});
  as?: "script" | "style" | "image" | "font" | "fetch" | "document" | "worker";
  crossorigin?: true | "" | "anonymous" | "use-credentials";
  type?: string;
  [attribute: string]: unknown;
};

export type HintValue = HintEntry | string;

export type HintsOptions = {
  hints: readonly HintValue[] | ((ctx: Parameters<Middleware>[0]) => readonly HintValue[] | Promise<readonly HintValue[]>);
  /** Send 103 Early Hints response before the main response (default true). */
  earlyHints?: boolean;
  /** Also inject Link headers into the final response (default true). */
  linkHeader?: boolean;
  /** Send at most one 103 per response when several hint middlewares run (default true). */
  once?: boolean;
  /** Observe hint computation/framing errors without breaking the final response. */
  onError?: (error: unknown) => void;
};

export type EarlyHintsOptions = Omit<HintsOptions, "hints">;

export const REL_TOKENS = Object.freeze([
  "preload",
  "preconnect",
  "modulepreload",
  "prefetch",
  "dns-prefetch",
  "prerender",
]);

const EARLY_HINTS_SENT = Symbol.for("@emsenn/web-server.earlyHintsSent");

function quoteParam(key: string, value: unknown): string {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${key}="${escaped}"`;
}

function linkHref(hint: HintEntry): string | undefined {
  const value = hint.href ?? hint.url;
  return value == null || value === "" ? undefined : String(value);
}

function hintToLink(hint: HintEntry): string | undefined {
  const href = linkHref(hint);
  if (!href || hint.rel == null || hint.rel === "") return undefined;

  const parts = [`<${href}>`, quoteParam("rel", hint.rel)];
  if (hint.as != null) parts.push(quoteParam("as", hint.as));
  if (hint.type != null && hint.type !== "") parts.push(quoteParam("type", hint.type));
  if (hint.crossorigin != null) {
    if (hint.crossorigin === true || hint.crossorigin === "" || hint.crossorigin === "anonymous") {
      parts.push("crossorigin");
    } else {
      parts.push(quoteParam("crossorigin", hint.crossorigin));
    }
  }

  for (const [key, value] of Object.entries(hint)) {
    if (key === "href" || key === "url" || key === "rel" || key === "as" || key === "type" || key === "crossorigin") continue;
    if (value == null || value === false) continue;
    if (value === true) parts.push(key);
    else parts.push(quoteParam(key, value));
  }

  return parts.join("; ");
}

function normalizeLinks(hints: readonly HintValue[] | undefined | null): string[] {
  if (!Array.isArray(hints)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const hint of hints) {
    let link: string | undefined;
    if (typeof hint === "string") {
      link = hint.trim();
    } else if (hint && typeof hint === "object") {
      link = hintToLink(hint);
    }
    if (!link || seen.has(link)) continue;
    seen.add(link);
    out.push(link);
  }

  return out;
}

export function buildLinkHeader(hints: readonly HintValue[] | undefined | null): string {
  return normalizeLinks(hints).join(", ");
}

function responseLinkHeaders(existing: number | string | string[] | undefined, next: readonly string[]): string[] {
  const values = [
    ...(typeof existing === "number" ? [String(existing)] : typeof existing === "string" ? [existing] : Array.isArray(existing) ? existing.map(String) : []),
    ...next,
  ];
  return Array.from(new Set(values.filter(Boolean)));
}

function canWriteEarlyHints(res: Parameters<Middleware>[0]["res"]): boolean {
  return Boolean(
    typeof (res as { writeEarlyHints?: unknown }).writeEarlyHints === "function"
    && !res.headersSent
    && !res.writableEnded
    && !(res as { destroyed?: boolean }).destroyed,
  );
}

async function writeEarlyHints(res: Parameters<Middleware>[0]["res"], linkValues: readonly string[]): Promise<void> {
  if (!canWriteEarlyHints(res)) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const writer = (res as { writeEarlyHints(headers: Record<string, string[]>, callback?: () => void): void }).writeEarlyHints;
      const result = writer.call(res, { link: [...linkValues] }, done);
      if (result === undefined) setImmediate(done);
    } catch {
      done();
    }
  });
}

export function earlyHints(opts: HintsOptions): Middleware;
export function earlyHints(
  hints: HintsOptions["hints"],
  options?: EarlyHintsOptions,
): Middleware;
export function earlyHints(
  optsOrHints: HintsOptions | HintsOptions["hints"],
  options: EarlyHintsOptions = {},
): Middleware {
  const opts: HintsOptions = Array.isArray(optsOrHints) || typeof optsOrHints === "function"
    ? { ...options, hints: optsOrHints as HintsOptions["hints"] }
    : optsOrHints as HintsOptions;
  const doEarlyHints = opts.earlyHints !== false;
  const doLinkHeader = opts.linkHeader !== false;
  const once = opts.once !== false;

  return async (ctx) => {
    const { res } = ctx;

    try {
      const rawHints = typeof opts.hints === "function" ? await opts.hints(ctx) : opts.hints;
      const linkValues = normalizeLinks(rawHints);
      if (linkValues.length === 0) return;

      if (doEarlyHints && (!once || !(res as unknown as Record<symbol, boolean>)[EARLY_HINTS_SENT])) {
        if (once) (res as unknown as Record<symbol, boolean>)[EARLY_HINTS_SENT] = true;
        await writeEarlyHints(res, linkValues);
      }

      if (doLinkHeader && !res.headersSent) {
        res.setHeader("Link", responseLinkHeaders(res.getHeader("Link"), linkValues));
      }
    } catch (error) {
      opts.onError?.(error);
    }
  };
}

/** Simple preload shorthand for common asset types. */
export function preload(urls: string[], as: HintEntry["as"] = "script"): Middleware {
  return earlyHints({
    hints: urls.map((url) => ({ url, rel: "preload", as })),
  });
}
