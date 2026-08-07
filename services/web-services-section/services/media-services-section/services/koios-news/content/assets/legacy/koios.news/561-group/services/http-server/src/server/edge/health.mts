// edge/health.ts — liveness/readiness/startup probe resources with explicit evidence.
import { compress, decompress, supportedCompressionCodings } from "../compress.mjs";
import { chargeValueFromBits } from "../admission.mjs";
import type { Context, Resource, Repr } from "../types.mjs";
import type { GracefulShutdownHandle } from "../server.mjs";

export type HealthStatus = "pass" | "warn" | "fail";

export type HealthCheckResult =
  | boolean
  | HealthStatus
  | {
      status?: HealthStatus;
      ok?: boolean;
      detail?: string;
      evidence?: readonly string[];
      data?: unknown;
    };

export type HealthCheck = {
  name: string;
  check: (ctx: Context) => HealthCheckResult | Promise<HealthCheckResult>;
};

export type HealthResourceOptions = {
  match?: string;
  id?: string;
  name?: string;
  checks?: readonly HealthCheck[];
  now?: () => Date;
};

export type HealthResourcesOptions = {
  healthPath?: string | false;
  livePath?: string | false;
  readyPath?: string | false;
  startupPath?: string | false;
  health?: readonly HealthCheck[];
  live?: readonly HealthCheck[];
  ready?: readonly HealthCheck[];
  startup?: readonly HealthCheck[];
  now?: () => Date;
};

export type ShutdownReadinessCheckOptions = {
  name?: string;
};

export type TransferCodingHealthCheckOptions = {
  name?: string;
};

type NormalizedHealthCheck = {
  name: string;
  status: HealthStatus;
  charge: string;
  detail?: string;
  evidence: string[];
  data?: unknown;
};

export function healthResource(options: HealthResourceOptions = {}): Resource {
  const match = options.match ?? "/healthz";
  const probeName = options.name ?? ((match.replace(/^\//, "")) || "health");
  return {
    match,
    id: options.id ?? `health.${probeName}`,
    name: options.name ?? "Health",
    methods: ["GET"],
    produces: ["application/health+json", "application/json"],
    handler: async (ctx) => {
      const report = await healthReport(ctx, probeName, options.checks ?? [], options.now ?? (() => new Date())); // law-allow: wall-clock-as-data — injectable clock seam default; callers may pass now; checkedAt is testimony
      const repr: Repr = {
        status: report.status === "fail" ? 503 : 200,
        type: "application/health+json; charset=utf-8",
        cacheControl: { noStore: true },
        body: JSON.stringify(report),
      };
      return repr;
    },
  };
}

export function healthResources(options: HealthResourcesOptions = {}): Resource[] {
  const now = options.now;
  const resources: Resource[] = [];
  if (options.healthPath !== false) {
    resources.push(healthResource({ match: options.healthPath ?? "/healthz", name: "health", checks: options.health ?? [], ...(now ? { now } : {}) }));
  }
  if (options.livePath !== false) {
    resources.push(healthResource({ match: options.livePath ?? "/livez", name: "live", checks: options.live ?? [], ...(now ? { now } : {}) }));
  }
  if (options.readyPath !== false) {
    resources.push(healthResource({ match: options.readyPath ?? "/readyz", name: "ready", checks: options.ready ?? [], ...(now ? { now } : {}) }));
  }
  if (options.startupPath !== false && options.startup !== undefined) {
    resources.push(healthResource({ match: options.startupPath ?? "/startupz", name: "startup", checks: options.startup, ...(now ? { now } : {}) }));
  }
  return resources;
}

export function shutdownReadinessCheck(
  shutdown: GracefulShutdownHandle,
  options: ShutdownReadinessCheckOptions = {},
): HealthCheck {
  const name = options.name ?? "shutdown";
  return {
    name,
    check: () => {
      const state = shutdown.state;
      if (state.phase === "running") {
        return {
          status: "pass",
          evidence: [`${name}:running`],
          data: { phase: state.phase },
        };
      }
      return {
        status: "fail",
        detail: state.phase === "draining" ? "server is draining" : `server is ${state.phase}`,
        evidence: [`${name}:${state.phase}`],
        data: {
          phase: state.phase,
          ...(state.reason !== undefined ? { reason: state.reason } : {}),
          ...(state.signal !== undefined ? { signal: state.signal } : {}),
          ...(state.startedAt !== undefined ? { startedAt: state.startedAt } : {}),
          ...(state.closedAt !== undefined ? { closedAt: state.closedAt } : {}),
          ...(state.error !== undefined ? { error: state.error } : {}),
        },
      };
    },
  };
}

export function transferCodingHealthCheck(options: TransferCodingHealthCheckOptions = {}): HealthCheck {
  const name = options.name ?? "transfer-coding";
  return {
    name,
    check: async () => {
      const codings = supportedCompressionCodings();
      const body = Buffer.from("@emsenn/web-server transfer coding probe");
      const passed: string[] = [];
      for (const coding of codings) {
        const compressed = await compress(body, coding);
        const restored = await decompress(compressed, coding);
        if (!restored.equals(body)) {
          return {
            status: "fail",
            detail: `${coding} did not round-trip`,
            evidence: [`${name}:${coding}:failed`],
            data: { codings, passed },
          };
        }
        passed.push(coding);
      }
      return {
        status: "pass",
        evidence: codings.map((coding) => `${name}:${coding}:available`),
        data: { codings },
      };
    },
  };
}

async function healthReport(
  ctx: Context,
  probeName: string,
  checks: readonly HealthCheck[],
  now: () => Date,
): Promise<{
  status: HealthStatus;
  charge: string;
  checkedAt: string;
  durationMs: number;
  checks: NormalizedHealthCheck[];
}> {
  const started = Date.now(); // law-allow: wall-clock-as-data — health probe duration telemetry
  const normalized: NormalizedHealthCheck[] = [];

  for (const healthCheck of checks) {
    const result = await runCheck(ctx, healthCheck);
    normalized.push({
      name: healthCheck.name,
      status: result.status,
      charge: String(healthCharge(result.status)),
      evidence: result.evidence,
      ...(result.detail !== undefined ? { detail: result.detail } : {}),
      ...(result.data !== undefined ? { data: result.data } : {}),
    });
  }

  const status = aggregateStatus(normalized);
  return {
    status,
    charge: String(healthCharge(status)),
    checkedAt: now().toISOString(),
    durationMs: Math.max(0, Date.now() - started), // law-allow: wall-clock-as-data — health probe duration telemetry
    checks: normalized,
  };
}

async function runCheck(
  ctx: Context,
  healthCheck: HealthCheck,
): Promise<Omit<NormalizedHealthCheck, "name" | "charge">> {
  try {
    return normalizeResult(await healthCheck.check(ctx), healthCheck.name);
  } catch (error) {
    return {
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
      evidence: [`${healthCheck.name}:threw`],
    };
  }
}

function normalizeResult(
  result: HealthCheckResult,
  name: string,
): Omit<NormalizedHealthCheck, "name" | "charge"> {
  if (typeof result === "boolean") {
    return { status: result ? "pass" : "fail", evidence: [`${name}:${result ? "pass" : "fail"}`] };
  }
  if (result === "pass" || result === "warn" || result === "fail") {
    return { status: result, evidence: [`${name}:${result}`] };
  }

  const status = result.status ?? (result.ok === undefined ? "pass" : result.ok ? "pass" : "fail");
  return {
    status,
    evidence: [...(result.evidence ?? [`${name}:${status}`])],
    ...(result.detail !== undefined ? { detail: result.detail } : {}),
    ...(result.data !== undefined ? { data: result.data } : {}),
  };
}

function aggregateStatus(checks: readonly Pick<NormalizedHealthCheck, "status">[]): HealthStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

function healthCharge(status: HealthStatus): ReturnType<typeof chargeValueFromBits> {
  return chargeValueFromBits(status === "pass" || status === "warn", status === "fail" || status === "warn");
}
