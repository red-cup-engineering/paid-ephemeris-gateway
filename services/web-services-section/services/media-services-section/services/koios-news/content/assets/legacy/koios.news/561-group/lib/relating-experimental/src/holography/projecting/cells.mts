// holography/projecting/cells — the grain-of-change EAVT cell DSL.
//
// A witness is an EAVT `[entity, attribute, value, time]`: at `time`, the cell
// (entity, attribute, value) was observed (monotone, no assert/retract; finality
// is derived by settling). Choosing the entity at the grain of independent change
// is the whole compression argument: an unchanged observation re-witnesses to a
// byte-identical row and dedupes to zero cost. Pure: constructs cells, no I/O.

import { eavtRecord, type EAVTRecord } from "../../codecs/eavt.mjs";
import type { JsonValue } from "../../codecs/json.mjs";

/** The witness time coordinate — a scalar mark (an ISO string, a block number). */
export type Witness = JsonValue;

/** One witnessed cell. `value` may be rich (object/array), never undefined. */
export function cell(entity: JsonValue, attribute: JsonValue, value: JsonValue, at: Witness): EAVTRecord {
  return eavtRecord({ e: entity, a: attribute, v: value, t: at });
}

/** Witness a fixed set of attributes of one entity, skipping absent values. */
export function attributesOf(
  entity: JsonValue,
  source: Readonly<Record<string, unknown>>,
  attributes: readonly string[],
  at: Witness,
): EAVTRecord[] {
  const rows: EAVTRecord[] = [];
  for (const attribute of attributes) {
    const value = source[attribute];
    if (value === undefined || value === null) continue;
    rows.push(cell(entity, attribute, value as JsonValue, at));
  }
  return rows;
}
