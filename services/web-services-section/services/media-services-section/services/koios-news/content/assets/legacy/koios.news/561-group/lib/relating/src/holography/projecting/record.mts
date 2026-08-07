// holography/projecting/record — the invariant projection (the record tier).
//
// Once a thing is determined by later blocks it can no longer change, so its
// witnesses are redundant: the settled value (and, for set members, the per-member
// timestamp carried IN the value) is all any future analysis needs. This projection:
//   1. finds the groups whose root is settled (a domain predicate — e.g. a post
//      past its 7-day payout window — supplied by the caller; chain consensus is
//      the ground truth, the filtration certifies it);
//   2. settles each group's witnesses (bounded — see ./settle) and emits one
//      Datom [e,a,v,t,reading] per current cell, the reading being the settled
//      judgement;
//   3. computes the compacted log — every witness of a settled group dropped —
//      losslessly, because the record now holds the frozen cells.
//
// This is the boundary→bulk holography of the invariant tier, expressed AS DATA:
// it returns `{ datoms, keptLog, outcome }` and performs NO I/O. The atomic
// append-record + rewrite-log effect is ./store's `commitRecord`. The log is left
// holding only still-maturing things; the record grows only with genuinely new
// settled facts. Both are bounded by the live window, not by time.

import {
  canonical,
  type JsonValue,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
import type {
  EAVT,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";
import {
  datom,
  type Datom,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/datom/index.mjs";

import { projectStateView, type EntityView } from "./state.mjs";
import { settleCells, boundedReading, CELL_CAP, RUN_CAP } from "./settle.mjs";

/** How a feed decides what has settled and how its entities nest. */
export interface RecordPolicy {
  /** Attributes that hold one value at a time (latest witness wins). */
  readonly functional: ReadonlySet<string>;
  /** Attributes whose value is a child entity id (a set member, e.g. a vote). */
  readonly membership: ReadonlySet<string>;
  /** Whether a root entity is frozen, given its current view and the present time. */
  readonly settled: (root: string, view: EntityView, now: JsonValue) => boolean;
}

export interface RecordOutcome {
  readonly settledGroups: number;
  readonly recordedDatoms: number;
  readonly droppedWitnesses: number;
}

/** The data result of an invariant projection: the Datoms to append to the record,
 *  the log rewritten to only its still-maturing rows, and the tally. */
export interface RecordProjection {
  readonly datoms: readonly Datom[];
  readonly keptLog: readonly EAVT[];
  readonly outcome: RecordOutcome;
}

const NOTHING: RecordProjection = Object.freeze({
  datoms: Object.freeze([]),
  keptLog: Object.freeze([]),
  outcome: Object.freeze({ settledGroups: 0, recordedDatoms: 0, droppedWitnesses: 0 }),
});

/** Project a log to its invariant tier: settle the frozen groups into Datoms and
 *  compute the compacted log. Pure — the caller commits the result (./store). The
 *  filtration is bounded per group (CELL_CAP / RUN_CAP); a group beyond the bound
 *  is still compacted, recorded with a transparent `bounded` reading. */
export function projectRecordData(
  log: readonly EAVT[],
  policy: RecordPolicy,
  now: JsonValue,
): RecordProjection {
  if (log.length === 0) return { ...NOTHING, keptLog: log };

  // child entity -> parent entity, from the membership cells.
  const parentOf = new Map<string, string>();
  for (const [e, a, v] of log) {
    if (policy.membership.has(String(a))) parentOf.set(canonical(v), canonical(e));
  }
  const rootOf = (entity: string): string => {
    let cursor = entity;
    const seen = new Set<string>();
    while (parentOf.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      cursor = parentOf.get(cursor)!;
    }
    return cursor;
  };

  const view = projectStateView(log, policy.functional);
  const settledRoots = new Set<string>();
  for (const entity of Object.keys(view)) {
    if (parentOf.has(entity)) continue; // only roots settle; members go with them
    if (policy.settled(entity, view[entity] ?? Object.freeze({}), now)) settledRoots.add(entity);
  }
  if (settledRoots.size === 0) return { ...NOTHING, keptLog: log };

  // Partition the log by whether a row belongs to a settled group, grouping the
  // settled rows under their root so each group settles together.
  const kept: EAVT[] = [];
  const groups = new Map<string, EAVT[]>();
  for (const row of log) {
    const root = rootOf(canonical(row[0]));
    if (!settledRoots.has(root)) { kept.push(row); continue; }
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(row);
  }

  const datoms: Datom[] = [];
  let runs = 0;
  for (const cells of groups.values()) {
    const reading = cells.length <= CELL_CAP && runs < RUN_CAP
      ? (runs++, settleCells(cells))
      : boundedReading(cells.length);
    for (const [e, a, v, t] of cells) datoms.push(datom([e, a, v, t], reading as unknown as JsonValue));
  }

  return Object.freeze({
    datoms: Object.freeze(datoms),
    keptLog: Object.freeze(kept),
    outcome: Object.freeze({
      settledGroups: groups.size,
      recordedDatoms: datoms.length,
      droppedWitnesses: log.length - kept.length,
    }),
  });
}
