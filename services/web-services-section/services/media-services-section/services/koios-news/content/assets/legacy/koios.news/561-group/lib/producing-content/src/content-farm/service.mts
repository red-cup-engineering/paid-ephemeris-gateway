/**
 * service — ContentFarmService: the cultivation machinery bound to
 * transports, persistent form. A farm is configured with properties; each
 * tick() runs one witnessed farm cycle — per property, a demand pull
 * (when the property configures a Search Console source) followed by one
 * cultivation — and appends it to an in-memory cycle trace ordered by
 * cycle ordinals, never by wall-clock. The durable truth is each
 * property's run trace (runs.jsonl) and its draft-true candidates.
 *
 * tick() is the primary, witness-driven advance; start() installs a
 * polling fallback only. The HTTP surface (`service.app`, served by the
 * CLI on 127.0.0.1) exposes GET /healthz, GET /runs.json, and
 * GET /compost.json. The ask computing is NEVER exposed over HTTP.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { jsonResource, type JsonValue } from "@emsenn/relating/writing";
import { fetchSearchConsoleDemand } from "../computer/demand.mjs";
import type { FetchLike } from "@emsenn/content/syndication";

import { compost, cultivate, replayRuns, type Ask, type CultivationJudgment, type FarmHub } from "./cultivate.mjs";
import { producingContentCycle, type ProducingContentCycle } from "./producing-content.mjs";
import { normalizeFarmProperty, runsPath, searchConsolePath, type FarmProperty } from "./property.mjs";
import type { ViewCountsReading } from "./demand.mjs";

// ---------- configuration ----------

export type ContentFarmConfig = Readonly<{
  name: string;
  port: number;
  properties: readonly FarmProperty[];
  intervalSeconds?: number;
}>;

export type ContentFarmServiceOptions = Readonly<{
  fetchImpl?: FetchLike;
  ask?: Ask;
  env?: Readonly<Record<string, string | undefined>>;
  hub?: FarmHub;
  views?: ViewCountsReading;
  /** Polling-fallback period; overrides config.intervalSeconds. */
  intervalMs?: number;
  /** ISO-instant supplier; the boundary's clock, injected for tests. */
  now?: () => string;
}>;

export function contentFarmConfigFromDocument(document: unknown): ContentFarmConfig {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new TypeError("content-farm config document must be an object");
  }
  return normalizeContentFarmConfig(document, "content-farm config");
}

export function normalizeContentFarmConfig(input: unknown, path = "content-farm config"): ContentFarmConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${path} must be an object`);
  }
  const record = input as Record<string, unknown>;
  if (!Array.isArray(record.properties)) throw new TypeError(`${path}.properties must be an array`);
  return Object.freeze({
    name: requiredString(record.name, `${path}.name`),
    port: requiredPort(record.port, `${path}.port`),
    properties: Object.freeze(record.properties.map((entry, index) => normalizeFarmProperty(entry, `${path}.properties[${index}]`))),
    ...(optionalPositiveInteger(record.intervalSeconds, `${path}.intervalSeconds`) === undefined
      ? {}
      : { intervalSeconds: optionalPositiveInteger(record.intervalSeconds, `${path}.intervalSeconds`)! }),
  });
}

// ---------- cycle carriers ----------

export type DemandPullWitness = Readonly<{
  kind: "content.farm.demand-pull:witness";
  property: string;
  queries: number;
  path: string;
}>;

export type DemandPullObstruction = Readonly<{
  kind: "content.farm.demand-pull:obstruction";
  property: string;
  detail: string;
}>;

export type DemandPullJudgment = DemandPullWitness | DemandPullObstruction;

/** A cultivation that could not even begin (e.g. no ask provider keyed):
 * what stood in the way, as a value. */
export type FarmRunObstruction = Readonly<{
  kind: "content.farm.run-obstruction";
  property: string;
  reason: string;
}>;

export type FarmReading = Readonly<{
  kind: "content.farm.reading";
  property: string;
  demand?: DemandPullJudgment;
  run: CultivationJudgment | FarmRunObstruction;
}>;

export type FarmCycle = Readonly<{
  kind: "content.farm.cycle";
  ordinal: bigint;
  readings: readonly FarmReading[];
  /** The cycle as produced content: property readings glued by organizing. */
  readonly producing: ProducingContentCycle;
}>;

export type FarmCycleReading = Readonly<{
  kind: "content.farm.cycle.reading";
  ordinal: string;
  readings: readonly FarmReading[];
  producing: JsonValue;
}>;

export type ContentFarmSnapshot = Readonly<{
  kind: "content.farm.service.snapshot";
  name: string;
  port: number;
  propertyCount: number;
  /** Cycle ordinals issued so far — the service's clock. */
  cycles: bigint;
  running: boolean;
  /** Telemetry testimony only; ordering lives in the cycle ordinals. */
  lastCycleAt: string | null;
}>;

// ---------- the service ----------

function dayOf(instant: string): string {
  return instant.slice(0, 10);
}

/** JSON-facing projection of a cycle, preserving the producing-content carrier. */
export function farmCycleReading(cycle: FarmCycle): FarmCycleReading {
  return Object.freeze({
    kind: "content.farm.cycle.reading" as const,
    ordinal: cycle.ordinal.toString(),
    readings: cycle.readings,
    producing: jsonResource(cycle.producing, "content farm cycle producing reading"),
  });
}

export class ContentFarmService {
  readonly kind = "content.farm.service";
  readonly config: ContentFarmConfig;
  #options: ContentFarmServiceOptions;
  #trace: FarmCycle[] = [];
  #ordinal = 0n;
  #inflight: Promise<FarmCycle> | null = null;
  #lastCycleAt: string | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ContentFarmConfig, options: ContentFarmServiceOptions = {}) {
    this.config = normalizeContentFarmConfig(config);
    this.#options = options;
  }

  /** The in-memory cycle trace, as accumulated so far. */
  cycles(): readonly FarmCycle[] {
    return Object.freeze([...this.#trace]);
  }

  /**
   * The primary, witness-driven advance: run one farm cycle — per
   * property, demand pull (if configured) then cultivation — and append
   * it to the trace. Obstructions are judgments inside the cycle, never
   * throws. Concurrent callers share the in-flight cycle.
   */
  async tick(): Promise<FarmCycle> {
    if (this.#inflight !== null) return this.#inflight;
    this.#inflight = this.#cycle().finally(() => {
      this.#inflight = null;
    });
    return this.#inflight;
  }

  async #cycle(): Promise<FarmCycle> {
    const ordinal = this.#ordinal;
    this.#ordinal += 1n;
    const at = (this.#options.now ?? (() => new Date().toISOString()))(); // law-allow: wall-clock-as-data — the tick boundary's testimony of when, recorded on runs; the cycle ordinal is the order
    const readings: FarmReading[] = [];
    for (const property of this.config.properties) {
      readings.push(await this.#cultivateOne(property, at));
    }
    const producing = producingContentCycle({
      identity: this.config.name,
      ordinal,
      readings,
    });
    const cycle: FarmCycle = Object.freeze({
      kind: "content.farm.cycle" as const,
      ordinal,
      readings: Object.freeze(readings),
      producing,
    });
    this.#trace.push(cycle);
    this.#lastCycleAt = at;
    return cycle;
  }

  async #cultivateOne(property: FarmProperty, at: string): Promise<FarmReading> {
    const demand = property.demand === undefined ? undefined : await this.#pullDemand(property, at);
    let run: CultivationJudgment | FarmRunObstruction;
    try {
      run = await cultivate(property, {
        at: dayOf(at),
        ...(this.#options.ask === undefined ? {} : { ask: this.#options.ask }),
        ...(this.#options.fetchImpl === undefined ? {} : { fetchImpl: this.#options.fetchImpl }),
        ...(this.#options.env === undefined ? {} : { env: this.#options.env }),
        ...(this.#options.hub === undefined ? {} : { hub: this.#options.hub }),
        ...(this.#options.views === undefined ? {} : { views: this.#options.views }),
      });
    } catch (error) {
      run = Object.freeze({
        kind: "content.farm.run-obstruction" as const,
        property: property.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    return Object.freeze({
      kind: "content.farm.reading" as const,
      property: property.name,
      ...(demand === undefined ? {} : { demand }),
      run,
    });
  }

  async #pullDemand(property: FarmProperty, at: string): Promise<DemandPullJudgment> {
    const demand = property.demand!;
    const endMs = Date.parse(at);
    if (Number.isNaN(endMs)) {
      return Object.freeze({ kind: "content.farm.demand-pull:obstruction" as const, property: property.name, detail: `unreadable instant "${at}"` });
    }
    const days = demand.days ?? 28;
    const startDate = dayOf(new Date(endMs - days * 86_400_000).toISOString());
    const endDate = dayOf(at);
    try {
      const judgment = await fetchSearchConsoleDemand({
        property: demand.property,
        startDate,
        endDate,
        ...(demand.keyFile === undefined ? {} : { keyFile: demand.keyFile }),
        ...(this.#options.fetchImpl === undefined ? {} : { fetchImpl: this.#options.fetchImpl }),
        now: () => Math.floor(endMs / 1000),
      });
      if (judgment.kind === "content.demand.search-console-obstruction") {
        return Object.freeze({ kind: "content.farm.demand-pull:obstruction" as const, property: property.name, detail: `${judgment.at}: ${judgment.detail}` });
      }
      const path = searchConsolePath(property);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify({
        property: judgment.property,
        startDate: judgment.startDate,
        endDate: judgment.endDate,
        queries: judgment.queries.map((entry) => ({ query: entry.query, impressions: entry.impressions, clicks: entry.clicks })),
      })}\n`, "utf8");
      return Object.freeze({ kind: "content.farm.demand-pull:witness" as const, property: property.name, queries: judgment.queries.length, path });
    } catch (error) {
      return Object.freeze({ kind: "content.farm.demand-pull:obstruction" as const, property: property.name, detail: error instanceof Error ? error.message : String(error) });
    }
  }

  /** Install the polling fallback. tick() remains the primary advance. */
  start(): void {
    if (this.#timer !== null) return;
    const intervalMs = this.#options.intervalMs ?? (this.config.intervalSeconds ?? 86_400) * 1000;
    this.#timer = setInterval(() => { // law-allow: polling-fallback — the interval only falls back to tick(); tick() is the witness-driven advance and the cycle ordinal is the clock
      void this.tick().catch(() => {});
    }, intervalMs);
    this.#timer.unref?.();
  }

  stop(): void {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
  }

  snapshot(): ContentFarmSnapshot {
    return Object.freeze({
      kind: "content.farm.service.snapshot" as const,
      name: this.config.name,
      port: this.config.port,
      propertyCount: this.config.properties.length,
      cycles: this.#ordinal,
      running: this.#inflight !== null,
      lastCycleAt: this.#lastCycleAt,
    });
  }

  /** The run traces, replayed from disk — the trace is the truth. */
  runsReading(): Readonly<{ properties: readonly Readonly<{ name: string; runs: readonly Readonly<Record<string, unknown>>[] }>[] }> {
    return Object.freeze({
      properties: Object.freeze(this.config.properties.map((property) => Object.freeze({
        name: property.name,
        runs: replayRuns(runsPath(property)),
      }))),
    });
  }

  /** The compost, read out of the run traces. */
  compostReading(): Readonly<{ properties: readonly Readonly<{ name: string; compost: readonly Readonly<Record<string, unknown>>[] }>[] }> {
    return Object.freeze({
      properties: Object.freeze(this.config.properties.map((property) => Object.freeze({
        name: property.name,
        compost: compost(replayRuns(runsPath(property))),
      }))),
    });
  }

}

export function createContentFarmService(config: ContentFarmConfig, options: ContentFarmServiceOptions = {}): ContentFarmService {
  return new ContentFarmService(config, options);
}

// ---------- admission helpers ----------

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function requiredPort(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 65_535) throw new TypeError(`${path} must be a TCP port`);
  return value;
}

function optionalPositiveInteger(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new TypeError(`${path} must be a positive integer`);
  return value;
}
