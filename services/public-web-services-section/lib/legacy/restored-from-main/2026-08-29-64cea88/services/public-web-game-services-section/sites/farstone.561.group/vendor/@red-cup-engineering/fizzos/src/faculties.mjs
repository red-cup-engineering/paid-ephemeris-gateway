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

export function bootstrapFaculties() {
  return Object.freeze({ kind: "fizzos.faculty-ecology.v1", faculties: FACULTY_CAPABILITIES });
}

export function facultyCapability(name, capability) {
  return FACULTY_CAPABILITIES[name]?.includes(capability) ?? false;
}
