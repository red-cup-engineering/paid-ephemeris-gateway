// platform/scheduler.ts — Cron-style and deferred job scheduler.
//
// Jobs are still tracked through UtteranceLog charge evidence, but timing is now driven by an injectable
// Clock and a pure cron core. Cron jobs arm exact next-run timers instead of polling every minute.

import { cellValues, witness, chargeOfUtterances, UtteranceLog, recallWhere } from "../internal/witness.mjs";
import type { App } from "../types.mjs";
import { realClock, type Clock, type ClockHandle } from "../internal/clock.mjs";
import type { Store } from "../internal/store.mjs";

export type JobHandler = (job: JobRecord) => void | Promise<void>;

export type JobRecord = {
  id: string;
  name: string;
  payload?: unknown;
  scheduledAt: number;
  attempts: number;
};

export type JobOptions = {
  /** Stable durable identifier. Defaults to a generated id, or a previously persisted id for this name. */
  id?: string;
  name: string;
  handler: JobHandler;
  /** Cron expression (5-field: min hour dom mon dow). */
  cron?: string;
  /** Fixed interval in ms. */
  intervalMs?: number;
  /** One-shot delay in ms. */
  delayMs?: number;
  maxAttempts?: number;    // default 3
  retryDelayMs?: number;   // default 5000
  payload?: unknown;
  onSuccess?: (job: JobRecord) => void;
  onFailure?: (job: JobRecord, err: unknown) => void;
};

export type SchedulerOptions = {
  clock?: Clock;
  store?: Store<ScheduledJobState>;
};

export type ScheduledJobKind = "manual" | "delay" | "interval" | "cron";

export type ScheduledJobState = {
  id: string;
  name: string;
  kind: ScheduledJobKind;
  nextAt: number | null;
  cron?: string;
  intervalMs?: number;
  delayMs?: number;
  payload?: unknown;
  maxAttempts?: number;
  retryDelayMs?: number;
};

export type ParsedCron = {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
  domRestricted: boolean;
  dowRestricted: boolean;
};

type FieldSpec = {
  name: string;
  min: number;
  max: number;
};

const FIELDS: readonly FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "dom", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "dow", min: 0, max: 7 },
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const NICKNAMES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function parseField(spec: string, field: FieldSpec, names?: Record<string, number>): Set<number> {
  const resolve = (raw: string): number => {
    const token = raw.trim().toLowerCase();
    if (names && Object.hasOwn(names, token)) return names[token]!;
    if (!/^\d+$/.test(token)) throw new Error(`scheduler: invalid ${field.name} value ${JSON.stringify(raw)}`);
    return Number(token);
  };

  const values = new Set<number>();
  for (const rawItem of spec.split(",")) {
    const item = rawItem.trim();
    if (!item) throw new Error(`scheduler: empty ${field.name} item in ${JSON.stringify(spec)}`);

    let body = item;
    let step = 1;
    const slash = item.indexOf("/");
    if (slash !== -1) {
      body = item.slice(0, slash);
      const stepRaw = item.slice(slash + 1).trim();
      if (!/^\d+$/.test(stepRaw)) throw new Error(`scheduler: invalid ${field.name} step ${JSON.stringify(stepRaw)}`);
      step = Number(stepRaw);
      if (step <= 0) throw new Error(`scheduler: ${field.name} step must be >= 1`);
    }

    let lo: number;
    let hi: number;
    if (body === "*") {
      lo = field.min;
      hi = field.max;
    } else {
      const dash = body.indexOf("-", 1);
      if (dash !== -1) {
        lo = resolve(body.slice(0, dash));
        hi = resolve(body.slice(dash + 1));
      } else {
        lo = resolve(body);
        hi = slash === -1 ? lo : field.max;
      }
    }

    if (lo < field.min || hi > field.max || lo > hi) {
      throw new Error(`scheduler: ${field.name} value out of range [${field.min}-${field.max}] in ${JSON.stringify(item)}`);
    }
    for (let value = lo; value <= hi; value += step) values.add(value);
  }
  return values;
}

export function parseCron(expr: string): ParsedCron {
  if (typeof expr !== "string") throw new Error("scheduler: cron expression must be a string");
  const trimmed = expr.trim();
  const expanded = NICKNAMES[trimmed.toLowerCase()] ?? trimmed;
  const parts = expanded.split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`scheduler: cron expression must have 5 fields (got ${parts.length}) in ${JSON.stringify(expr)}`);
  }

  const dowRaw = parseField(parts[4]!, FIELDS[4]!, DOW_NAMES);
  const dow = new Set<number>();
  for (const value of dowRaw) dow.add(value === 7 ? 0 : value);

  return {
    minute: parseField(parts[0]!, FIELDS[0]!),
    hour: parseField(parts[1]!, FIELDS[1]!),
    dom: parseField(parts[2]!, FIELDS[2]!),
    month: parseField(parts[3]!, FIELDS[3]!, MONTH_NAMES),
    dow,
    domRestricted: parts[2]!.trim() !== "*",
    dowRestricted: parts[4]!.trim() !== "*",
  };
}

function matchesDay(cron: ParsedCron, date: Date): boolean {
  const domOk = cron.dom.has(date.getDate());
  const dowOk = cron.dow.has(date.getDay());
  if (cron.domRestricted && cron.dowRestricted) return domOk || dowOk;
  if (cron.domRestricted) return domOk;
  if (cron.dowRestricted) return dowOk;
  return true;
}

function matchesMinute(cron: ParsedCron, date: Date): boolean {
  return cron.month.has(date.getMonth() + 1) &&
    matchesDay(cron, date) &&
    cron.hour.has(date.getHours()) &&
    cron.minute.has(date.getMinutes());
}

export function nextRun(expr: string | ParsedCron, afterMs = Date.now()): number | null { // law-allow: wall-clock-as-data — cron schedule arithmetic over wall time is the domain; afterMs is injectable
  const cron = typeof expr === "string" ? parseCron(expr) : expr;
  const date = new Date(afterMs);
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);

  const limit = 4 * 366 * 24 * 60;
  for (let i = 0; i < limit; i++) {
    if (cron.month.has(date.getMonth() + 1) && matchesDay(cron, date)) {
      if (matchesMinute(cron, date)) return date.getTime();
      date.setMinutes(date.getMinutes() + 1);
    } else {
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 1);
    }
  }
  return null;
}

let jobCounter = 0;

export class PlatformScheduler {
  private store = new UtteranceLog();
  private timers = new Map<string, ClockHandle>();
  private jobs = new Map<string, JobOptions>();
  private states = new Map<string, ScheduledJobState>();
  private names = new Map<string, string>();
  private readonly clock: Clock;
  private readonly persistentStore: Store<ScheduledJobState> | null;
  private persistTail = Promise.resolve();
  readonly ready: Promise<void>;

  constructor(opts: SchedulerOptions = {}) {
    this.clock = opts.clock ?? realClock();
    this.persistentStore = opts.store ?? null;
    this.ready = this.loadPersisted();
  }

  register(opts: JobOptions): string {
    this.validate(opts);
    const existing = this.existingStateFor(opts);
    const id = opts.id ?? existing?.id ?? `job-${++jobCounter}-${opts.name}`;
    const state = this.stateFor(id, opts, existing);
    this.persist(state);
    this.jobs.set(id, opts);
    this.record(id, "scheduled", true);
    this.arm(id, opts, state.nextAt);
    return id;
  }

  cancel(id: string): void {
    this.clearTimer(id);
    this.jobs.delete(id);
    const state = this.states.get(id);
    if (state) {
      this.states.delete(id);
      this.names.delete(state.name);
      this.deletePersisted(id);
    }
    this.record(id, "cancelled", false);
  }

  private validate(opts: JobOptions): void {
    if (!opts.name) throw new TypeError("scheduler: job name is required");
    if (typeof opts.handler !== "function") throw new TypeError("scheduler: job handler is required");
    if (opts.cron) parseCron(opts.cron);
    if (opts.intervalMs !== undefined && opts.intervalMs <= 0) throw new RangeError("scheduler: intervalMs must be > 0");
    if (opts.delayMs !== undefined && opts.delayMs < 0) throw new RangeError("scheduler: delayMs must be >= 0");
  }

  private async loadPersisted(): Promise<void> {
    if (!this.persistentStore) return;
    try {
      for await (const [id, state] of this.persistentStore.entries()) {
        if (!state || state.id !== id) continue;
        this.states.set(id, structuredClone(state));
        this.names.set(state.name, id);
      }
    } catch {}
  }

  private persist(state: ScheduledJobState): void {
    const cloned = structuredClone(state);
    this.states.set(cloned.id, cloned);
    this.names.set(cloned.name, cloned.id);
    if (!this.persistentStore) return;
    this.persistTail = this.persistTail
      .then(() => this.persistentStore!.set(cloned.id, cloned))
      .then(() => undefined, () => undefined);
  }

  private deletePersisted(id: string): void {
    if (!this.persistentStore) return;
    this.persistTail = this.persistTail
      .then(() => this.persistentStore!.delete(id))
      .then(() => undefined, () => undefined);
  }

  flush(): Promise<void> {
    return this.persistTail;
  }

  private kindOf(opts: JobOptions): ScheduledJobKind {
    if (opts.delayMs !== undefined) return "delay";
    if (opts.intervalMs !== undefined) return "interval";
    if (opts.cron !== undefined) return "cron";
    return "manual";
  }

  private existingStateFor(opts: JobOptions): ScheduledJobState | undefined {
    if (opts.id && this.states.has(opts.id)) return this.states.get(opts.id);
    const namedId = this.names.get(opts.name);
    return namedId ? this.states.get(namedId) : undefined;
  }

  private sameSchedule(state: ScheduledJobState | undefined, opts: JobOptions): state is ScheduledJobState {
    if (!state) return false;
    const kind = this.kindOf(opts);
    if (state.kind !== kind) return false;
    if (kind === "cron") return state.cron === opts.cron;
    if (kind === "interval") return state.intervalMs === opts.intervalMs;
    return state.delayMs === opts.delayMs;
  }

  private nextAtFor(opts: JobOptions, existing?: ScheduledJobState): number | null {
    if (this.sameSchedule(existing, opts) && existing.nextAt !== null) return existing.nextAt;
    if (opts.delayMs !== undefined) return this.clock.now() + opts.delayMs;
    if (opts.intervalMs !== undefined) return this.clock.now() + opts.intervalMs;
    if (opts.cron) return nextRun(opts.cron, this.clock.now());
    return null;
  }

  private stateFor(id: string, opts: JobOptions, existing?: ScheduledJobState): ScheduledJobState {
    const kind = this.kindOf(opts);
    const state: ScheduledJobState = {
      id,
      name: opts.name,
      kind,
      nextAt: this.nextAtFor(opts, existing),
    };
    if (opts.cron !== undefined) state.cron = opts.cron;
    if (opts.intervalMs !== undefined) state.intervalMs = opts.intervalMs;
    if (opts.delayMs !== undefined) state.delayMs = opts.delayMs;
    if (opts.payload !== undefined) state.payload = structuredClone(opts.payload);
    if (opts.maxAttempts !== undefined) state.maxAttempts = opts.maxAttempts;
    if (opts.retryDelayMs !== undefined) state.retryDelayMs = opts.retryDelayMs;
    return state;
  }

  private record(id: string, state: string, positive: boolean): void {
    witness(
      this.store,
      { subject: id, predicate: "job", object: state },
      positive ? [true, false] : [false, true],
    );
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      this.clock.cancel(timer);
      this.timers.delete(id);
    }
  }

  private setTimer(id: string, timer: ClockHandle): void {
    this.clearTimer(id);
    this.timers.set(id, timer);
  }

  private arm(id: string, _opts: JobOptions, nextAt: number | null): void {
    if (nextAt !== null) this.setTimer(id, this.clock.schedule(nextAt, () => void this.run(id)));
  }

  private jobCancelled(id: string): boolean {
    const memes = recallWhere(this.store, { subject: id, predicate: "job" });
    return chargeOfUtterances(memes) === "active";
  }

  private retry(id: string, attempt: number): void {
    const opts = this.jobs.get(id);
    if (!opts) return;
    const delay = opts.retryDelayMs ?? 5000;
    this.setTimer(id, this.clock.schedule(this.clock.now() + delay, () => void this.run(id, attempt)));
  }

  private rearmAfterRun(id: string, opts: JobOptions, firedAt: number): void {
    if (!this.jobs.has(id)) return;
    const state = this.states.get(id);
    if (opts.delayMs !== undefined) {
      if (state) {
        state.nextAt = null;
        this.persist(state);
      }
      this.clearTimer(id);
      return;
    }
    if (opts.intervalMs !== undefined) {
      const next = firedAt + opts.intervalMs;
      if (state) {
        state.nextAt = next;
        this.persist(state);
      }
      this.setTimer(id, this.clock.schedule(next, () => void this.run(id)));
      return;
    }
    if (opts.cron) {
      const next = nextRun(opts.cron, firedAt);
      if (state) {
        state.nextAt = next;
        this.persist(state);
      }
      if (next !== null) this.setTimer(id, this.clock.schedule(next, () => void this.run(id)));
    }
  }

  private async run(id: string, attempt = 1): Promise<void> {
    const opts = this.jobs.get(id);
    if (!opts) return;
    if (this.jobCancelled(id)) return;

    const firedAt = this.clock.now();
    this.record(id, "running", true);
    const record: JobRecord = { id, name: opts.name, payload: opts.payload, scheduledAt: firedAt, attempts: attempt };

    try {
      await opts.handler(record);
      this.record(id, "done", true);
      opts.onSuccess?.(record);
      this.rearmAfterRun(id, opts, firedAt);
    } catch (err) {
      const maxAttempts = opts.maxAttempts ?? 3;
      if (attempt < maxAttempts) {
        this.record(id, "retry", true);
        this.retry(id, attempt + 1);
      } else {
        this.record(id, "failed", false);
        opts.onFailure?.(record, err);
        this.rearmAfterRun(id, opts, firedAt);
      }
    }
  }

  status(id: string): string {
    const memes = recallWhere(this.store, { subject: id, predicate: "job" });
    if (!memes.length) return "unknown";
    return String(cellValues(memes[memes.length - 1]!)?.object);
  }

  stop(): void {
    for (const id of [...this.timers.keys()]) this.clearTimer(id);
  }

  stopAll(): void {
    for (const id of [...this.jobs.keys()]) this.cancel(id);
  }
}

export function platformScheduler(opts: SchedulerOptions = {}): PlatformScheduler {
  return new PlatformScheduler(opts);
}

/** Build a /jobs status endpoint resource. */
export function schedulerResource(scheduler: PlatformScheduler, jobIds: string[]): NonNullable<App["resources"]>[number] {
  return {
    match: "/platform/jobs",
    methods: ["GET"],
    handler: (ctx) => {
      const statuses = Object.fromEntries(jobIds.map((id) => [id, scheduler.status(id)]));
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.writeHead(200).end(JSON.stringify(statuses));
      return Promise.resolve();
    },
  };
}
