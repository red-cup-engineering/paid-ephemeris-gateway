// platform/durable.ts — Durable Objects style single-writer state.
//
// A namespace owns one in-process object instance per id. Every fetch/RPC/alarm
// for an id runs through that id's mailbox, so operations never interleave.
// Storage is synchronous for object code and write-throughs to the package's
// canonical async Store for persistence.

import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { sendWebResponse, toWebRequest } from "./fetch-adapter.mjs";
import { sha256hex } from "../internal/hash.mjs";
import { memoryStore, type Store } from "../internal/store.mjs";
import { realClock, type Clock, type ClockHandle } from "../internal/clock.mjs";
import type { Context, Resource } from "../types.mjs";

const ALARM_KEY = "\u0000durable.alarm";
const SAFE_ID = /^[A-Za-z0-9._~-]+$/;
const DELETED = Symbol("durable.deleted");

export type DurableStorage = {
  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(keys: readonly string[]): Map<string, T>;
  has(key: string): boolean;
  put<T = unknown>(key: string, value: T): void;
  put(values: Record<string, unknown>): void;
  set<T = unknown>(key: string, value: T): void;
  delete(key: string): boolean;
  delete(keys: readonly string[]): number;
  list(): Array<[string, unknown]>;
  transaction<T>(fn: (txn: DurableStorage) => T | Promise<T>): Promise<T>;
};

export type DurableObjectState = {
  id: string;
  storage: DurableStorage;
  getAlarm(): number | null;
  setAlarm(atMs: number | Date): void;
  deleteAlarm(): void;
  blockConcurrencyWhile<T>(fn: () => T | Promise<T>): Promise<T>;
};

export type DurableObjectInstance = {
  fetch?: (request: Request, ctx?: Context) => Response | Promise<Response>;
  alarm?: () => void | Promise<void>;
  onAlarm?: () => void | Promise<void>;
  [key: string]: unknown;
};

export type DurableObjectFactory = (id: string, state: DurableObjectState) => DurableObjectInstance;

export type DurableBackend = {
  get(key: string): unknown;
  has(key: string): boolean;
  put(key: string, value: unknown): void;
  delete(key: string): boolean;
  list(): Array<[string, unknown]>;
  getAlarm(): number | null;
  setAlarm(atMs: number): void;
  deleteAlarm(): void;
  ready?: Promise<void>;
  flush?(): Promise<void>;
  close?(): void | Promise<void>;
};

export type DurableObjectHandler = (state: DurableObjectState, ctx: Context) => Promise<void> | void;

export type DurableObjectClass = {
  fetch: DurableObjectHandler;
  alarm?: (state: DurableObjectState) => Promise<void> | void;
};

export type DurableObjectsOptions = {
  factory: DurableObjectFactory;
  storage?: (id: string) => DurableBackend;
  store?: (id: string) => Store<unknown>;
  clock?: Clock;
  idFromRequest?: (req: Context["req"], ctx: Context) => string | null | undefined;
  idParam?: string;
  mount?: string;
};

export type DurableObjectStub = {
  readonly id: string;
  readonly storage: DurableStorage;
  readonly ready: Promise<void>;
  flush(): Promise<void>;
  fetch(request: Request, ctx?: Context): Promise<Response>;
  call<T>(fn: (instance: DurableObjectInstance, storage: DurableStorage) => T | Promise<T>): Promise<T>;
};

type ObjectRecord = {
  id: string;
  backend: DurableBackend;
  storage: DurableStorage;
  enqueue: <T>(op: () => T | Promise<T>) => Promise<T>;
  instance: DurableObjectInstance;
  clockHandle: ClockHandle | null;
  ready: Promise<void>;
};

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

function through(tail: { current: Promise<void> }, fn: () => Promise<unknown>): void {
  tail.current = tail.current.then(fn, fn).then(() => undefined, () => undefined);
}

function makeBackend(store: Store<unknown>): DurableBackend {
  const map = new Map<string, unknown>();
  const tail = { current: Promise.resolve() };
  let alarm: number | null = null;

  const ready = (async () => {
    for await (const [key, value] of store.entries()) {
      if (key === ALARM_KEY) alarm = typeof value === "number" ? value : null;
      else map.set(key, value);
    }
  })();

  return {
    get(key) { return map.has(key) ? clone(map.get(key)) : undefined; },
    has(key) { return map.has(key); },
    put(key, value) {
      const stored = clone(value);
      map.set(key, stored);
      through(tail, () => store.set(key, stored));
    },
    delete(key) {
      const had = map.delete(key);
      if (had) through(tail, () => store.delete(key));
      return had;
    },
    list() { return [...map.entries()].map(([key, value]) => [key, clone(value)]); },
    getAlarm() { return alarm; },
    setAlarm(atMs) {
      alarm = atMs;
      through(tail, () => store.set(ALARM_KEY, atMs));
    },
    deleteAlarm() {
      alarm = null;
      through(tail, () => store.delete(ALARM_KEY));
    },
    ready,
    flush: () => tail.current,
    close: () => tail.current.then(() => store.close()).then(() => undefined, () => undefined),
  };
}

export function memoryStorage(): (id: string) => DurableBackend {
  return () => makeBackend(memoryStore());
}

function transactionalStorage(backend: DurableBackend): DurableStorage {
  type OverlayValue = unknown | typeof DELETED;

  function makeFace(overlay: Map<string, OverlayValue> | null, read: (key: string) => unknown): DurableStorage {
    const readKey = (key: string): unknown => {
      if (overlay?.has(key)) {
        const value = overlay.get(key);
        return value === DELETED ? undefined : clone(value);
      }
      return read(key);
    };
    const hasKey = (key: string): boolean => {
      if (overlay?.has(key)) return overlay.get(key) !== DELETED;
      return readKey(key) !== undefined;
    };
    const face = {
      get(key: string | readonly string[]) {
        if (typeof key !== "string") {
          const out = new Map<string, unknown>();
          for (const item of key) {
            const value = readKey(item);
            if (value !== undefined) out.set(item, value);
          }
          return out;
        }
        return readKey(key);
      },
      has(key: string) { return hasKey(key); },
      put(key: string | Record<string, unknown>, value?: unknown) {
        if (typeof key !== "string") {
          for (const [itemKey, itemValue] of Object.entries(key)) face.put(itemKey, itemValue);
          return;
        }
        if (overlay) overlay.set(key, clone(value));
        else backend.put(key, value);
      },
      set(key: string, value: unknown) { face.put(key, value); },
      delete(key: string | readonly string[]) {
        if (typeof key !== "string") {
          let count = 0;
          for (const item of key) if (face.delete(item)) count++;
          return count;
        }
        const existed = hasKey(key);
        if (overlay) overlay.set(key, DELETED);
        else backend.delete(key);
        return existed;
      },
      list() {
        const entries = new Map<string, unknown>(backend.list());
        if (overlay) {
          for (const [key, value] of overlay) {
            if (value === DELETED) entries.delete(key);
            else entries.set(key, clone(value));
          }
        }
        return [...entries.entries()].map(([key, value]) => [key, clone(value)] as [string, unknown]);
      },
      async transaction<T>(fn: (txn: DurableStorage) => T | Promise<T>): Promise<T> {
        const child = new Map<string, OverlayValue>();
        const childFace = makeFace(child, readKey);
        const result = await fn(childFace);
        for (const [key, value] of child) {
          if (overlay) overlay.set(key, value);
          else if (value === DELETED) backend.delete(key);
          else backend.put(key, value);
        }
        return result;
      },
    };
    return face as DurableStorage;
  }

  return makeFace(null, (key) => backend.get(key));
}

function makeMailbox(): <T>(op: () => T | Promise<T>) => Promise<T> {
  let tail = Promise.resolve();
  return (op) => {
    const run = tail.then(op, op);
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
}

export function idFromName(name: string): string {
  return sha256hex(String(name));
}

function responseFromError(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  return new Response(`Durable Object error: ${message}`, { status: 500 });
}

function mountPattern(mount: string): RegExp {
  const escaped = mount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}([^/]+)(/.*)?$`);
}

export class DurableObjectNamespace {
  readonly resource: Resource;
  readonly alarms: { fire: (id: string) => Promise<void> };
  private readonly objects = new Map<string, ObjectRecord>();
  private readonly options: Required<Pick<DurableObjectsOptions, "factory" | "clock" | "idParam" | "mount">> & Omit<DurableObjectsOptions, "factory" | "clock" | "idParam" | "mount">;
  private readonly storageFactory: (id: string) => DurableBackend;
  private readonly legacyHandler: DurableObjectClass | null;

  constructor(options: DurableObjectsOptions | DurableObjectClass) {
    const isModern = "factory" in options;
    const legacyHandler = isModern ? null : options as DurableObjectClass;
    let resolved: DurableObjectsOptions;
    if (legacyHandler) {
      resolved = {
        factory: (_id, state) => {
          const instance: DurableObjectInstance = {
            fetch: async (_request, ctx) => {
              if (!ctx) return new Response("Durable Object legacy context is required", { status: 500 });
              await legacyHandler.fetch(state, ctx);
              return new Response(null, { status: 204 });
            },
          };
          if (legacyHandler.alarm) instance.alarm = () => legacyHandler.alarm?.(state);
          return instance;
        },
      };
    } else {
      resolved = options as DurableObjectsOptions;
    }

    if (typeof resolved.factory !== "function") {
      throw new TypeError("durableObjects({ factory }): factory(id, state) is required");
    }
    if (resolved.storage !== undefined && typeof resolved.storage !== "function") {
      throw new TypeError("durableObjects({ storage }): storage must be a factory");
    }
    if (resolved.store !== undefined && typeof resolved.store !== "function") {
      throw new TypeError("durableObjects({ store }): store must be a factory");
    }

    this.options = {
      ...resolved,
      factory: resolved.factory,
      clock: resolved.clock ?? realClock(),
      idParam: resolved.idParam ?? "id",
      mount: resolved.mount ?? "/object/",
    };
    this.legacyHandler = legacyHandler;
    const storeFactory = resolved.store ?? (() => memoryStore<unknown>());
    this.storageFactory = resolved.storage ?? ((id) => makeBackend(storeFactory(id)));

    const mountRe = mountPattern(this.options.mount);
    this.resource = {
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      match: (path, ctx) => {
        if (this.options.idFromRequest) {
          const id = this.options.idFromRequest(ctx.req, ctx);
          return id == null ? null : { [this.options.idParam]: String(id) };
        }
        const match = mountRe.exec(path);
        return match ? { [this.options.idParam]: decodeURIComponent(match[1]!), rest: match[2] ?? "" } : null;
      },
      handler: async (ctx) => {
        const raw = ctx.params[this.options.idParam];
        const id = raw === undefined ? "" : String(raw);
        if (!id || !SAFE_ID.test(id)) {
          ctx.res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("Bad Request (invalid object id)");
          return;
        }
        const response = await this.get(id).fetch(toWebRequest(ctx.req, ctx), ctx);
        await this.send(ctx, response);
      },
    };
    this.alarms = {
      fire: async (id) => {
        const record = this.objects.get(String(id));
        if (!record) return;
        await record.enqueue(async () => {
          const fn = record.instance.alarm ?? record.instance.onAlarm;
          if (typeof fn === "function") await fn.call(record.instance);
        });
      },
    };
  }

  get size(): number { return this.objects.size; }

  idFromName(name: string): string { return idFromName(name); }

  ids(): string[] { return [...this.objects.keys()]; }

  get(id: string): DurableObjectStub {
    const record = this.recordFor(String(id));
    return {
      id: record.id,
      get storage() { return record.storage; },
      get ready() { return record.ready; },
      flush: () => record.backend.flush?.() ?? Promise.resolve(),
      fetch: (request, ctx) => record.enqueue(async () => {
        await record.ready;
        const fn = record.instance.fetch;
        if (typeof fn !== "function") return new Response("Durable Object has no fetch handler", { status: 500 });
        try {
          const response = await fn.call(record.instance, request, ctx);
          if (!(response instanceof Response)) return new Response("Durable Object fetch must return a Response", { status: 500 });
          return response;
        } catch (error) {
          return responseFromError(error);
        }
      }),
      call: (fn) => record.enqueue(async () => {
        await record.ready;
        return fn(record.instance, record.storage);
      }),
    };
  }

  async fetch(id: string, ctx: Context): Promise<void> {
    if (!this.legacyHandler) {
      const response = await this.get(id).fetch(toWebRequest(ctx.req, ctx), ctx);
      await this.send(ctx, response);
      return;
    }
    await this.get(id).fetch(new Request("http://localhost/"), ctx);
  }

  async alarm(id: string): Promise<void> {
    await this.alarms.fire(id);
  }

  router(keyFn: (ctx: Context) => string) {
    return async (ctx: Context): Promise<void> => {
      await this.fetch(keyFn(ctx), ctx);
    };
  }

  private recordFor(id: string): ObjectRecord {
    let record = this.objects.get(id);
    if (!record) {
      record = this.instantiate(id);
      this.objects.set(id, record);
    }
    return record;
  }

  private send(ctx: Context, response: Response): Promise<void> {
    const options = ctx.req.method === undefined ? undefined : { method: ctx.req.method };
    return options === undefined ? sendWebResponse(ctx.res, response) : sendWebResponse(ctx.res, response, options);
  }

  private instantiate(id: string): ObjectRecord {
    const backend = this.storageFactory(id);
    const storage = transactionalStorage(backend);
    const enqueue = makeMailbox();
    const record = {
      id,
      backend,
      storage,
      enqueue,
      instance: {} as DurableObjectInstance,
      clockHandle: null as ClockHandle | null,
      ready: backend.ready ?? Promise.resolve(),
    };

    const armAlarm = () => {
      if (record.clockHandle !== null) {
        this.options.clock.cancel(record.clockHandle);
        record.clockHandle = null;
      }
      const at = backend.getAlarm();
      if (at === null) return;
      record.clockHandle = this.options.clock.schedule(at, () => {
        record.clockHandle = null;
        record.enqueue(runAlarm).catch(() => undefined);
      });
    };

    const runAlarm = async () => {
      await record.ready;
      const at = backend.getAlarm();
      if (at === null) return;
      backend.deleteAlarm();
      const fn = record.instance.alarm ?? record.instance.onAlarm;
      if (typeof fn === "function") await fn.call(record.instance);
      armAlarm();
    };

    const state: DurableObjectState = {
      id,
      storage,
      getAlarm: () => backend.getAlarm(),
      setAlarm: (atMs) => {
        const value = atMs instanceof Date ? atMs.getTime() : Number(atMs);
        backend.setAlarm(value);
        armAlarm();
      },
      deleteAlarm: () => {
        backend.deleteAlarm();
        armAlarm();
      },
      blockConcurrencyWhile: (fn) => record.enqueue(fn),
    };

    const instance = this.options.factory(id, state);
    if (!instance || typeof instance !== "object") {
      throw new TypeError(`durableObjects: factory(${JSON.stringify(id)}, state) returned no object`);
    }
    record.instance = instance;
    armAlarm();
    record.ready.then(armAlarm, () => undefined);
    return record;
  }
}

export function durableObjects(options: DurableObjectsOptions | DurableObjectClass): DurableObjectNamespace {
  return new DurableObjectNamespace(options);
}

export function bodyToNode(webBody: NodeReadableStream<Uint8Array> | Readable | null): Readable | null {
  if (webBody === null) return null;
  if (webBody instanceof Readable) return webBody;
  return Readable.fromWeb(webBody);
}
