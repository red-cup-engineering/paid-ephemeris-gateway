// FeltOS's faculty seat: the eight faculties are not names here — they are the
// live published packages, mounted. Each package exposes a uniform action
// registry (records with verb, formats, domain/codomain carriers, and a run
// function) built on relating's action machinery over the one metrologic
// bilattice floor. FeltOS's own capability triads name the platform's
// contracted vocabulary; the registries carry the faculties' full verb
// surfaces beneath them.
import * as animating from "@red-cup-engineering/animating";
import * as communicating from "@red-cup-engineering/communicating";
import * as computing from "@red-cup-engineering/computing";
import * as gaming from "@red-cup-engineering/gaming";
import * as knowing from "@red-cup-engineering/knowing";
import * as organizing from "@red-cup-engineering/organizing";
import * as playing from "@red-cup-engineering/playing";
import * as socializing from "@red-cup-engineering/socializing";

const FACULTY_MODULES = Object.freeze({
  animating,
  communicating,
  computing,
  gaming,
  knowing,
  organizing,
  playing,
  socializing,
});

export const FACULTY_NAMES = Object.freeze(Object.keys(FACULTY_MODULES));

export const FACULTY_CAPABILITIES = Object.freeze({
  animating: Object.freeze(["perceive", "submit", "step"]),
  communicating: Object.freeze(["meme", "common-ground", "discourse"]),
  computing: Object.freeze(["settle", "snapshot", "receipt"]),
  gaming: Object.freeze(["game", "arena", "campaign"]),
  knowing: Object.freeze(["absorb", "cognize", "research"]),
  organizing: Object.freeze(["party", "guild", "governance"]),
  playing: Object.freeze(["design", "cut", "behavior"]),
  socializing: Object.freeze(["speech", "standing", "institution"]),
});

function fail(message) {
  throw new TypeError(message);
}

/** The live module namespace of a mounted faculty. */
export function facultyModule(name) {
  return FACULTY_MODULES[name] ?? fail(`unknown faculty: ${String(name)}`);
}

/** The faculty's live action registry: uniform records with a verb and a run function. */
export function facultyActions(name) {
  const module = facultyModule(name);
  const registry = typeof module.actions === "function" ? module.actions() : module.actions;
  if (!Array.isArray(registry) || registry.length === 0) fail(`faculty ${name} mounts no action registry`);
  for (const action of registry) {
    if (typeof action.verb !== "string" || typeof action.run !== "function") {
      fail(`faculty ${name} action registry is malformed`);
    }
  }
  return registry;
}

/** All verbs a mounted faculty answers to. */
export function facultyActionVerbs(name) {
  return Object.freeze(facultyActions(name).map((action) => action.verb));
}

/** One faculty action by verb, ready to run. */
export function facultyAction(name, verb) {
  const action = facultyActions(name).find((candidate) => candidate.verb === verb);
  return action ?? fail(`faculty ${name} has no action ${String(verb)}`);
}

export function bootstrapFaculties() {
  const faculties = {};
  for (const name of FACULTY_NAMES) {
    faculties[name] = Object.freeze({
      capabilities: FACULTY_CAPABILITIES[name],
      verbs: facultyActionVerbs(name),
    });
  }
  return Object.freeze({ kind: "feltos.faculty-ecology.v2", faculties: Object.freeze(faculties) });
}

export function facultyCapability(name, capability) {
  return FACULTY_CAPABILITIES[name]?.includes(capability) ?? false;
}
