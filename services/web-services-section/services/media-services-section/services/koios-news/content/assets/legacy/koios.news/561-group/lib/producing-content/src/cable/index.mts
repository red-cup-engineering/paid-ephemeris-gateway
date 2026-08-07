// producing-content/cable — the wire and the cable, web-free.
//
// Vocabulary, in the literal electrical sense: a NEWSWIRE is a discrete thing
// with its own data — a provenanced claim stream with a masthead, owning its
// store, its item projection, its surfaces, and its production kit. A NEWSCABLE
// is a NEW thing whose data IS newswires — a bundle of wires the way a cable is
// a bundle of wires, adding only the sheath: the routing inversion, the index,
// /cable.json, robots, and sitemap. Claim-state bundles are the canonical
// resources throughout; HTML and feeds are lossy projections, and no projection
// displays a claim stronger than its force.
//
// This is the FORMING + STORE + PRODUCTION KIT, all web-free: the surface
// strings come from @emsenn/content's pure feed codecs, and the HTML document
// shell is an injected `render` (the cable topology — routing, /cable.json — is
// @emsenn/content/topology/news). HTTP transport (mounting `cable.handle` on a
// listener) is the site's affair; filum supplies the renderer and the App.

export {
  addDays,
  assertedNow,
  computesClaim,
  createNewswire,
  htmlPage,
  loadWireBundles,
  readBundleFile,
  reportWrite,
  resolveDate,
  wireSurfaceUrls,
  writeBundleIfAbsent,
  type ComputedClaimInput,
  type Newswire,
  type NewswireAuthor,
  type NewswireDefinition,
  type NewswireDescription,
  type NewswireOptions,
  type RenderDocument,
  type RenderLink,
  type StoredBundle,
  type WireCorrection,
  type WireSurface,
  type WireSurfaceUrls,
  type WriteOutcome,
} from "./wire.mjs";

export {
  createNewscable,
  type CableDirectory,
  type Newscable,
  type NewscableOptions,
} from "./cable.mjs";

export {
  DEFAULT_WIRE_STORE,
  NEWSCABLE_CONFIG_BLOCK,
  assertNewscableBlock,
  assertNewswireBlock,
  aggregateWires,
  readNewscableSiteConfig,
  type NewscableSiteConfig,
  type NewswireBlock,
  type NewswireConfig,
} from "./discovery.mjs";

export {
  auditOf,
  claimLine,
  freshnessOf,
  itemSummary,
  itemTitle,
  projectItem,
  propositionText,
  publishedOf,
  sortReverseChronological,
  updatedOf,
  type WireAuditEntry,
  type WireItem,
} from "./projection.mjs";

export {
  ingestWire,
  ingestCableFromConfig,
  type IngestResult,
} from "./ingest.mjs";

export {
  SourceRollSchema,
  SourceRollSourceSchema,
  SourceRollWireSchema,
  sourceRollCarrier,
  sourceRollReading,
  sourceRollTerm,
  type SourceRollClassification,
  type SourceRollClassifier,
  type SourceRollOptions,
  type SourceRollReading,
  type SourceRollSource,
  type SourceRollWire,
} from "./source-roll.mjs";
