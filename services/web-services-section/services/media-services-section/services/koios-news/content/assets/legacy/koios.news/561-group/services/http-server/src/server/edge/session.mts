import { randomBytes } from "node:crypto";
import type { CookieOptions } from "@emsenn/computing-with-http/codecs/cookie";
import { deleteCookie, getSignedCookie, setSignedCookie } from "../cookies.mjs";
import type { Context, Middleware } from "../types.mjs";

export type SessionData = Record<string, unknown>;

export type SessionRecord<T extends SessionData = SessionData> = Readonly<{
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
}>;

export type SessionStore<T extends SessionData = SessionData> = Readonly<{
  get(id: string): SessionRecord<T> | undefined;
  set(record: SessionRecord<T>): void;
  delete(id: string): boolean;
}>;

export type MemorySessionStore<T extends SessionData = SessionData> = SessionStore<T> & Readonly<{
  size(): number;
  sweep(now?: number): number;
  entries(): SessionRecord<T>[];
}>;

export type SessionHandle<T extends SessionData = SessionData> = {
  id: string;
  data: T;
  isNew: boolean;
  destroyed: boolean;
  commit(): void;
  destroy(): void;
  regenerate(data?: T): void;
};

export type FlashBag = Readonly<Record<string, readonly unknown[]>>;

export type FlashHandle = {
  peek(type?: string): readonly unknown[] | FlashBag;
  consume(type?: string): readonly unknown[] | FlashBag;
  push(type: string, message: unknown): void;
  clear(type?: string): void;
};

export type SessionOptions<T extends SessionData = SessionData> = Readonly<{
  secret: string;
  cookieName?: string;
  cookie?: CookieOptions;
  ttlMs?: number;
  rolling?: boolean;
  store?: SessionStore<T>;
  localsKey?: string;
  dataLocalsKey?: string;
  idLocalsKey?: string;
  generateId?: () => string;
  now?: () => number;
}>;

export type FlashOptions = Readonly<{
  sessionLocalsKey?: string;
  localsKey?: string;
  sessionKey?: string;
}>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function memorySessionStore<T extends SessionData = SessionData>(): MemorySessionStore<T> {
  const records = new Map<string, SessionRecord<T>>();
  const get = (id: string): SessionRecord<T> | undefined => {
    const record = records.get(id);
    return record ? cloneRecord(record) : undefined;
  };
  const set = (record: SessionRecord<T>): void => {
    records.set(record.id, cloneRecord(record));
  };
  return Object.freeze({
    get,
    set,
    delete: (id) => records.delete(id),
    size: () => records.size,
    sweep(now = Date.now()) { // law-allow: wall-clock-as-data — expiry sweep bookkeeping; now is injectable
      let removed = 0;
      for (const [id, record] of records) {
        if (record.expiresAt !== null && record.expiresAt <= now) {
          records.delete(id);
          removed++;
        }
      }
      return removed;
    },
    entries: () => [...records.values()].map(cloneRecord),
  });
}

export function session<T extends SessionData = SessionData>(options: SessionOptions<T>): Middleware {
  if (!options.secret) throw new TypeError("session: secret is required");
  const cookieName = options.cookieName ?? "sid";
  const store = options.store ?? memorySessionStore<T>();
  const ttlMs = Math.max(0, Math.trunc(options.ttlMs ?? WEEK_MS));
  const rolling = options.rolling ?? false;
  const localsKey = options.localsKey ?? "sessionHandle";
  const dataLocalsKey = options.dataLocalsKey ?? "session";
  const idLocalsKey = options.idLocalsKey ?? "sessionId";
  const now = options.now ?? (() => Date.now()); // law-allow: wall-clock-as-data — injectable clock seam default; callers may pass now; session expiry bookkeeping
  const generateId = options.generateId ?? (() => randomBytes(24).toString("base64url"));
  const cookie: CookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    ...options.cookie,
  };

  return (ctx) => {
    const issued = getSignedCookie(ctx.req, cookieName, options.secret);
    const loaded = issued ? validRecord(store.get(issued), now()) : undefined;
    const start = now();
    let id = loaded?.id ?? generateId();
    let data = cloneData((loaded?.data ?? {}) as T);
    let isNew = loaded === undefined;
    let destroyed = false;
    let committed = false;

    const expiresAt = (): number | null => ttlMs > 0 ? now() + ttlMs : null;
    const handle: SessionHandle<T> = {
      get id() { return id; },
      set id(value: string) { id = value; },
      get data() { return data; },
      set data(value: T) {
        data = cloneData(value);
        ctx.locals[dataLocalsKey] = data;
      },
      get isNew() { return isNew; },
      set isNew(value: boolean) { isNew = value; },
      get destroyed() { return destroyed; },
      set destroyed(value: boolean) { destroyed = value; },
      commit() {
        if (committed || ctx.res.headersSent) return;
        committed = true;
        if (destroyed) {
          store.delete(id);
          deleteCookie(ctx.res, cookieName, cookie);
          return;
        }
        const record: SessionRecord<T> = {
          id,
          data: cloneData(data),
          createdAt: loaded?.createdAt ?? start,
          updatedAt: now(),
          expiresAt: expiresAt(),
        };
        store.set(record);
        if (isNew || rolling) setSignedCookie(ctx.res, cookieName, id, options.secret, cookie);
      },
      destroy() {
        destroyed = true;
      },
      regenerate(nextData: T = {} as T) {
        store.delete(id);
        id = generateId();
        data = cloneData(nextData);
        isNew = true;
        destroyed = false;
        committed = false;
        ctx.locals[idLocalsKey] = id;
        ctx.locals[dataLocalsKey] = data;
      },
    };

    ctx.locals[localsKey] = handle;
    ctx.locals[idLocalsKey] = id;
    ctx.locals[dataLocalsKey] = data;
    installSessionCommitHook(ctx, handle);
  };
}

export { session as sessionMiddleware };

export function flash(options: FlashOptions = {}): Middleware {
  const sessionLocalsKey = options.sessionLocalsKey ?? "sessionHandle";
  const localsKey = options.localsKey ?? "flash";
  const sessionKey = options.sessionKey ?? "_flash";

  return (ctx) => {
    const sessionHandle = ctx.locals[sessionLocalsKey] as SessionHandle | undefined;
    if (!sessionHandle) throw new TypeError("flash: session middleware must run before flash middleware");

    const incoming = cloneFlashBag(sessionHandle.data[sessionKey]);
    const outgoing = new Map<string, unknown[]>();
    delete sessionHandle.data[sessionKey]; // law-allow: delete-not-trace — flash bag is consume-on-read by contract; ephemeral session state, not witnessed evidence

    const handle: FlashHandle = {
      peek(type?: string) {
        return type === undefined ? freezeFlashMap(incoming) : Object.freeze([...(incoming.get(type) ?? [])]);
      },
      consume(type?: string) {
        if (type === undefined) {
          const all = freezeFlashMap(incoming);
          incoming.clear();
          return all;
        }
        const values = Object.freeze([...(incoming.get(type) ?? [])]);
        incoming.delete(type);
        return values;
      },
      push(type: string, message: unknown) {
        const key = String(type);
        const messages = outgoing.get(key) ?? [];
        messages.push(message);
        outgoing.set(key, messages);
      },
      clear(type?: string) {
        if (type === undefined) {
          incoming.clear();
          outgoing.clear();
          return;
        }
        incoming.delete(type);
        outgoing.delete(type);
      },
    };

    ctx.locals[localsKey] = handle;
    installFlashCommitHook(ctx, sessionHandle, sessionKey, outgoing);
  };
}

export { flash as flashMessages };

function installSessionCommitHook<T extends SessionData>(ctx: Context, handle: SessionHandle<T>): void {
  const res = ctx.res as unknown as {
    writeHead: (...args: any[]) => unknown;
    end: (...args: any[]) => unknown;
  };
  const originalWriteHead = res.writeHead.bind(res);
  const originalEnd = res.end.bind(res);
  res.writeHead = (...args: any[]) => {
    handle.commit();
    return originalWriteHead(...args);
  };
  res.end = (...args: any[]) => {
    handle.commit();
    return originalEnd(...args);
  };
}

function installFlashCommitHook(ctx: Context, sessionHandle: SessionHandle, sessionKey: string, outgoing: ReadonlyMap<string, readonly unknown[]>): void {
  const res = ctx.res as unknown as {
    writeHead: (...args: any[]) => unknown;
    end: (...args: any[]) => unknown;
  };
  const originalWriteHead = res.writeHead.bind(res);
  const originalEnd = res.end.bind(res);
  let committed = false;
  const commit = () => {
    if (committed || ctx.res.headersSent || sessionHandle.destroyed) return;
    committed = true;
    const next = freezeFlashMap(outgoing);
    if (Object.keys(next).length > 0) sessionHandle.data[sessionKey] = next;
    else delete sessionHandle.data[sessionKey]; // law-allow: delete-not-trace — flash bag is consume-on-read by contract; ephemeral session state, not witnessed evidence
  };
  res.writeHead = (...args: any[]) => {
    commit();
    return originalWriteHead(...args);
  };
  res.end = (...args: any[]) => {
    commit();
    return originalEnd(...args);
  };
}

function validRecord<T extends SessionData>(record: SessionRecord<T> | undefined, now: number): SessionRecord<T> | undefined {
  if (!record) return undefined;
  return record.expiresAt !== null && record.expiresAt <= now ? undefined : record;
}

function cloneRecord<T extends SessionData>(record: SessionRecord<T>): SessionRecord<T> {
  return Object.freeze({
    id: record.id,
    data: cloneData(record.data),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
  });
}

function cloneData<T extends SessionData>(data: T): T {
  try {
    return structuredClone(data) as T;
  } catch {
    return { ...data };
  }
}

function cloneFlashBag(value: unknown): Map<string, unknown[]> {
  const out = new Map<string, unknown[]>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages)) out.set(key, [...messages]);
  }
  return out;
}

function freezeFlashMap(messages: ReadonlyMap<string, readonly unknown[]>): FlashBag {
  return Object.freeze(Object.fromEntries([...messages.entries()].map(([key, value]) => [key, Object.freeze([...value])])));
}
