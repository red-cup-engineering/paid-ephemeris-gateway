// observability/metrics.ts — Prometheus text exposition and minimal OTLP-shaped spans.
import { randomBytes } from "node:crypto";
import type { Context, Middleware, Resource } from "../types.mjs";

export const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

type LabelSet = Record<string, string | number | boolean | null | undefined>;
type PickedLabels = Record<string, string>;

type CounterFamily = {
  name: string;
  type: "counter";
  help: string;
  labelNames: string[];
  series: Map<string, { labels: PickedLabels; value: number }>;
};

type GaugeFamily = {
  name: string;
  type: "gauge";
  help: string;
  labelNames: string[];
  series: Map<string, { labels: PickedLabels; value: number }>;
};

type HistogramFamily = {
  name: string;
  type: "histogram";
  help: string;
  labelNames: string[];
  buckets: number[];
  series: Map<string, { labels: PickedLabels; counts: number[]; sum: number; count: number }>;
};

type MetricFamily = CounterFamily | GaugeFamily | HistogramFamily;

function escapeLabelValue(value: unknown): string {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function escapeHelp(text: string): string {
  return String(text).replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

function labelSet(labels: LabelSet): string {
  const keys = Object.keys(labels).filter((key) => labels[key] !== undefined && labels[key] !== null).sort();
  if (!keys.length) return "";
  return `{${keys.map((key) => `${key}="${escapeLabelValue(labels[key])}"`).join(",")}}`;
}

function formatNumber(value: number): string {
  if (value === Infinity) return "+Inf";
  if (value === -Infinity) return "-Inf";
  if (Number.isNaN(value)) return "NaN";
  return String(value);
}

function keyOf(labels: PickedLabels): string {
  return Object.keys(labels).sort().map((key) => `${key}=${labels[key]}`).join("\0");
}

function pickLabels(labelNames: readonly string[], labels: LabelSet = {}): PickedLabels {
  const picked: PickedLabels = {};
  for (const name of labelNames) picked[name] = String(labels[name] ?? "");
  return picked;
}

export class Counter {
  family: CounterFamily;
  constructor(family: CounterFamily) {
    this.family = family;
  }
  get name(): string { return this.family.name; }
  get help(): string { return this.family.help; }
  get labelNames(): string[] { return this.family.labelNames; }

  inc(labels: LabelSet = {}, delta = 1): void {
    if (delta < 0) throw new Error("counter cannot decrease");
    const picked = pickLabels(this.family.labelNames, labels);
    const key = keyOf(picked);
    const series = this.family.series.get(key);
    if (series) series.value += delta;
    else this.family.series.set(key, { labels: picked, value: delta });
  }

  get(labels: LabelSet = {}): number {
    return this.family.series.get(keyOf(pickLabels(this.family.labelNames, labels)))?.value ?? 0;
  }

  collect(): string {
    return renderFamily(this.family);
  }
}

export class Gauge {
  family: GaugeFamily;
  constructor(family: GaugeFamily) {
    this.family = family;
  }
  get name(): string { return this.family.name; }
  get help(): string { return this.family.help; }
  get labelNames(): string[] { return this.family.labelNames; }

  private at(labels: LabelSet = {}): { labels: PickedLabels; value: number } {
    const picked = pickLabels(this.family.labelNames, labels);
    const key = keyOf(picked);
    let series = this.family.series.get(key);
    if (!series) {
      series = { labels: picked, value: 0 };
      this.family.series.set(key, series);
    }
    return series;
  }

  set(labels: LabelSet = {}, value: number): void { this.at(labels).value = value; }
  inc(labels: LabelSet = {}, delta = 1): void { this.at(labels).value += delta; }
  dec(labels: LabelSet = {}, delta = 1): void { this.at(labels).value -= delta; }
  get(labels: LabelSet = {}): number {
    return this.family.series.get(keyOf(pickLabels(this.family.labelNames, labels)))?.value ?? 0;
  }
  collect(): string { return renderFamily(this.family); }
}

export class Histogram {
  family: HistogramFamily;
  constructor(family: HistogramFamily) {
    this.family = family;
  }
  get name(): string { return this.family.name; }
  get help(): string { return this.family.help; }
  get labelNames(): string[] { return this.family.labelNames; }

  private at(labels: LabelSet = {}): { labels: PickedLabels; counts: number[]; sum: number; count: number } {
    const picked = pickLabels(this.family.labelNames, labels);
    const key = keyOf(picked);
    let series = this.family.series.get(key);
    if (!series) {
      series = { labels: picked, counts: new Array(this.family.buckets.length).fill(0), sum: 0, count: 0 };
      this.family.series.set(key, series);
    }
    return series;
  }

  observe(labels: LabelSet = {}, value: number): void {
    const series = this.at(labels);
    series.count += 1;
    series.sum += value;
    for (let i = 0; i < this.family.buckets.length; i++) {
      if (value <= this.family.buckets[i]!) series.counts[i] = (series.counts[i] ?? 0) + 1;
    }
  }

  get(labels: LabelSet = {}): { labels: PickedLabels; counts: number[]; sum: number; count: number } | undefined {
    return this.family.series.get(keyOf(pickLabels(this.family.labelNames, labels)));
  }

  collect(): string { return renderFamily(this.family); }
}

function renderFamily(family: MetricFamily): string {
  const lines: string[] = [];
  if (family.help) lines.push(`# HELP ${family.name} ${escapeHelp(family.help)}`);
  lines.push(`# TYPE ${family.name} ${family.type}`);

  if (family.type === "histogram") {
    for (const series of family.series.values()) {
      for (let i = 0; i < family.buckets.length; i++) {
        lines.push(`${family.name}_bucket${labelSet({ ...series.labels, le: formatNumber(family.buckets[i]!) })} ${series.counts[i]}`);
      }
      lines.push(`${family.name}_bucket${labelSet({ ...series.labels, le: "+Inf" })} ${series.count}`);
      lines.push(`${family.name}_sum${labelSet(series.labels)} ${formatNumber(series.sum)}`);
      lines.push(`${family.name}_count${labelSet(series.labels)} ${series.count}`);
    }
    return lines.join("\n");
  }

  for (const series of family.series.values()) {
    lines.push(`${family.name}${labelSet(series.labels)} ${formatNumber(series.value)}`);
  }
  return lines.join("\n");
}

export class MetricsRegistry {
  readonly families = new Map<string, MetricFamily>();
  readonly render: (() => string) & { contentType: string };

  constructor() {
    this.render = Object.assign(() => this.collect(), {
      contentType: "text/plain; version=0.0.4; charset=utf-8",
    });
  }

  registerFamily(name: string, type: MetricFamily["type"], help: string, labelNames: string[] = [], buckets = DEFAULT_BUCKETS): MetricFamily {
    const existing = this.families.get(name);
    if (existing) {
      if (existing.type !== type) throw new Error(`metric ${name} already registered as ${existing.type}`);
      return existing;
    }
    const family: MetricFamily = type === "histogram"
      ? {
          name,
          type,
          help,
          labelNames,
          buckets: [...new Set(buckets.filter((bucket) => Number.isFinite(bucket)))].sort((a, b) => a - b),
          series: new Map(),
        }
      : { name, type, help, labelNames, series: new Map() };
    this.families.set(name, family);
    return family;
  }

  counter(name: string, help: string, labelNames: string[] = []): Counter {
    return new Counter(this.registerFamily(name, "counter", help, labelNames) as CounterFamily);
  }

  gauge(name: string, help: string, labelNames: string[] = []): Gauge {
    return new Gauge(this.registerFamily(name, "gauge", help, labelNames) as GaugeFamily);
  }

  histogram(name: string, help: string, labelNames: string[] = [], buckets = DEFAULT_BUCKETS): Histogram {
    return new Histogram(this.registerFamily(name, "histogram", help, labelNames, buckets) as HistogramFamily);
  }

  collect(): string {
    const blocks = [...this.families.values()].map((family) => renderFamily(family));
    return blocks.join("\n") + (blocks.length ? "\n" : "");
  }

  reset(): void {
    for (const family of this.families.values()) family.series.clear();
  }

  scrapeHandler(): (ctx: Context) => Promise<void> {
    return async (ctx) => {
      ctx.res.setHeader("Content-Type", this.render.contentType);
      ctx.res.writeHead(200).end(this.render());
    };
  }
}

export function registry(): MetricsRegistry {
  return new MetricsRegistry();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEXLONG_RE = /^[0-9a-f]{16,}$/i;
const NUM_RE = /^\d+$/;

export function normalizeRoute(ctx?: Partial<Context> & Record<string, unknown>, req?: { url?: string | undefined }): string {
  const explicit = ctx?.route ?? ctx?.matchedRoute ?? ctx?.routeTemplate;
  if (typeof explicit === "string" && explicit) return explicit;

  const raw = typeof ctx?.path === "string"
    ? ctx.path
    : (() => {
        try { return new URL(req?.url ?? ctx?.url?.pathname ?? "/", "http://x/").pathname; }
        catch { return req?.url ?? "/"; }
      })();
  if (raw === "/" || raw === "") return "/";

  const route = raw.split("/").map((segment) => {
    if (!segment) return segment;
    if (NUM_RE.test(segment)) return ":id";
    if (UUID_RE.test(segment)) return ":uuid";
    if (HEXLONG_RE.test(segment)) return ":hash";
    return segment;
  }).join("/");
  return route || "/";
}

type ResponseInfo = Context | {
  req?: Context["req"];
  res?: Context["res"];
  ctx?: Partial<Context> & Record<string, unknown>;
  status?: number;
  ms?: number;
};

function responseParts(info: ResponseInfo): {
  req: Context["req"];
  res: Context["res"];
  ctx: Partial<Context> & Record<string, unknown>;
  status: number;
  ms: number;
} {
  if ("req" in info && "res" in info && "startedAt" in info) {
    return {
      req: info.req,
      res: info.res,
      ctx: info,
      status: info.res.statusCode,
      ms: Date.now() - info.startedAt, // law-allow: wall-clock-as-data — request duration telemetry testimony
    };
  }
  const shaped = info as Exclude<ResponseInfo, Context>;
  const req = shaped.req ?? shaped.ctx?.req;
  const res = shaped.res ?? shaped.ctx?.res;
  if (!req || !res) throw new Error("metrics response info requires req and res");
  const startedAt = typeof shaped.ctx?.startedAt === "number" ? shaped.ctx.startedAt : Date.now(); // law-allow: wall-clock-as-data — request duration telemetry testimony (fallback start)
  return {
    req,
    res,
    ctx: shaped.ctx ?? {},
    status: shaped.status ?? res.statusCode,
    ms: shaped.ms ?? Date.now() - startedAt, // law-allow: wall-clock-as-data — request duration telemetry testimony
  };
}

function nowNanos(): bigint {
  return BigInt(Date.now()) * 1_000_000n + (process.hrtime.bigint() % 1_000_000n); // law-allow: wall-clock-as-data — metric sample timestamp is telemetry testimony (OTLP nanos)
}

const NOOP_EXPORTER = (): void => {};

export type OtelSpan = {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  kind: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  durationNanos: string;
  attributes: Record<string, unknown>;
  status: unknown;
};

export function span({
  name,
  attrs = {},
  kind = "INTERNAL",
  traceId,
  parentSpanId,
  exporter = NOOP_EXPORTER,
}: {
  name?: string;
  attrs?: Record<string, unknown>;
  kind?: string;
  traceId?: string;
  parentSpanId?: string;
  exporter?: (span: OtelSpan) => void;
} = {}): {
  spanId: string;
  traceId: string;
  setAttribute(key: string, value: unknown): void;
  setStatus(status: unknown): void;
  end(endAttrs?: Record<string, unknown>): OtelSpan | null;
} {
  const tid = traceId ?? randomBytes(16).toString("hex");
  const sid = randomBytes(8).toString("hex");
  const startTime = nowNanos();
  const attributes = { ...attrs };
  let status: unknown = { code: "UNSET" };
  let ended = false;

  return {
    spanId: sid,
    traceId: tid,
    setAttribute(key, value) { attributes[key] = value; },
    setStatus(next) { status = typeof next === "string" ? { code: next } : next; },
    end(endAttrs) {
      if (ended) return null;
      ended = true;
      if (endAttrs) Object.assign(attributes, endAttrs);
      const endTime = nowNanos();
      const out: OtelSpan = {
        name: name ?? "span",
        traceId: tid,
        spanId: sid,
        ...(parentSpanId !== undefined ? { parentSpanId } : {}),
        kind,
        startTimeUnixNano: String(startTime),
        endTimeUnixNano: String(endTime),
        durationNanos: String(endTime - startTime),
        attributes,
        status,
      };
      exporter(out);
      return out;
    },
  };
}

export type MetricsOptions = {
  registry?: MetricsRegistry;
  buckets?: number[];
  exporter?: (span: OtelSpan) => void;
};

export function metrics(options: MetricsOptions = {}): {
  registry: MetricsRegistry;
  middleware: Middleware;
  onResponse(info: ResponseInfo): void;
  resource: Resource;
  span(options?: Parameters<typeof span>[0]): ReturnType<typeof span>;
} {
  const reg = options.registry ?? registry();
  const total = reg.counter("http_requests_total", "Total HTTP requests.", ["method", "route", "status"]);
  const duration = reg.histogram("http_request_duration_seconds", "HTTP request duration.", ["method", "route"], options.buckets);
  const inFlight = reg.gauge("http_requests_in_flight", "In-flight HTTP requests.");
  inFlight.set({}, 0);

  const middleware: Middleware = (ctx) => {
    if (ctx.url?.pathname === "/metrics") return;
    let settled = false;
    inFlight.inc();
    const settle = () => {
      if (settled) return;
      settled = true;
      inFlight.dec();
    };
    ctx.res.on("finish", settle);
    ctx.res.on("close", settle);
  };

  function onResponse(info: ResponseInfo): void {
    const { req, ctx, status, ms } = responseParts(info);
    const method = req.method ?? "GET";
    const route = normalizeRoute(ctx, req);
    total.inc({ method, route, status: String(status) });
    duration.observe({ method, route }, ms / 1000);
  }

  return {
    registry: reg,
    middleware,
    onResponse,
    resource: {
      match: "/metrics",
      methods: ["GET"],
      produces: [reg.render.contentType],
      handler: reg.scrapeHandler(),
    },
    span(spanOptions = {}) {
      const merged = { ...spanOptions };
      if (!merged.exporter && options.exporter) merged.exporter = options.exporter;
      return span(merged);
    },
  };
}

export type RequestMetricsOptions = {
  registry: MetricsRegistry;
  labelFn?: (ctx: Context) => LabelSet;
};

export function requestMetrics(opts: RequestMetricsOptions): Middleware {
  const surface = metrics({ registry: opts.registry });
  return (ctx) => {
    void surface.middleware(ctx);
    ctx.res.on("finish", () => {
      const extra = opts.labelFn?.(ctx) ?? {};
      const route = extra.route === undefined || extra.route === null ? ctx.url.pathname : String(extra.route);
      surface.onResponse({ ctx: { ...ctx, route }, req: ctx.req, res: ctx.res });
    });
  };
}
