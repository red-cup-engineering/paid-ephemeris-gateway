// holography/projecting/cells — the grain-of-change EAVT cell DSL.
//
// A witness is an EAVT `[entity, attribute, value, time]`: at `time`, the cell
// (entity, attribute, value) was observed (see the eavt codec — monotone, no
// assert/retract; finality is derived by settling, never claimed).
//
// The whole compression argument rests on choosing the entity at the *grain of
// independent change*, exactly as the relational codec does
// (`[citekey, "author", literal, t]` — each set member its own entity). Model a
// thing's volatile parts as their own entities and an unchanged observation
// re-witnesses to byte-identical rows, so it dedupes to zero cost. Values may be
// rich JSON; only the time coordinate is forced to be a scalar witness.
//
// Pure: constructs cells, performs no I/O.

import type {
  JsonValue,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
import type {
  EAVTRecord,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";
import { eavtRecord } from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";

/** The witness time coordinate — a scalar mark (an ISO string, a block number). */
export type Witness = JsonValue;

/** One witnessed cell. `value` may be rich (an object/array), never undefined. */
export function cell(entity: JsonValue, attribute: JsonValue, value: JsonValue, at: Witness): EAVTRecord {
  return eavtRecord({ e: entity, a: attribute, v: value, t: at });
}

/** Witness a fixed set of scalar/rich attributes of one entity, skipping any whose
 *  value is absent. The common case for a record's own slowly-changing fields. */
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

/** Witness a set whose members each become their OWN entity — the grain-of-change
 *  move. `member` derives a member entity id from each item (e.g. the voter),
 *  `memberAt` the *stable* time that member joined (e.g. the vote's own cast time
 *  — NOT the observation tick, or the membership row would churn every tick), and
 *  `fields` reduces an item to its attribute rows under that member entity. The
 *  parent gets one membership row `[parent, attribute, memberEntity, memberAt]`
 *  so the set is reconstructable; an unchanged member re-witnesses to nothing. */
export function membersOf<Item>(
  parent: JsonValue,
  attribute: string,
  items: readonly Item[],
  member: (item: Item) => JsonValue,
  memberAt: (item: Item) => Witness,
  fields: (item: Item, entity: JsonValue) => readonly EAVTRecord[],
): EAVTRecord[] {
  const rows: EAVTRecord[] = [];
  for (const item of items) {
    const entity = member(item);
    rows.push(cell(parent, attribute, entity, memberAt(item)));
    for (const row of fields(item, entity)) rows.push(row);
  }
  return rows;
}
