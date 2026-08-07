/**
 * codecs/html — the Semantic Hypertext Packet (SHP) codec: a carrier⇄HTML
 * holography projector.
 *
 * SHP (per the research spec) is a finite, deterministic, MONOTONE projection of
 * a settled carrier frontier into HTML, where `class` names a morphism identity
 * and `data-*` attributes carry carrier coordinates (entity/attribute/value +
 * bilattice sides), with RFC 7992 as one pluggable inhabitant profile. It is a
 * `../../holography` projector: `project` is the write direction (cells → HTML),
 * `markup` the read direction (HTML → charged cells), and `htmlProjector` binds
 * both into the holography kernel.
 *
 *   - escape    — HTML-safe text/attr + charge marks (relating's charge naming)
 *   - normalize — settle a section / cells / detector report into an ShpDataform
 *   - project   — ShpDataform → HTML packet (the projection morphism)
 *   - markup    — HTML packet → charged cells (the inverse, for carrier coordinates)
 *   - morphism  — the class-as-morphism registry
 *   - packet    — the ShpPacket object: frontier, settlement/projection evidence, content-address
 *   - lint      — packet-safety obligations
 *   - profiles  — inhabitant profiles (RFC 7992)
 *   - projector — SHP as a holography Projector<ChargedCell>
 */
export {
  escapeText,
  escapeAttr,
  slug,
  unmark,
  chargeValueOf,
  chargeMark,
  calmChargeOf,
  isContested,
} from "./escape.mjs";

export { fromSection, fromCells, fromDetect } from "./normalize.mjs";
export type {
  ShpCell,
  ChargedCell,
  SectionEntry,
  Section,
  DataformOptions,
  ShpDataform,
  DetectSpan,
  DetectRule,
  DetectFinding,
  DetectReport,
} from "./normalize.mjs";

export { project, shp } from "./project.mjs";
export { markup } from "./markup.mjs";

export { defaultMorphisms, morphismRegistry } from "./morphism.mjs";
export type { Morphism, MorphismRegistry } from "./morphism.mjs";

export { pack, cellKey, address } from "./packet.mjs";
export type { ShpPacket, PackDeclaration } from "./packet.mjs";

export { lint } from "./lint.mjs";
export type { LintReport, LintViolation } from "./lint.mjs";

export { rfc7992Profile, RFC7992_CLASSES } from "./profiles.mjs";
export type { Profile, Rfc7992Class } from "./profiles.mjs";

export { htmlProjector } from "./projector.mjs";
