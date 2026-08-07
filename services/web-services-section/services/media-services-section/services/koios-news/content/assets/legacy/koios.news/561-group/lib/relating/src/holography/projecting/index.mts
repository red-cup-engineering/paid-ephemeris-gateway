// holography/projecting — the three-tier witness ledger as boundary→bulk holography.
//
//   data/log/<feed>.jsonl     append-only EAVT witnesses (the boundary)
//   data/state/<feed>.json    the current view, projected from the log (bulk)
//   data/record/<feed>.jsonl  settled invariants (Datoms), log compacted (bulk)
//
// The append-only log is the boundary; state and record are the bulk it
// holographically determines. Grounded in the eavt/datom codecs and the settlement
// filtration: EAVT is a monotone witness, the Datom carries the settled reading,
// and the filtration derives what is invariant. The projection morphisms (cells,
// state, settle, record) are PURE; ./store is the single effectful binding (the
// only node:fs in this module). A caller defines a Feed ("get this from the source,
// witness it here") and the three tiers are generic over it.

export { cell, attributesOf, membersOf, type Witness } from "./cells.mjs";
export { projectStateView, type EntityView, type StateView } from "./state.mjs";
export {
  settleCells,
  boundedReading,
  CELL_CAP,
  RUN_CAP,
  type SettlementReading,
} from "./settle.mjs";
export {
  projectRecordData,
  type RecordPolicy,
  type RecordOutcome,
  type RecordProjection,
} from "./record.mjs";
export {
  type WitnessStore,
  feedPath,
  ensureStoreDirs,
  readWitnessLog,
  appendWitnesses,
  writeFileAtomic,
  writeJsonAtomic,
  writeState,
  commitRecord,
  appendJsonl,
  readJsonl,
  readJsonFile,
} from "./store.mjs";
export {
  witnessObservation,
  projectFeedState,
  projectFeedRecord,
  type Feed,
} from "./feed.mjs";
