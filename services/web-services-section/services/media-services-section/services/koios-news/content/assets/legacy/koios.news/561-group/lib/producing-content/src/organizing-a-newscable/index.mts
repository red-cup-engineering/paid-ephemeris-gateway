/**
 * organizing-a-newscable - the cable-bundling facet.
 *
 * Newscables bundle newswires. The cable owns the sheath: routing inversion,
 * the cable directory, cable index, robots, sitemap, ingest, and source-roll
 * readings over configured wires.
 */
export {
  DEFAULT_WIRE_STORE,
  NEWSCABLE_CONFIG_BLOCK,
  SourceRollSchema,
  SourceRollSourceSchema,
  SourceRollWireSchema,
  aggregateWires,
  assertNewscableBlock,
  assertNewswireBlock,
  createNewscable,
  ingestCableFromConfig,
  ingestWire,
  readNewscableSiteConfig,
  sourceRollCarrier,
  sourceRollReading,
  sourceRollTerm,
  type CableDirectory,
  type IngestResult,
  type Newscable,
  type NewscableOptions,
  type NewscableSiteConfig,
  type NewswireBlock,
  type NewswireConfig,
  type RenderDocument,
  type SourceRollClassification,
  type SourceRollClassifier,
  type SourceRollOptions,
  type SourceRollReading,
  type SourceRollSource,
  type SourceRollWire,
} from "../cable/index.mjs";
