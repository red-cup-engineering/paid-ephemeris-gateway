// observability/preset.ts - production observability as a composable App fragment.
import type { App, Context, Middleware, Resource } from "../types.mjs";
import { accessLog, type AccessLogOptions } from "./access-log.mjs";
import {
  metrics,
  type MetricsOptions,
  type MetricsRegistry,
  type OtelSpan,
} from "./metrics.mjs";
import {
  correlationId,
  serverTiming,
  traceContext,
  type CorrelationIdOptions,
  type ServerTimingSurface,
  type TraceContextOptions,
} from "./trace.mjs";

export type ServerTimingOptions = Parameters<typeof serverTiming>[0];

export type ObservabilityMetricsOptions = MetricsOptions & Readonly<{
  /** Mount the Prometheus scrape resource here. Set false to keep metrics internal. */
  path?: string | false;
}>;

export type ObservabilityOptions = Readonly<{
  correlation?: boolean | CorrelationIdOptions;
  trace?: boolean | TraceContextOptions;
  serverTiming?: boolean | ServerTimingOptions;
  metrics?: boolean | ObservabilityMetricsOptions;
  accessLog?: boolean | AccessLogOptions;
}>;

export type ObservabilityPreset = App & {
  metrics?: ReturnType<typeof metrics>;
  registry?: MetricsRegistry;
  serverTiming?: ServerTimingSurface;
  spans?: readonly OtelSpan[];
};

export function observability(options: ObservabilityOptions = {}): ObservabilityPreset {
  const middlewares: Middleware[] = [];
  const resources: Resource[] = [];
  const onResponseHooks: Array<(ctx: Context) => void | Promise<void>> = [];

  if (options.correlation !== false) {
    middlewares.push(correlationId(options.correlation === true || options.correlation === undefined ? {} : options.correlation));
  }

  if (options.trace !== false) {
    middlewares.push(traceContext(options.trace === true || options.trace === undefined ? {} : options.trace));
  }

  const timing = options.serverTiming === false
    ? undefined
    : serverTiming(options.serverTiming === true || options.serverTiming === undefined ? {} : options.serverTiming);
  if (timing) middlewares.push(timing.middleware);

  const metricSurface = options.metrics === false
    ? undefined
    : metrics(metricOptions(options.metrics));
  if (metricSurface) {
    const path = metricPath(options.metrics);
    middlewares.push(metricsMiddleware(metricSurface.middleware, path));
    onResponseHooks.push(metricSurface.onResponse);
    if (path !== false) resources.push(path === metricSurface.resource.match ? metricSurface.resource : {
      ...metricSurface.resource,
      match: path,
    });
  }

  if (options.accessLog !== false && options.accessLog !== undefined) {
    middlewares.push(accessLog(options.accessLog === true ? {} : options.accessLog) as Middleware);
  }

  const app: ObservabilityPreset = {
    middlewares,
    resources,
  };
  if (onResponseHooks.length) {
    app.onResponse = async (ctx) => {
      for (const hook of onResponseHooks) await hook(ctx);
    };
  }
  if (metricSurface) {
    app.metrics = metricSurface;
    app.registry = metricSurface.registry;
  }
  if (timing) app.serverTiming = timing;
  return app;
}

function metricOptions(input: boolean | ObservabilityMetricsOptions | undefined): MetricsOptions {
  if (input === true || input === false || input === undefined) return {};
  const { path: _path, ...rest } = input;
  return rest;
}

function metricPath(input: boolean | ObservabilityMetricsOptions | undefined): string | false {
  if (input === true || input === false || input === undefined) return "/metrics";
  if (input.path === false) return false;
  return input.path ?? "/metrics";
}

function metricsMiddleware(inner: Middleware, scrapePath: string | false): Middleware {
  return (ctx) => {
    if (scrapePath !== false && ctx.url.pathname === scrapePath) return;
    return inner(ctx);
  };
}
