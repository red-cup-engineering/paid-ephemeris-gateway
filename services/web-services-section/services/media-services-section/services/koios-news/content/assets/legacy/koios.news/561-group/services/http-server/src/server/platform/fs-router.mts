// platform/fs-router.ts — File-system routing.
//
// A directory tree of route modules maps to URL paths by filename conventions
// shared by Next.js, Bun, and SvelteKit:
//   index            → /
//   about            → /about
//   [id]             → /:id        (dynamic segment)
//   [...slug]        → /*slug      (catch-all, 1+ segments)
//   [[...slug]]      → optional catch-all (0+ segments)
//
// Precedence: static > dynamic > catch-all (per-segment, then per-route).
// Route modules export named handlers (GET, POST, …) or a default handler.

import { readdir } from "node:fs/promises";
import { join, extname, basename, sep } from "node:path";
import type { IncomingMessage } from "node:http";
import type { Resource, Context, Repr } from "../types.mjs";

// ── Segment model ─────────────────────────────────────────────────────────────

const KIND = { STATIC: 0, DYNAMIC: 1, CATCHALL: 2, OPTIONAL_CATCHALL: 3 } as const;
type SegmentKind = typeof KIND[keyof typeof KIND];

type Segment = { kind: SegmentKind; name: string; raw: string };

function parseSegment(raw: string): Segment {
  const optional = /^\[\[\.\.\.(.+)\]\]$/.exec(raw);
  if (optional) return { kind: KIND.OPTIONAL_CATCHALL, name: optional[1]!, raw };
  const catchAll = /^\[\.\.\.(.+)\]$/.exec(raw);
  if (catchAll) return { kind: KIND.CATCHALL, name: catchAll[1]!, raw };
  const dynamic = /^\[(.+)\]$/.exec(raw);
  if (dynamic) return { kind: KIND.DYNAMIC, name: dynamic[1]!, raw };
  return { kind: KIND.STATIC, name: raw, raw };
}

function patternFor(segments: Segment[]): string {
  if (segments.length === 0) return "/";
  return "/" + segments.map((s) => {
    if (s.kind === KIND.STATIC) return s.name;
    if (s.kind === KIND.DYNAMIC) return ":" + s.name;
    if (s.kind === KIND.CATCHALL) return "*" + s.name;
    return "*" + s.name + "?";
  }).join("/");
}

function compareRoutes(
  a: { segments: Segment[]; pattern: string },
  b: { segments: Segment[]; pattern: string },
): number {
  const sa = a.segments;
  const sb = b.segments;
  const n = Math.min(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    if (sa[i]!.kind !== sb[i]!.kind) return sa[i]!.kind - sb[i]!.kind;
  }
  const aCatch = sa.length > 0 && sa[sa.length - 1]!.kind >= KIND.CATCHALL;
  const bCatch = sb.length > 0 && sb[sb.length - 1]!.kind >= KIND.CATCHALL;
  if (aCatch !== bCatch) return aCatch ? 1 : -1;
  if (sa.length !== sb.length) return sb.length - sa.length;
  return a.pattern < b.pattern ? -1 : a.pattern > b.pattern ? 1 : 0;
}

function matchSegments(routeSegs: Segment[], pathSegs: string[]): Record<string, string> | null {
  const params: Record<string, string> = {};
  let i = 0;
  for (; i < routeSegs.length; i++) {
    const seg = routeSegs[i]!;
    if (seg.kind === KIND.CATCHALL) {
      const rest = pathSegs.slice(i);
      if (rest.length === 0) return null;
      params[seg.name] = rest.map(decodeSeg).join("/");
      return params;
    }
    if (seg.kind === KIND.OPTIONAL_CATCHALL) {
      const rest = pathSegs.slice(i);
      params[seg.name] = rest.map(decodeSeg).join("/");
      return params;
    }
    if (i >= pathSegs.length) return null;
    const part = pathSegs[i]!;
    if (seg.kind === KIND.STATIC) {
      if (seg.name !== part) return null;
    } else {
      params[seg.name] = decodeSeg(part);
    }
  }
  return i === pathSegs.length ? params : null;
}

function decodeSeg(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

// ── Module dispatch ───────────────────────────────────────────────────────────

const ALL_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

type RouteModule = {
  default?: RouteHandler;
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
  HEAD?: RouteHandler;
  OPTIONS?: RouteHandler;
};

type RouteContext = Partial<Context> & {
  params?: Record<string, string>;
  path?: string;
};

type RouteHandler = (reqOrCtx: IncomingMessage | Context, ctx?: RouteContext) => unknown | Promise<unknown>;

function pickHandler(mod: RouteModule, method: string): RouteHandler | null {
  const named = (mod as Record<string, unknown>)[method];
  if (typeof named === "function") return named as RouteHandler;
  if (method === "HEAD" && typeof mod.GET === "function") return mod.GET;
  const def = mod.default;
  return typeof def === "function" ? def : null;
}

function methodsOf(mod: RouteModule | null): string[] {
  if (!mod) return ALL_METHODS;
  const present = new Set(ALL_METHODS.filter((m) => typeof (mod as Record<string, unknown>)[m] === "function"));
  if (present.size) {
    if (present.has("GET")) present.add("HEAD");
    return ALL_METHODS.filter((m) => present.has(m));
  }
  const def = mod.default;
  return typeof def === "function" ? ALL_METHODS : ["GET", "HEAD"];
}

// ── Directory scan ────────────────────────────────────────────────────────────

type RouteDescriptor = { file: string; segments: Segment[]; pattern: string };

type DirEntry = { name: string; isDirectory(): boolean; isFile(): boolean };

async function scan(dir: string, extensions: string[], prefixSegments: Segment[], out: RouteDescriptor[]): Promise<void> {
  let entries: DirEntry[];
  try { entries = (await readdir(dir, { withFileTypes: true })) as unknown as DirEntry[]; } catch { return; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await scan(full, extensions, [...prefixSegments, parseSegment(entry.name)], out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name);
    if (!extensions.includes(ext)) continue;
    const stem = basename(entry.name, ext);
    const segments = stem === "index" ? [...prefixSegments] : [...prefixSegments, parseSegment(stem)];
    out.push({ file: full, segments, pattern: patternFor(segments) });
  }
}

function pathToFileUrl(p: string): string {
  if (/^file:\/\//.test(p)) return p;
  let normalized = p.split(sep).join("/");
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  const encoded = normalized.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return "file://" + encoded;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type FsRouterOptions = {
  dir: string;
  extensions?: string[];
  lazy?: boolean;
};

export type FsRouterResult = {
  resources: FileSystemResource[];
  routes: { pattern: string; file: string }[];
};

export type FileSystemResource = Resource & {
  pattern: string;
  file: string;
  match: (path: string, ctx?: RouteContext) => Record<string, string> | null;
  handle: (req: IncomingMessage, ctx: RouteContext) => Promise<unknown>;
};

function requestPath(req: IncomingMessage, ctx: RouteContext): string {
  if (ctx.path) return ctx.path;
  if (ctx.url instanceof URL) return ctx.url.pathname;
  try {
    return new URL(req.url ?? "/", "http://localhost/").pathname;
  } catch {
    return "/";
  }
}

function assignParams(ctx: RouteContext, params: Record<string, string>): void {
  ctx.params ??= {};
  for (const [key, value] of Object.entries(params)) ctx.params[key] = value;
}

function responseBuffer(body: Repr["body"]): Buffer {
  if (body === undefined) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return Buffer.from(String(body));
}

function isRepr(value: unknown): value is Repr {
  return typeof value === "object" && value !== null && (
    "body" in value ||
    "status" in value ||
    "headers" in value ||
    "type" in value
  );
}

function writeRepr(ctx: Context, repr: Repr): void {
  const status = repr.status ?? 200;
  const headers: Record<string, string | readonly string[]> = { ...(repr.headers ?? {}) };
  if (repr.type) headers["content-type"] = repr.type;
  if (repr.etag) headers.etag = repr.etag;
  if (repr.lastModified) headers["last-modified"] = repr.lastModified.toUTCString();

  const empty = status === 204 || status === 304;
  const isHead = (ctx.req.method ?? "GET").toUpperCase() === "HEAD";
  const body = responseBuffer(repr.body);
  if (!empty) headers["content-length"] = String(body.length);
  ctx.res.writeHead(status, headers as import("node:http").OutgoingHttpHeaders);
  ctx.res.end(empty || isHead ? undefined : body);
}

/**
 * fileSystemRouter(opts) — scan `dir` and return Resources ordered most-specific-first.
 * Route modules may default-export a handler or export method-named handlers (GET, POST, …).
 * Lazy-loads modules on first match (when `lazy: true`, the default).
 */
export async function fileSystemRouter(opts: FsRouterOptions): Promise<FsRouterResult> {
  const { dir, extensions = [".mjs", ".mjs", ".js"], lazy = true } = opts;
  if (!dir) throw new Error("fileSystemRouter: `dir` is required");
  const exts = extensions.map((e) => (e.startsWith(".") ? e : "." + e));

  const collected: RouteDescriptor[] = [];
  await scan(dir, exts, [], collected);
  collected.sort(compareRoutes);

  const cache = new Map<string, RouteModule>();
  const load = async (file: string): Promise<RouteModule> => {
    if (cache.has(file)) return cache.get(file)!;
    const mod = await import(pathToFileUrl(file)) as RouteModule;
    cache.set(file, mod);
    return mod;
  };

  if (!lazy) {
    for (const r of collected) await load(r.file);
  }

  const resources: FileSystemResource[] = collected.map((route) => {
    const eagerMod = lazy ? null : (cache.get(route.file) ?? null);

    const resource = {
      pattern: route.pattern,
      route: route.pattern,
      file: route.file,
      match: (path: string) => {
        return matchSegments(route.segments, splitPath(path));
      },
      methods: eagerMod ? methodsOf(eagerMod) : ALL_METHODS,
      handle: async (req: IncomingMessage, ctx: RouteContext) => {
        const mod = await load(route.file);
        const method = req.method ?? "GET";
        const handler = pickHandler(mod, method);
        if (!handler) {
          const allow = methodsOf(mod);
          return {
            status: 405,
            type: "text/plain; charset=utf-8",
            body: "Method Not Allowed",
            headers: { allow: allow.join(", ") },
          };
        }
        const params = matchSegments(route.segments, splitPath(requestPath(req, ctx)));
        if (params) assignParams(ctx, params);
        return handler.length >= 2 ? handler(req, ctx) : handler(ctx as Context);
      },
      handler: async (ctx: Context) => {
        const result = await resource.handle(ctx.req, ctx);
        if (isRepr(result)) writeRepr(ctx, result);
      },
    } as FileSystemResource;
    return resource;
  });

  const routes = collected.map((r) => ({ pattern: r.pattern, file: r.file }));
  return { resources, routes };
}
