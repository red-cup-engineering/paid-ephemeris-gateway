/**
 * federate-graded - contradiction-aware federation over coherent RWIL readings.
 *
 * This is the bridge where held top and graded H1 meet: sources contribute
 * protocol-local collections, each cell is admitted as a Reading over one RWIL
 * witness, disagreement is retained as a bilattice top, and only nonzero-H1
 * residue is routed into Raft.
 */
import {
  canonical,
  carrierFrom,
  charge,
  chargeValue,
  cohomologyTerms,
  evaluateRunTerm,
  joinKnowledge,
  mark,
  monotonicityCertificateOfFederatedCover,
  negate,
  valueOf,
  type ChargeCarrier,
  type ChargeValueName,
  type FederatedCoverStatement,
  type FromSchema,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { cell, cohere, type CoherenceReport, type Reading, type RWILWitness } from "@emsenn/relating/ledger";
import type { Activity } from "@emsenn/animating";
import type { Federation } from "./schemas.mjs";
import { ACTIVITYSTREAMS_CONTEXT, federateActivities, mergeActivities } from "./writing/activitypub/index.mjs";
import type { CalmReading } from "./writing/calm/index.mjs";
import {
  coordinateByCalmOrRaft,
  emptyRaftLog,
  type CalmRaftFrontier,
  type RaftAppendResult,
  type RaftLeadership,
  type RaftLog,
  type RaftProposal,
} from "./writing/raft/index.mjs";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;

const federatedCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "value", "witness"],
  properties: {
    cell: { type: "string", minLength: 1 },
    value: {},
    witness: { type: "string", minLength: 1 },
    polarity: { enum: ["assert", "deny"] },
  },
} as const;

export const federateGradedSourceSchema = {
  $id: "organizing/federate-graded/source",
  title: "FederateGradedSource",
  description:
    "One protocol source admitted into contradiction-aware federation. Its cells are protocol-local readings of RWIL witnesses.",
  type: "object",
  additionalProperties: false,
  required: ["id", "protocol", "collection"],
  properties: {
    id: { type: "string", minLength: 1 },
    protocol: { type: "string", minLength: 1 },
    collection: { type: "array", items: federatedCellSchema },
  },
} as const;

export type FederateGradedSource = Omit<FromSchema<typeof federateGradedSourceSchema>, "collection"> & {
  readonly collection: readonly FederateGradedCell[];
};
export type FederateGradedCell = Omit<FromSchema<typeof federatedCellSchema>, "value" | "polarity"> & {
  readonly value: JsonValue;
  readonly polarity?: "assert" | "deny";
};
export const federateGradedSourceCarrier = carrierFrom(federateGradedSourceSchema);

const sourceStatementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["source", "protocol", "cell", "value", "polarity", "witness"],
  properties: {
    source: { type: "string", minLength: 1 },
    protocol: { type: "string", minLength: 1 },
    cell: { type: "string", minLength: 1 },
    value: {},
    polarity: { enum: ["assert", "deny"] },
    witness: { type: "string", minLength: 1 },
  },
} as const;

const sharedCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "value", "witnesses", "statements"],
  properties: {
    cell: { type: "string", minLength: 1 },
    value: {},
    witnesses: { type: "array", items: { type: "string", minLength: 1 } },
    statements: { type: "array", items: sourceStatementSchema },
  },
} as const;

const contestedCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "standing", "topCharge", "truthWitnesses", "falsityWitnesses", "statements", "calm"],
  properties: {
    cell: { type: "string", minLength: 1 },
    standing: { const: "stable" },
    topCharge: {},
    truthWitnesses: { type: "array", items: { type: "string", minLength: 1 } },
    falsityWitnesses: { type: "array", items: { type: "string", minLength: 1 } },
    statements: { type: "array", items: sourceStatementSchema },
    calm: { const: "coordination-free" },
  },
} as const;

const needsCoordinationCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "standing", "topCharge", "truthWitnesses", "falsityWitnesses", "statements", "h1", "raftCommand"],
  properties: {
    cell: { type: "string", minLength: 1 },
    standing: { const: "stable" },
    topCharge: {},
    truthWitnesses: { type: "array", items: { type: "string", minLength: 1 } },
    falsityWitnesses: { type: "array", items: { type: "string", minLength: 1 } },
    statements: { type: "array", items: sourceStatementSchema },
    h1: nonnegativeIntegerSchema,
    raftCommand: {},
  },
} as const;

export const gradedConsensusSchema = {
  $id: "organizing/federate-graded/consensus",
  title: "GradedConsensus",
  description:
    "Contradiction-aware federation report: shared cells, top-held contested cells, and the nonzero-H1 residue routed through Raft.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "sources",
    "federation",
    "mergedActivities",
    "coherence",
    "shared",
    "contested",
    "needsCoordination",
    "h1",
    "calm",
    "raft",
    "decomposition",
  ],
  properties: {
    kind: { const: "organizing.federate-graded.consensus" },
    sources: { type: "array", items: { type: "string", minLength: 1 } },
    federation: {},
    mergedActivities: nonnegativeIntegerSchema,
    coherence: { type: "array", items: {} },
    shared: { type: "array", items: sharedCellSchema },
    contested: { type: "array", items: contestedCellSchema },
    needsCoordination: { type: "array", items: needsCoordinationCellSchema },
    h1: {
      type: "object",
      additionalProperties: false,
      required: ["rank", "cells", "cohomology"],
      properties: {
        rank: nonnegativeIntegerSchema,
        cells: { type: "array", items: { type: "string", minLength: 1 } },
        cohomology: {
          description: "normalized relating cohomology receipt for the nonzero cover H1 residue",
        },
      },
    },
    calm: {},
    raft: {},
    decomposition: {
      type: "object",
      additionalProperties: false,
      required: ["exhaustive", "disjoint", "shared", "contested", "needsCoordination"],
      properties: {
        exhaustive: { type: "boolean" },
        disjoint: { type: "boolean" },
        shared: nonnegativeIntegerSchema,
        contested: nonnegativeIntegerSchema,
        needsCoordination: nonnegativeIntegerSchema,
      },
    },
  },
} as const;

export type FederateGradedStatement = Omit<FromSchema<typeof sourceStatementSchema>, "value"> & {
  readonly value: JsonValue;
};
export type SharedGradedCell = Omit<FromSchema<typeof sharedCellSchema>, "value" | "statements"> & {
  readonly value: JsonValue;
  readonly statements: readonly FederateGradedStatement[];
};
export type ContestedGradedCell = Omit<FromSchema<typeof contestedCellSchema>, "topCharge" | "statements"> & {
  readonly topCharge: ChargeCarrier;
  readonly statements: readonly FederateGradedStatement[];
};
export type NeedsCoordinationCell = Omit<FromSchema<typeof needsCoordinationCellSchema>, "topCharge" | "statements" | "raftCommand"> & {
  readonly topCharge: ChargeCarrier;
  readonly statements: readonly FederateGradedStatement[];
  readonly raftCommand: JsonValue;
};
export type GradedConsensus = Omit<
  FromSchema<typeof gradedConsensusSchema>,
  "federation" | "coherence" | "shared" | "contested" | "needsCoordination" | "calm" | "raft"
> & {
  readonly federation: Federation;
  readonly coherence: readonly CoherenceReport[];
  readonly shared: readonly SharedGradedCell[];
  readonly contested: readonly ContestedGradedCell[];
  readonly needsCoordination: readonly NeedsCoordinationCell[];
  readonly calm: CalmReading;
  readonly raft: {
    readonly frontier: CalmRaftFrontier;
    readonly log: RaftLog;
    readonly append?: RaftAppendResult;
  };
};
export const gradedConsensusCarrier = carrierFrom(gradedConsensusSchema);

export interface FederateGradedOptions {
  readonly cluster?: string;
  readonly leadership?: RaftLeadership;
  readonly log?: RaftLog;
}

type SourceWire = {
  readonly id: string;
  readonly protocol: string;
  readonly collection: readonly FederateGradedCell[];
};

function polarityOf(cellInput: FederateGradedCell): "assert" | "deny" {
  return cellInput.polarity ?? "assert";
}

function statementOf(source: FederateGradedSource, cellInput: FederateGradedCell): FederateGradedStatement {
  return Object.freeze({
    source: source.id,
    protocol: source.protocol,
    cell: cellInput.cell,
    value: cellInput.value,
    polarity: polarityOf(cellInput),
    witness: cellInput.witness,
  });
}

function witnessOf(statement: FederateGradedStatement): RWILWitness {
  return cell(
    Object.freeze({
      bridge: "organizing.federate-graded",
      source: statement.source,
    protocol: statement.protocol,
    cell: statement.cell,
  }) as JsonValue,
  Object.freeze({
      polarity: statement.polarity,
    }) as JsonValue,
    statement.value,
    Object.freeze({
      source: statement.source,
      protocol: statement.protocol,
      witness: statement.witness,
    }) as JsonValue,
  );
}

function sourceWireFromWitness(row: RWILWitness): SourceWire {
  if (row.e === null || typeof row.e !== "object" || Array.isArray(row.e)) throw new TypeError("federateGraded reading: witness entity is not a record");
  if (row.a === null || typeof row.a !== "object" || Array.isArray(row.a)) throw new TypeError("federateGraded reading: witness attribute is not a record");
  if (row.t === null || typeof row.t !== "object" || Array.isArray(row.t)) throw new TypeError("federateGraded reading: witness time is not a record");
  const entity = row.e as Record<string, unknown>;
  const attribute = row.a as Record<string, unknown>;
  const time = row.t as Record<string, unknown>;
  const id = entity.source;
  const protocol = entity.protocol;
  const cellName = entity.cell;
  const polarity = attribute.polarity;
  const witness = time.witness;
  if (typeof id !== "string" || typeof protocol !== "string" || typeof cellName !== "string") throw new TypeError("federateGraded reading: malformed entity");
  if (polarity !== "assert" && polarity !== "deny") throw new TypeError("federateGraded reading: malformed polarity");
  if (typeof witness !== "string") throw new TypeError("federateGraded reading: malformed witness");
  return Object.freeze({
    id,
    protocol,
    collection: Object.freeze([Object.freeze({
      cell: cellName,
      value: row.v,
      polarity,
      witness,
    })]),
  });
}

function sourceReading(source: FederateGradedSource): Reading<SourceWire> {
  return Object.freeze({
    id: `organizing.federate-graded.${source.protocol}.${source.id}`,
    toWire: sourceWireFromWitness,
    fromWire: (wire: SourceWire) => {
      if (wire.collection.length !== 1) throw new TypeError("federateGraded reading: expected one witnessed cell");
      return witnessOf(statementOf({ id: wire.id, protocol: wire.protocol, collection: wire.collection }, wire.collection[0]!));
    },
  });
}

const canonicalReading: Reading<SourceWire> = Object.freeze({
  id: "organizing.federate-graded.canonical",
  toWire: sourceWireFromWitness,
  fromWire: (wire: SourceWire) => {
    if (wire.collection.length !== 1) throw new TypeError("federateGraded canonical reading: expected one witnessed cell");
    return witnessOf(statementOf({ id: wire.id, protocol: wire.protocol, collection: wire.collection }, wire.collection[0]!));
  },
});

function activityOf(statement: FederateGradedStatement): Activity {
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `urn:organizing:federate-graded:${encodeURIComponent(statement.source)}:${encodeURIComponent(statement.witness)}`,
    type: statement.polarity === "deny" ? "Undo" : "Create",
    actor: statement.cell,
    object: {
      type: "Note",
      content: `${statement.cell}|${canonical(statement.value)}`,
    },
  });
}

function stanceKey(statement: FederateGradedStatement): string {
  return `${statement.polarity}:${canonical(statement.value)}`;
}

function statementOrder(left: FederateGradedStatement, right: FederateGradedStatement): number {
  return left.cell.localeCompare(right.cell)
    || stanceKey(left).localeCompare(stanceKey(right))
    || left.source.localeCompare(right.source)
    || left.witness.localeCompare(right.witness);
}

function affirmed(witnesses: readonly string[]): ChargeCarrier {
  return charge(chargeValue("potential"), [witnesses.map((witness) => mark(witness)), []]);
}

function heldTop(statements: readonly FederateGradedStatement[]): {
  readonly topCharge: ChargeCarrier;
  readonly truthWitnesses: readonly string[];
  readonly falsityWitnesses: readonly string[];
} {
  const byStance = new Map<string, FederateGradedStatement[]>();
  for (const statement of statements) {
    const key = stanceKey(statement);
    byStance.set(key, [...(byStance.get(key) ?? []), statement]);
  }
  const stances = [...byStance.entries()].sort(([left], [right]) => left.localeCompare(right));
  const truthWitnesses = stances[0]?.[1].map((statement) => statement.witness).sort() ?? [];
  const falsityWitnesses = stances.slice(1).flatMap(([, group]) => group.map((statement) => statement.witness)).sort();
  const topCharge = joinKnowledge(affirmed(truthWitnesses), negate(affirmed(falsityWitnesses)));
  const standing = valueOf(topCharge).name as ChargeValueName;
  if (standing !== "stable") throw new TypeError(`federateGraded: expected held top, got ${standing}`);
  return Object.freeze({
    topCharge,
    truthWitnesses: Object.freeze(truthWitnesses),
    falsityWitnesses: Object.freeze(falsityWitnesses),
  });
}

function hasDisagreement(statements: readonly FederateGradedStatement[]): boolean {
  return new Set(statements.map(stanceKey)).size > 1;
}

function coverStatementOf(statement: FederateGradedStatement): FederatedCoverStatement {
  return Object.freeze({
    source: statement.source,
    cell: statement.cell,
    stance: stanceKey(statement),
    witness: statement.witness,
  });
}

function naturalSize(value: { readonly members: readonly unknown[] }): number {
  return value.members.length;
}

function h1CohomologyReceipt(
  certificate: ReturnType<typeof monotonicityCertificateOfFederatedCover>,
): JsonRecord {
  return Object.freeze({
    kind: "organizing.federate-graded.h1-cohomology" as const,
    rank: naturalSize(certificate.rank),
    cells: Object.freeze([...certificate.cells]),
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, certificate.vanishing as unknown as JsonValue),
    obstructions: Object.freeze(certificate.obstructions.map((obstruction) => Object.freeze({
      cell: obstruction.cell,
      rank: naturalSize(obstruction.rank),
      vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, obstruction.vanishing as unknown as JsonValue),
      carrier: evaluateRunTerm(cohomologyTerms.carrier, obstruction.cohomology as unknown as JsonValue),
    }))),
  }) as JsonRecord;
}

function raftCommandOf(statements: readonly FederateGradedStatement[]): JsonValue {
  return Object.freeze({
    bridge: "organizing.federate-graded",
    cell: statements[0]?.cell ?? "",
    residue: statements.map((statement) => Object.freeze({
      source: statement.source,
      protocol: statement.protocol,
      value: statement.value,
      polarity: statement.polarity,
      witness: statement.witness,
    })),
  }) as JsonValue;
}

function calmReading(shared: number, contested: number, needsCoordination: number): CalmReading {
  return Object.freeze({
    kind: "organizing.writing.calm.reading" as const,
    theorem: "CALM" as const,
    operation: "federate" as const,
    monotone: needsCoordination === 0,
    coordination: needsCoordination === 0 ? "coordination-free" : "consensus-required",
    witness: {
      shared,
      contested,
      federationOnly: needsCoordination,
    },
  });
}

function defaultLeadership(cluster: string): RaftLeadership {
  return Object.freeze({
    kind: "organizing.writing.raft.leadership" as const,
    cluster,
    term: 1,
    leader: "federate-graded",
  });
}

function decompositionIsDisjoint(
  shared: readonly SharedGradedCell[],
  contested: readonly ContestedGradedCell[],
  needsCoordination: readonly NeedsCoordinationCell[],
): boolean {
  const all = [...shared.map((entry) => entry.cell), ...contested.map((entry) => entry.cell), ...needsCoordination.map((entry) => entry.cell)];
  return new Set(all).size === all.length;
}

/**
 * federateGraded - hold cross-source contradiction and grade the consensus cost.
 *
 * Agreement enters `shared`; H1-vanishing disagreement enters `contested` as held
 * top with both witness sides retained; nonzero H1 disagreement enters
 * `needsCoordination` and is the only payload sent through Raft.
 */
export function federateGraded(
  sources: readonly FederateGradedSource[],
  options: FederateGradedOptions = {},
): GradedConsensus {
  if (sources.length === 0) throw new TypeError("federateGraded: at least one source is required");
  const admitted = sources.map((source) => federateGradedSourceCarrier.assert(source, `source ${source.id}`) as FederateGradedSource);
  const statements = admitted.flatMap((source) => source.collection.map((entry) => statementOf(source, entry)));
  if (statements.length === 0) throw new TypeError("federateGraded: source collections are empty");

  const coherence = admitted.flatMap((source) => {
    const reading = sourceReading(source);
    return source.collection.map((entry) => cohere(reading, canonicalReading, witnessOf(statementOf(source, entry))));
  });

  const activitiesBySource = admitted.map((source) => source.collection.map((entry) => activityOf(statementOf(source, entry))));
  const federation = federateActivities(activitiesBySource);
  const merged = mergeActivities(...activitiesBySource);

  const byCell = new Map<string, FederateGradedStatement[]>();
  for (const statement of statements) byCell.set(statement.cell, [...(byCell.get(statement.cell) ?? []), statement]);
  const monotonicity = monotonicityCertificateOfFederatedCover(statements.map(coverStatementOf));
  const h1RankByCell = new Map(monotonicity.obstructions.map((entry) => [entry.cell, naturalSize(entry.rank)] as const));

  const shared: SharedGradedCell[] = [];
  const contested: ContestedGradedCell[] = [];
  const needsCoordination: NeedsCoordinationCell[] = [];
  for (const [cellName, group] of [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const sorted = Object.freeze([...group].sort(statementOrder));
    if (!hasDisagreement(sorted)) {
      shared.push(Object.freeze({
        cell: cellName,
        value: sorted[0]!.value,
        witnesses: Object.freeze(sorted.map((statement) => statement.witness).sort()),
        statements: sorted,
      }));
      continue;
    }
    const top = heldTop(sorted);
    const h1Rank = h1RankByCell.get(cellName) ?? 0;
    if (h1Rank === 0) {
      contested.push(Object.freeze({
        cell: cellName,
        standing: "stable" as const,
        topCharge: top.topCharge,
        truthWitnesses: top.truthWitnesses,
        falsityWitnesses: top.falsityWitnesses,
        statements: sorted,
        calm: "coordination-free" as const,
      }));
      continue;
    }
    needsCoordination.push(Object.freeze({
      cell: cellName,
      standing: "stable" as const,
      topCharge: top.topCharge,
      truthWitnesses: top.truthWitnesses,
      falsityWitnesses: top.falsityWitnesses,
      statements: sorted,
      h1: h1Rank,
      raftCommand: raftCommandOf(sorted),
    }));
  }

  const h1Cells = Object.freeze(monotonicity.cells);
  const h1Rank = naturalSize(monotonicity.rank);
  const h1Cohomology = h1CohomologyReceipt(monotonicity);
  const calm = calmReading(shared.length, contested.length, h1Rank);
  const cluster = options.cluster ?? options.leadership?.cluster ?? "organizing";
  const proposals: readonly RaftProposal[] = Object.freeze(needsCoordination.map((entry, index) => Object.freeze({
    cluster,
    index: index + 1,
    term: options.leadership?.term ?? 1,
    leader: options.leadership?.leader ?? "federate-graded",
    command: entry.raftCommand,
    witness: `h1:${entry.cell}`,
  })));
  const raft = coordinateByCalmOrRaft(calm, {
    log: options.log ?? emptyRaftLog(cluster),
    ...(needsCoordination.length === 0 && options.leadership === undefined
      ? {}
      : { leadership: needsCoordination.length === 0 ? options.leadership! : (options.leadership ?? defaultLeadership(cluster)) }),
    proposals,
    operation: "federateGraded",
  });

  const decomposition = {
    exhaustive: shared.length + contested.length + needsCoordination.length === byCell.size,
    disjoint: decompositionIsDisjoint(shared, contested, needsCoordination),
    shared: shared.length,
    contested: contested.length,
    needsCoordination: needsCoordination.length,
  };

  return gradedConsensusCarrier.assert(Object.freeze({
    kind: "organizing.federate-graded.consensus" as const,
    sources: Object.freeze(admitted.map((source) => source.id)),
    federation,
    mergedActivities: merged.totalItems,
    coherence: Object.freeze(coherence),
    shared: Object.freeze(shared),
    contested: Object.freeze(contested),
    needsCoordination: Object.freeze(needsCoordination),
    h1: {
      rank: h1Rank,
      cells: h1Cells,
      cohomology: h1Cohomology,
    },
    calm,
    raft,
    decomposition,
  }), "graded consensus") as GradedConsensus;
}
