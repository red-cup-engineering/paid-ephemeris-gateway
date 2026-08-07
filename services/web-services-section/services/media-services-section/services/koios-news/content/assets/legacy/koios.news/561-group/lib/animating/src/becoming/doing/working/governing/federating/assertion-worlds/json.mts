import { createHash } from "node:crypto";
import { canonical, requireJsonValue } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json";

/**
 * The sha256 content identifier for a value: hashes the value's canonical
 * stableJson serialization and returns the digest as a hex string.
 */
export function contentId(value: unknown): string {
  return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

/**
 * The canonical (JCS-style) JSON serialization of a value: an alias for
 * stableJson, returning a deterministic string with object keys sorted and
 * undefined values dropped.
 */
export function jcs(value: unknown): string {
  return stableJson(value);
}

/**
 * A deterministic JSON serialization of a value: arrays keep their order,
 * object keys are sorted lexically and entries whose value is undefined are
 * omitted, so equal values always produce the same string.
 */
export function stableJson(value: unknown): string {
  return canonical(requireJsonValue(value, "stableJson value"));
}

/**
 * Orders two stamp values by their derived sort keys, returning -1, 0, or 1 -
 * finite numbers are zero-padded to 16 digits, strings compared directly, and
 * anything else compared by its stableJson form.
 */
export function compareStamp(left: unknown, right: unknown): -1 | 0 | 1 {
  const leftKey = stampKey(left);
  const rightKey = stampKey(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

/**
 * Recursively freezes a value and all of its nested object values in place,
 * then returns the same value now made immutable.
 */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function stampKey(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return `n:${String(value).padStart(16, "0")}`;
  if (typeof value === "string") return `s:${value}`;
  return `j:${stableJson(value)}`;
}
