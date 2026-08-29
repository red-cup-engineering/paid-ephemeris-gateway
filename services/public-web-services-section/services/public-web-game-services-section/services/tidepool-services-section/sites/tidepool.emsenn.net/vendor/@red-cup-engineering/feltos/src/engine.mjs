import { instantiateGame } from "./game.mjs";
import { contentsOf, move, perceive, placeOf, tell, value } from "./world.mjs";
import { EMPTY_RUNTIME } from "./capabilities.mjs";

const ACTOR_IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

function freezeEngine(engine) {
  return Object.freeze({
    ...engine,
    actors: Object.freeze([...engine.actors].sort(compareText)),
    queue: Object.freeze([...engine.queue]),
  });
}

export function createEngine(game) {
  if (game?.kind !== "feltos.game.v1") fail("createEngine requires a defined game");
  return freezeEngine({
    kind: "feltos.engine.v1",
    game,
    world: instantiateGame(game),
    actors: [],
    tick: 0,
    nextIntent: 1,
    queue: [],
  });
}

/** Join is a control-plane admission, not a simulation tick. */
export function join(engine, actor, { at = engine.game.start } = {}) {
  if (engine?.kind !== "feltos.engine.v1") fail("join requires a FeltOS engine");
  if (typeof actor !== "string" || !ACTOR_IDENTIFIER.test(actor)) fail("actor must be a stable lowercase identifier");
  if (actor in engine.game.rooms || actor in engine.game.things) fail(`actor id collides with game content: ${actor}`);
  if (!(at in engine.game.rooms)) fail(`unknown join room: ${String(at)}`);
  if (engine.actors.includes(actor)) return engine;
  let world = move(engine.world, actor, at, { source: "feltos.join" });
  world = tell(world, [
    { subject: actor, predicate: "kind", object: "actor" },
    { subject: actor, predicate: "name", object: actor },
  ], { source: "feltos.join" });
  return freezeEngine({ ...engine, world, actors: [...engine.actors, actor] });
}

export function submit(engine, intent) {
  if (engine?.kind !== "feltos.engine.v1") fail("submit requires a FeltOS engine");
  if (intent === null || typeof intent !== "object" || Array.isArray(intent)) fail("intent must be a record");
  if (!engine.actors.includes(intent.actor)) fail(`actor has not joined: ${String(intent.actor)}`);
  if (typeof intent.command !== "string" || intent.command.trim().length === 0) fail("intent command must be non-empty text");
  const admitted = Object.freeze({
    kind: "feltos.command.v1",
    ordinal: engine.nextIntent,
    actor: intent.actor,
    command: intent.command.trim(),
  });
  return freezeEngine({
    ...engine,
    nextIntent: engine.nextIntent + 1,
    queue: [...engine.queue, admitted],
  });
}

export function message(to, text, channel = "system") {
  return Object.freeze({ kind: "feltos.message.v1", to, channel, text });
}

function displayName(world, subject) {
  const name = value(world, subject, "name");
  return typeof name === "string" ? name : subject;
}

function resolveVisible(world, actor, token) {
  const needle = token.toLowerCase();
  const view = perceive(world, actor);
  return view.subjects.find((subject) => subject === token
    || displayName(world, subject).toLowerCase() === needle) ?? null;
}

function renderRoom(world, actor) {
  const place = placeOf(world, actor);
  if (place === null) return "You are nowhere.";
  const name = displayName(world, place);
  const description = value(world, place, "description") ?? "";
  const occupants = contentsOf(world, place).filter((subject) => subject !== actor);
  const exits = Object.keys(
    perceive(world, actor).cells
      .filter(({ subject, predicate, evidence }) => subject === place && predicate.startsWith("exit:") && evidence.positiveEvidence)
      .reduce((out, { predicate }) => ({ ...out, [predicate.slice(5)]: true }), {}),
  ).sort(compareText);
  const lines = [name, String(description)];
  if (occupants.length > 0) lines.push(`Here: ${occupants.map((subject) => displayName(world, subject)).join(", ")}`);
  lines.push(`Exits: ${exits.length > 0 ? exits.join(", ") : "none"}`);
  return lines.join("\n");
}

function validateCapabilityResult(result, fallbackWorld, capabilityId) {
  if (result === undefined) return { world: fallbackWorld, events: [] };
  if (result === null || typeof result !== "object" || Array.isArray(result)) fail(`capability ${capabilityId} returned an invalid result`);
  const world = result.world ?? fallbackWorld;
  if (world?.kind !== "feltos.world.v1") fail(`capability ${capabilityId} returned an invalid world`);
  const events = result.events ?? [];
  if (!Array.isArray(events) || events.some((entry) => entry?.kind !== "feltos.message.v1")) {
    fail(`capability ${capabilityId} returned invalid events`);
  }
  return { world, events };
}

function capabilityContext(engine, intent, verb, argument) {
  return Object.freeze({
    actor: intent.actor,
    verb,
    argument,
    command: intent.command,
    tick: engine.tick,
    game: engine.game,
    actors: engine.actors,
    world: engine.world,
    contentsOf,
    message,
    move,
    perceive,
    placeOf,
    tell,
    value,
  });
}

function execute(engine, intent, runtime) {
  const [rawVerb, ...words] = intent.command.split(/\s+/u);
  const verb = rawVerb.toLowerCase();
  const argument = words.join(" ");
  const actor = intent.actor;
  let world = engine.world;
  const events = [];
  const room = placeOf(world, actor);

  if (verb === "look" || verb === "l") {
    events.push(message(actor, argument.length === 0
      ? renderRoom(world, actor)
      : (() => {
        const subject = resolveVisible(world, actor, argument);
        return subject === null ? `You do not see ${argument}.` : String(value(world, subject, "description") ?? displayName(world, subject));
      })()));
  } else if (verb === "inventory" || verb === "i") {
    const inventory = contentsOf(world, actor);
    events.push(message(actor, inventory.length === 0 ? "You carry nothing." : `You carry: ${inventory.map((id) => displayName(world, id)).join(", ")}`));
  } else if (verb === "go" || verb === "move") {
    if (argument.length === 0 || room === null) {
      events.push(message(actor, "Go where?"));
    } else {
      const destination = value(world, room, `exit:${argument.toLowerCase()}`);
      if (typeof destination !== "string") events.push(message(actor, `There is no exit ${argument}.`));
      else {
        world = move(world, actor, destination, { source: "feltos.command.go" });
        events.push(message(actor, renderRoom(world, actor)));
      }
    }
  } else if (verb === "take" || verb === "get") {
    const subject = resolveVisible(world, actor, argument);
    if (subject === null || room === null || placeOf(world, subject) !== room || value(world, subject, "kind") !== "thing") {
      events.push(message(actor, `You cannot take ${argument || "that"}.`));
    } else {
      world = move(world, subject, actor, { source: "feltos.command.take" });
      events.push(message(actor, `You take ${displayName(world, subject)}.`));
    }
  } else if (verb === "drop") {
    const subject = contentsOf(world, actor).find((id) => id === argument
      || displayName(world, id).toLowerCase() === argument.toLowerCase());
    if (subject === undefined || room === null) events.push(message(actor, `You are not carrying ${argument || "that"}.`));
    else {
      world = move(world, subject, room, { source: "feltos.command.drop" });
      events.push(message(actor, `You drop ${displayName(world, subject)}.`));
    }
  } else if (verb === "say" || verb === "'") {
    if (argument.length === 0 || room === null) events.push(message(actor, "Say what?"));
    else {
      for (const recipient of engine.actors.filter((candidate) => placeOf(world, candidate) === room)) {
        events.push(message(recipient, recipient === actor ? `You say, “${argument}”` : `${displayName(world, actor)} says, “${argument}”`, "speech"));
      }
    }
  } else {
    const extension = runtime.command(verb);
    if (extension === null || !engine.game.capabilities.includes(extension.capability)) {
      events.push(message(actor, `Unknown command: ${verb}`));
    } else {
      const result = validateCapabilityResult(
        extension.handler(capabilityContext({ ...engine, world }, intent, verb, argument)),
        world,
        extension.capability,
      );
      world = result.world;
      events.push(...result.events);
    }
  }

  return { world, events };
}

/**
 * The simulation's sole writer. Intents execute in immutable admission order;
 * contradictions remain evidence, while resource races are resolved by order.
 */
export function step(engine, { runtime = EMPTY_RUNTIME } = {}) {
  if (engine?.kind !== "feltos.engine.v1") fail("step requires a FeltOS engine");
  if (runtime?.kind !== "feltos.runtime.v1") fail("step runtime is invalid");
  for (const capabilityId of engine.game.capabilities) {
    if (!runtime.ids.includes(capabilityId)) fail(`game requires unavailable capability: ${capabilityId}`);
  }
  let current = { ...engine, tick: engine.tick + 1, queue: [] };
  const events = [];
  for (const intent of [...engine.queue].sort((left, right) => left.ordinal - right.ordinal)) {
    const result = execute(current, intent, runtime);
    current = { ...current, world: result.world };
    events.push(...result.events);
  }
  for (const capability of runtime.capabilities) {
    if (!engine.game.capabilities.includes(capability.id) || capability.onTick === undefined) continue;
    const result = validateCapabilityResult(capability.onTick(Object.freeze({
      tick: current.tick,
      game: current.game,
      actors: current.actors,
      world: current.world,
      contentsOf,
      message,
      move,
      perceive,
      placeOf,
      tell,
      value,
    })), current.world, capability.id);
    current = { ...current, world: result.world };
    events.push(...result.events);
  }
  return Object.freeze({
    engine: freezeEngine(current),
    receipt: Object.freeze({
      kind: "feltos.tick-receipt.v1",
      tick: current.tick,
      intents: Object.freeze([...engine.queue]),
      events: Object.freeze(events),
      worldSequence: current.world.sequence,
      capabilities: Object.freeze(engine.game.capabilities),
    }),
  });
}
