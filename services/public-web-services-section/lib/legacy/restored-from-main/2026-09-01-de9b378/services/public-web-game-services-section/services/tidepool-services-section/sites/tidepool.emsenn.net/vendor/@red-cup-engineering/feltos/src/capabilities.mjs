const IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const COMMAND = /^[a-z][a-z0-9-]*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

/**
 * Define executable policy separately from serializable game data and engine
 * state. A capability may own command reducers, a tick reducer, or both.
 */
export function defineCapability(source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) fail("capability must be a record");
  if (typeof source.id !== "string" || !IDENTIFIER.test(source.id)) fail("capability id must be a stable lowercase identifier");
  const commands = {};
  for (const [name, handler] of Object.entries(source.commands ?? {}).sort(([a], [b]) => compareText(a, b))) {
    if (!COMMAND.test(name)) fail(`invalid capability command: ${name}`);
    if (typeof handler !== "function") fail(`capability command ${name} must be a function`);
    commands[name] = handler;
  }
  if (source.onTick !== undefined && typeof source.onTick !== "function") fail("capability onTick must be a function");
  return Object.freeze({
    kind: "feltos.capability.v1",
    id: source.id,
    commands: Object.freeze(commands),
    ...(source.onTick === undefined ? {} : { onTick: source.onTick }),
  });
}

export function composeCapabilities(capabilities = []) {
  const ordered = [...capabilities];
  const ids = new Set();
  const commands = new Map();
  for (const capability of ordered) {
    if (capability?.kind !== "feltos.capability.v1") fail("runtime contains an undefined capability");
    if (ids.has(capability.id)) fail(`duplicate capability: ${capability.id}`);
    ids.add(capability.id);
    for (const [name, handler] of Object.entries(capability.commands)) {
      if (commands.has(name)) fail(`command ${name} is claimed by multiple capabilities`);
      commands.set(name, Object.freeze({ capability: capability.id, handler }));
    }
  }
  return Object.freeze({
    kind: "feltos.runtime.v1",
    ids: Object.freeze([...ids]),
    capabilities: Object.freeze(ordered),
    command(name) { return commands.get(name) ?? null; },
  });
}

export const EMPTY_RUNTIME = composeCapabilities();
