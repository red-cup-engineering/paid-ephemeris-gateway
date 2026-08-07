// transclusion.mts — the ESI markup transform.
//
// Decodes <esi:remove>, <esi:comment>, <esi:vars>, and <esi:include>
// out of HTML, splicing in fragments supplied by an abstract resolver.
// The resolver is the whole transport boundary: this module never
// fetches, caches, or reads a request. Fragments may be text, bytes, or
// a representation-shaped record (EsiFragment); non-text fragments are
// rejected rather than spliced.

import { substituteVars } from "./variables.mjs";

export type EsiResolver = (src: string, ctx: Record<string, any>) => unknown | Promise<unknown>;

/** The representation-shaped fragment the resolver may return (structurally, a Repr). */
export type EsiFragment = Readonly<{
  status?: number;
  type?: string;
  body?: unknown;
}>;

export class EsiIncludeError extends Error {
  readonly src: string | null;
  readonly alt: string | null;
  constructor(src: string | null, alt: string | null) {
    super(`ESI include failed: src=${src ?? "-"} alt=${alt ?? "-"}`);
    this.name = "EsiIncludeError";
    this.src = src;
    this.alt = alt;
  }
}

function parseAttrs(text: string): Record<string, string | true> {
  const attrs: Record<string, string | true> = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    attrs[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return attrs;
}

export function hasEsi(html: unknown): boolean {
  return typeof html === "string" && /<esi:/i.test(html);
}

function coerceFragment(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (typeof value === "object") {
    const fragment = value as EsiFragment;
    if (fragment.status !== undefined && fragment.status >= 400) return null;
    if (fragment.type && !/^text\/|\+xml|\/xml|\/json|javascript/i.test(fragment.type)) return null;
    if (fragment.body == null) return "";
    if (typeof fragment.body === "string") return fragment.body;
    if (Buffer.isBuffer(fragment.body)) return fragment.body.toString("utf8");
  }
  return null;
}

export async function processEsi(
  html: unknown,
  ctx: Record<string, any> = {},
  resolve: EsiResolver,
  options: { maxDepth?: number; vars?: Record<string, unknown> } = {},
): Promise<string> {
  if (typeof resolve !== "function") throw new TypeError("processEsi requires a resolve(src, ctx) function");
  return composeEsi(String(html ?? ""), ctx, resolve, options.maxDepth ?? 8, options.vars ?? {});
}

async function composeEsi(
  html: string,
  ctx: Record<string, any>,
  resolve: EsiResolver,
  depth: number,
  vars: Record<string, unknown>,
): Promise<string> {
  let out = html.replace(/<esi:remove>[\s\S]*?<\/esi:remove>/gi, "");
  out = out.replace(/<esi:comment\b[^>]*\/?>/gi, "");
  out = out.replace(/<esi:vars\b[^>]*>([\s\S]*?)<\/esi:vars>/gi, (_all, body: string) => substituteVars(body, vars));
  out = out.replace(/<esi:vars\b([^>]*?)\/>/gi, (_all, attrsText: string) => {
    const attrs = parseAttrs(attrsText);
    return attrs.name === undefined || attrs.name === true ? "" : substituteVars(attrs.name, vars);
  });

  const includeRe = /<esi:include\b([^>]*?)(?:\/>|>(?:[\s\S]*?<\/esi:include>)?)/gi;
  const matches: Array<{ index: number; length: number; attrs: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = includeRe.exec(out)) !== null) matches.push({ index: match.index, length: match[0].length, attrs: match[1] ?? "" });
  if (!matches.length) return out;

  let result = "";
  let cursor = 0;
  for (const item of matches) {
    result += out.slice(cursor, item.index);
    result += await resolveInclude(parseAttrs(item.attrs), ctx, resolve, depth, vars);
    cursor = item.index + item.length;
  }
  return result + out.slice(cursor);
}

async function resolveInclude(
  attrs: Record<string, string | true>,
  ctx: Record<string, any>,
  resolve: EsiResolver,
  depth: number,
  vars: Record<string, unknown>,
): Promise<string> {
  const onerror = String(attrs.onerror ?? "").toLowerCase();
  const src = typeof attrs.src === "string" ? substituteVars(attrs.src, vars) : null;
  const alt = typeof attrs.alt === "string" ? substituteVars(attrs.alt, vars) : null;
  let fragment = src ? await tryResolve(src, ctx, resolve) : null;
  if (fragment == null && alt) fragment = await tryResolve(alt, ctx, resolve);
  if (fragment == null) {
    if (onerror === "continue") return "";
    throw new EsiIncludeError(src, alt);
  }
  if (depth > 1 && hasEsi(fragment)) return composeEsi(fragment, ctx, resolve, depth - 1, vars);
  return fragment;
}

async function tryResolve(src: string, ctx: Record<string, any>, resolve: EsiResolver): Promise<string | null> {
  try {
    return coerceFragment(await resolve(src, ctx));
  } catch {
    return null;
  }
}
