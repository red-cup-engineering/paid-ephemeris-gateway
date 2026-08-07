/**
 * codecs/path/object/attribute/file/flatfile/serialization/json/jsonl
 *
 * JSON Lines: a flatfile serialization whose non-blank lines are independent
 * JSON values. Leaves such as EAVT and Datom restrict this line discipline.
 */
import { restrict, type Projector } from "../../../../../../../../../holography/index.mjs";
import { canonical, parse, type JsonValue } from "../index.mjs";
import { jsonProjector } from "../index.mjs";

/** The newline-delimited JSON media type. */
export const JSONL = "application/jsonl; charset=utf-8";

/** The non-blank lines of a document. */
export const nonBlankLines = (content: string): string[] =>
  content.split("\n").filter((line) => line.trim() !== "");

/** Parse a jsonl document into its values: one json value per non-blank line. */
export const parseLines = (content: string): JsonValue[] => nonBlankLines(content).map(parse);

/** Serialize values to a jsonl document: one canonical value per newline-terminated line. */
export const serializeLines = (values: readonly JsonValue[]): string =>
  values.map((value) => canonical(value) + "\n").join("");

export const jsonlProjector: Projector<unknown> = restrict(jsonProjector, {
  type: "jsonl",
  recognize: (resource) => {
    try {
      return nonBlankLines(resource.content).length > 0 && parseLines(resource.content).length > 0;
    } catch {
      return false;
    }
  },
});

export type { JsonValue, JsonRecord } from "../index.mjs";
export { canonical, isJsonRecord, isJsonValue, parse, requireJsonValue } from "../index.mjs";
