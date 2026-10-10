import { createHash } from "node:crypto";
import { createEngine, join, step, submit } from "./engine.mjs";
import { EMPTY_RUNTIME } from "./capabilities.mjs";
import { checkpointEngine } from "./persistence.mjs";

function fail(message) {
  throw new TypeError(message);
}

export function actorIdFor(name) {
  if (typeof name !== "string" || name.trim().length === 0) fail("actor name must be non-empty text");
  const normalized = name.trim().normalize("NFKC").toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 40) || "actor";
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 12);
  return `actor:${slug}-${digest}`;
}

/** In-memory transport/session owner around the pure engine. */
export class MudServer {
  #engine;
  #runtime;
  #pending = [];
  #nextCommand = 1;
  #events = new Map();
  #maxCommandsPerActor;
  #maxAssertions;

  constructor(game, { runtime = EMPTY_RUNTIME, engine = undefined, maxCommandsPerActor = 4, maxAssertions = 10_000 } = {}) {
    if (!Number.isSafeInteger(maxCommandsPerActor) || maxCommandsPerActor < 1) fail("maxCommandsPerActor must be a positive integer");
    if (engine !== undefined && (engine?.kind !== "fizzos.engine.v1" || engine.game.id !== game.id)) fail("restored engine does not belong to this game");
    this.#engine = engine ?? createEngine(game);
    this.#runtime = runtime;
    this.#maxCommandsPerActor = maxCommandsPerActor;
    if (!Number.isSafeInteger(maxAssertions) || maxAssertions < 1) fail("maxAssertions must be a positive integer");
    this.#maxAssertions = maxAssertions;
  }

  connect(name) {
    const actor = actorIdFor(name);
    this.#engine = join(this.#engine, actor);
    if (!this.#events.has(actor)) this.#events.set(actor, []);
    return actor;
  }

  disconnect(actor) {
    this.#events.delete(actor);
    this.#pending = this.#pending.filter((entry) => entry.actor !== actor);
  }

  enqueue(actor, command) {
    if (!this.#engine.actors.includes(actor)) fail(`actor is not connected: ${String(actor)}`);
    if (typeof command !== "string" || command.trim().length === 0) fail("command must be non-empty text");
    this.#pending.push(Object.freeze({ ordinal: this.#nextCommand++, actor, command: command.trim() }));
  }

  tick() {
    const counts = new Map();
    const admitted = [];
    const deferred = [];
    for (const command of this.#pending) {
      const count = counts.get(command.actor) ?? 0;
      if (count < this.#maxCommandsPerActor) {
        counts.set(command.actor, count + 1);
        admitted.push(command);
      } else {
        deferred.push(command);
      }
    }
    this.#pending = deferred;
    for (const command of admitted) this.#engine = submit(this.#engine, command);
    const result = step(this.#engine, { runtime: this.#runtime });
    this.#engine = result.engine;
    if (this.#engine.world.assertions.length > this.#maxAssertions) this.#engine = checkpointEngine(this.#engine);
    for (const entry of result.receipt.events) {
      const queue = this.#events.get(entry.to);
      if (queue !== undefined) queue.push(entry);
    }
    return result.receipt;
  }

  drain(actor) {
    const queue = this.#events.get(actor);
    if (queue === undefined) fail(`actor is not connected: ${String(actor)}`);
    const events = Object.freeze([...queue]);
    queue.length = 0;
    return events;
  }

  engine() { return this.#engine; }

  metrics() {
    return Object.freeze({
      actors: this.#engine.actors.length,
      tick: this.#engine.tick,
      worldAssertions: this.#engine.world.assertions.length,
      pendingCommands: this.#pending.length,
    });
  }
}

export function createMudServer(game, options) {
  return new MudServer(game, options);
}
