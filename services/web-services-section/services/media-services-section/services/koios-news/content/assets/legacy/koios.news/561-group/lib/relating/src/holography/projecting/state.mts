// holography/projecting/state — the current-view projection (the state tier).
//
// State is a pure projection of the witness log: no new facts, only a reading of
// the ones witnessed. For each cell coordinate (entity, attribute):
//   • a FUNCTIONAL attribute (net_rshares, pending_payout — one value at a time)
//     projects to the value of its latest witness;
//   • any other attribute is SET-valued (tags, votes, beneficiaries — members
//     accumulate, monotone, never retracted) and projects to all witnessed values.
// The result is `{ entity: { attribute: value | value[] } }` — the live view any
// reader can consult without replaying the chain.
//
// Relationship to the datom codec: `currentDatomValue` folds object-datoms to the
// latest value per (e,a) — exactly this projection restricted to functional
// attributes. `projectStateView` generalizes it to the EAVT substrate and adds the
// set-valued (monotone accumulation) case. Pure: performs no I/O; the state-tier
// file write lives in ./store.
//
// This module imports nothing from node — the boundary→bulk fold is mathematics.

import {
  canonical,
  type JsonValue,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
import type {
  EAVT,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";

/** True when `a` is a strictly later witness time than `b`. Numbers compare
 *  numerically (block heights), everything else by canonical string (ISO times
 *  sort chronologically). */
function later(a: JsonValue, b: JsonValue): boolean {
  if (typeof a === "number" && typeof b === "number") return a > b;
  return canonical(a) > canonical(b);
}

/** A projected entity: each attribute mapped to its current value (functional) or
 *  the accumulated set of its values (everything else). */
export type EntityView = Readonly<Record<string, JsonValue>>;
export type StateView = Readonly<Record<string, EntityView>>;

/** Project a witness log to the current view. `functional` names the attributes
 *  that hold one value at a time (latest witness wins); all others accumulate. */
export function projectStateView(log: readonly EAVT[], functional: ReadonlySet<string>): StateView {
  // entity -> attribute -> (functional: {v,t}) | (set: Map<canonical(v), v>)
  const fnLatest = new Map<string, Map<string, { v: JsonValue; t: JsonValue }>>();
  const setVals = new Map<string, Map<string, Map<string, JsonValue>>>();

  for (const [e, a, v, t] of log) {
    const entity = canonical(e);
    const attribute = String(a);
    if (functional.has(attribute)) {
      const attrs = fnLatest.get(entity) ?? new Map();
      const prev = attrs.get(attribute);
      if (prev === undefined || later(t, prev.t)) attrs.set(attribute, { v, t });
      fnLatest.set(entity, attrs);
    } else {
      const attrs = setVals.get(entity) ?? new Map();
      const members = attrs.get(attribute) ?? new Map();
      members.set(canonical(v), v);
      attrs.set(attribute, members);
      setVals.set(entity, attrs);
    }
  }

  const entities = new Set<string>([...fnLatest.keys(), ...setVals.keys()]);
  const view: Record<string, EntityView> = {};
  for (const entity of entities) {
    const out: Record<string, JsonValue> = {};
    for (const [attribute, { v }] of fnLatest.get(entity) ?? []) out[attribute] = v;
    for (const [attribute, members] of setVals.get(entity) ?? []) out[attribute] = [...members.values()];
    view[entity] = Object.freeze(out);
  }
  return Object.freeze(view);
}
