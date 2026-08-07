/**
 * codecs/html/packet — the SHP packet object: a finite, content-addressed,
 * monotone projection witness. Per the spec it declares its source carrier, the
 * finite frontier (the cell keys it settled), settlement + projection evidence,
 * the projection morphism id, the HTML carrier, and a deterministic identity.
 *
 * `pack` is deterministic for a fixed dataform + morphism registry, and the
 * identity is content-derived, so a later frontier yields a later packet
 * without mutating any earlier witness.
 */
import type { ShpCell, ShpDataform } from "./normalize.mjs";
import { unmark, type HtmlValue } from "./escape.mjs";
import { project } from "./project.mjs";
import type { MorphismRegistry } from "./morphism.mjs";

/**
 * The SHP packet object: a finite, content-addressed projection witness.
 * Declares the source carrier, the finite frontier (the cell keys settled),
 * settlement and projection evidence, the projection morphism id, the HTML
 * carrier, and a deterministic content-derived identity.
 */
export interface ShpPacket {
  readonly kind: "shp.packet";
  /** the source trace/carrier this packet projects. */
  readonly source: HtmlValue;
  /** the finite frontier: the cell keys settled into this packet. */
  readonly frontier: readonly string[];
  /** finite settlement evidence (opaque to the codec). */
  readonly settlement: HtmlValue;
  /** the projection morphism identity. */
  readonly projection: string;
  /** the HTML packet carrier. */
  readonly html: string;
  /** projection evidence (opaque to the codec). */
  readonly evidence: HtmlValue;
  /** the deterministic content-address. */
  readonly identity: string;
}

/**
 * The inputs to pack: the source carrier the packet projects, plus optional
 * settlement evidence, projection evidence, projection morphism id, and
 * morphism registry used to drive the HTML projection.
 */
export interface PackDeclaration {
  readonly source: HtmlValue;
  readonly settlement?: HtmlValue;
  readonly evidence?: HtmlValue;
  readonly projection?: string;
  readonly morphisms?: MorphismRegistry;
}

/**
 * Projects a dataform into an ShpPacket: renders the HTML carrier via the
 * declared morphism registry, derives the frontier from the dataform cell keys,
 * and computes a deterministic content-address over the projection id,
 * frontier, and html. Returns a frozen packet.
 */
export function pack(dataform: ShpDataform, decl: PackDeclaration): ShpPacket {
  const html = project(dataform, decl.morphisms);
  const frontier = (dataform.cells ?? []).map((c) => cellKey(c.cell));
  const projection = decl.projection ?? "shp.project/1";
  const identity = address(`${projection}\n${canonicalJson(frontier)}\n${html}`);
  return Object.freeze({
    kind: "shp.packet",
    source: decl.source,
    frontier,
    settlement: decl.settlement ?? null,
    projection,
    html,
    evidence: decl.evidence ?? null,
    identity,
  });
}

/** The canonical identity of a cell: its [entity, attribute, value] coordinates. */
export function cellKey(cell: Partial<ShpCell>): string {
  const subject = unmark(cell?.subject);
  const predicate = unmark(cell?.predicate);
  const object = unmark(cell?.object);
  return canonicalJson([subject ?? null, predicate ?? null, object === undefined ? null : object]);
}

/** A deterministic content-address (FNV-1a, 64-bit, hex). Pure; no I/O. */
export function address(content: string): string {
  const mask = 0xffffffffffffffffn;
  const prime = 0x100000001b3n;
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < content.length; i++) {
    hash = (hash ^ BigInt(content.charCodeAt(i))) & mask;
    hash = (hash * prime) & mask;
  }
  return `shp1-${hash.toString(16).padStart(16, "0")}`;
}

function canonicalJson(value: HtmlValue | readonly HtmlValue[]): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}
