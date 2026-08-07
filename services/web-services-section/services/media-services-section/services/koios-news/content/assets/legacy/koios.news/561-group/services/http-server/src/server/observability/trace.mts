// observability/trace.ts — W3C Trace Context, Server-Timing, spans, and request correlation.
import { randomBytes, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { Context, Middleware } from "../types.mjs";

type AnyCtx = Partial<Context> & Record<string | symbol, unknown>;
type AnyReq = Pick<IncomingMessage, "headers" | "method" | "url"> & { id?: string };
type AnyRes = {
  headersSent?: boolean;
  setHeader(name: string, value: unknown): unknown;
  writeHead?: (...args: unknown[]) => unknown;
  end?: (...args: unknown[]) => unknown;
};

function partsFromArgs(args: [Context] | [AnyReq, AnyRes, AnyCtx]): { req: AnyReq; res: AnyRes; ctx: AnyCtx } {
  if (args.length === 1) return { req: args[0].req as AnyReq, res: args[0].res as AnyRes, ctx: args[0] };
  return { req: args[0], res: args[1], ctx: args[2] };
}

// ── Server-Timing ────────────────────────────────────────────────────────────

const TIMINGS = Symbol.for("@emsenn/webserver.serverTimings");
const SERVER_TIMING_ARMED = Symbol.for("@emsenn/webserver.serverTimingArmed");
const TRACE_OBJECT = Symbol.for("@emsenn/webserver.traceObject");

type TimingMeasure = { dur?: number; desc?: string; start?: number };

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Number(process.hrtime.bigint()) / 1e6;
}

function timingsOf(ctx: AnyCtx): Map<string, TimingMeasure> {
  let map = ctx[TIMINGS] as Map<string, TimingMeasure> | undefined;
  if (!map) {
    map = new Map();
    ctx[TIMINGS] = map;
  }
  return map;
}

function sanitizeTimingName(name: unknown): string {
  const token = String(name ?? "").replace(/[^!#$%&'*+\-.^_`|~0-9A-Za-z]/g, "");
  return token || "_";
}

function quoteDesc(desc: unknown): string {
  return `"${String(desc).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatDur(ms: unknown): string {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "0";
  return String(Math.round(n * 1000) / 1000);
}

export function renderServerTiming(ctx: AnyCtx | undefined): string {
  const map = ctx?.[TIMINGS] as Map<string, TimingMeasure> | undefined;
  if (!map?.size) return "";
  const members: string[] = [];
  for (const [name, measure] of map) {
    let member = sanitizeTimingName(name);
    if (measure.dur !== undefined) member += `;dur=${formatDur(measure.dur)}`;
    if (measure.desc !== undefined && measure.desc !== "") member += `;desc=${quoteDesc(measure.desc)}`;
    members.push(member);
  }
  return members.join(", ");
}

export type ServerTimingContext = {
  start(name: string, desc?: string): () => number;
  end(name: string, desc?: string): number;
  record(name: string, dur?: number, desc?: string): void;
  add(name: string, dur: number, desc?: string): void;
};

export type ServerTimingSurface = {
  middleware: Middleware & ((req: AnyReq, res: AnyRes, ctx: AnyCtx) => false | void);
  start(ctx: AnyCtx, name: string, desc?: string): () => number;
  end(ctx: AnyCtx, name: string, desc?: string): number;
  record(ctx: AnyCtx, name: string, dur?: number, desc?: string): void;
  header(ctx: AnyCtx): string;
  onResponse(info?: { req?: AnyReq; res?: AnyRes; ctx?: AnyCtx } | Context): void;
};

export function serverTiming(options: {
  headerName?: string;
  total?: boolean;
  totalName?: string;
} = {}): ServerTimingSurface {
  const headerName = (options.headerName ?? "server-timing").toLowerCase();
  const total = options.total ?? true;
  const totalName = options.totalName ?? "total";

  function start(ctx: AnyCtx, name: string, desc?: string): () => number {
    timingsOf(ctx).set(name, { start: nowMs(), ...(desc !== undefined ? { desc } : {}) });
    return () => end(ctx, name);
  }

  function end(ctx: AnyCtx, name: string, desc?: string): number {
    const map = timingsOf(ctx);
    const measure = map.get(name);
    const dur = measure?.start !== undefined ? nowMs() - measure.start : 0;
    const next: TimingMeasure = { dur };
    const nextDesc = desc ?? measure?.desc;
    if (nextDesc !== undefined) next.desc = nextDesc;
    map.set(name, next);
    return dur;
  }

  function record(ctx: AnyCtx, name: string, dur?: number, desc?: string): void {
    const measure: TimingMeasure = {};
    if (dur !== undefined) measure.dur = Number(dur);
    if (desc !== undefined) measure.desc = desc;
    timingsOf(ctx).set(name, measure);
  }

  function emit(res: AnyRes | undefined, ctx: AnyCtx | undefined, began?: number): void {
    try {
      if (!res || res.headersSent || !ctx) return;
      if (total && !(ctx[TIMINGS] as Map<string, TimingMeasure> | undefined)?.has(totalName)) {
        record(ctx, totalName, began !== undefined ? nowMs() - began : 0, "Total response time");
      }
      const value = renderServerTiming(ctx);
      if (value) res.setHeader(headerName, value);
    } catch {}
  }

  const middleware = ((...args: [Context] | [AnyReq, AnyRes, AnyCtx]) => {
    const { res, ctx } = partsFromArgs(args);
    if ((res as Record<symbol, unknown>)[SERVER_TIMING_ARMED]) return false;
    (res as Record<symbol, unknown>)[SERVER_TIMING_ARMED] = true;
    const began = nowMs();

    const api = {
      start: (name: string, desc?: string) => start(ctx, name, desc),
      end: (name: string, desc?: string) => end(ctx, name, desc),
      record: (name: string, dur?: number, desc?: string) => record(ctx, name, dur, desc),
      add: (name: string, dur: number, desc?: string) => record(ctx, name, dur, desc),
    };
    ctx.serverTiming = api;
    if (ctx.locals && typeof ctx.locals === "object") (ctx.locals as Record<string, unknown>).timing = api;

    if (typeof res.writeHead === "function") {
      const original = res.writeHead.bind(res);
      res.writeHead = (...writeArgs: unknown[]) => {
        emit(res, ctx, began);
        return original(...writeArgs);
      };
    }
    return false;
  }) as ServerTimingSurface["middleware"];

  return {
    middleware,
    start,
    end,
    record,
    header: renderServerTiming,
    onResponse(info = {}) {
      if ("res" in info && "req" in info && "startedAt" in info) emit(info.res as AnyRes, info as AnyCtx);
      else emit((info as { res?: AnyRes; ctx?: AnyCtx }).res, (info as { ctx?: AnyCtx }).ctx);
    },
  };
}

// ── Trace Context ────────────────────────────────────────────────────────────

export type TraceFlags = 0 | 1;
export type TraceCtx = {
  traceId: string;
  spanId: string;
  flags: TraceFlags;
  state?: string;
};

export type ParsedTraceparent = {
  version: string;
  traceId: string;
  parentId: string;
  flags: string;
  sampled: boolean;
};

export type TracestateMember = { key: string; value: string };

const HEX2 = /^[0-9a-f]{2}$/;
const HEX16 = /^[0-9a-f]{16}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const ZERO16 = "0".repeat(16);
const ZERO32 = "0".repeat(32);

export function newTraceId(): string {
  let id = randomBytes(16).toString("hex");
  if (id === ZERO32) id = `${ZERO32.slice(0, -1)}1`;
  return id;
}

export function newSpanId(): string {
  let id = randomBytes(8).toString("hex");
  if (id === ZERO16) id = `${ZERO16.slice(0, -1)}1`;
  return id;
}

export function parseTraceparent(value: unknown): ParsedTraceparent | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().toLowerCase().split("-");
  if (parts.length < 4) return null;
  const [version, traceId, parentId, flags] = parts;
  if (!version || !traceId || !parentId || !flags) return null;
  if (!HEX2.test(version) || version === "ff") return null;
  if (version === "00" && parts.length !== 4) return null;
  if (!HEX32.test(traceId) || traceId === ZERO32) return null;
  if (!HEX16.test(parentId) || parentId === ZERO16) return null;
  if (!HEX2.test(flags)) return null;
  return { version, traceId, parentId, flags, sampled: (parseInt(flags, 16) & 1) === 1 };
}

export function formatTraceparent({
  traceId,
  spanId,
  flags,
  sampled,
}: {
  traceId: string;
  spanId: string;
  flags?: string;
  sampled?: boolean;
}): string {
  const renderedFlags = flags !== undefined ? String(flags).padStart(2, "0").slice(-2) : sampled ? "01" : "00";
  return `00-${traceId}-${spanId}-${renderedFlags}`;
}

export function parseTracestate(value: unknown): TracestateMember[] {
  if (typeof value !== "string" || !value.trim()) return [];
  const out: TracestateMember[] = [];
  for (const raw of value.split(",")) {
    const member = raw.trim();
    const eq = member.indexOf("=");
    if (eq <= 0) continue;
    const key = member.slice(0, eq).trim();
    const val = member.slice(eq + 1).trim();
    if (!key || !val) continue;
    out.push({ key, value: val });
    if (out.length >= 32) break;
  }
  return out;
}

export function formatTracestate(members: TracestateMember[] | Record<string, string | number | boolean | undefined>): string {
  const list = Array.isArray(members)
    ? members
    : Object.entries(members ?? {}).map(([key, value]) => ({ key, value: value === undefined ? "" : String(value) }));
  return list
    .filter((member) => member.key && member.value !== "")
    .slice(0, 32)
    .map((member) => `${member.key}=${member.value}`)
    .join(",");
}

function withVendor(members: TracestateMember[], key: string | undefined, value: string): TracestateMember[] {
  if (!key) return members;
  return [{ key, value }, ...members.filter((member) => member.key !== key)].slice(0, 32);
}

export type TraceObject = {
  traceId: string;
  spanId: string;
  parentId: string | null;
  sampled: boolean;
  flags: string;
  version: string;
  tracestate: TracestateMember[];
  traceparent(): string;
  propagationHeaders(extra?: Record<string, string>): Record<string, string>;
  child(): {
    traceId: string;
    spanId: string;
    parentId: string;
    sampled: boolean;
    flags: string;
    traceparent(): string;
  };
};

export type TraceContextOptions = {
  trustIncoming?: boolean | ((req: AnyReq, ctx: AnyCtx) => boolean);
  sampler?: (incoming: ParsedTraceparent | null, req: AnyReq, ctx: AnyCtx) => boolean;
  vendor?: string;
  respond?: boolean;
  headerName?: string;
  forceSample?: boolean;
  sampleRate?: number;
  localsKey?: string;
};

export function traceObjectOf(ctx: AnyCtx, key: string | symbol = TRACE_OBJECT): TraceObject | undefined {
  return ctx[key] as TraceObject | undefined;
}

export function traceContext(options: TraceContextOptions = {}): Middleware & ((req: AnyReq, res: AnyRes, ctx: AnyCtx) => false) {
  const store = new UtteranceLog();
  const trustIncoming = options.trustIncoming ?? true;
  const trust = typeof trustIncoming === "function" ? trustIncoming : () => Boolean(trustIncoming);
  const respond = options.respond ?? true;
  const responseHeader = (options.headerName ?? "traceresponse").toLowerCase();
  const localsKey = options.localsKey ?? "traceContext";
  const sampleRate = options.sampleRate ?? 1;

  return ((...args: [Context] | [AnyReq, AnyRes, AnyCtx]) => {
    const { req, res, ctx } = partsFromArgs(args);
    const rawTraceparent = Array.isArray(req.headers.traceparent) ? req.headers.traceparent[0] : req.headers.traceparent;
    const incoming = parseTraceparent(rawTraceparent);
    const rawTracestate = Array.isArray(req.headers.tracestate) ? req.headers.tracestate.join(",") : req.headers.tracestate;
    const tracestate = parseTracestate(rawTracestate);

    let traceId: string;
    let parentId: string | null;
    let sampled: boolean;
    let version = "00";
    if (incoming && trust(req, ctx)) {
      traceId = incoming.traceId;
      parentId = incoming.parentId;
      sampled = incoming.sampled;
      version = incoming.version;
    } else {
      traceId = newTraceId();
      parentId = null;
      sampled = options.sampler ? Boolean(options.sampler(incoming, req, ctx)) : incoming ? incoming.sampled : Math.random() < sampleRate;
    }
    if (options.forceSample) sampled = true;
    const spanId = newSpanId();
    const flags = sampled ? "01" : "00";

    const trace: TraceObject = {
      traceId,
      spanId,
      parentId,
      sampled,
      flags: sampled ? "01" : flags,
      version,
      tracestate,
      traceparent() { return formatTraceparent({ traceId, spanId, flags: this.flags }); },
      propagationHeaders(extra) {
        const members = withVendor(tracestate, options.vendor, spanId);
        const headers: Record<string, string> = { traceparent: formatTraceparent({ traceId, spanId, flags: this.flags }) };
        const renderedState = formatTracestate(members);
        if (renderedState) headers.tracestate = renderedState;
        return { ...headers, ...(extra ?? {}) };
      },
      child() {
        const childSpan = newSpanId();
        return {
          traceId,
          spanId: childSpan,
          parentId: spanId,
          sampled,
          flags: this.flags,
          traceparent() { return formatTraceparent({ traceId, spanId: childSpan, flags: this.flags }); },
        };
      },
    };

    ctx[TRACE_OBJECT] = trace;
    if (ctx.locals && typeof ctx.locals === "object") (ctx.locals as Record<string, unknown>)[localsKey] = {
      traceId,
      spanId,
      flags: sampled ? 1 : 0,
      ...(rawTracestate !== undefined ? { state: String(rawTracestate) } : {}),
    } satisfies TraceCtx;
    if (respond && !res.headersSent) {
      try { res.setHeader(responseHeader, trace.traceparent()); } catch {}
    }

    witness(store, { subject: traceId, predicate: "trace", object: spanId }, [true, false]); // store append order is the trace
    return false;
  }) as Middleware & ((req: AnyReq, res: AnyRes, ctx: AnyCtx) => false);
}

export function propagationHeaders(tc: TraceCtx | TraceObject): Record<string, string> {
  if ("propagationHeaders" in tc) return tc.propagationHeaders();
  const headers: Record<string, string> = { traceparent: formatTraceparent({ traceId: tc.traceId, spanId: tc.spanId, sampled: tc.flags === 1 }) };
  if (tc.state) headers.tracestate = tc.state;
  return headers;
}

// ── OpenTelemetry-ish span middleware retained from the current package ──────

export type SpanAttributes = Record<string, string | number | boolean>;
export type Span = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startMs: number;
  endMs?: number;
  attributes: SpanAttributes;
  status: "unset" | "ok" | "error";
  end(attrs?: SpanAttributes): void;
};
export type SpanExporter = (span: Span) => void;
export type SpanOptions = { exporter?: SpanExporter; localsKey?: string };

export function span(name: string, opts: SpanOptions = {}): Middleware {
  const localsKey = opts.localsKey ?? "trace";
  return (ctx) => {
    const tc = ctx.locals[localsKey] as TraceCtx | undefined;
    const parentSpanId = tc?.spanId;
    const current: Span = {
      traceId: tc?.traceId ?? ZERO32,
      spanId: newSpanId(),
      ...(parentSpanId !== undefined ? { parentSpanId } : {}),
      name,
      startMs: Date.now(), // law-allow: wall-clock-as-data — span start is duration telemetry testimony (W3C trace context)
      attributes: { "http.method": ctx.req.method ?? "GET", "http.url": ctx.url.href },
      status: "unset",
      end(attrs = {}) {
        this.endMs = Date.now(); // law-allow: wall-clock-as-data — span end is duration telemetry testimony (W3C trace context)
        Object.assign(this.attributes, attrs, { "http.status_code": ctx.res.statusCode });
        this.status = ctx.res.statusCode < 500 ? "ok" : "error";
        opts.exporter?.(this);
      },
    };
    ctx.locals.span = current;
    const originalEnd = ctx.res.end.bind(ctx.res);
    (ctx.res as unknown as { end: (...args: unknown[]) => unknown }).end = function patchedEnd(...args: unknown[]) {
      if (!current.endMs) current.end();
      return (originalEnd as (...args: unknown[]) => unknown)(...args);
    };
  };
}

// ── Correlation ID ───────────────────────────────────────────────────────────

const REQUEST_ID_HEADERS = ["x-request-id", "x-correlation-id", "x-amzn-trace-id", "x-amz-request-id"];

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[\x21-\x7e]{1,200}$/.test(value);
}

export type CorrelationIdOptions = {
  header?: string;
  headerName?: string;
  headerNames?: string[];
  generate?: (req?: AnyReq, ctx?: AnyCtx) => string;
  trustIncoming?: boolean | ((req: AnyReq, ctx: AnyCtx) => boolean);
  trustProxy?: boolean;
  localsKey?: string;
  echo?: boolean;
};

export function correlationId(options: CorrelationIdOptions = {}): Middleware & ((req: AnyReq, res: AnyRes, ctx: AnyCtx) => false) {
  const headerName = (options.headerName ?? options.header ?? "x-request-id").toLowerCase();
  const reads = (options.headerNames?.length ? options.headerNames : REQUEST_ID_HEADERS).map((header) => header.toLowerCase());
  const trustIncoming = options.trustIncoming ?? options.trustProxy ?? true;
  const trust = typeof trustIncoming === "function" ? trustIncoming : () => Boolean(trustIncoming);
  const generate = options.generate ?? (() => randomUUID());
  const localsKey = options.localsKey ?? "requestId";
  const echo = options.echo ?? true;

  return ((...args: [Context] | [AnyReq, AnyRes, AnyCtx]) => {
    const { req, res, ctx } = partsFromArgs(args);
    let id: string | undefined;
    if (trust(req, ctx)) {
      for (const header of reads) {
        const value = req.headers[header];
        const candidate = Array.isArray(value) ? value[0] : value;
        if (validId(candidate)) { id = candidate; break; }
      }
    }
    id ??= String(generate(req, ctx));
    ctx.requestId = id;
    if (ctx.locals && typeof ctx.locals === "object") (ctx.locals as Record<string, unknown>)[localsKey] = id;
    req.id = id;
    if (echo && !res.headersSent) {
      try { res.setHeader(headerName, id); } catch {}
    }
    return false;
  }) as Middleware & ((req: AnyReq, res: AnyRes, ctx: AnyCtx) => false);
}
