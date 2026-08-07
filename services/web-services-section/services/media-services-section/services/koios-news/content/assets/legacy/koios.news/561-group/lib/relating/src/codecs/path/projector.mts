/**
 * codecs/path/projector
 *
 * The root path projector without descendant rollups. Descendant path codecs
 * inherit from this parent so the public path index can remain an observation
 * surface instead of an initialization dependency.
 */
import { define, type Projector, type Resource } from "../../holography/index.mjs";

export type PathResource = Resource;

export const POSIX_PATHNAME_PATTERN = /^\/$|^\/?(?:[^/\u0000]+\/?)+$/;

export const isPathname = (value: string): boolean => POSIX_PATHNAME_PATTERN.test(value);

/** A POSIX lexical path is a non-empty string with no NUL byte. */
export const validPath = (path: unknown): path is string =>
  typeof path === "string" && path.length > 0 && !path.includes("\0");

/** Lexically normalize a path: drop "." and empty segments, resolve ".." where possible, keep absoluteness. */
export function normalizePath(path: string): string {
  if (!validPath(path)) throw new TypeError("normalizePath: path must be a non-empty string without NUL");
  const absolute = path.startsWith("/");
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length > 0 && parts[parts.length - 1] !== "..") parts.pop();
      else if (!absolute) parts.push("..");
      continue;
    }
    parts.push(part);
  }
  const joined = parts.join("/");
  if (absolute) return joined ? `/${joined}` : "/";
  return joined || ".";
}

/** The normalized parent path, or null at a root path ("/" or "."). */
export function pathParent(path: string): string | null {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === ".") return null;
  const absolute = normalized.startsWith("/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return absolute ? "/" : ".";
  const parent = parts.slice(0, -1).join("/");
  return absolute ? `/${parent}` : parent;
}

/** The final normalized path segment. */
export function pathBasename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === ".") return normalized;
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

/** The point identifier for a normalized POSIX path. */
export function pathPoint(path: string): string {
  return `path:${normalizePath(path)}`;
}

/** The path carried by a path point, or null when the point is not path-shaped. */
export function pathOfPoint(point: string): string | null {
  return point.startsWith("path:") ? point.slice(5) : null;
}

export const pathProjector: Projector<unknown> = define<unknown>({
  type: "path",
  recognize: (resource) => isPathname(resource.path),
});
