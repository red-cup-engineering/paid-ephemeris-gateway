import { FOUR, fourName, fourNamed, joinKnowledge, validateFour } from "./four.mjs";

export const LOCATED_IN = "located-in";

const DEFAULT_FUNCTIONAL = Object.freeze([
  LOCATED_IN,
  "description",
  "kind",
  "name",
]);

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const subjectSettlementCache = new WeakMap();
const subjectListCache = new WeakMap();
const assertionIndexCache = new WeakMap();

function assertionIndex(world) {
  let index = assertionIndexCache.get(world);
  if (index !== undefined) return index;
  index = new Map();
  for (const assertion of world.assertions) {
    const assertions = index.get(assertion.subject);
    if (assertions === undefined) index.set(assertion.subject, [assertion]);
    else assertions.push(assertion);
  }
  assertionIndexCache.set(world, index);
  return index;
}

function fail(message) {
  throw new TypeError(message);
}

function text(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be non-empty text`);
  return value;
}

function cloneValue(value, path = "object") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.map((entry, index) => cloneValue(entry, `${path}[${index}]`)));
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => [key, cloneValue(entry, `${path}.${key}`)]);
    return Object.freeze(Object.fromEntries(entries));
  }
  fail(`${path} must be a finite JSON value`);
}

function valueKey(value) {
  return JSON.stringify(cloneValue(value));
}

function normalizeFunctional(predicates) {
  const values = new Set(DEFAULT_FUNCTIONAL);
  for (const predicate of predicates ?? []) values.add(text(predicate, "functional predicate"));
  return Object.freeze([...values].sort(compareText));
}

export function createWorld({ functionalPredicates = [] } = {}) {
  return Object.freeze({
    kind: "fizzos.world.v1",
    sequence: 0,
    functionalPredicates: normalizeFunctional(functionalPredicates),
    assertions: Object.freeze([]),
  });
}

/** Extend a world's schema without mutating it or its assertion trace. */
export function declareFunctional(world, predicates) {
  validateWorld(world);
  return Object.freeze({
    ...world,
    functionalPredicates: normalizeFunctional([...world.functionalPredicates, ...predicates]),
  });
}

function normalizeEvidence(value) {
  if (value === undefined) return FOUR.true;
  return typeof value === "string" ? fourNamed(value) : validateFour(value);
}

function normalizeClaim(claim, sequence, source) {
  if (claim === null || typeof claim !== "object" || Array.isArray(claim)) fail("claim must be a record");
  return Object.freeze({
    subject: text(claim.subject, "claim subject"),
    predicate: text(claim.predicate, "claim predicate"),
    object: cloneValue(claim.object),
    evidence: normalizeEvidence(claim.evidence),
    sequence,
    source,
  });
}

/**
 * Append claims to an immutable assertion trace. This is the only primitive
 * world-state transition; higher operations reduce to tell().
 */
export function tell(world, claims, { source = "fizzos" } = {}) {
  validateWorld(world);
  text(source, "assertion source");
  const batch = Array.isArray(claims) ? claims : [claims];
  let sequence = world.sequence;
  const appended = batch.map((claim) => normalizeClaim(claim, ++sequence, source));
  return Object.freeze({
    ...world,
    sequence,
    assertions: Object.freeze([...world.assertions, ...appended]),
  });
}

export function validateWorld(world) {
  if (world?.kind !== "fizzos.world.v1"
    || !Number.isSafeInteger(world.sequence)
    || !Array.isArray(world.functionalPredicates)
    || !Array.isArray(world.assertions)) {
    fail("value is not a FizzOS world");
  }
  return world;
}

function cell(assertion, evidence = assertion.evidence) {
  return Object.freeze({
    subject: assertion.subject,
    predicate: assertion.predicate,
    object: assertion.object,
    evidence,
    sequence: assertion.sequence,
    sources: Object.freeze([assertion.source]),
  });
}

/** Settle a subject's trace without destroying contradictory evidence. */
export function settleSubject(world, subject) {
  validateWorld(world);
  text(subject, "subject");
  let bySubject = subjectSettlementCache.get(world);
  if (bySubject === undefined) {
    bySubject = new Map();
    subjectSettlementCache.set(world, bySubject);
  }
  const cached = bySubject.get(subject);
  if (cached !== undefined) return cached;
  const functional = new Set(world.functionalPredicates);
  const latest = new Map();
  const accumulating = new Map();

  for (const assertion of assertionIndex(world).get(subject) ?? []) {
    if (functional.has(assertion.predicate)) {
      latest.set(assertion.predicate, cell(assertion));
      continue;
    }
    const key = `${assertion.predicate}\u0000${valueKey(assertion.object)}`;
    const prior = accumulating.get(key);
    accumulating.set(key, prior === undefined
      ? cell(assertion)
      : Object.freeze({
        ...prior,
        evidence: joinKnowledge(prior.evidence, assertion.evidence),
        sequence: assertion.sequence,
        sources: Object.freeze([...new Set([...prior.sources, assertion.source])].sort(compareText)),
      }));
  }

  const settled = Object.freeze(
    [...latest.values(), ...accumulating.values()]
      .sort((left, right) => compareText(left.predicate, right.predicate)
        || compareText(valueKey(left.object), valueKey(right.object))),
  );
  bySubject.set(subject, settled);
  return settled;
}

export function subjects(world) {
  validateWorld(world);
  const cached = subjectListCache.get(world);
  if (cached !== undefined) return cached;
  const result = Object.freeze([...assertionIndex(world).keys()].sort(compareText));
  subjectListCache.set(world, result);
  return result;
}

export function settledWorld(world) {
  return Object.freeze(subjects(world).flatMap((subject) => settleSubject(world, subject)));
}

export function cells(world, subject, predicate) {
  return Object.freeze(settleSubject(world, subject).filter((entry) => entry.predicate === predicate));
}

export function value(world, subject, predicate) {
  const matches = cells(world, subject, predicate).filter(({ evidence }) => evidence.positiveEvidence);
  return matches.length === 1 ? matches[0].object : null;
}

export function values(world, subject, predicate) {
  return Object.freeze(cells(world, subject, predicate)
    .filter(({ evidence }) => evidence.positiveEvidence)
    .map(({ object }) => object));
}

export function placeOf(world, subject) {
  const place = value(world, subject, LOCATED_IN);
  return typeof place === "string" ? place : null;
}

export function contentsOf(world, container) {
  return Object.freeze(subjects(world).filter((subject) => placeOf(world, subject) === container));
}

export function move(world, subject, destination, options) {
  return tell(world, { subject, predicate: LOCATED_IN, object: destination }, options);
}

/**
 * Restrict the world to the actor, its place, inventory, and co-located
 * subjects. Remote state is absent rather than merely hidden by presentation.
 */
export function perceive(world, actor) {
  const place = placeOf(world, actor);
  const visible = new Set([actor]);
  if (place !== null) {
    visible.add(place);
    for (const subject of contentsOf(world, place)) visible.add(subject);
  }
  for (const subject of contentsOf(world, actor)) visible.add(subject);
  const ordered = [...visible].sort(compareText);
  return Object.freeze({
    kind: "fizzos.perception.v1",
    actor,
    place,
    subjects: Object.freeze(ordered),
    cells: Object.freeze(ordered.flatMap((subject) => settleSubject(world, subject))),
  });
}

export function evidenceName(cellValue) {
  return fourName(cellValue.evidence);
}
