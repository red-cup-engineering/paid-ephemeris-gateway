/**
 * codecs/path
 *
 * The root path projector. A path is a categorical address, not a bag of file
 * metadata. Descendants restrict this address by Curry-Howard directionality:
 * each child can only be recognized when its parent is already recognized.
 */
export { classify, entails, restrict, type Projector, type Resource } from "../../holography/index.mjs";
export {
  isPathname,
  normalizePath,
  pathBasename,
  pathOfPoint,
  pathParent,
  pathPoint,
  pathProjector,
  POSIX_PATHNAME_PATTERN,
  validPath,
  type PathResource,
} from "./projector.mjs";

export * as object from "./object/index.mjs";
export * as attribute from "./object/attribute/index.mjs";
export * as file from "./object/attribute/file/index.mjs";
export * as flatfile from "./object/attribute/file/flatfile/index.mjs";
export * as text from "./object/attribute/file/flatfile/text/index.mjs";
export * as serialization from "./object/attribute/file/flatfile/serialization/index.mjs";
export * as json from "./object/attribute/file/flatfile/serialization/json/index.mjs";
export * as jsonSchema from "./object/attribute/file/flatfile/serialization/json/schema/index.mjs";
export * as jsonl from "./object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
export * as eavt from "./object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";
export * as triple from "./object/attribute/file/flatfile/serialization/json/jsonl/eavt/triple/index.mjs";
export * as datom from "./object/attribute/file/flatfile/serialization/json/jsonl/datom/index.mjs";
export * as markdown from "./object/attribute/file/flatfile/text/markdown/index.mjs";
export * as html from "./object/attribute/file/flatfile/serialization/html/index.mjs";
export * as toml from "./object/attribute/file/flatfile/serialization/toml/index.mjs";
export * as turtle from "./object/attribute/file/flatfile/serialization/turtle/index.mjs";

export {
  JSON_MEDIA_TYPE,
  canonical,
  canonical as canonicalJson,
  isJsonRecord,
  isJsonValue,
  jsonProjector,
  parse as parseJson,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "./object/attribute/file/flatfile/serialization/json/index.mjs";

export {
  JSONL,
  jsonlProjector,
  nonBlankLines,
  parseLines,
  parseLines as parseJsonlLines,
  serializeLines,
  serializeLines as serializeJsonlLines,
} from "./object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";

export {
  JSON_SCHEMA_DIALECT,
  assertSchemaAssertion,
  cohereSchemaAssertions,
  foldSchema,
  mergeSchemaAssertions,
  parseSchemaAssertions,
  projectSchemaAssertions,
  resolveJsonPointer,
  schemaAssertionEavt,
  schemaAssertionEavtId,
  schemaAssertionId,
  schemaAssertionTriple,
  schemaProjector,
  serializeSchemaAssertions,
  unfoldSchema,
  type JsonSchema,
  type JsonSchemaDocument,
  type SchemaAssertion,
  type SchemaCohereResult,
  type SchemaContradiction,
  type SchemaProjectResult,
} from "./object/attribute/file/flatfile/serialization/json/schema/index.mjs";

export {
  EAVT_JSONL,
  cellToEavt,
  eavtOrder,
  eavtProjector,
  eavtToCell,
  isEavtShape,
  parse as parseEavt,
  serialize as serializeEavt,
  toEavt,
  type ChargedCell,
  type Cell,
  type EAVT,
  type EAVTRecord,
} from "./object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";

export {
  assertTriple,
  dedupeTriples,
  tripleFromDatom,
  tripleFromEavt,
  tripleId,
  type Triple,
} from "./object/attribute/file/flatfile/serialization/json/jsonl/eavt/triple/index.mjs";

export {
  ASSERT,
  RETRACT,
  assertDatomFact,
  assertObjectDatom,
  currentDatomValue,
  datom as datomRow,
  foldObjectDatoms,
  isDatomShape,
  objectDatomId,
  objectDatomWitnesses,
  objectDatomsAsOf,
  parse as parseDatoms,
  retractDatomFact,
  serialize as serializeDatoms,
  toDatom,
  type CurrentDatomFact,
  type Datom,
  type DatomOp,
  type ObjectDatomCharge,
  type ObjectDatomSection,
  type ObjectDatomSectionCell,
  type ObjectDatom,
} from "./object/attribute/file/flatfile/serialization/json/jsonl/datom/index.mjs";

export { decodeToml, encodeToml, type TomlTable, type TomlValue } from "./object/attribute/file/flatfile/serialization/toml/index.mjs";
export { iriRef, turtleLiteral } from "./object/attribute/file/flatfile/serialization/turtle/index.mjs";
export {
  DOC_TYPE_STAMP,
  allDocumentTypeAssertions,
  documentTypeAssertions,
  documentTypeDefinitions,
  documentTypeFragment,
  frontmatterConformance,
  markdownDocumentSchemaFragment,
  markdownDataform,
  markdownProjector,
  parseMarkdown,
  type DocumentTypeDefinition,
  type FrontmatterCharge,
  type FrontmatterChargeEntry,
  type FrontmatterConformance,
  type FrontmatterModality,
  type MarkdownAssertion,
  type MarkdownDataform,
  type MarkdownFrontmatterFormat,
  type MarkdownParseResult,
} from "./object/attribute/file/flatfile/text/markdown/index.mjs";
