// holography/projecting/settle — the bridge from witness cells to a settled reading.
//
// "You ASSERT EAVT and RECEIVE Datoms" (the eavt codec): the Datom's fifth slot
// is where the settled judgement goes. This module computes that judgement by
// running the settlement filtration over a bounded set of cells — one relational
// subject's witnesses at a time, never the whole log.
//
// Boundedness is not optional. The feasibility spike showed the descent costs
// ~O(n²) in cell count (~3.6s at 256 cells), and the substrate is the same exact
// arithmetic the corpus warns can "never return" on large inputs. Settling a
// thing's own witness history (a post and its votes — tens to low-hundreds of
// cells) stays well inside the feasible region; settling the accumulated log
// would not. So a caller settles per-group, offline, only for things already
// frozen by chain consensus — and the record tier holds the bound to `CELL_CAP` /
// `RUN_CAP` so a viral group is compacted with a transparent `bounded` reading
// rather than freezing the process.
//
// Pure: a fold over the settlement filtration; performs no I/O.

import {
  mark,
  utterance,
} from "../../articulating/index.mjs";
import {
  settleUtterances,
  readClassificationOfSettlementFiltration,
  readClosureInvariantOfSettlementFiltration,
} from "../../articulating/predicating/positing/settling/index.mjs";
import {
  canonical,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
import type {
  EAVT,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";

/** A settled judgement read off the filtration: the closure regime (finite means
 *  it stabilized at a finite stage — a clean invariant) and the number of
 *  non-Scott closure steps it took. Recorded in each settled Datom's reading slot. */
export interface SettlementReading {
  readonly kind: "relating.projecting.settlement";
  readonly cells: number;
  readonly regime: string;
  readonly closureSteps: number;
}

const TRIVIAL: SettlementReading = Object.freeze({
  kind: "relating.projecting.settlement" as const,
  cells: 0,
  regime: "ordinal.closure.regime.finite",
  closureSteps: 0,
});

// Feasibility bounds on the settlement filtration (its descent is ~O(n²); the
// feasibility spike measured ~3.6s at 256 cells). Pruning a settled group is
// cheap and always happens; running the *filtration reading* over it is what we
// bound. A group larger than CELL_CAP, or beyond RUN_CAP runs in one pass, is
// still compacted but recorded with the transparent `bounded` reading below
// rather than freezing the process over a viral root's thousands of members.
export const CELL_CAP = 200;
export const RUN_CAP = 12;

/** The transparent reading for a group settled beyond the feasibility bound: the
 *  group is still compacted, but the filtration was not run over it. */
export function boundedReading(cells: number): SettlementReading {
  return { kind: "relating.projecting.settlement", cells, regime: "bounded:not-settled", closureSteps: 0 };
}

/** Settle a bounded set of witness cells and read off the judgement. Each cell
 *  utters its coordinate (entity×attribute) against its content (value×time);
 *  the filtration relates those utterances and settles them to a fixed point. */
export function settleCells(cells: readonly EAVT[]): SettlementReading {
  if (cells.length === 0) return TRIVIAL;
  const utterances = cells.map(([e, a, v, t]) =>
    utterance(mark(canonical({ e, a })), mark(canonical({ v, t }))));
  const filtration = settleUtterances(utterances);
  const regime = readClassificationOfSettlementFiltration(filtration).regime.kind;
  const closureSteps = readClosureInvariantOfSettlementFiltration(filtration).nonScottAdditions.length;
  return Object.freeze({ kind: "relating.projecting.settlement" as const, cells: cells.length, regime, closureSteps });
}
