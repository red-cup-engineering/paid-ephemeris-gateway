// platform/object-store.ts — Pluggable object store (S3/R2/in-memory).
//
// Object metadata is stored as Memes. Stored charge evidence settles whether an object exists
// (potential) or has been deleted (active). Contradicted objects (stable) are
// still returned with a warning header.
//
// Backend is a pluggable interface — wire up S3, R2, GCS, or the in-memory backend.

import { chargeOfUtterances, witness, UtteranceLog, recallWhere } from "../internal/witness.mjs";
import type { App } from "../types.mjs";
import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { atomicWrite } from "../internal/atomic-write.mjs";
import { httpDate } from "@emsenn/computing-with-http/codecs/http";

export type ObjectMetadata = {
  key: string;
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
  userMeta?: Record<string, string>;
};

export type ObjectBody = Uint8Array | Buffer | AsyncIterable<Uint8Array>;

export type ObjectStoreBackend = {
  get(key: string): Promise<{ body: AsyncIterable<Uint8Array>; meta: ObjectMetadata } | null>;
  put(key: string, body: ObjectBody, meta?: Partial<ObjectMetadata>): Promise<ObjectMetadata>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string, limit?: number): Promise<ObjectMetadata[]>;
  head(key: string): Promise<ObjectMetadata | null>;
};

export type DiskObjectBackendOptions = {
  dir: string;
};

export type BucketedObjectStoreOptions = {
  dir?: string;
};

export type PutObjectOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
};

export type StoredObject = {
  body: Buffer;
  etag?: string;
  size: number;
  lastModified?: Date;
  contentType: string;
  metadata: Record<string, string>;
};

export type ListObjectsOptions = {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  startAfter?: string;
  continuationToken?: string;
};

export type ListObjectsResult = {
  keys: Array<{ key: string; etag?: string; size?: number; lastModified?: Date }>;
  commonPrefixes: string[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
};

const SAFE_BUCKET = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

function isSafeBucket(bucket: string): boolean {
  return SAFE_BUCKET.test(bucket) && bucket !== "." && bucket !== "..";
}

function strongObjectEtag(body: Uint8Array): string {
  return `"${createHash("sha256").update(body).digest("hex")}"`;
}

function contentTypeOf(meta: Partial<ObjectMetadata>): string | undefined {
  return meta.contentType === undefined ? undefined : meta.contentType;
}

function userMetaOf(meta: Partial<ObjectMetadata>): Record<string, string> | undefined {
  return meta.userMeta === undefined ? undefined : { ...meta.userMeta };
}

function metadataFor(key: string, body: Uint8Array, meta: Partial<ObjectMetadata> = {}): ObjectMetadata {
  const out: ObjectMetadata = {
    key,
    size: body.length,
    lastModified: new Date(), // law-allow: wall-clock-as-data — LastModified is S3 protocol testimony
    etag: strongObjectEtag(body),
  };
  const contentType = contentTypeOf(meta);
  const userMeta = userMetaOf(meta);
  if (contentType !== undefined) out.contentType = contentType;
  if (userMeta !== undefined) out.userMeta = userMeta;
  return out;
}

async function collectBody(body: ObjectBody): Promise<Uint8Array> {
  if (Buffer.isBuffer(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof Uint8Array) return body;
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return data;
}

// ── In-memory backend ─────────────────────────────────────────────────────────

export class InMemoryObjectBackend implements ObjectStoreBackend {
  private objects = new Map<string, { body: Uint8Array; meta: ObjectMetadata }>();

  async get(key: string) {
    const obj = this.objects.get(key);
    if (!obj) return null;
    const body = obj.body;
    async function* iter() { yield body; }
    return { body: iter(), meta: obj.meta };
  }

  async put(key: string, body: ObjectBody, meta: Partial<ObjectMetadata> = {}): Promise<ObjectMetadata> {
    const data = await collectBody(body);
    const m = metadataFor(key, data, meta);
    this.objects.set(key, { body: data, meta: m });
    return m;
  }

  async delete(key: string): Promise<boolean> { return this.objects.delete(key); }

  async list(prefix = "", limit = 1000): Promise<ObjectMetadata[]> {
    return [...this.objects.values()]
      .map((o) => o.meta)
      .filter((meta) => meta.key.startsWith(prefix))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, limit);
  }

  async head(key: string): Promise<ObjectMetadata | null> { return this.objects.get(key)?.meta ?? null; }
}

function keyToFile(key: string): string {
  return `${Buffer.from(key, "utf8").toString("hex")}.obj`;
}

function fileToKey(name: string): string {
  return Buffer.from(name.slice(0, -4), "hex").toString("utf8");
}

function keyToMetaFile(key: string): string {
  return `${Buffer.from(key, "utf8").toString("hex")}.meta.json`;
}

function reviveMeta(raw: unknown): ObjectMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.key !== "string" || typeof value.size !== "number") return null;
  const meta: ObjectMetadata = {
    key: value.key,
    size: value.size,
  };
  if (typeof value.contentType === "string") meta.contentType = value.contentType;
  if (typeof value.etag === "string") meta.etag = value.etag;
  if (typeof value.lastModified === "string" || typeof value.lastModified === "number") {
    const date = new Date(value.lastModified);
    if (!Number.isNaN(date.getTime())) meta.lastModified = date;
  }
  if (value.userMeta && typeof value.userMeta === "object") {
    meta.userMeta = Object.fromEntries(
      Object.entries(value.userMeta as Record<string, unknown>).map(([key, item]) => [key, String(item)]),
    );
  }
  return meta;
}

// ── Disk backend ──────────────────────────────────────────────────────────────

export class DiskObjectBackend implements ObjectStoreBackend {
  private readonly options: DiskObjectBackendOptions;
  private readonly ready: Promise<void>;

  constructor(options: DiskObjectBackendOptions) {
    if (!options.dir) throw new TypeError("DiskObjectBackend: { dir } is required");
    this.options = options;
    this.ready = fsp.mkdir(options.dir, { recursive: true }).then(() => undefined);
  }

  private objectPath(key: string): string {
    return join(this.options.dir, keyToFile(key));
  }

  private metaPath(key: string): string {
    return join(this.options.dir, keyToMetaFile(key));
  }

  private async readMeta(key: string): Promise<ObjectMetadata | null> {
    await this.ready;
    try {
      return reviveMeta(JSON.parse(await fsp.readFile(this.metaPath(key), "utf8")));
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<{ body: AsyncIterable<Uint8Array>; meta: ObjectMetadata } | null> {
    await this.ready;
    let body: Buffer;
    try {
      body = await fsp.readFile(this.objectPath(key));
    } catch {
      return null;
    }
    const meta = await this.readMeta(key) ?? metadataFor(key, body);
    async function* iter() { yield body; }
    return { body: iter(), meta };
  }

  async put(key: string, body: ObjectBody, meta: Partial<ObjectMetadata> = {}): Promise<ObjectMetadata> {
    await this.ready;
    const data = await collectBody(body);
    const next = metadataFor(key, data, meta);
    await atomicWrite(this.objectPath(key), data);
    await atomicWrite(this.metaPath(key), JSON.stringify({
      ...next,
      lastModified: next.lastModified?.toISOString(),
    }));
    return next;
  }

  async delete(key: string): Promise<boolean> {
    await this.ready;
    let existed = false;
    try {
      await fsp.stat(this.objectPath(key));
      existed = true;
    } catch {}
    await fsp.rm(this.objectPath(key), { force: true }); // law-allow: delete-not-trace — DeleteObject eviction of the byte store; the ledgered wrapper records the retraction as assertion
    await fsp.rm(this.metaPath(key), { force: true }); // law-allow: delete-not-trace — DeleteObject eviction of the byte store; the ledgered wrapper records the retraction as assertion
    return existed;
  }

  async list(prefix = "", limit = 1000): Promise<ObjectMetadata[]> {
    await this.ready;
    let names: string[];
    try {
      names = await fsp.readdir(this.options.dir);
    } catch {
      return [];
    }
    const metas: ObjectMetadata[] = [];
    for (const name of names) {
      if (!name.endsWith(".obj")) continue;
      let key: string;
      try { key = fileToKey(name); } catch { continue; }
      if (!key.startsWith(prefix)) continue;
      const meta = await this.head(key);
      if (meta) metas.push(meta);
    }
    return metas.sort((a, b) => a.key.localeCompare(b.key)).slice(0, limit);
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    await this.ready;
    const meta = await this.readMeta(key);
    if (meta) return meta;
    try {
      const body = await fsp.readFile(this.objectPath(key));
      return metadataFor(key, body);
    } catch {
      return null;
    }
  }
}

// ── ObjectStore facade ────────────────────────────────────────────────────────

export class ObjectStore {
  private store = new UtteranceLog();
  private readonly backend: ObjectStoreBackend;

  constructor(backend: ObjectStoreBackend) {
    this.backend = backend;
  }

  async get(key: string): Promise<{ body: AsyncIterable<Uint8Array>; meta: ObjectMetadata } | null> {
    const memes = recallWhere(this.store, { subject: key, predicate: "object" });
    const g = chargeOfUtterances(memes);
    if (g === "active") return null; // definitely deleted

    const result = await this.backend.get(key);
    if (!result && g !== "stable") return null;
    return result;
  }

  async put(key: string, body: ObjectBody, meta: Partial<ObjectMetadata> = {}): Promise<ObjectMetadata> {
    const result = await this.backend.put(key, body, meta);
    witness(this.store, { subject: key, predicate: "object", object: "exists" }, [true, false]);
    return result;
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.backend.delete(key);
    witness(this.store, { subject: key, predicate: "object", object: "exists" }, [false, true]);
    return result;
  }

  async list(prefix?: string, limit?: number): Promise<ObjectMetadata[]> {
    return this.backend.list(prefix, limit);
  }

  async head(key: string): Promise<ObjectMetadata | null> { return this.backend.head(key); }
}

// ── Bucketed S3/R2-style object store ─────────────────────────────────────────

export class BucketedObjectStore {
  private readonly options: BucketedObjectStoreOptions;
  private readonly buckets = new Map<string, ObjectStore>();
  private readonly ready: Promise<void>;

  constructor(options: BucketedObjectStoreOptions = {}) {
    this.options = options;
    this.ready = options.dir ? fsp.mkdir(options.dir, { recursive: true }).then(() => undefined) : Promise.resolve();
  }

  private assertBucket(bucket: string): void {
    if (!isSafeBucket(bucket)) throw new TypeError(`objectStore: invalid bucket ${JSON.stringify(bucket)}`);
  }

  private bucketPath(bucket: string): string {
    if (!this.options.dir) throw new TypeError("objectStore: no disk directory configured");
    return join(this.options.dir, bucket);
  }

  private async backendFor(bucket: string, create: boolean): Promise<ObjectStore | null> {
    await this.ready;
    this.assertBucket(bucket);
    const existing = this.buckets.get(bucket);
    if (existing) return existing;
    if (!create && !(await this.hasBucket(bucket))) return null;
    const backend = this.options.dir
      ? new DiskObjectBackend({ dir: this.bucketPath(bucket) })
      : new InMemoryObjectBackend();
    const store = new ObjectStore(backend);
    this.buckets.set(bucket, store);
    return store;
  }

  async createBucket(bucket: string): Promise<boolean> {
    await this.ready;
    this.assertBucket(bucket);
    const existed = await this.hasBucket(bucket);
    if (this.options.dir) await fsp.mkdir(this.bucketPath(bucket), { recursive: true });
    if (!this.buckets.has(bucket)) this.buckets.set(bucket, new ObjectStore(this.options.dir ? new DiskObjectBackend({ dir: this.bucketPath(bucket) }) : new InMemoryObjectBackend()));
    return !existed;
  }

  async hasBucket(bucket: string): Promise<boolean> {
    await this.ready;
    if (!isSafeBucket(bucket)) return false;
    if (this.buckets.has(bucket)) return true;
    if (!this.options.dir) return false;
    try {
      return (await fsp.stat(this.bucketPath(bucket))).isDirectory();
    } catch {
      return false;
    }
  }

  async listBuckets(): Promise<Array<{ name: string }>> {
    await this.ready;
    const names = new Set(this.buckets.keys());
    if (this.options.dir) {
      try {
        for (const entry of await fsp.readdir(this.options.dir, { withFileTypes: true })) {
          if (entry.isDirectory() && isSafeBucket(entry.name)) names.add(entry.name);
        }
      } catch {}
    }
    return [...names].sort().map((name) => ({ name }));
  }

  async deleteBucket(bucket: string): Promise<"deleted" | "absent" | "not-empty"> {
    await this.ready;
    if (!isSafeBucket(bucket)) return "absent";
    const list = await this.listObjects(bucket, {});
    if (list === null) return "absent";
    if (list.keys.length || list.commonPrefixes.length) return "not-empty";
    this.buckets.delete(bucket);
    if (this.options.dir) await fsp.rm(this.bucketPath(bucket), { recursive: true, force: true }); // law-allow: delete-not-trace — DeleteBucket eviction commanded by the S3 protocol; forgetting at the caller's explicit request
    return "deleted";
  }

  async putObject(bucket: string, key: string, body: ObjectBody, opts: PutObjectOptions = {}): Promise<StoredObject> {
    if (!key) throw new TypeError("objectStore: a non-empty key is required");
    const store = await this.backendFor(bucket, true);
    const data = await collectBody(body);
    const metadata = await store!.put(key, data, {
      contentType: opts.contentType ?? "application/octet-stream",
      userMeta: opts.metadata ?? {},
    });
    const out: StoredObject = {
      body: Buffer.from(data),
      size: metadata.size,
      contentType: metadata.contentType ?? "application/octet-stream",
      metadata: metadata.userMeta ?? {},
    };
    if (metadata.etag !== undefined) out.etag = metadata.etag;
    if (metadata.lastModified !== undefined) out.lastModified = metadata.lastModified;
    return out;
  }

  async getObject(bucket: string, key: string): Promise<StoredObject | null> {
    const store = await this.backendFor(bucket, false);
    if (!store) return null;
    const obj = await store.get(key);
    if (!obj) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of obj.body) chunks.push(Buffer.from(chunk));
    const out: StoredObject = {
      body: Buffer.concat(chunks),
      size: obj.meta.size,
      contentType: obj.meta.contentType ?? "application/octet-stream",
      metadata: obj.meta.userMeta ?? {},
    };
    if (obj.meta.etag !== undefined) out.etag = obj.meta.etag;
    if (obj.meta.lastModified !== undefined) out.lastModified = obj.meta.lastModified;
    return out;
  }

  async headObject(bucket: string, key: string): Promise<Omit<StoredObject, "body"> | null> {
    const store = await this.backendFor(bucket, false);
    if (!store) return null;
    const meta = await store.head(key);
    if (!meta) return null;
    const out: Omit<StoredObject, "body"> = {
      size: meta.size,
      contentType: meta.contentType ?? "application/octet-stream",
      metadata: meta.userMeta ?? {},
    };
    if (meta.etag !== undefined) out.etag = meta.etag;
    if (meta.lastModified !== undefined) out.lastModified = meta.lastModified;
    return out;
  }

  async deleteObject(bucket: string, key: string): Promise<boolean> {
    const store = await this.backendFor(bucket, false);
    return store ? store.delete(key) : false;
  }

  async listObjects(bucket: string, opts: ListObjectsOptions = {}): Promise<ListObjectsResult | null> {
    const store = await this.backendFor(bucket, false);
    if (!store) return null;
    const prefix = opts.prefix ?? "";
    const delimiter = opts.delimiter ?? "";
    const maxKeys = Number.isFinite(opts.maxKeys) && (opts.maxKeys ?? 0) > 0 ? Math.floor(opts.maxKeys!) : 1000;
    const after = opts.continuationToken ?? opts.startAfter ?? null;
    const all = (await store.list(prefix, Number.MAX_SAFE_INTEGER))
      .filter((meta) => after === null || meta.key > after)
      .sort((a, b) => a.key.localeCompare(b.key));
    const keys: ListObjectsResult["keys"] = [];
    const commonPrefixSet = new Set<string>();
    let lastEmitted: string | null = null;
    let isTruncated = false;
    let nextContinuationToken: string | null = null;

    for (const meta of all) {
      if (delimiter) {
        const rest = meta.key.slice(prefix.length);
        const index = rest.indexOf(delimiter);
        if (index !== -1) {
          const common = prefix + rest.slice(0, index + delimiter.length);
          if (!commonPrefixSet.has(common)) {
            if (keys.length + commonPrefixSet.size >= maxKeys) {
              isTruncated = true;
              nextContinuationToken = lastEmitted;
              break;
            }
            commonPrefixSet.add(common);
          }
          lastEmitted = meta.key;
          continue;
        }
      }
      if (keys.length + commonPrefixSet.size >= maxKeys) {
        isTruncated = true;
        nextContinuationToken = lastEmitted;
        break;
      }
      const entry: { key: string; etag?: string; size?: number; lastModified?: Date } = {
        key: meta.key,
        size: meta.size,
      };
      if (meta.etag !== undefined) entry.etag = meta.etag;
      if (meta.lastModified !== undefined) entry.lastModified = meta.lastModified;
      keys.push(entry);
      lastEmitted = meta.key;
    }
    return {
      keys,
      commonPrefixes: [...commonPrefixSet].sort(),
      isTruncated,
      nextContinuationToken,
    };
  }
}

export function objectStore(options: BucketedObjectStoreOptions = {}): BucketedObjectStore {
  return new BucketedObjectStore(options);
}

function xmlEscape(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const XML_TYPE = "application/xml; charset=utf-8";
const S3_NS = "http://s3.amazonaws.com/doc/2006-03-01/";

export function listObjectsV2Xml(bucket: string, result: ListObjectsResult, opts: ListObjectsOptions = {}): string {
  const prefix = opts.prefix ?? "";
  const delimiter = opts.delimiter ?? "";
  const maxKeys = opts.maxKeys ?? 1000;
  const contents = result.keys.map((object) => {
    const parts = [`<Key>${xmlEscape(object.key)}</Key>`];
    if (object.lastModified) parts.push(`<LastModified>${object.lastModified.toISOString()}</LastModified>`);
    if (object.etag) parts.push(`<ETag>${xmlEscape(object.etag)}</ETag>`);
    if (object.size !== undefined) parts.push(`<Size>${object.size}</Size>`);
    parts.push("<StorageClass>STANDARD</StorageClass>");
    return `<Contents>${parts.join("")}</Contents>`;
  }).join("");
  const common = result.commonPrefixes
    .map((prefixValue) => `<CommonPrefixes><Prefix>${xmlEscape(prefixValue)}</Prefix></CommonPrefixes>`)
    .join("");
  const next = result.nextContinuationToken
    ? `<NextContinuationToken>${xmlEscape(result.nextContinuationToken)}</NextContinuationToken>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ListBucketResult xmlns="${S3_NS}">` +
    `<Name>${xmlEscape(bucket)}</Name>` +
    `<Prefix>${xmlEscape(prefix)}</Prefix>` +
    (delimiter ? `<Delimiter>${xmlEscape(delimiter)}</Delimiter>` : "") +
    `<KeyCount>${result.keys.length + result.commonPrefixes.length}</KeyCount>` +
    `<MaxKeys>${maxKeys}</MaxKeys>` +
    `<IsTruncated>${result.isTruncated ? "true" : "false"}</IsTruncated>` +
    next +
    contents +
    common +
    "</ListBucketResult>";
}

function s3ErrorXml(code: string, message: string, resource?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Error><Code>${xmlEscape(code)}</Code><Message>${xmlEscape(message)}</Message>` +
    (resource ? `<Resource>${xmlEscape(resource)}</Resource>` : "") +
    "</Error>";
}

function writeXml(ctx: Parameters<NonNullable<App["resources"]>[number]["handler"]>[0], status: number, body = "", headers: Record<string, string | number> = {}): void {
  ctx.res.writeHead(status, { "content-type": XML_TYPE, ...headers }).end(ctx.req.method === "HEAD" ? undefined : body);
}

function writeS3Error(ctx: Parameters<NonNullable<App["resources"]>[number]["handler"]>[0], status: number, code: string, message: string, resource?: string): void {
  writeXml(ctx, status, s3ErrorXml(code, message, resource));
}

function parseS3Path(path: string, mount: string): { bucket: string; key: string } {
  const prefix = mount === "/" ? "/" : (mount.endsWith("/") ? mount : `${mount}/`);
  const rel = (mount === "/" ? path : path.slice(prefix.length)).replace(/^\/+/, "");
  const slash = rel.indexOf("/");
  if (slash === -1) return { bucket: rel ? decodeURIComponent(rel) : "", key: "" };
  return {
    bucket: decodeURIComponent(rel.slice(0, slash)),
    key: rel.slice(slash + 1).split("/").map((part) => decodeURIComponent(part)).join("/"),
  };
}

async function readRequestBody(req: Parameters<NonNullable<App["resources"]>[number]["handler"]>[0]["req"]): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function s3UserMetadata(headers: Parameters<NonNullable<App["resources"]>[number]["handler"]>[0]["req"]["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!name.toLowerCase().startsWith("x-amz-meta-") || value === undefined) continue;
    out[name.slice("x-amz-meta-".length)] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return out;
}

function setObjectHeaders(ctx: Parameters<NonNullable<App["resources"]>[number]["handler"]>[0], meta: Omit<StoredObject, "body">): void {
  ctx.res.setHeader("Content-Type", meta.contentType);
  ctx.res.setHeader("Content-Length", meta.size);
  ctx.res.setHeader("Accept-Ranges", "bytes");
  if (meta.etag) ctx.res.setHeader("ETag", meta.etag);
  if (meta.lastModified) ctx.res.setHeader("Last-Modified", httpDate(meta.lastModified));
  for (const [name, value] of Object.entries(meta.metadata)) ctx.res.setHeader(`x-amz-meta-${name}`, value);
}

function bucketS3Resource(store: BucketedObjectStore, mount = "/"): NonNullable<App["resources"]>[number] {
  return {
    match: (path) => {
      const prefix = mount === "/" ? "/" : (mount.endsWith("/") ? mount : `${mount}/`);
      return mount === "/" ? path.startsWith("/") : (path === mount || path === prefix || path.startsWith(prefix));
    },
    methods: ["GET", "HEAD", "PUT", "DELETE"],
    handler: async (ctx) => {
      const method = ctx.req.method ?? "GET";
      const { bucket, key } = parseS3Path(ctx.url.pathname, mount);
      if (!bucket) {
        writeS3Error(ctx, method === "GET" || method === "HEAD" ? 404 : 400, method === "GET" || method === "HEAD" ? "NoSuchBucket" : "InvalidRequest", method === "GET" || method === "HEAD" ? "The specified bucket does not exist" : "A bucket must be specified", ctx.url.pathname);
        return;
      }
      if (!isSafeBucket(bucket)) {
        writeS3Error(ctx, 400, "InvalidBucketName", "The specified bucket is not valid.", bucket);
        return;
      }

      if (key) {
        if (method === "PUT") {
          const contentTypeHeader = ctx.req.headers["content-type"];
          const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
          const obj = await store.putObject(bucket, key, await readRequestBody(ctx.req), {
            contentType: contentType ?? "application/octet-stream",
            metadata: s3UserMetadata(ctx.req.headers),
          });
          const headers: Record<string, string | number> = {};
          if (obj.etag) headers.etag = obj.etag;
          writeXml(ctx, 200, "", headers);
          return;
        }
        if (method === "GET" || method === "HEAD") {
          const obj = method === "HEAD" ? await store.headObject(bucket, key) : await store.getObject(bucket, key);
          if (!obj) {
            writeS3Error(ctx, 404, "NoSuchKey", "The specified key does not exist.", key);
            return;
          }
          setObjectHeaders(ctx, obj);
          ctx.res.writeHead(200);
          if (method === "HEAD") ctx.res.end();
          else ctx.res.end((obj as StoredObject).body);
          return;
        }
        if (method === "DELETE") {
          await store.deleteObject(bucket, key);
          ctx.res.writeHead(204).end();
          return;
        }
      } else {
        if (method === "PUT") {
          await store.createBucket(bucket);
          writeXml(ctx, 200, "", { location: `/${bucket}` });
          return;
        }
        if (method === "DELETE") {
          const result = await store.deleteBucket(bucket);
          if (result === "absent") writeS3Error(ctx, 404, "NoSuchBucket", "The specified bucket does not exist", bucket);
          else if (result === "not-empty") writeS3Error(ctx, 409, "BucketNotEmpty", "The bucket you tried to delete is not empty", bucket); // law-allow: delete-not-trace — string literal in the S3 BucketNotEmpty message, not a delete
          else ctx.res.writeHead(204).end();
          return;
        }
        if (method === "GET" || method === "HEAD") {
          const listOptions: ListObjectsOptions = {
            prefix: ctx.url.searchParams.get("prefix") ?? "",
            delimiter: ctx.url.searchParams.get("delimiter") ?? "",
            maxKeys: ctx.url.searchParams.has("max-keys") ? parseInt(ctx.url.searchParams.get("max-keys") ?? "1000", 10) : 1000,
          };
          const startAfter = ctx.url.searchParams.get("start-after");
          const continuationToken = ctx.url.searchParams.get("continuation-token");
          if (startAfter !== null) listOptions.startAfter = startAfter;
          if (continuationToken !== null) listOptions.continuationToken = continuationToken;
          const result = await store.listObjects(bucket, listOptions);
          if (!result) {
            writeS3Error(ctx, 404, "NoSuchBucket", "The specified bucket does not exist", bucket);
            return;
          }
          writeXml(ctx, 200, listObjectsV2Xml(bucket, result, listOptions));
          return;
        }
      }
      writeS3Error(ctx, 405, "MethodNotAllowed", "The specified method is not allowed.", key || bucket);
    },
  };
}

/** Build a /objects REST API resource set. */
export function s3Resource(store: ObjectStore, prefix?: string): NonNullable<App["resources"]>[number][];
export function s3Resource(store: BucketedObjectStore, options?: { mount?: string } | string): NonNullable<App["resources"]>[number];
export function s3Resource(store: ObjectStore | BucketedObjectStore, prefix: string | { mount?: string } = "/objects"): NonNullable<App["resources"]>[number][] | NonNullable<App["resources"]>[number] {
  if (store instanceof BucketedObjectStore) {
    return bucketS3Resource(store, typeof prefix === "string" ? prefix : prefix.mount ?? "/");
  }
  if (typeof prefix !== "string") prefix = prefix.mount ?? "/objects";
  const root = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const objectPrefix = `${root}/`;

  function keyFrom(path: string): string | null {
    if (!path.startsWith(objectPrefix)) return null;
    const raw = path.slice(objectPrefix.length);
    if (!raw) return null;
    return raw.split("/").map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    }).join("/");
  }

  function userMetaHeaders(meta: ObjectMetadata): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(meta.userMeta ?? {})) {
      headers[`X-Amz-Meta-${key}`] = value;
    }
    return headers;
  }

  return [
    {
      match: (path) => {
        const key = keyFrom(path);
        return key === null ? false : { key };
      },
      methods: ["GET", "HEAD", "PUT", "DELETE"],
      handler: async (ctx) => {
        const key = ctx.params["key"] ?? "";
        const method = ctx.req.method ?? "GET";

        if (method === "GET" || method === "HEAD") {
          const obj = await store.get(key);
          if (!obj) { ctx.res.writeHead(404).end("Not Found"); return; }
          if (obj.meta.contentType) ctx.res.setHeader("Content-Type", obj.meta.contentType);
          if (obj.meta.etag) ctx.res.setHeader("ETag", obj.meta.etag);
          if (obj.meta.lastModified) ctx.res.setHeader("Last-Modified", obj.meta.lastModified.toUTCString());
          for (const [name, value] of Object.entries(userMetaHeaders(obj.meta))) ctx.res.setHeader(name, value);
          ctx.res.setHeader("Content-Length", obj.meta.size);
          if (method === "HEAD") { ctx.res.writeHead(200).end(); return; }
          ctx.res.writeHead(200);
          for await (const chunk of obj.body) ctx.res.write(chunk);
          ctx.res.end();
        } else if (method === "PUT") {
          const chunks: Buffer[] = [];
          await new Promise<void>((res, rej) => {
            ctx.req.on("data", (c: Buffer) => chunks.push(c));
            ctx.req.on("end", () => res());
            ctx.req.on("error", rej);
          });
          const body = Buffer.concat(chunks);
          const ct = ctx.req.headers["content-type"];
          const userMeta: Record<string, string> = {};
          for (const [name, value] of Object.entries(ctx.req.headers)) {
            if (!name.toLowerCase().startsWith("x-amz-meta-") || value === undefined) continue;
            userMeta[name.slice("x-amz-meta-".length)] = Array.isArray(value) ? value.join(",") : String(value);
          }
          const putMeta: Partial<ObjectMetadata> = {};
          if (ct !== undefined) putMeta.contentType = Array.isArray(ct) ? ct[0] : ct;
          if (Object.keys(userMeta).length) putMeta.userMeta = userMeta;
          const meta = await store.put(key, body, putMeta);
          if (meta.etag) ctx.res.setHeader("ETag", meta.etag);
          ctx.res.setHeader("Content-Type", "application/json");
          ctx.res.writeHead(200).end(JSON.stringify(meta));
        } else if (method === "DELETE") {
          const ok = await store.delete(key);
          ctx.res.writeHead(ok ? 204 : 404).end();
        }
      },
    },
    {
      match: root,
      methods: ["GET"],
      handler: async (ctx) => {
        const prefix = ctx.url.searchParams.get("prefix") ?? undefined;
        const limit = parseInt(ctx.url.searchParams.get("limit") ?? "1000", 10);
        const list = await store.list(prefix, limit);
        ctx.res.setHeader("Content-Type", "application/json");
        ctx.res.writeHead(200).end(JSON.stringify(list));
      },
    },
  ];
}
