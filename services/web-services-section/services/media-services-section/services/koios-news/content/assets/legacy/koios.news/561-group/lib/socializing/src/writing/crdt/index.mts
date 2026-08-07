/**
 * writing/crdt — socializing's merge made into an interoperable state-CRDT.
 *
 * A CRDT is not a second ontology here. Its semilattice join is exactly the
 * knowledge-order join `joinKnowledge` from relating, lifted from one charge to
 * a replicated JSON state: cells with the same key accumulate evidence by
 * `∨_k`; distinct cells commute by map union. The multi-value register below is
 * the register-shaped projection of that state. Concurrent disagreement is not
 * resolved by a clock winner; both writes remain present and the register's
 * charge rises to `stable` (⊤, told-both).
 */
import {
  canonical,
  carrierFrom,
  charge,
  chargeValue,
  joinKnowledge,
  joinKnowledgeValue,
  mark,
  valueOf,
  type ChargeCarrier,
  type ChargeValueName,
  type FromSchema,
  type JsonValue,
} from "@emsenn/relating";

const writeSchema = {
  type: "object",
  description: "one causally-addressed MV-register write, kept as a witness rather than collapsed by a clock",
  required: ["dot", "replica", "value", "standing", "witness"],
  properties: {
    dot: { type: "string", minLength: 1 },
    replica: { type: "string", minLength: 1 },
    value: {},
    standing: { enum: ["potential", "active", "stable", "absurd"] },
    witness: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;
export type MultiValueRegisterWrite = FromSchema<typeof writeSchema>;

const stateCellSchema = {
  type: "object",
  description: "one join-semilattice cell: key-addressed knowledge standing plus optional register writes",
  required: ["key", "charge"],
  properties: {
    key: { type: "string", minLength: 1 },
    charge: { description: "a relating ChargeCarrier; referenced, never redefined" },
    writes: { type: "array", items: writeSchema },
  },
  additionalProperties: false,
} as const;
export type StateCrdtCell = Omit<FromSchema<typeof stateCellSchema>, "charge" | "writes"> & {
  readonly charge: ChargeCarrier;
  readonly writes?: readonly MultiValueRegisterWrite[];
};

export const StateCrdtSchema = {
  $id: "socializing/writing/crdt/state",
  title: "StateCrdt",
  description:
    "A state-based CRDT carrier whose merge is the pointwise <=_k join from relating. Cells are keyed replicated-state entries; their charge is a reused ChargeCarrier, so merge is joinKnowledge and no parallel lattice is introduced.",
  type: "object",
  required: ["kind", "cells"],
  properties: {
    kind: { const: "socializing.crdt.state" },
    cells: { type: "array", items: stateCellSchema },
  },
  additionalProperties: false,
} as const;
export type StateCrdt = Omit<FromSchema<typeof StateCrdtSchema>, "cells"> & {
  readonly cells: readonly StateCrdtCell[];
};
export const stateCrdtCarrier = carrierFrom(StateCrdtSchema);

export const MultiValueRegisterSchema = {
  $id: "socializing/writing/crdt/mv-register",
  title: "MultiValueRegister",
  description:
    "A multi-value register as a state-CRDT projection: concurrent writes are retained as witnesses, and the register's standing is the <=_k join of their standings. Conflicts therefore settle to stable/top instead of last-writer-wins.",
  type: "object",
  required: ["kind", "key", "charge", "writes"],
  properties: {
    kind: { const: "socializing.crdt.mv-register" },
    key: { type: "string", minLength: 1 },
    charge: { description: "a relating ChargeCarrier; the register's accumulated <=_k standing" },
    writes: { type: "array", items: writeSchema },
  },
  additionalProperties: false,
} as const;
export type MultiValueRegister = Omit<FromSchema<typeof MultiValueRegisterSchema>, "charge" | "writes"> & {
  readonly charge: ChargeCarrier;
  readonly writes: readonly MultiValueRegisterWrite[];
};
export const multiValueRegisterCarrier = carrierFrom(MultiValueRegisterSchema);

/** The knowledge-order bottom for a fresh replicated state. */
export function emptyCrdtState(): StateCrdt {
  return Object.freeze({ kind: "socializing.crdt.state" as const, cells: Object.freeze([]) });
}

function chargeOf(standing: ChargeValueName, witness: string): ChargeCarrier {
  const w = mark(witness);
  switch (standing) {
    case "potential": return charge(chargeValue("potential"), [[w], []]);
    case "active": return charge(chargeValue("active"), [[], [w]]);
    case "stable": return charge(chargeValue("stable"), [[w], [w]]);
    case "absurd": default: return charge(chargeValue("absurd"));
  }
}

function writesByDot(writes: readonly MultiValueRegisterWrite[] = []): readonly MultiValueRegisterWrite[] {
  const byDot = new Map<string, MultiValueRegisterWrite>();
  for (const write of writes) byDot.set(write.dot, write);
  return Object.freeze([...byDot.values()].sort((left, right) => left.dot.localeCompare(right.dot)));
}

function joinedWriteCharge(writes: readonly MultiValueRegisterWrite[] = []): ChargeCarrier {
  return writes.reduce(
    (standing, write) => joinKnowledge(standing, chargeOf(write.standing as ChargeValueName, write.witness)),
    charge(chargeValue("absurd")),
  );
}

function registerCharge(writes: readonly MultiValueRegisterWrite[] = []): ChargeCarrier {
  const joined = joinedWriteCharge(writes);
  const byValue = new Map<string, readonly MultiValueRegisterWrite[]>();
  for (const write of writes) {
    const key = canonical(write.value as JsonValue);
    byValue.set(key, Object.freeze([...(byValue.get(key) ?? []), write]));
  }
  if (byValue.size < 2 || valueOf(joined).name !== "potential") return joined;

  // A plain MV-register conflict is different concurrent values for the same
  // register. Read the canonical first value as the truth-side representative
  // and every other value as the falsity-side representative; the choice is
  // deterministic and only witnesses that the register is now told-both.
  const entries = [...byValue.entries()].sort(([left], [right]) => left.localeCompare(right));
  const truth = entries[0]![1].map((write) => mark(write.witness));
  const falsity = entries.slice(1).flatMap(([, conflicting]) => conflicting.map((write) => mark(write.witness)));
  return charge(chargeValue("stable"), [truth, falsity]);
}

function normalizeCell(cell: StateCrdtCell): StateCrdtCell {
  const writes = writesByDot(cell.writes);
  const chargeFromWrites = registerCharge(writes);
  const joined = writes.length === 0 ? cell.charge : chargeFromWrites;
  return Object.freeze({
    key: cell.key,
    charge: joined,
    ...(writes.length === 0 ? {} : { writes }),
  });
}

/** Build a state-CRDT cell, admitting the charge carrier through relating's own surface. */
export function crdtCell(key: string, standing: ChargeValueName, witness: string): StateCrdtCell {
  return Object.freeze({ key, charge: chargeOf(standing, witness) });
}

/** Build a state-CRDT snapshot from cells; equal keys are immediately joined. */
export function crdtState(cells: readonly StateCrdtCell[] = []): StateCrdt {
  return mergeCrdtStates(emptyCrdtState(), Object.freeze({ kind: "socializing.crdt.state" as const, cells }));
}

/**
 * Merge two state-CRDT snapshots by pointwise `joinKnowledge`.
 *
 * The returned normal form is sorted by key. Because each key folds with
 * relating's idempotent/commutative/associative knowledge join, the state merge
 * inherits those semilattice laws.
 */
export function mergeCrdtStates(left: StateCrdt, right: StateCrdt): StateCrdt {
  const cells = new Map<string, StateCrdtCell>();
  for (const raw of [...left.cells, ...right.cells]) {
    const cell = normalizeCell(raw);
    const prior = cells.get(cell.key);
    if (prior === undefined) {
      cells.set(cell.key, cell);
      continue;
    }
    cells.set(cell.key, Object.freeze({
      key: cell.key,
      charge: joinKnowledge(prior.charge, cell.charge),
      writes: writesByDot([...(prior.writes ?? []), ...(cell.writes ?? [])]),
    }));
  }
  return Object.freeze({
    kind: "socializing.crdt.state" as const,
    cells: Object.freeze([...cells.values()].map(normalizeCell).sort((leftCell, rightCell) => leftCell.key.localeCompare(rightCell.key))),
  });
}

function dot(replica: string, value: JsonValue, witness: string): string {
  return `${replica}:${witness}:${canonical(value)}`;
}

/** A one-write MV-register replica. The write standing is explicit so callers can
 *  represent opposing concurrent claims without encoding that opposition as time. */
export function mvRegister(
  key: string,
  replica: string,
  value: JsonValue,
  options: { readonly standing?: ChargeValueName; readonly witness?: string } = {},
): MultiValueRegister {
  const standing = options.standing ?? "potential";
  const witness = options.witness ?? `${replica}:${canonical(value)}`;
  const write: MultiValueRegisterWrite = Object.freeze({
    dot: dot(replica, value, witness),
    replica,
    value,
    standing,
    witness,
  });
  return Object.freeze({
    kind: "socializing.crdt.mv-register" as const,
    key,
    charge: chargeOf(standing, witness),
    writes: Object.freeze([write]),
  });
}

function stateOfRegister(register: MultiValueRegister): StateCrdt {
  return Object.freeze({
    kind: "socializing.crdt.state" as const,
    cells: Object.freeze([{
      key: register.key,
      charge: register.charge,
      writes: register.writes,
    }]),
  });
}

/** Merge MV-register replicas by lifting them into the state-CRDT join. */
export function mergeMultiValueRegisters(left: MultiValueRegister, right: MultiValueRegister): MultiValueRegister {
  if (left.key !== right.key) throw new TypeError(`mergeMultiValueRegisters: key mismatch ${left.key} !== ${right.key}`);
  const state = mergeCrdtStates(stateOfRegister(left), stateOfRegister(right));
  const cell = state.cells.find((candidate) => candidate.key === left.key);
  if (cell === undefined) throw new TypeError(`mergeMultiValueRegisters: missing merged cell ${left.key}`);
  return Object.freeze({
    kind: "socializing.crdt.mv-register" as const,
    key: left.key,
    charge: cell.charge,
    writes: writesByDot(cell.writes),
  });
}

/** The register's current bilattice standing name. */
export function multiValueRegisterStanding(register: MultiValueRegister): ChargeValueName {
  return valueOf(register.charge).name;
}

/** The value-level join, exposed for callers/tests that need the algebra witness. */
export function joinCrdtStanding(left: ChargeValueName, right: ChargeValueName): ChargeValueName {
  return joinKnowledgeValue(chargeValue(left), chargeValue(right)).name;
}
