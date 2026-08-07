// platform/router.ts — URLPattern-style middleware router and resource builder.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { App, Context, Resource, Repr } from "../types.mjs";
import { sendWebResponse } from "../internal/web-bridge.mjs";
import type { OpenApiMetadata } from "./openapi.mjs";
import {
  requestValidation,
  responseValidationOpenApiMetadata,
  responseValidationReport,
  type RequestValidationSpec,
  type ResponseValidationSpec,
} from "./validation.mjs";

export type RouterOptions = {
  prefix?: string;
  middlewares?: App["middlewares"];
};

export type RouterContext = Context & {
  params: Record<string, string>;
  path?: string;
  base?: string;
  query?: URLSearchParams;
};

export type RouterResult = Repr | Response | void | null | undefined;
export type RouterNext = () => Promise<RouterResult>;
export type RouterHandler = (ctx: RouterContext, next: RouterNext) => RouterResult | Promise<RouterResult>;

export type RouterRouteOptions = {
  id?: string;
  name?: string;
  produces?: readonly string[];
  languages?: readonly string[];
  middlewares?: readonly RouterHandler[];
  validation?: RequestValidationSpec;
  responses?: ResponseValidationSpec;
  openapi?: OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>> | false;
};

export type RouterRouteArgument = RouterHandler | RouterRouteOptions;

export type RouterMiddleware = {
  (ctx: Context): Promise<boolean>;
  (req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<boolean>;
};

export type RouterMatch = {
  route: RouteSnapshot | null;
  params: Record<string, string> | null;
  allowed: Set<string>;
  pathMatched: boolean;
};

export type RouteSnapshot = {
  methods: Set<string> | null;
  pattern: string;
  handlers: RouterHandler[];
  options: RouterRouteOptions;
};

export type CrudHandlers<T> = {
  list?: (ctx: Context) => Promise<T[]>;
  get?: (ctx: Context) => Promise<T | null>;
  create?: (ctx: Context) => Promise<T>;
  update?: (ctx: Context) => Promise<T>;
  destroy?: (ctx: Context) => Promise<void>;
};

type Matcher = {
  exec(path: string): Record<string, string> | null;
};

type RouteEntry = RouteSnapshot & {
  matcher: Matcher;
};

type MiddlewareEntry = {
  scope: string | null;
  matcher: Matcher | null;
  handler: RouterHandler;
};

type Store = {
  routes: RouteEntry[];
  middlewares: MiddlewareEntry[];
};

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function compilePattern(pathname: string): Matcher {
  const names: string[] = [];
  let wildcardIndex = 0;
  let re = "";
  let i = 0;
  const escapeLiteral = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");

  while (i < pathname.length) {
    const ch = pathname[i]!;
    if (ch === ":") {
      let j = i + 1;
      while (j < pathname.length && /[A-Za-z0-9_]/.test(pathname[j]!)) j++;
      const name = pathname.slice(i + 1, j);
      if (!name) {
        re += escapeLiteral(ch);
        i += 1;
        continue;
      }
      const optional = pathname[j] === "?";
      names.push(name);
      if (optional) {
        if (re.endsWith("/")) re = `${re.slice(0, -1)}(?:/([^/]+))?`;
        else re += "([^/]+)?";
        i = j + 1;
      } else {
        re += "([^/]+)";
        i = j;
      }
    } else if (ch === "*") {
      names.push(String(wildcardIndex++));
      re += "(.*)";
      i += 1;
    } else if (ch === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < pathname.length && depth > 0) {
        if (pathname[j] === "\\") {
          j += 2;
          continue;
        }
        if (pathname[j] === "(") depth++;
        else if (pathname[j] === ")") depth--;
        j++;
      }
      names.push(String(wildcardIndex++));
      re += pathname.slice(i, j);
      i = j;
    } else {
      re += escapeLiteral(ch);
      i += 1;
    }
  }

  const rx = new RegExp(`^${re}/?$`);
  return {
    exec(path: string) {
      const m = rx.exec(path);
      if (!m) return null;
      const groups: Record<string, string> = {};
      names.forEach((name, index) => {
        const value = m[index + 1];
        if (value !== undefined) groups[name] = decodeParam(value);
      });
      return groups;
    },
  };
}

function joinPath(prefix: string, pathname: string): string {
  if (!prefix) return pathname || "/";
  const a = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const b = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return (a + b).replace(/\/+$/, "") || "/";
}

async function dispatch(chain: RouterHandler[], ctx: RouterContext): Promise<RouterResult> {
  let index = -1;
  async function run(i: number): Promise<RouterResult> {
    if (i <= index) throw new Error("router: next() called multiple times");
    index = i;
    const fn = chain[i];
    if (!fn) return undefined;
    let nextResult: RouterResult = undefined;
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
      nextResult = await run(i + 1);
      return nextResult;
    };
    const result = await fn(ctx, next);
    if (result !== undefined && result !== null) return result;
    return nextCalled ? nextResult : undefined;
  }
  return run(0);
}

function isRepr(value: RouterResult): value is Repr {
  return typeof value === "object" && value !== null && !(value instanceof Response);
}

function responseBodyBuffer(body: Repr["body"]): Buffer {
  if (body === undefined) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return Buffer.from(String(body));
}

function responseProblem(title: string, issues: readonly { path: string; keyword: string; message: string }[]): Repr {
  return {
    status: 500,
    type: "application/problem+json; charset=utf-8",
    cacheControl: { noStore: true },
    body: JSON.stringify({
      type: "urn:561-group:web-server:problem:response-validation",
      title,
      status: 500,
      issues,
    }),
  };
}

function lowerHeaders(headers: Headers | Record<string, string | readonly string[]> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    for (const [name, value] of headers) out[name.toLowerCase()] = value;
    return out;
  }
  for (const [name, value] of Object.entries(headers)) {
    out[name.toLowerCase()] = Array.isArray(value) ? (value as readonly string[]).join(", ") : (value as string);
  }
  return out;
}

function parseObservedBody(body: Repr["body"] | string | undefined, contentType: string | undefined): unknown {
  if (body === undefined) return undefined;
  if (typeof body !== "string" && !Buffer.isBuffer(body) && !(body instanceof Uint8Array)) return undefined;
  const text = Buffer.isBuffer(body) || body instanceof Uint8Array ? Buffer.from(body).toString("utf8") : body;
  if (/^application\/(?:[^+]+\+)?json(?:;|$)/i.test(contentType ?? "")) {
    try { return text ? JSON.parse(text) : undefined; } catch { return text; }
  }
  return text;
}

function isProblemType(contentType: string | undefined): boolean {
  return /^application\/problem\+json(?:;|$)/i.test(contentType ?? "");
}

async function validateRouteResult(ctx: RouterContext, options: RouterRouteOptions, result: RouterResult): Promise<RouterResult> {
  if (!options.responses || result === undefined || result === null) return result;
  if (isRepr(result)) {
    const status = result.status ?? 200;
    const headers = lowerHeaders(result.headers);
    const contentType = result.type ?? headers["content-type"];
    if (isProblemType(contentType)) return result;
    const report = responseValidationReport({
      trace: ctx.trace,
      spec: options.responses,
      response: {
        status,
        headers,
        ...(contentType !== undefined ? { contentType } : {}),
        body: parseObservedBody(result.body, contentType),
      },
    });
    if (!report.valid) return responseProblem(`Invalid response ${report.invalidArea ?? "contract"}`, report.issues);
    return result;
  }
  if (result instanceof Response) {
    const headers = lowerHeaders(result.headers);
    const contentType = result.headers.get("content-type") ?? undefined;
    if (isProblemType(contentType)) return result;
    const text = result.body === null ? undefined : await result.clone().text();
    const report = responseValidationReport({
      trace: ctx.trace,
      spec: options.responses,
      response: {
        status: result.status,
        headers,
        ...(contentType !== undefined ? { contentType } : {}),
        body: parseObservedBody(text, contentType),
      },
    });
    if (!report.valid) return responseProblem(`Invalid response ${report.invalidArea ?? "contract"}`, report.issues);
  }
  return result;
}

function sendRepr(req: IncomingMessage, res: ServerResponse, repr: Repr): void {
  const { status = 200, type, body = "", headers = {}, etag } = repr;
  const out: Record<string, string | readonly string[]> = { ...headers };
  if (type) out["content-type"] = type;
  if (etag) out.etag = etag;
  if (repr.lastModified) out["last-modified"] = repr.lastModified.toUTCString();
  const vary = (repr as Repr & { vary?: string }).vary;
  if (vary) out.vary = vary;
  const links = (repr as Repr & { links?: Array<{ href: string; rel: string; type?: string }> }).links;
  if (links?.length) {
    out.link = links.map(({ href, rel, type: linkType }) => {
      return `<${href}>; rel="${rel}"${linkType ? `; type="${linkType}"` : ""}`;
    }).join(", ");
  }

  const empty = status === 204 || status === 304;
  if (req.method === "HEAD" || empty) {
    if (!empty) out["content-length"] = String(responseBodyBuffer(body).length);
    res.writeHead(status, out as import("node:http").OutgoingHttpHeaders);
    res.end();
    return;
  }

  const buf = responseBodyBuffer(body);
  out["content-length"] = String(buf.length);
  res.writeHead(status, out as import("node:http").OutgoingHttpHeaders);
  res.end(buf);
}

function requestPath(req: IncomingMessage, ctx: Context): string {
  const path = (ctx as { path?: string }).path;
  if (path) return path;
  return ctx.url?.pathname ?? new URL(req.url ?? "/", (ctx as { base?: string }).base ?? "http://localhost/").pathname;
}

function isRouteOptions(value: unknown): value is RouterRouteOptions {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Response);
}

function routeHandlers(options: RouterRouteOptions, handlers: readonly RouterHandler[]): RouterHandler[] {
  const out: RouterHandler[] = [];
  if (options.validation) {
    const validation = requestValidation(options.validation);
    out.push(async (ctx, next) => {
      const result = await validation(ctx);
      if (result !== undefined && result !== null && result !== false) return result as RouterResult;
      return next();
    });
  }
  out.push(...(options.middlewares ?? []));
  out.push(...handlers);
  return out;
}

function splitRouteArgs(args: readonly RouterRouteArgument[]): { options: RouterRouteOptions; handlers: RouterHandler[] } {
  const [first, ...rest] = args;
  if (isRouteOptions(first)) {
    return { options: first, handlers: rest as RouterHandler[] };
  }
  return { options: {}, handlers: args as RouterHandler[] };
}

function mergeOpenApiMetadata(base: OpenApiMetadata, extra: OpenApiMetadata): OpenApiMetadata {
  return Object.freeze({
    ...extra,
    ...base,
    responses: Object.freeze({
      ...(extra.responses ?? {}),
      ...(base.responses ?? {}),
    }),
  });
}

function routeOpenApi(options: RouterRouteOptions): OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>> | undefined | false {
  const generated = options.responses ? responseValidationOpenApiMetadata(options.responses) : Object.freeze({ responses: Object.freeze({}) });
  if (options.openapi !== undefined) {
    if (!options.responses || options.openapi === false) return options.openapi;
    if (isOpenApiOperation(options.openapi)) return mergeOpenApiMetadata(options.openapi, generated);
    return Object.freeze(Object.fromEntries(Object.entries(options.openapi).map(([method, operation]) => [
      method,
      mergeOpenApiMetadata(operation, generated),
    ])));
  }
  if (options.validation || options.responses) return generated;
  return undefined;
}

function isOpenApiOperation(value: unknown): value is OpenApiMetadata {
  return Boolean(value && typeof value === "object" && (
    "responses" in value ||
    "summary" in value ||
    "description" in value ||
    "operationId" in value ||
    "tags" in value ||
    "requestBody" in value
  ));
}

export class Router {
  private readonly store: Store;
  private readonly prefix: string;
  private readonly appMiddlewares: NonNullable<App["middlewares"]>;

  constructor(opts: RouterOptions = {}, store: Store = { routes: [], middlewares: [] }, prefix = opts.prefix ?? "") {
    this.store = store;
    this.prefix = prefix;
    this.appMiddlewares = opts.middlewares ?? [];
  }

  private add(methods: string[] | null, path: string, args: readonly RouterRouteArgument[]): this {
    if (typeof path !== "string") throw new TypeError("router: pattern must be a string");
    const { options, handlers } = splitRouteArgs(args);
    if (handlers.length === 0) throw new TypeError(`router: ${path} registered with no handler`);
    const pattern = joinPath(this.prefix, path);
    this.store.routes.push({
      methods: methods ? new Set(methods.map((method) => method.toUpperCase())) : null,
      pattern,
      matcher: compilePattern(pattern),
      handlers: routeHandlers(options, handlers),
      options,
    });
    return this;
  }

  get(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["GET", "HEAD"], path, handlers); }
  head(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["HEAD"], path, handlers); }
  post(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["POST"], path, handlers); }
  put(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["PUT"], path, handlers); }
  patch(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["PATCH"], path, handlers); }
  delete(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["DELETE"], path, handlers); }
  options(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(["OPTIONS"], path, handlers); }
  all(path: string, ...handlers: RouterRouteArgument[]): this { return this.add(null, path, handlers); }

  on(methods: string | string[], path: string, ...handlers: RouterRouteArgument[]): this {
    return this.add([methods].flat().map((method) => method.toUpperCase()), path, handlers);
  }

  use(...handlers: RouterHandler[]): this;
  use(scope: string, ...handlers: RouterHandler[]): this;
  use(...args: [string | RouterHandler, ...RouterHandler[]]): this {
    if (typeof args[0] === "string") {
      const [scope, ...handlers] = args as [string, ...RouterHandler[]];
      const pattern = joinPath(this.prefix, joinPath(scope, "*"));
      for (const handler of handlers) {
        this.store.middlewares.push({ scope: pattern, matcher: compilePattern(pattern), handler });
      }
      return this;
    }

    const scope = this.prefix ? joinPath(this.prefix, "*") : null;
    const matcher = scope ? compilePattern(scope) : null;
    for (const handler of args as RouterHandler[]) {
      this.store.middlewares.push({ scope, matcher, handler });
    }
    return this;
  }

  group(prefix: string, fn: (router: Router) => void): this;
  group(prefix: string): Router;
  group(prefix: string, fn?: (router: Router) => void): this | Router {
    const sub = new Router({}, this.store, joinPath(this.prefix, prefix));
    if (fn) {
      fn(sub);
      return this;
    }
    return sub;
  }

  route(methods: string[], path: string, ...handlers: RouterRouteArgument[]): this;
  route(prefix: string, router: Router): this;
  route(methodsOrPrefix: string[] | string, pathOrRouter: string | Router, ...handlers: RouterRouteArgument[]): this {
    if (Array.isArray(methodsOrPrefix)) {
      if (typeof pathOrRouter !== "string" || handlers.length === 0) throw new TypeError("router.route: expected methods, path, handler");
      return this.add(methodsOrPrefix, pathOrRouter, handlers);
    }

    if (!(pathOrRouter instanceof Router)) throw new TypeError("router.route: expected a Router to mount");
    const mountPrefix = joinPath(this.prefix, methodsOrPrefix);
    const snapshot = pathOrRouter._drain();
    for (const route of snapshot.routes) {
      const pattern = joinPath(mountPrefix, route.pattern);
      this.store.routes.push({ ...route, pattern, matcher: compilePattern(pattern) });
    }
    for (const mw of snapshot.middlewares) {
      const scope = mw.scope ? joinPath(mountPrefix, mw.scope) : joinPath(mountPrefix, "*");
      this.store.middlewares.push({ ...mw, scope, matcher: compilePattern(scope) });
    }
    return this;
  }

  mount(prefix: string, router: Router): this {
    return this.route(prefix, router);
  }

  handler(path: string, method = "GET"): RouterMatch {
    const allowed = new Set<string>();
    let pathMatched = false;
    const normalized = method.toUpperCase();
    for (const route of this.store.routes) {
      const params = route.matcher.exec(path);
      if (!params) continue;
      pathMatched = true;
      if (route.methods === null) {
        for (const m of METHODS) allowed.add(m);
      } else {
        for (const m of route.methods) allowed.add(m);
      }
      if (route.methods === null || route.methods.has(normalized)) {
        return { route, params, allowed, pathMatched };
      }
    }
    return { route: null, params: null, allowed, pathMatched };
  }

  private collectMiddleware(path: string): RouterHandler[] {
    const handlers: RouterHandler[] = [];
    for (const mw of this.store.middlewares) {
      if (!mw.matcher || mw.matcher.exec(path)) handlers.push(mw.handler);
    }
    return handlers;
  }

  middleware(): RouterMiddleware {
    return (async (...args: [Context] | [IncomingMessage, ServerResponse, Context]) => {
      const ctx = args.length === 1 ? args[0] : args[2];
      const req = args.length === 1 ? ctx.req : args[0];
      const res = args.length === 1 ? ctx.res : args[1];
      const path = requestPath(req, ctx);
      const method = (req.method ?? "GET").toUpperCase();
      const { route, params, allowed, pathMatched } = this.handler(path, method);

      if (!route) {
        if (pathMatched) {
          if (allowed.has("GET")) allowed.add("HEAD");
          res.writeHead(405, { allow: [...allowed].join(", "), "content-type": "text/plain; charset=utf-8" });
          res.end("Method Not Allowed");
          return true;
        }
        return false;
      }

      Object.assign(ctx.params, params);
      const result = await validateRouteResult(ctx as RouterContext, route.options, await dispatch([...this.collectMiddleware(path), ...route.handlers], ctx as RouterContext));
      if (result === undefined || result === null) {
        if (!res.writableEnded && !res.headersSent) {
          res.writeHead(204);
          res.end();
        }
        return true;
      }
      if (result instanceof Response) await sendWebResponse(res, result, req.method === undefined ? {} : { method: req.method });
      else if (isRepr(result)) sendRepr(req, res, result);
      return true;
    }) as RouterMiddleware;
  }

  toResources(): Resource[] {
    return this.store.routes.map((route): Resource => {
      const openapi = routeOpenApi(route.options);
      const resource: Resource = {
        match: route.pattern,
        route: route.pattern,
        ...(route.options.id !== undefined ? { id: route.options.id } : {}),
        ...(route.options.name !== undefined ? { name: route.options.name } : {}),
        ...(route.options.produces !== undefined ? { produces: route.options.produces } : {}),
        ...(route.options.languages !== undefined ? { languages: route.options.languages } : {}),
        handler: async (ctx) => {
          const result = await validateRouteResult(ctx as RouterContext, route.options, await dispatch([...this.collectMiddleware(ctx.url.pathname), ...route.handlers], ctx as RouterContext));
          return result === undefined || result === null ? { status: 204 } : result;
        },
      };
      if (route.methods) resource.methods = [...route.methods];
      return {
        ...resource,
        ...(route.options.validation !== undefined ? { validation: route.options.validation } : {}),
        ...(route.options.responses !== undefined ? { responses: route.options.responses } : {}),
        ...(openapi !== undefined ? { openapi } : {}),
      } as Resource;
    });
  }

  toApp(overrides: App = {}): App {
    const extra = overrides.middlewares ?? [];
    return {
      ...overrides,
      middlewares: [this.middleware(), ...this.appMiddlewares, ...extra],
      resources: [...this.toResources(), ...(overrides.resources ?? [])],
    };
  }

  _drain(): { routes: RouteSnapshot[]; middlewares: Array<{ scope: string | null; handler: RouterHandler }> } {
    const prefix = this.prefix;
    const owns = (pattern: string | null) => !prefix || pattern === prefix || pattern?.startsWith(`${prefix}/`);
    return {
      routes: this.store.routes
        .filter((route) => owns(route.pattern))
        .map((route) => ({
          methods: route.methods ? new Set(route.methods) : null,
          pattern: prefix && route.pattern.startsWith(prefix) ? (route.pattern.slice(prefix.length) || "/") : route.pattern,
          handlers: route.handlers,
          options: route.options,
        })),
      middlewares: this.store.middlewares
        .filter((mw) => owns(mw.scope))
        .map((mw) => ({
          scope: mw.scope && prefix && mw.scope.startsWith(prefix) ? (mw.scope.slice(prefix.length) || "/") : mw.scope,
          handler: mw.handler,
        })),
    };
  }
}

export function router(opts: RouterOptions = {}): Router {
  return new Router(opts);
}

export function crud<T>(base: string, handlers: CrudHandlers<T>): Resource[] {
  const resources: Resource[] = [];
  if (handlers.list || handlers.create) {
    resources.push({
      match: base,
      methods: [handlers.list ? "GET" : "", handlers.create ? "POST" : ""].filter(Boolean),
      handler: async (ctx) => {
        if (ctx.req.method === "GET" && handlers.list) {
          const items = await handlers.list(ctx);
          ctx.res.setHeader("Content-Type", "application/json");
          ctx.res.writeHead(200).end(JSON.stringify(items));
        } else if (ctx.req.method === "POST" && handlers.create) {
          const item = await handlers.create(ctx);
          ctx.res.setHeader("Content-Type", "application/json");
          ctx.res.writeHead(201).end(JSON.stringify(item));
        }
      },
    });
  }
  if (handlers.get || handlers.update || handlers.destroy) {
    resources.push({
      match: `${base}/:id`,
      methods: [
        handlers.get ? "GET" : "",
        handlers.update ? "PUT" : "",
        handlers.update ? "PATCH" : "",
        handlers.destroy ? "DELETE" : "",
      ].filter(Boolean),
      handler: async (ctx) => {
        const m = ctx.req.method ?? "GET";
        if ((m === "GET" || m === "HEAD") && handlers.get) {
          const item = await handlers.get(ctx);
          if (!item) {
            ctx.res.writeHead(404).end("Not Found");
            return;
          }
          ctx.res.setHeader("Content-Type", "application/json");
          ctx.res.writeHead(200).end(JSON.stringify(item));
        } else if ((m === "PUT" || m === "PATCH") && handlers.update) {
          const item = await handlers.update(ctx);
          ctx.res.setHeader("Content-Type", "application/json");
          ctx.res.writeHead(200).end(JSON.stringify(item));
        } else if (m === "DELETE" && handlers.destroy) {
          await handlers.destroy(ctx);
          ctx.res.writeHead(204).end();
        }
      },
    });
  }
  return resources;
}
