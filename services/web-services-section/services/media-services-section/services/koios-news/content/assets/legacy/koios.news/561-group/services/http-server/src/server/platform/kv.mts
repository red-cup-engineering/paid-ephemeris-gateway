// platform/kv.ts — Hierarchical, versioned KV storage with TTL and CAS.
//
// The functional `kvStore` surface is shaped after Deno KV / edge KV systems:
// ordered hierarchical keys, monotonic versionstamps, TTL, optimistic atomic
// checks, pluggable storage, and replication hooks. `KvStore` keeps the older
// class facade available for package-local callers.

import { randomBytes } from "node:crypto";
import type { Resource, Context } from "../types.mjs";
import { ifMatch } from "@emsenn/computing-with-http/codecs/http";
import { diskStore, memoryStore, type Store } from "../internal/store.mjs";
import { realClock, type Clock, type ClockHandle } from "../internal/clock.mjs";

const SEP = "\u0000";

export type KvKey = string | readonly string[];

export type KvRecord<T = unknown> = {
  value: T;
  versionstamp: string;
  expireAt: number | null;
};

export type KvVersionedEntry<T = unknown> = {
  key: string[];
  value: T;
  versionstamp: string;
  expireAt: number | null;
};

export type KvGetOptions = { asJson?: boolean };
export type KvSetOptions = { ttlMs?: number; json?: boolean };
export type KvListOptions = { prefix?: KvKey; limit?: number; reverse?: boolean };

export type KvEntry<T = unknown> = {
  key: string | string[];
  value: T;
  expiresAt: number | null;
  versionstamp?: string;
};

export type KvMutation<T = unknown> =
  | { type: "set"; key: string[]; value: T; versionstamp: string; expireAt: number | null }
  | { type: "delete"; key: string[]; versionstamp?: string };

export type KvBackend<T = unknown> = {
  get(key: string): KvRecord<T> | null;
  set(key: string, record: KvRecord<T>): void;
  delete(key: string): void;
  entries(): Iterable<[string, KvRecord<T>]>;
  clear?(): void;
  close?(): void | Promise<void>;
  ready?: Promise<void>;
  flush?(): Promise<void>;
  store?: Store<KvRecord<T>>;
};

export type KvStoreOptions<T = unknown> = {
  backend?: KvBackend<T>;
  store?: Store<KvRecord<T>>;
  defaultTtlMs?: number;
  sweepMs?: number;
  clock?: Clock;
  now?: () => number;
  onChange?: (mutation: KvMutation<T>) => void;
};

export type AtomicKvTransaction<T = unknown> = {
  check(key: KvKey, versionstamp: string | null): AtomicKvTransaction<T>;
  set(key: KvKey, value: T, opts?: KvSetOptions): AtomicKvTransaction<T>;
  delete(key: KvKey): AtomicKvTransaction<T>;
  commit(): { ok: boolean; versionstamp?: string };
};

export type FunctionalKvStore<T = unknown> = {
  get(key: KvKey): KvVersionedEntry<T> | null;
  set(key: KvKey, value: T, opts?: KvSetOptions): { ok: true; versionstamp: string };
  delete(key: KvKey): void;
  list(opts?: KvListOptions): KvVersionedEntry<T>[];
  atomic(): AtomicKvTransaction<T>;
  applyRemote(mutation: KvMutation<T>): { ok: boolean };
  sweep(): void;
  close(): void | Promise<void>;
  encodeKey(key: KvKey): string;
  backend: KvBackend<T>;
  ready: Promise<void>;
  flush(): Promise<void>;
};

export type KvResourceOptions = {
  /** URL prefix for the KV resource (default "/kv/"). */
  mount?: string;
  /** If true, only GET/HEAD are allowed. */
  readonly?: boolean;
  /** Custom value parser (default JSON.parse). */
  parse?: (text: string) => unknown;
  /** Custom value serializer (default JSON.stringify). */
  serialize?: (value: unknown) => string;
};

function encodeKey(key: KvKey): string {
  if (typeof key === "string") return key;
  if (!Array.isArray(key) || key.length === 0) throw new TypeError("kv: array keys must be non-empty");
  return key.map((part) => {
    if (typeof part !== "string") throw new TypeError("kv: key parts must be strings");
    return part;
  }).join(SEP);
}

function decodeKey(encoded: string): string[] {
  return encoded.split(SEP);
}

function keyMatchesPrefix(encoded: string, prefix: KvKey | undefined): boolean {
  if (prefix === undefined) return true;
  const encPrefix = encodeKey(prefix);
  if (typeof prefix === "string") return encoded.startsWith(encPrefix);
  return encoded === encPrefix || encoded.startsWith(`${encPrefix}${SEP}`);
}

function makeStamper(now: () => number): () => string {
  let last = 0n;
  return () => {
    const tick = BigInt(Math.max(0, Math.floor(now()))) * 1000n;
    last = tick > last ? tick : last + 1n;
    return `${last.toString(16).padStart(16, "0")}${randomBytes(2).toString("hex")}`;
  };
}

function isExpired(record: KvRecord | null, now: number): boolean {
  return record !== null && record.expireAt !== null && record.expireAt <= now;
}

export function storeBackend<T = unknown>(store: Store<KvRecord<T>>): KvBackend<T> {
  const map = new Map<string, KvRecord<T>>();
  let tail = Promise.resolve();
  const through = (fn: () => Promise<unknown>) => {
    tail = tail.then(fn, fn).then(() => undefined, () => undefined);
  };

  const ready = (async () => {
    for await (const [key, value] of store.entries()) {
      if (!map.has(key)) map.set(key, value);
    }
  })();

  return {
    get(key) { return map.get(key) ?? null; },
    set(key, record) {
      map.set(key, record);
      through(() => store.set(key, record));
    },
    delete(key) {
      map.delete(key);
      through(() => store.delete(key));
    },
    *entries() { yield* map.entries(); },
    clear() {
      map.clear();
      through(() => store.clear());
    },
    close() {
      return tail.then(() => store.close()).then(() => undefined, () => undefined);
    },
    ready,
    flush: () => tail,
    store,
  };
}

export function memoryBackend<T = unknown>(): KvBackend<T> {
  return storeBackend(memoryStore<KvRecord<T>>());
}

export function diskBackend<T = unknown>({ dir }: { dir: string }): KvBackend<T> {
  if (!dir) throw new TypeError("diskBackend: { dir } is required");
  return storeBackend(diskStore<KvRecord<T>>({ dir }));
}

export function kvStore<T = unknown>(options: KvStoreOptions<T> = {}): FunctionalKvStore<T> {
  const clock = options.clock ?? realClock();
  const now = options.now ?? clock.now;
  const backend = options.backend ?? (options.store ? storeBackend(options.store) : memoryBackend<T>());
  const stamp = makeStamper(now);
  const defaultTtlMs = options.defaultTtlMs ?? 0;
  const sweepMs = options.sweepMs ?? 60_000;

  function readRecord(encoded: string): KvRecord<T> | null {
    const record = backend.get(encoded);
    if (record === null) return null;
    if (isExpired(record, now())) {
      backend.delete(encoded);
      return null;
    }
    return record;
  }

  function entryFor(encoded: string, record: KvRecord<T>): KvVersionedEntry<T> {
    return {
      key: decodeKey(encoded),
      value: record.value,
      versionstamp: record.versionstamp,
      expireAt: record.expireAt,
    };
  }

  function expiryFor(ttlMs: number | undefined): number | null {
    const ttl = ttlMs ?? defaultTtlMs;
    return ttl > 0 ? now() + ttl : null;
  }

  function writeRecord(encoded: string, value: T, opts: { expireAt?: number | null; versionstamp?: string } = {}): KvRecord<T> {
    const record: KvRecord<T> = {
      value,
      versionstamp: opts.versionstamp ?? stamp(),
      expireAt: opts.expireAt ?? null,
    };
    backend.set(encoded, record);
    return record;
  }

  function set(key: KvKey, value: T, opts: KvSetOptions = {}): { ok: true; versionstamp: string } {
    const encoded = encodeKey(key);
    const record = writeRecord(encoded, value, { expireAt: expiryFor(opts.ttlMs) });
    options.onChange?.({ type: "set", key: decodeKey(encoded), value, versionstamp: record.versionstamp, expireAt: record.expireAt });
    return { ok: true, versionstamp: record.versionstamp };
  }

  function del(key: KvKey): void {
    const encoded = encodeKey(key);
    const current = backend.get(encoded);
    backend.delete(encoded);
    const mutation: KvMutation<T> = { type: "delete", key: decodeKey(encoded) };
    if (current?.versionstamp !== undefined) mutation.versionstamp = current.versionstamp;
    options.onChange?.(mutation);
  }

  function get(key: KvKey): KvVersionedEntry<T> | null {
    const encoded = encodeKey(key);
    const record = readRecord(encoded);
    return record === null ? null : entryFor(encoded, record);
  }

  function list(opts: KvListOptions = {}): KvVersionedEntry<T>[] {
    const out: Array<KvVersionedEntry<T> & { encoded: string }> = [];
    const t = now();
    for (const [encoded, record] of backend.entries()) {
      if (!keyMatchesPrefix(encoded, opts.prefix)) continue;
      if (isExpired(record, t)) {
        backend.delete(encoded);
        continue;
      }
      out.push({ ...entryFor(encoded, record), encoded });
    }
    out.sort((a, b) => a.encoded.localeCompare(b.encoded));
    if (opts.reverse) out.reverse();
    const limited = opts.limit !== undefined && opts.limit >= 0 ? out.slice(0, opts.limit) : out;
    return limited.map(({ encoded: _encoded, ...entry }) => entry);
  }

  function atomic(): AtomicKvTransaction<T> {
    const checks: Array<{ encoded: string; expected: string | null }> = [];
    const mutations: Array<{ type: "set"; encoded: string; value: T; ttlMs?: number } | { type: "delete"; encoded: string }> = [];
    const tx: AtomicKvTransaction<T> = {
      check(key, versionstamp) {
        checks.push({ encoded: encodeKey(key), expected: versionstamp ?? null });
        return tx;
      },
      set(key, value, opts = {}) {
        const mutation: { type: "set"; encoded: string; value: T; ttlMs?: number } = {
          type: "set",
          encoded: encodeKey(key),
          value,
        };
        if (opts.ttlMs !== undefined) mutation.ttlMs = opts.ttlMs;
        mutations.push(mutation);
        return tx;
      },
      delete(key) {
        mutations.push({ type: "delete", encoded: encodeKey(key) });
        return tx;
      },
      commit() {
        for (const check of checks) {
          const current = readRecord(check.encoded)?.versionstamp ?? null;
          if (current !== check.expected) return { ok: false };
        }
        let lastStamp: string | undefined;
        for (const mutation of mutations) {
          if (mutation.type === "set") {
            const record = writeRecord(mutation.encoded, mutation.value, { expireAt: expiryFor(mutation.ttlMs) });
            lastStamp = record.versionstamp;
            options.onChange?.({
              type: "set",
              key: decodeKey(mutation.encoded),
              value: mutation.value,
              versionstamp: record.versionstamp,
              expireAt: record.expireAt,
            });
          } else {
            backend.delete(mutation.encoded);
            options.onChange?.({ type: "delete", key: decodeKey(mutation.encoded) });
          }
        }
        return lastStamp === undefined ? { ok: true } : { ok: true, versionstamp: lastStamp };
      },
    };
    return tx;
  }

  function applyRemote(mutation: KvMutation<T>): { ok: boolean } {
    const encoded = encodeKey(mutation.key);
    const local = backend.get(encoded);
    if (mutation.type === "delete") {
      if (local && mutation.versionstamp && local.versionstamp > mutation.versionstamp) return { ok: false };
      backend.delete(encoded);
      return { ok: true };
    }
    if (local && local.versionstamp >= mutation.versionstamp) return { ok: false };
    writeRecord(encoded, mutation.value, { expireAt: mutation.expireAt, versionstamp: mutation.versionstamp });
    return { ok: true };
  }

  function sweep(): void {
    const t = now();
    for (const [encoded, record] of [...backend.entries()]) {
      if (isExpired(record, t)) backend.delete(encoded);
    }
  }

  let timer: ClockHandle | null = null;
  if (sweepMs > 0) timer = clock.interval(sweepMs, sweep);

  function close(): void | Promise<void> {
    if (timer !== null) {
      clock.cancel(timer);
      timer = null;
    }
    return backend.close?.();
  }

  return {
    get,
    set,
    delete: del,
    list,
    atomic,
    applyRemote,
    sweep,
    close,
    encodeKey,
    backend,
    ready: backend.ready ?? Promise.resolve(),
    flush: () => backend.flush?.() ?? Promise.resolve(),
  };
}

export class KvStore<T = unknown> {
  private readonly namespace: string;
  private readonly core: FunctionalKvStore<T>;

  constructor(namespace = "kv", options: KvStoreOptions<T> = {}) {
    this.namespace = namespace;
    this.core = kvStore<T>(options);
  }

  private scoped(key: KvKey): KvKey {
    return typeof key === "string" ? [this.namespace, key] : [this.namespace, ...key];
  }

  get ready(): Promise<void> { return this.core.ready; }

  flush(): Promise<void> { return this.core.flush(); }

  close(): void | Promise<void> { return this.core.close(); }

  getEntry(key: KvKey): KvVersionedEntry<T> | null {
    const entry = this.core.get(this.scoped(key));
    if (!entry) return null;
    return { ...entry, key: entry.key.slice(1) };
  }

  set(key: KvKey, value: T, opts: KvSetOptions = {}): { ok: true; versionstamp: string } {
    return this.core.set(this.scoped(key), value, opts);
  }

  get<U = T>(key: KvKey, opts: KvGetOptions = {}): U | null {
    const entry = this.getEntry(key);
    if (!entry) return null;
    if (opts.asJson && typeof entry.value === "string") return JSON.parse(entry.value) as U;
    return entry.value as unknown as U;
  }

  has(key: KvKey): boolean { return this.getEntry(key) !== null; }

  delete(key: KvKey): void { this.core.delete(this.scoped(key)); }

  list(opts: KvListOptions = {}): KvEntry<T>[] {
    const prefix = opts.prefix === undefined ? [this.namespace] : this.scoped(opts.prefix);
    return this.core.list({ ...opts, prefix }).map((entry) => ({
      key: entry.key.length === 2 ? entry.key[1]! : entry.key.slice(1),
      value: entry.value,
      expiresAt: entry.expireAt,
      versionstamp: entry.versionstamp,
    }));
  }

  increment(key: KvKey, by = 1, opts: KvSetOptions = {}): number {
    const current = Number(this.get(key) ?? 0);
    const next = current + by;
    this.set(key, next as T, opts);
    return next;
  }

  cas(key: KvKey, expected: T | null, next: T, opts: KvSetOptions = {}): boolean {
    const current = this.get<T>(key);
    if (JSON.stringify(current) !== JSON.stringify(expected)) return false;
    this.set(key, next, opts);
    return true;
  }
}

function resourceEntry(store: FunctionalKvStore | KvStore, key: KvKey): KvVersionedEntry | null {
  if (store instanceof KvStore) return store.getEntry(key) as KvVersionedEntry | null;
  return store.get(key);
}

function resourceSet(store: FunctionalKvStore | KvStore, key: KvKey, value: unknown, opts: KvSetOptions): { ok: true; versionstamp: string } {
  return store.set(key, value, opts);
}

function resourceDelete(store: FunctionalKvStore | KvStore, key: KvKey): void {
  store.delete(key);
}

function resourceList(store: FunctionalKvStore | KvStore, opts: KvListOptions): Array<KvVersionedEntry | KvEntry> {
  return store.list(opts);
}

/**
 * kvResource(store, opts) — expose a KV store as an HTTP resource.
 *
 *   GET    <mount>/a/b  -> 200 JSON value, strong ETag versionstamp, or 404
 *   HEAD   <mount>/a/b  -> same headers without a body
 *   PUT    <mount>/a/b  -> 200 { ok, versionstamp }, honors If-Match
 *   DELETE <mount>/a/b  -> 204
 *   GET    <mount>/a/   -> 200 JSON entries under hierarchical prefix
 */
export function kvResource(store: FunctionalKvStore | KvStore, opts: KvResourceOptions = {}): Resource {
  const {
    mount = "/kv/",
    readonly = false,
    parse: parseFn = (text) => (text ? JSON.parse(text) : null),
    serialize: serializeFn = (value) => JSON.stringify(value),
  } = opts;
  const prefix = mount.endsWith("/") ? mount : `${mount}/`;
  const methods = readonly ? ["GET", "HEAD"] : ["GET", "HEAD", "PUT", "DELETE"];

  function keyOf(pathname: string): { parts: string[]; isList: boolean } {
    const rel = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(mount.length);
    const isList = rel === "" || rel.endsWith("/");
    const parts = rel.split("/").map((part) => decodeURIComponent(part)).filter(Boolean);
    return { parts, isList };
  }

  return {
    match: (path: string) => (path === mount || path === prefix || path.startsWith(prefix)) ? true : false,
    methods,
    handler: async (ctx: Context) => {
      const method = ctx.req.method ?? "GET";
      const { parts, isList } = keyOf(ctx.url.pathname);

      if (method === "GET" || method === "HEAD") {
        if (isList) {
          const limitQ = ctx.url.searchParams.get("limit");
          const reverse = ctx.url.searchParams.get("reverse") === "true";
          const entries = resourceList(store, {
            ...(parts.length ? { prefix: parts } : {}),
            ...(limitQ !== null ? { limit: parseInt(limitQ, 10) } : {}),
            reverse,
          });
          ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
          ctx.res.writeHead(200);
          if (method === "HEAD") ctx.res.end();
          else ctx.res.end(serializeFn(entries));
          return;
        }

        const entry = resourceEntry(store, parts);
        if (!entry) { ctx.res.writeHead(404).end("Not Found"); return; }
        ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
        ctx.res.setHeader("ETag", `"${entry.versionstamp}"`);
        ctx.res.writeHead(200);
        if (method === "HEAD") ctx.res.end();
        else ctx.res.end(serializeFn(entry.value));
        return;
      }

      if (method === "PUT" && !readonly) {
        if (isList) { ctx.res.writeHead(400).end("Cannot PUT a prefix"); return; }
        const current = resourceEntry(store, parts);
        if (current && !ifMatch(ctx.req.headers["if-match"], `"${current.versionstamp}"`)) {
          ctx.res.writeHead(412).end("Precondition Failed");
          return;
        }

        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          ctx.req.on("data", (chunk: Buffer) => chunks.push(chunk));
          ctx.req.on("end", resolve);
          ctx.req.on("error", reject);
        });
        let value: unknown;
        try { value = parseFn(Buffer.concat(chunks).toString("utf8")); }
        catch { ctx.res.writeHead(400).end("Bad Request (unparseable body)"); return; }

        const ttlQ = ctx.url.searchParams.get("ttlMs");
        const setOpts: KvSetOptions = {};
        if (ttlQ !== null) setOpts.ttlMs = parseInt(ttlQ, 10);
        const result = resourceSet(store, parts, value, setOpts);
        ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
        ctx.res.setHeader("ETag", `"${result.versionstamp}"`);
        ctx.res.writeHead(200).end(serializeFn(result));
        return;
      }

      if (method === "DELETE" && !readonly) {
        if (isList) { ctx.res.writeHead(400).end("Cannot DELETE a prefix"); return; }
        resourceDelete(store, parts);
        ctx.res.writeHead(204).end();
        return;
      }

      ctx.res.setHeader("Allow", methods.join(", "));
      ctx.res.writeHead(405).end("Method Not Allowed");
    },
  };
}
