// platform/pages.ts — File-system-based page routing (Next.js/Astro-style).
//
// Scans a `pages/` directory and generates Resources from the file layout:
//   pages/index.ts      → GET /
//   pages/about.ts      → GET /about
//   pages/blog/[id].ts  → GET /blog/:id
//   pages/api/users.ts  → all methods /api/users
//
// Each page module exports a `handler` (Handler) and optionally `methods`.
// The MPU settles which page matches using the same routing logic as pipeline.ts.

import { createReadStream, readFileSync } from "node:fs";
import { stat, readdir, readFile } from "node:fs/promises";
import { join, relative, extname, dirname, basename, resolve, sep } from "node:path";
import type { App, Resource, Handler, Context, Middleware } from "../types.mjs";
import { DEFAULT_TYPES, staticFiles } from "../static.mjs";
import { httpDate } from "@emsenn/computing-with-http/codecs/http";

export type PagesOptions = {
  dir: string;              // path to pages directory
  extensions?: string[];    // default ["ts", "js", "mjs"]
  prefix?: string;          // URL prefix (default "")
};

export type PagesSiteOptions = {
  dir: string;
  types?: Readonly<Record<string, string>>;
  maxBuffer?: number;
  base?: string;
};

export type PageModule = {
  handler: Handler;
  methods?: string[];
  default?: Handler;        // also accept default export as handler
};

export type RedirectRule = {
  from: string;
  to: string;
  status: number;
  force: boolean;
};

export type HeaderRule = {
  pattern: string;
  headers: Array<[string, string]>;
};

function fileToRoute(filePath: string, pagesDir: string, prefix: string): string {
  const rel = relative(pagesDir, filePath);
  const ext = extname(rel);
  let route = rel.slice(0, -ext.length);

  // [param] → :param
  route = route.replace(/\[([^\]]+)\]/g, ":$1");
  // index → "" (strip)
  if (basename(route) === "index") route = dirname(route);
  // normalize leading slash
  route = "/" + route.replace(/\\/g, "/").replace(/^\//, "");
  // strip trailing slash (except root)
  if (route !== "/" && route.endsWith("/")) route = route.slice(0, -1);

  return prefix + route;
}

async function scanPages(dir: string, exts: string[]): Promise<string[]> {
  const files: string[] = [];
  async function walk(d: string): Promise<void> {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (exts.includes(extname(entry.name).slice(1))) files.push(full);
    }
  }
  await walk(dir);
  return files;
}

export async function loadPages(opts: PagesOptions): Promise<Resource[]> {
  const exts = opts.extensions ?? ["ts", "js", "mjs"];
  const prefix = opts.prefix ?? "";

  try {
    await stat(opts.dir);
  } catch {
    return []; // pages dir doesn't exist
  }

  const files = await scanPages(opts.dir, exts);
  const resources: Resource[] = [];

  for (const file of files) {
    try {
      const mod = await import(file) as PageModule;
      const handler: Handler | undefined = mod.handler ?? mod.default;
      if (!handler) continue;

      const route = fileToRoute(file, opts.dir, prefix);
      const resource: Resource = { match: route, handler };
      if (mod.methods) resource.methods = mod.methods;
      resources.push(resource);
    } catch { /* skip unloadable modules */ }
  }

  return resources;
}

/** Build an App from a pages directory. */
export async function pagesApp(opts: PagesOptions): Promise<App> {
  const resources = await loadPages(opts);
  return { resources };
}

/** Middleware that dynamically re-scans pages on each request (dev mode). */
export function devPages(opts: PagesOptions): App["onRequest"] {
  return async (ctx) => {
    const resources = await loadPages(opts);
    ctx.app.resources = resources;
  };
}

function parseRedirectLine(line: string): RedirectRule | null {
  const trimmed = line.replace(/(^|\s)#.*$/, "$1").trim();
  if (!trimmed) return null;
  const [from, to, rawStatus] = trimmed.split(/\s+/);
  if (!from || !to) return null;
  let status = 301;
  let force = false;
  if (rawStatus) {
    const token = rawStatus.endsWith("!") ? rawStatus.slice(0, -1) : rawStatus;
    force = rawStatus.endsWith("!");
    const parsed = parseInt(token, 10);
    if (Number.isFinite(parsed)) status = parsed;
  }
  return { from, to, status, force };
}

function compileFrom(from: string): (path: string) => Record<string, string> | null {
  const names: string[] = [];
  const pattern = from.startsWith("/") ? from : `/${from}`;
  let source = "^";
  for (let i = 0; i < pattern.length;) {
    const ch = pattern[i]!;
    if (ch === "*") {
      names.push("splat");
      source += "(.*)";
      i++;
    } else if (ch === ":") {
      let j = i + 1;
      while (j < pattern.length && /[A-Za-z0-9_]/.test(pattern[j]!)) j++;
      const name = pattern.slice(i + 1, j);
      names.push(name);
      source += name === "splat" ? "(.*)" : "([^/]+)";
      i = j;
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i++;
    }
  }
  source += "/?$";
  const rx = new RegExp(source);
  return (path) => {
    const match = rx.exec(path);
    if (!match) return null;
    const params: Record<string, string> = {};
    names.forEach((name, index) => { params[name] = match[index + 1] ?? ""; });
    return params;
  };
}

function expandTarget(to: string, params: Record<string, string>): string {
  let out = to.replace(/:([A-Za-z0-9_]+)/g, (_all, name: string) => params[name] ?? `:${name}`);
  if (params.splat !== undefined) out = out.replace(/\*/g, params.splat);
  return out;
}

function compileRedirects(text: string): Array<RedirectRule & { test: (path: string) => Record<string, string> | null }> {
  return text.split(/\r?\n/)
    .map(parseRedirectLine)
    .filter((rule): rule is RedirectRule => rule !== null)
    .map((rule) => ({ ...rule, test: compileFrom(rule.from) }));
}

function compileHeaderPattern(pattern: string): (path: string) => boolean {
  const normalized = pattern.startsWith("/") ? pattern : `/${pattern}`;
  if (normalized === "/*" || normalized === "*") return () => true;
  if (normalized.endsWith("/*")) {
    const prefix = normalized.slice(0, -1);
    const bare = prefix.replace(/\/$/, "");
    return (path) => path === bare || path.startsWith(prefix);
  }
  const bare = normalized.replace(/\/$/, "");
  return (path) => path === normalized || path.replace(/\/$/, "") === bare;
}

function compileHeaders(text: string): Array<HeaderRule & { test: (path: string) => boolean }> {
  const blocks: Array<HeaderRule & { test: (path: string) => boolean }> = [];
  let current: (HeaderRule & { test: (path: string) => boolean }) | null = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      const pattern = raw.trim();
      current = { pattern, test: compileHeaderPattern(pattern), headers: [] };
      blocks.push(current);
      continue;
    }
    const index = raw.indexOf(":");
    if (!current || index <= 0) continue;
    const name = raw.slice(0, index).trim();
    const value = raw.slice(index + 1).trim();
    if (name) current.headers.push([name, value]);
  }
  return blocks;
}

function readSiteFile<T>(dir: string, name: string, compile: (text: string) => T, fallback: T): T {
  const full = join(dir, name);
  if (full !== dir && !full.startsWith(dir + sep)) return fallback;
  try {
    return compile(readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

function inside(root: string, full: string): boolean {
  return full === root || full.startsWith(root + sep);
}

async function resolveCleanRel(root: string, reqPath: string): Promise<string | null> {
  let decoded: string;
  try { decoded = decodeURIComponent(reqPath); } catch { return null; }
  const rel = decoded.replace(/^\/+/, "");
  const base = resolve(root, rel);
  if (rel !== "" && !inside(root, base)) return null;
  const candidates: string[] = [];
  if (rel === "" || reqPath.endsWith("/")) {
    candidates.push(join(base, "index.html"));
  } else {
    candidates.push(base);
    candidates.push(`${base}.html`);
    candidates.push(join(base, "index.html"));
  }
  for (const full of candidates) {
    if (!inside(root, full)) continue;
    try {
      const st = await stat(full);
      if (st.isFile()) return full.slice(root.length + 1).split(sep).join("/");
    } catch {}
  }
  return null;
}

function rewriteUrl(ctx: Context, rel: string): void {
  const search = ctx.url.search;
  ctx.req.url = `/${rel}${search}`;
  ctx.url = new URL(ctx.req.url, ctx.url);
}

function fileEtag(size: number, mtimeMs: number): string {
  return `"${size.toString(36)}-${mtimeMs.toString(36)}"`;
}

async function writeFileResponse(ctx: Context, root: string, rel: string, opts: Required<Pick<PagesSiteOptions, "types" | "maxBuffer">>, status = 200): Promise<boolean> {
  const full = resolve(root, rel);
  if (!inside(root, full)) return false;
  let st: Awaited<ReturnType<typeof stat>>;
  try {
    st = await stat(full);
  } catch {
    return false;
  }
  if (!st.isFile()) return false;
  const type = opts.types[extname(full).toLowerCase()] ?? "application/octet-stream";
  const headers: Record<string, string | number> = {
    "content-type": type,
    etag: fileEtag(st.size, st.mtimeMs),
    "last-modified": httpDate(st.mtime),
  };
  if (st.size <= opts.maxBuffer) {
    const body = await readFile(full);
    headers["content-length"] = body.length;
    ctx.res.writeHead(status, headers).end(ctx.req.method === "HEAD" ? undefined : body);
    return true;
  }
  headers["content-length"] = st.size;
  headers["accept-ranges"] = "bytes";
  ctx.res.writeHead(status, headers);
  if (ctx.req.method === "HEAD") ctx.res.end();
  else createReadStream(full).pipe(ctx.res);
  return true;
}

async function writeNotFound(ctx: Context, root: string, opts: Required<Pick<PagesSiteOptions, "types" | "maxBuffer">>): Promise<void> {
  if (await writeFileResponse(ctx, root, "404.html", opts, 404)) return;
  ctx.res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end(ctx.req.method === "HEAD" ? undefined : "Not Found");
}

export function pagesSite(options: PagesSiteOptions): App & {
  app: App;
  middlewares: Middleware[];
  resources: Resource[];
} {
  const root = resolve(options.dir);
  const pageOptions = {
    types: options.types ?? DEFAULT_TYPES,
    maxBuffer: options.maxBuffer ?? 262_144,
  };
  const redirects = readSiteFile(root, "_redirects", compileRedirects, []);
  const headerBlocks = readSiteFile(root, "_headers", compileHeaders, []);
  const serveStatic = staticFiles({ root, extensions: ["html"], maxBuffer: pageOptions.maxBuffer });

  const headersMiddleware: Middleware = (ctx) => {
    for (const block of headerBlocks) {
      if (!block.test(ctx.url.pathname)) continue;
      for (const [name, value] of block.headers) {
        if (!ctx.res.headersSent) ctx.res.setHeader(name, value);
      }
    }
  };

  const redirectMiddleware: Middleware = async (ctx) => {
    for (const rule of redirects) {
      const params = rule.test(ctx.url.pathname);
      if (!params) continue;
      const target = expandTarget(rule.to, params);
      if (rule.status >= 300 && rule.status < 400) {
        const location = target.includes("?") ? target : `${target}${ctx.url.search}`;
        ctx.res.writeHead(rule.status, {
          location,
          "content-type": "text/plain; charset=utf-8",
        }).end(ctx.req.method === "HEAD" ? undefined : `Redirecting to ${location}`);
        return true;
      }
      if (rule.status === 404) {
        await writeNotFound(ctx, root, pageOptions);
        return true;
      }
      if (rule.status === 200) {
        const rel = await resolveCleanRel(root, target.split("?")[0] ?? target);
        if (rel) {
          rewriteUrl(ctx, rel);
          await serveStatic(ctx);
          return true;
        }
      }
    }
  };

  const resource: Resource = {
    match: () => true,
    methods: ["GET", "HEAD"],
    handler: async (ctx) => {
      const rel = await resolveCleanRel(root, ctx.url.pathname);
      if (!rel) {
        await writeNotFound(ctx, root, pageOptions);
        return;
      }
      rewriteUrl(ctx, rel);
      await serveStatic(ctx);
    },
  };

  const app: App = {
    ...(options.base ? { base: options.base } : {}),
    middlewares: [headersMiddleware, redirectMiddleware],
    resources: [resource],
  };

  return Object.assign(app, {
    app,
    middlewares: app.middlewares as Middleware[],
    resources: app.resources as Resource[],
  });
}
