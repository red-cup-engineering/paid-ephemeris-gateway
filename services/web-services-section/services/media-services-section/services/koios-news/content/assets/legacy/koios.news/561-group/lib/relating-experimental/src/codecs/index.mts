/**
 * codecs — the representation boundaries of relating.
 *
 * Codecs witness that a value can cross a representation (string, JSON, EAVT)
 * and reject what cannot inhabit it. They are transport witnesses, never the
 * category's ontology. Each is a holography `Projector`, so they share one
 * restriction lattice and one classifier.
 */
export {
  type JsonValue,
  type JsonRecord,
  isJsonValue,
  isJsonRecord,
  requireJsonValue,
  parse as parseJson,
  jsonResource,
  canonical,
  parseLines,
  serializeLines,
  jsonProjector,
  jsonlProjector,
} from "./json.mjs";

export {
  EAVT_JSONL,
  type EAVT,
  type EAVTRecord,
  type Datom,
  type Cell,
  type ChargedCell,
  type EAVTTriple,
  isEavtShape,
  eavtRecord,
  eavtId,
  eavtTriple,
  eavtToCell,
  cellToEavt,
  eavtOrder,
  parse as parseEavt,
  serialize as serializeEavt,
  serializeDatoms,
  eavtProjector,
} from "./eavt.mjs";

export {
  nonBlankLines,
  parseLines as parseJsonlLines,
  serializeLines as serializeJsonlLines,
} from "./json.mjs";

export {
  datom as datomRow,
  parse as parseDatoms,
} from "./datom.mjs";

// Holography kernel functions the codec catalog re-exposes (a path is a
// holography Projector; classification/entailment/restriction act on it).
export { classify, entails, restrict } from "../holography/index.mjs";

export { stringProjector } from "./text.mjs";

export {
  toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, toNumber, fromInts,
  integerToDecimalString, ratToExactString, parseDecimal, fromDecimalString, toDecimalString,
} from "./exact-number.mjs";

export * as datom from "./datom.mjs";
export * as triple from "./triple.mjs";

export { decodeToml, encodeToml, type TomlValue, type TomlTable } from "./toml.mjs";
export { iriRef, turtleLiteral } from "./turtle.mjs";

export {
  toEavt, mergeEavtLogs, unfoldJson, foldJson,
} from "./eavt.mjs";

export * as schema from "./schema.mjs";
export {
  JSON_SCHEMA_DIALECT, schemaProjector, unfoldSchema, foldSchema,
  projectSchemaAssertions, resolveJsonPointer,
  type JsonSchema, type SchemaAssertion,
} from "./schema.mjs";

export * as markdown from "./markdown.mjs";
export {
  markdownProjector, markdownDataform, markdownDocumentSchemaFragment,
  documentTypeDefinitions, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions,
  type MarkdownDataform, type DocumentTypeDefinition,
} from "./markdown.mjs";

export * as html from "./html.mjs";
export { escapeText, escapeAttr, slug, type HtmlValue } from "./html.mjs";

export * as xml from "./xml.mjs";
export { escapeXmlText, escapeXmlAttr, isXmlName, type XmlNode } from "./xml.mjs";

export * as svg from "./svg.mjs";
export { projectSvg, svgProjector, type SvgDataform } from "./svg.mjs";

export * as path from "./path.mjs";
export {
  address, logPath, eavtLogPaths, termKey, segment, sanitizeSegment, desanitizeSegment,
  composeTerm, decomposeTerm, namespaceOf, withinNamespace, termOf, termOfNested, addressNested,
  dehydrateUtterances, rehydrateUtterances,
  normalizePath, pathParent, pathBasename, pathPoint, pathOfPoint, isPathname, validPath,
  pathProjector, type AddressTerm,
} from "./path.mjs";

export * as evidence from "./evidence.mjs";
export * as spectral from "./spectral.mjs";
