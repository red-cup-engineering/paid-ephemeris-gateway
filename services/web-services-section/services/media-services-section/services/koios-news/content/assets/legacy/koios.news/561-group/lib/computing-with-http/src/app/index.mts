import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { parseContentType, type CacheControl } from "../codecs/http/index.mjs";
import { decompress } from "../codecs/compression/index.mjs";
import { parseMultipartForm, type MultipartForm } from "../codecs/multipart/index.mjs";
import type { Coding } from "../codecs/negotiation/index.mjs";
import { sseCommentFrame, sseFrame, sseHeaders } from "../codecs/sse/index.mjs";

export type Body = string | Buffer | NodeJS.ReadableStream | AsyncIterable<Uint8Array>;

export type ResponseTrailerValue = string | number | readonly string[];
export type ResponseTrailers = Readonly<Record<string, ResponseTrailerValue>>;

export type Repr = {
  status?: number;
  headers?: Record<string, string | readonly string[]>;
  trailers?: ResponseTrailers;
  body?: Body;
  type?: string;
  etag?: string;
  lastModified?: Date;
  cacheControl?: CacheControl | string;
  security?: SecurityHeaders | true;
};

export type ReprOptions = Readonly<{
  status?: number;
  headers?: Record<string, string>;
  trailers?: ResponseTrailers;
  cacheControl?: CacheControl | string;
  security?: SecurityHeaders | true;
  etag?: string;
  lastModified?: Date;
}>;

export type JsonReprOptions = ReprOptions & Readonly<{
  type?: string;
  pretty?: boolean | number;
  newline?: boolean;
}>;

export type TextReprOptions = ReprOptions & Readonly<{
  type?: string;
}>;

export type HandlerResult = Repr | Response | null | undefined | void;
export type RequestHookResult = boolean | HandlerResult;
export type ErrorHookResult = boolean | HandlerResult;

export type ProblemResponseOptions = Readonly<{
  headers?: Readonly<Record<string, string>>;
  cacheControl?: CacheControl | string;
  security?: SecurityHeaders | true;
  includeErrorDetail?: boolean;
  includeStack?: boolean;
  instance?: string | ((ctx: Context) => string | undefined);
}>;

export type RequestTraceEntry = Readonly<{
  e: unknown;
  a: string;
  v: unknown;
  t: unknown;
}>;

export type RequestTrace = Readonly<{
  kind: "web-server.request-trace";
  id: string;
  entries: readonly RequestTraceEntry[];
}>;

export type Handler = (ctx: Context) => HandlerResult | Promise<HandlerResult>;
export type Middleware = (ctx: Context) => MiddlewareResult | Promise<MiddlewareResult>;
export type MiddlewareResult = RequestTraceEntry[] | boolean | HandlerResult;

export type Resource = {
  match: string | RegExp | ((path: string, ctx: Context) => boolean | Record<string, string> | null | undefined);
  route?: string;
  id?: string;
  name?: string;
  methods?: readonly string[];
  produces?: readonly string[];
  languages?: readonly string[];
  middlewares?: readonly Middleware[];
  handler: Handler;
};

export type Context = {
  req: IncomingMessage;
  res: ServerResponse;
  app: App;
  url: URL;
  params: Readonly<Record<string, string>>;
  locals: Record<string, unknown>;
  nonce: string;
  negotiatedType?: string;
  negotiatedLanguage?: string;
  resource?: Resource;
  route?: string;
  routeTemplate?: string;
  matchedRoute?: string;
  routeId?: string;
  routeName?: string;
  signal: AbortSignal;
  trace: RequestTrace;
  startedAt: number;
};

export type UpgradeHandler = {
  match?: string | RegExp | ((path: string) => boolean) | ((req: IncomingMessage) => boolean);
  handler?: (req: IncomingMessage, socket: unknown, head: Buffer) => void;
  handleUpgrade?: (req: IncomingMessage, socket: unknown, head: Buffer, ctx: { app: App }) => void;
};

export type ServerLifecycle = {
  onStart?: (server: unknown) => void | Promise<void>;
  onStop?: (server: unknown) => void | Promise<void>;
  onConnection?: (socket: unknown) => void;
};

export type ExpectContinueHook = (
  req: IncomingMessage,
  res: ServerResponse,
  app: App,
) => boolean | void | Promise<boolean | void>;

export type ClientError = Error & {
  code?: string;
  bytesParsed?: number;
  rawPacket?: Buffer;
};

export type ClientErrorHook = (
  error: ClientError,
  socket: unknown,
  app: App,
) => boolean | void | Promise<boolean | void>;

export type CorsOriginPattern = string | RegExp;

export type CorsOptions = {
  origins?: readonly CorsOriginPattern[] | ((origin: string, ctx: { req: IncomingMessage }) => boolean);
  methods?: readonly string[];
  headers?: readonly string[];
  expose?: readonly string[];
  credentials?: boolean;
  maxAge?: number;
  allowPrivateNetwork?: boolean;
  strictPreflight?: boolean;
  preflightDenyStatus?: number;
};

export type StrictTransportSecurity =
  | string
  | false
  | {
      maxAge?: number;
      includeSubDomains?: boolean;
      preload?: boolean;
    };

export type SecurityHeaders = {
  contentSecurityPolicy?: string | false;
  contentSecurityPolicyReportOnly?: string | false;
  strictTransportSecurity?: StrictTransportSecurity;
  contentTypeOptions?: "nosniff" | false;
  referrerPolicy?: string | false;
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  permissionsPolicy?: string | false;
  reportingEndpoints?: string | Readonly<Record<string, string>> | false;
  crossOriginOpenerPolicy?: string | false;
  crossOriginResourcePolicy?: string | false;
  crossOriginEmbedderPolicy?: string | false;
  originAgentCluster?: "?1" | false;
  dnsPrefetchControl?: "on" | "off" | false;
  downloadOptions?: "noopen" | false;
  permittedCrossDomainPolicies?: "none" | "master-only" | "by-content-type" | "by-ftp-filename" | "all" | false;
};

export type App = {
  resources?: readonly Resource[];
  middlewares?: readonly Middleware[];
  upgrades?: readonly UpgradeHandler[];

  tls?: { key: string; cert: string; ca?: string };
  http2?: boolean;
  cors?: CorsOptions;
  cacheControl?: CacheControl | string;
  security?: SecurityHeaders | true;
  problems?: boolean | ProblemResponseOptions;
  base?: string;
  trustProxy?: boolean | number;
  expectContinue?: boolean | ExpectContinueHook;
  clientError?: false | ClientErrorHook;
  locals?: Record<string, unknown>;

  onStart?: (app: App) => void | Promise<void>;
  onStop?: (app: App) => void | Promise<void>;
  onConnection?: (socket: unknown) => void;
  lifecycle?: ServerLifecycle;
  onRequest?: (ctx: Context) => RequestHookResult | Promise<RequestHookResult>;
  onResponse?: (ctx: Context) => void | Promise<void>;
  onError?: (err: unknown, ctx: Context) => ErrorHookResult | Promise<ErrorHookResult>;
};

export type StartResult = {
  server: unknown;
  port: number;
  address: AddressInfo | string | null;
  close: {
    (): Promise<void>;
    (grace: number): Promise<void>;
  };
};

export interface Servable {
  readonly app: App;
  refresh(): Promise<void>;
  start(intervalMs?: number): void;
  stop(): void;
}

export type SseWriter = {
  send(event: string, data: unknown, id?: string): void;
  comment(text: string): void;
  close(): void;
};

export type SseSink = {
  write(chunk: string): unknown;
};

export type TopicEvent = Readonly<{
  type?: string;
  topic?: string;
  [key: string]: unknown;
}>;

export function sse(req: IncomingMessage, res: ServerResponse, onClose?: () => void): SseWriter {
  res.writeHead(200, sseHeaders());
  res.flushHeaders?.();

  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  res.on("close", () => onClose?.());

  return {
    send(event, data, id) { res.write(sseFrame(event, data, id)); },
    comment(text) { res.write(sseCommentFrame(text)); },
    close() { res.end(); },
  };
}

export function writeSseEvent(sink: SseSink, name: string, data: unknown, id?: string): boolean {
  try {
    sink.write(sseFrame(name, data, id));
    return true;
  } catch {
    return false;
  }
}

export function writeSseComment(sink: SseSink, text = ""): boolean {
  try {
    sink.write(sseCommentFrame(text));
    return true;
  } catch {
    return false;
  }
}

export function createProjectedEventHub(): {
  subscribe(sink: SseSink, opts?: { topics?: Iterable<string> | string }): () => void;
  publish(events: TopicEvent | readonly TopicEvent[]): void;
  keepAlive(): number;
  size(): number;
} {
  type Sub = { sink: SseSink; topics: Set<string> };
  const subscribers = new Set<Sub>();
  const topicSet = (topics: Iterable<string> | string | undefined): Set<string> => {
    if (topics === undefined) return new Set();
    if (typeof topics === "string") return new Set(topics.split(",").map((item) => item.trim()).filter(Boolean));
    return new Set([...topics].map((item) => String(item).trim()).filter(Boolean));
  };
  const accepts = (sub: Sub, event: TopicEvent): boolean =>
    sub.topics.size === 0 ||
    (event.topic !== undefined && sub.topics.has(String(event.topic))) ||
    (event.type !== undefined && sub.topics.has(String(event.type)));

  return {
    subscribe(sink, opts = {}) {
      const sub = { sink, topics: topicSet(opts.topics) };
      subscribers.add(sub);
      writeSseComment(sink, "ok");
      return () => { subscribers.delete(sub); };
    },
    publish(events) {
      const list = Array.isArray(events) ? events : [events];
      const dead: Sub[] = [];
      for (const sub of subscribers) {
        for (const event of list) {
          if (!accepts(sub, event)) continue;
          if (!writeSseEvent(sub.sink, String(event.type ?? "message"), event)) {
            dead.push(sub);
            break;
          }
        }
      }
      for (const sub of dead) subscribers.delete(sub);
    },
    keepAlive() {
      const dead: Sub[] = [];
      for (const sub of subscribers) if (!writeSseComment(sub.sink, "ka")) dead.push(sub);
      for (const sub of dead) subscribers.delete(sub);
      return subscribers.size;
    },
    size: () => subscribers.size,
  };
}

export type WellKnownEntry = {
  name: string;
  handler?: Handler;
  repr?: Repr | ((pathRemainder: string, ctx: Parameters<Handler>[0]) => Repr | Promise<Repr>);
  methods?: readonly string[];
  produces?: readonly string[];
  prefix?: boolean;
};

export type WellKnownOptions = {
  basePath?: string;
};

const WELL_KNOWN_TOKEN = /^[A-Za-z0-9._~-]+$/;

function assertWellKnownName(name: string): void {
  if (!WELL_KNOWN_TOKEN.test(name) || name === "." || name === "..") {
    throw new TypeError(`invalid well-known name: ${name}`);
  }
}

function wellKnownBase(basePath: string | undefined): string {
  if (!basePath) return "/.well-known";
  const trimmed = basePath.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function wellKnownExactPath(basePath: string, name: string): string {
  return `${basePath}/${name}`;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wellKnownPrefixRegex(path: string): RegExp {
  return new RegExp(`^${escapeRegex(path)}(?:/(?<remainder>.*))?$`);
}

function wellKnownEntryHandler(entry: WellKnownEntry): Handler {
  if (entry.handler) return entry.handler;
  if (!entry.repr) throw new TypeError(`well-known entry ${entry.name} needs a handler or repr`);
  const representation = entry.repr;
  return async (ctx) => {
    const remainder = ctx.params.remainder ?? "";
    return typeof representation === "function" ? await representation(remainder, ctx) : representation;
  };
}

export function wellKnown(entries: readonly WellKnownEntry[], opts: WellKnownOptions = {}): App {
  const basePath = wellKnownBase(opts.basePath);
  const resources: Resource[] = entries.map((entry) => {
    assertWellKnownName(entry.name);
    const path = wellKnownExactPath(basePath, entry.name);
    const resource: Resource = {
      match: entry.prefix ? wellKnownPrefixRegex(path) : path,
      methods: entry.methods ?? ["GET", "HEAD"],
      handler: wellKnownEntryHandler(entry),
    };
    if (entry.produces) resource.produces = entry.produces;
    return resource;
  });

  return { resources };
}

export function jsonRepr(body: unknown, options: number | JsonReprOptions = {}): Repr {
  const opts = typeof options === "number" ? { status: options } : options;
  const indent = opts.pretty === true ? 2 : typeof opts.pretty === "number" ? opts.pretty : undefined;
  const serialized = JSON.stringify(body, null, indent) ?? "null";
  return repr({
    ...opts,
    type: opts.type ?? "application/json; charset=utf-8",
    body: opts.newline === false ? serialized : `${serialized}\n`,
  });
}

export function textRepr(body: string, options: number | TextReprOptions = {}): Repr {
  const opts = typeof options === "number" ? { status: options } : options;
  return repr({
    ...opts,
    type: opts.type ?? "text/plain; charset=utf-8",
    body,
  });
}

export function htmlRepr(body: string, options: number | TextReprOptions = {}): Repr {
  const opts = typeof options === "number" ? { status: options } : options;
  return repr({
    ...opts,
    type: opts.type ?? "text/html; charset=utf-8",
    body,
  });
}

export function emptyRepr(status = 204, options: ReprOptions = {}): Repr {
  return repr({ ...options, status });
}

export type BodyParseOptions = Readonly<{
  maxBytes?: number;
  maxEncodedBytes?: number;
  contentType?: string;
  contentEncoding?: string | readonly string[];
  decodeContentEncoding?: boolean;
}>;

export type JsonBodyOptions<T = unknown> = BodyParseOptions & Readonly<{
  empty?: T;
}>;

export async function readBody(req: IncomingMessage, options: number | BodyParseOptions = {}): Promise<Buffer> {
  const opts = typeof options === "number" ? { maxBytes: options, maxEncodedBytes: options } : options;
  const maxBytes = opts.maxBytes ?? Infinity;
  const maxEncodedBytes = opts.maxEncodedBytes ?? maxBytes;
  const raw = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let overLimit = false;
    req.on("data", (chunk: Buffer | string) => {
      if (overLimit) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxEncodedBytes) {
        overLimit = true;
        reject(new RangeError(`request body exceeded ${maxEncodedBytes} bytes`));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (!overLimit) resolve(Buffer.concat(chunks, size));
    });
    req.on("error", reject);
  });
  if (opts.decodeContentEncoding === false) return raw;
  return decodeContentEncodedBody(raw, opts.contentEncoding ?? req.headers?.["content-encoding"], maxBytes);
}

function parseContentCodings(value: string | readonly string[] | undefined): readonly Coding[] {
  const raw: string | undefined = typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value.join(",")
      : undefined;
  if (!raw) return [];
  const codings: Coding[] = [];
  for (const part of raw.split(",").map((item: string) => item.trim().toLowerCase()).filter(Boolean)) {
    if (part === "identity") continue;
    if (part === "br" || part === "gzip" || part === "deflate" || part === "zstd") codings.push(part);
    else throw new TypeError(`unsupported request content-encoding: ${part}`);
  }
  return Object.freeze(codings);
}

async function decodeContentEncodedBody(
  body: Buffer,
  contentEncoding: string | readonly string[] | undefined,
  maxBytes: number,
): Promise<Buffer> {
  let decoded = body;
  const codings = parseContentCodings(contentEncoding);
  for (const coding of [...codings].reverse()) {
    decoded = await decompress(decoded, coding);
    if (decoded.length > maxBytes) throw new RangeError(`decoded request body exceeded ${maxBytes} bytes`);
  }
  return decoded;
}

export async function readTextBody(req: IncomingMessage, options: BodyParseOptions = {}): Promise<string> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  const charset = contentType?.params["charset"] ?? "utf-8";
  return decodeBody(await readBody(req, options), charset);
}

export async function readJsonBody<T = unknown>(req: IncomingMessage, options: JsonBodyOptions<T> = {}): Promise<T> {
  const text = await readTextBody(req, options);
  if (!text.trim()) return options.empty as T;
  return JSON.parse(text) as T;
}

export async function readFormBody(req: IncomingMessage, options: BodyParseOptions = {}): Promise<URLSearchParams> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  if (contentType !== null && contentType.type !== "application/x-www-form-urlencoded") {
    throw new TypeError(`expected application/x-www-form-urlencoded body, got ${contentType.type}`);
  }
  return new URLSearchParams(await readTextBody(req, options));
}

export async function readMultipartBody(req: IncomingMessage, options: BodyParseOptions = {}): Promise<MultipartForm> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  if (contentType?.type !== "multipart/form-data") {
    throw new TypeError(`expected multipart/form-data body, got ${contentType?.type ?? "missing content-type"}`);
  }
  const boundary = contentType.params["boundary"];
  if (!boundary) throw new TypeError("multipart/form-data boundary is required");
  return parseMultipartForm(await readBody(req, options), boundary);
}

function decodeBody(body: Buffer, charset: string): string {
  const normalized = charset.toLowerCase();
  if (normalized === "utf-8" || normalized === "utf8") return body.toString("utf8");
  if (normalized === "us-ascii" || normalized === "ascii") return body.toString("ascii");
  if (normalized === "iso-8859-1" || normalized === "latin1") return body.toString("latin1");
  throw new TypeError(`unsupported request charset: ${charset}`);
}

function repr(options: ReprOptions & Readonly<{ type?: string; body?: Body }>): Repr {
  const out: Repr = {};
  if (options.status !== undefined) out.status = options.status;
  if (options.headers !== undefined) out.headers = options.headers;
  if (options.trailers !== undefined) out.trailers = options.trailers;
  if (options.type !== undefined) out.type = options.type;
  if (options.body !== undefined) out.body = options.body;
  if (options.cacheControl !== undefined) out.cacheControl = options.cacheControl;
  if (options.security !== undefined) out.security = options.security;
  if (options.etag !== undefined) out.etag = options.etag;
  if (options.lastModified !== undefined) out.lastModified = options.lastModified;
  return out;
}
