// platform/ws-pubsub.ts — WebSocket topic pub/sub hub.
//
// A hub can be driven directly with WsSession objects or mounted as an
// App.upgrades entry. Topic membership is still recorded as Memes, while the
// operational surface follows modern realtime servers: JSON wire commands,
// presence, optional backlog replay, heartbeat cleanup, and explicit shutdown.

import { recallCell, chargeOfUtterances, witness, UtteranceLog } from "../internal/witness.mjs";
import type { IncomingMessage } from "node:http";
import type { UpgradeHandler } from "../types.mjs";
import { wsUpgrade, type WsMessage, type WsOptions, type WsSession } from "../edge/ws.mjs";

export type WsPubSubWireMessage =
  | { op: "subscribe"; topic: string }
  | { op: "unsubscribe"; topic: string }
  | { op: "publish"; topic: string; data: unknown }
  | { op: "presence"; topic: string };

export type WsPubSubOperation = {
  type: "subscribe" | "unsubscribe" | "publish" | "presence";
  topic: string;
  data?: unknown;
};

export type WsPubSubConnection = WsSession & {
  topics: Set<string>;
  pubsend(frame: unknown): void;
};

export type WsPubSubOptions = {
  /** Max subscribers per topic (default 10_000). */
  maxPerTopic?: number;
  /** Whether server-side publish delivers to sender when `from` is supplied (default false). */
  echo?: boolean;
  /** Ping interval for idle cleanup. 0 disables. Default 30s. */
  heartbeatMs?: number;
  /** Per-topic backlog size replayed on subscribe. Default 0. */
  backlog?: number;
  /** Enable JSON client wire convention. Default true. */
  wire?: boolean;
  encode?: (frame: unknown) => string | Buffer;
  decode?: (text: string) => unknown;
  onConnection?: (conn: WsPubSubConnection, req: IncomingMessage) => void | Promise<void>;
  authorize?: (conn: WsPubSubConnection, op: WsPubSubOperation) => boolean | Promise<boolean>;
  path?: WsOptions["path"];
  admit?: WsOptions["admit"];
  maxMessageBytes?: number;
};

export type PublishOptions = {
  from?: string | null;
  echo?: boolean;
};

type Subscriber = {
  session: WsPubSubConnection;
  topics: Set<string>;
  alive: boolean;
};

let connectionCounter = 0;

function nowEvidence(): string {
  return String(Date.now()); // law-allow: wall-clock-as-data — evidence timestamp testimony, not ordering; connection ids are counter ordinals
}

function normalizeTopics(topics: string | readonly string[] | undefined): string[] {
  if (topics === undefined) return [];
  return typeof topics === "string" ? [topics] : [...topics];
}

function asPublishOptions(fromOrOptions?: string | PublishOptions | null): PublishOptions {
  if (fromOrOptions === undefined || fromOrOptions === null) return {};
  return typeof fromOrOptions === "string" ? { from: fromOrOptions } : fromOrOptions;
}

export class WsPubSub {
  private readonly store = new UtteranceLog();
  private readonly subscribers = new Map<string, Subscriber>();
  private readonly topicIndex = new Map<string, Set<string>>();
  private readonly backlogs = new Map<string, unknown[]>();
  private readonly maxPerTopic: number;
  private readonly echo: boolean;
  private readonly heartbeatMs: number;
  private readonly backlog: number;
  private readonly wire: boolean;
  private readonly encode: (frame: unknown) => string | Buffer;
  private readonly decode: (text: string) => unknown;
  private readonly onConnection: ((conn: WsPubSubConnection, req: IncomingMessage) => void | Promise<void>) | undefined;
  private readonly authorize: ((conn: WsPubSubConnection, op: WsPubSubOperation) => boolean | Promise<boolean>) | undefined;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private readonly upgradeHandler: UpgradeHandler["handler"];

  constructor(opts: WsPubSubOptions = {}) {
    this.maxPerTopic = opts.maxPerTopic ?? 10_000;
    this.echo = opts.echo ?? false;
    this.heartbeatMs = opts.heartbeatMs ?? 30_000;
    this.backlog = opts.backlog ?? 0;
    this.wire = opts.wire ?? true;
    this.encode = opts.encode ?? ((frame) => JSON.stringify(frame));
    this.decode = opts.decode ?? ((text) => JSON.parse(text));
    this.onConnection = opts.onConnection;
    this.authorize = opts.authorize;

    const upgrade = wsUpgrade({
      path: opts.path ?? "/",
      ...(opts.admit ? { admit: opts.admit } : {}),
      ...(opts.maxMessageBytes !== undefined ? { maxMessageBytes: opts.maxMessageBytes } : {}),
      onSession: async (session) => {
        const conn = this.connect(session);
        await this.onConnection?.(conn, session.req);
      },
    });
    this.upgradeHandler = upgrade.handler;
  }

  /** Register a WsSession with the hub. Returns the subscriber handle. */
  subscribe(session: WsSession, topics: string | readonly string[] = []): () => void {
    this.connect(session);
    for (const topic of normalizeTopics(topics)) this.addTopic(session.id, topic);
    return () => this.unsubscribe(session.id);
  }

  /** Enroll a session and install wire/cleanup handlers. Idempotent. */
  connect(session: WsSession): WsPubSubConnection {
    const id = session.id || `ws-pubsub-${++connectionCounter}`;
    let sub = this.subscribers.get(id);
    if (sub) return sub.session;

    const conn = Object.assign(session, {
      topics: new Set<string>(),
      pubsend: (frame: unknown) => {
        const encoded = this.encode(frame);
        session.send(typeof encoded === "string" || Buffer.isBuffer(encoded) ? encoded : String(encoded));
      },
    }) as WsPubSubConnection;

    sub = { session: conn, topics: conn.topics, alive: true };
    this.subscribers.set(id, sub);
    conn.on("message", (message) => {
      if (message.type === "pong" || message.type === "ping") {
        const current = this.subscribers.get(id);
        if (current) current.alive = true;
      }
      void this.onMessage(conn, message);
    });
    conn.on("close", () => this.unsubscribe(id));
    conn.on("error", () => this.unsubscribe(id));
    this.startHeartbeat();
    return conn;
  }

  /** Add a subscriber to a topic. Returns resulting presence count. */
  addTopic(sessionId: string, topic: string): number {
    const sub = this.subscribers.get(sessionId);
    if (!sub || !topic) return 0;

    const current = this.topicIndex.get(topic) ?? new Set<string>();
    if (!current.has(sessionId) && current.size >= this.maxPerTopic) return current.size;
    const already = current.has(sessionId);
    current.add(sessionId);
    this.topicIndex.set(topic, current);
    sub.topics.add(topic);

    witness(this.store, { subject: sessionId, predicate: "topic", object: topic }, [true, false]);

    if (!already && this.backlog > 0) {
      for (const data of this.backlogs.get(topic) ?? []) this.push(sub, topic, data, null, true);
    }
    return current.size;
  }

  /** Archive-compatible alias: subscribe one existing connection to one topic. */
  join(session: WsSession, topic: string): number {
    this.connect(session);
    return this.addTopic(session.id, topic);
  }

  /** Remove a subscriber from a topic. */
  removeTopic(sessionId: string, topic: string): boolean {
    const sub = this.subscribers.get(sessionId);
    const current = this.topicIndex.get(topic);
    const existed = Boolean(current?.delete(sessionId));
    if (sub) sub.topics.delete(topic);
    if (current && current.size === 0) this.topicIndex.delete(topic);

    witness(this.store, { subject: sessionId, predicate: "topic", object: topic }, [false, true]);
    return existed;
  }

  /** Remove a whole session, or one topic when `topic` is provided. */
  unsubscribe(sessionId: string | WsSession, topic?: string): void {
    const id = typeof sessionId === "string" ? sessionId : sessionId.id;
    if (topic !== undefined) {
      this.removeTopic(id, topic);
      return;
    }
    const sub = this.subscribers.get(id);
    if (!sub) return;
    for (const joined of [...sub.topics]) this.removeTopic(id, joined);
    this.subscribers.delete(id);
    if (this.subscribers.size === 0) this.stopHeartbeat();
  }

  /** Publish a message to all subscribers of a topic. */
  publish(topic: string, data: unknown, fromOrOptions?: string | PublishOptions | null): number {
    if (!topic) return 0;
    const options = asPublishOptions(fromOrOptions);
    this.recordBacklog(topic, data);
    const ids = this.topicIndex.get(topic);
    if (!ids?.size) return 0;
    let count = 0;
    for (const id of [...ids]) {
      if (!(options.echo ?? this.echo) && id === options.from) continue;
      const sub = this.subscribers.get(id);
      if (!sub || !this.membershipAdmitted(id, topic)) continue;
      if (this.push(sub, topic, data, options.from ?? null, true)) count++;
    }
    return count;
  }

  /** Publish to all live sessions, irrespective of topic. */
  broadcast(data: unknown, fromOrOptions?: string | PublishOptions | null): number {
    const options = asPublishOptions(fromOrOptions);
    let count = 0;
    for (const [id, sub] of [...this.subscribers]) {
      if (!(options.echo ?? this.echo) && id === options.from) continue;
      if (this.pushRaw(sub, data)) count++;
    }
    return count;
  }

  topics(): string[] {
    return [...this.topicIndex.keys()];
  }

  topicsFor(sessionId: string): string[] {
    return [...(this.subscribers.get(sessionId)?.topics ?? [])];
  }

  presence(topic: string): { topic: string; count: number; members: string[] } {
    const members = [...(this.topicIndex.get(topic) ?? [])].filter((id) => this.subscribers.has(id));
    return { topic, count: members.length, members };
  }

  subscriberCount(topic: string): number {
    return this.presence(topic).count;
  }

  connections(): WsPubSubConnection[] {
    return [...this.subscribers.values()].map((sub) => sub.session);
  }

  get totalSubscribers(): number { return this.subscribers.size; }

  handleUpgrade(req: IncomingMessage, socket: unknown, head: Buffer): void {
    this.upgradeHandler?.(req, socket, head);
  }

  toUpgrade(match?: UpgradeHandler["match"]): UpgradeHandler {
    const entry: UpgradeHandler = {
      handleUpgrade: (req, socket, head) => this.handleUpgrade(req, socket, head),
    };
    if (match !== undefined) entry.match = match;
    return entry;
  }

  close(code = 1001, reason = "shutdown"): void {
    for (const sub of [...this.subscribers.values()]) {
      try { sub.session.close(code, reason); } catch {}
    }
    this.subscribers.clear();
    this.topicIndex.clear();
    this.backlogs.clear();
    this.stopHeartbeat();
  }

  private recordBacklog(topic: string, data: unknown): void {
    if (this.backlog <= 0) return;
    const ring = this.backlogs.get(topic) ?? [];
    ring.push(data);
    if (ring.length > this.backlog) ring.splice(0, ring.length - this.backlog);
    this.backlogs.set(topic, ring);
  }

  private membershipAdmitted(sessionId: string, topic: string): boolean {
    const memes = recallCell(this.store, { subject: sessionId, predicate: "topic", object: topic });
    const charge = chargeOfUtterances(memes);
    return charge === "potential" || charge === "stable";
  }

  private push(sub: Subscriber, topic: string, data: unknown, from: string | null, wireFrame: boolean): boolean {
    try {
      if (this.wire && wireFrame) {
        sub.session.pubsend({ op: "message", topic, data, from });
      } else {
        this.pushRaw(sub, data);
      }
      return true;
    } catch {
      this.unsubscribe(sub.session.id);
      return false;
    }
  }

  private pushRaw(sub: Subscriber, data: unknown): boolean {
    try {
      if (typeof data === "string" || Buffer.isBuffer(data)) sub.session.send(data);
      else sub.session.send(this.encode(data));
      return true;
    } catch {
      this.unsubscribe(sub.session.id);
      return false;
    }
  }

  private async onMessage(conn: WsPubSubConnection, message: WsMessage): Promise<void> {
    if (!this.wire || message.type !== "text") return;
    let raw: unknown;
    try { raw = this.decode(message.data); } catch { return; }
    if (!raw || typeof raw !== "object") return;
    const msg = raw as Partial<WsPubSubWireMessage>;
    const op = msg.op;
    const topic = msg.topic;
    if (typeof topic !== "string") return;

    if (op === "subscribe" || op === "unsubscribe" || op === "presence") {
      if (!(await this.allowed(conn, { type: op, topic }))) return;
      if (op === "subscribe") this.addTopic(conn.id, topic);
      else if (op === "unsubscribe") this.removeTopic(conn.id, topic);
      else conn.pubsend({ op: "presence", ...this.presence(topic) });
    } else if (op === "publish") {
      const data = "data" in msg ? msg.data : null;
      if (!(await this.allowed(conn, { type: "publish", topic, data }))) return;
      this.publish(topic, data, { from: conn.id, echo: true });
    }
  }

  private async allowed(conn: WsPubSubConnection, op: WsPubSubOperation): Promise<boolean> {
    if (!this.authorize) return true;
    try { return await this.authorize(conn, op); } catch { return false; }
  }

  private startHeartbeat(): void {
    if (this.heartbeat || this.heartbeatMs <= 0) return;
    this.heartbeat = setInterval(() => {
      for (const [id, sub] of [...this.subscribers]) {
        if (!sub.alive) {
          try { sub.session.close(1001, "idle"); } catch {}
          this.unsubscribe(id);
          continue;
        }
        sub.alive = false;
        try { sub.session.ping(); } catch { this.unsubscribe(id); }
      }
    }, this.heartbeatMs);
    this.heartbeat.unref?.();
  }

  private stopHeartbeat(): void {
    if (!this.heartbeat) return;
    clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
}

export function wsPubSub(opts: WsPubSubOptions = {}): WsPubSub {
  return new WsPubSub(opts);
}
