// holography/projecting/feed — the parameterizable "get this, witness it here" driver.
//
// A Feed is the only thing a caller writes: a name, a cellizer that turns one
// observation into grain-of-change EAVT cells, and the schema (which attributes
// are functional vs set membership, and when a root has settled). The three tiers
// — witness (append-only log), state (current projection), record (settled
// invariants + compaction) — are then generic over any feed. "Get the trending
// field, witness it under data/log/trending-field.jsonl" is a Feed; so is "get
// each account's stake". One machine, many feeds.
//
// This driver is the thin orchestration over the pure projections (./state,
// ./record) and the fs binding (./store): read → project → write. It is the reuse
// surface the corpus's hand-rolled witness loops collapse into.

import type {
  JsonValue,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
import type {
  EAVTRecord,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";

import type { Witness } from "./cells.mjs";
import { projectStateView, type EntityView, type StateView } from "./state.mjs";
import { projectRecordData, type RecordOutcome } from "./record.mjs";
import { appendWitnesses, readWitnessLog, writeState, commitRecord, type WitnessStore } from "./store.mjs";

/** A feed: how to witness one observation and how its cells settle. */
export interface Feed<Observation> {
  readonly name: string;
  /** Turn one observation, witnessed at `at`, into EAVT cells. */
  readonly cellize: (observation: Observation, at: Witness) => readonly EAVTRecord[];
  /** Attributes holding one value at a time (latest witness wins on projection). */
  readonly functional: readonly string[];
  /** Attributes whose value is a child entity id (a set member). Default none. */
  readonly membership?: readonly string[];
  /** Whether a root entity is frozen given its view and the present time. Default
   *  never — a feed with no settlement keeps everything live (e.g. market state). */
  readonly settled?: (root: string, view: EntityView, now: JsonValue) => boolean;
}

/** Witness one observation: append only the cells new since the last witness.
 *  Returns the count of genuinely new rows — the per-tick growth of this feed. */
export function witnessObservation<Observation>(
  store: WitnessStore,
  feed: Feed<Observation>,
  observation: Observation,
  at: Witness,
): { readonly appended: number } {
  return appendWitnesses(store, feed.name, feed.cellize(observation, at));
}

/** Project the feed's current view and write data/state/<feed>.json. */
export function projectFeedState<Observation>(store: WitnessStore, feed: Feed<Observation>): StateView {
  const view = projectStateView(readWitnessLog(store, feed.name), new Set(feed.functional));
  writeState(store, feed.name, view);
  return view;
}

/** Settle the feed's frozen groups: record their invariants and compact the log.
 *  A no-op for feeds without a `settled` predicate. Run offline, not per tick. */
export function projectFeedRecord<Observation>(
  store: WitnessStore,
  feed: Feed<Observation>,
  now: JsonValue,
): RecordOutcome {
  const settled = feed.settled;
  if (settled === undefined) return { settledGroups: 0, recordedDatoms: 0, droppedWitnesses: 0 };
  const log = readWitnessLog(store, feed.name);
  const projection = projectRecordData(log, {
    functional: new Set(feed.functional),
    membership: new Set(feed.membership ?? []),
    settled,
  }, now);
  commitRecord(store, feed.name, projection.datoms, projection.keptLog);
  return projection.outcome;
}
