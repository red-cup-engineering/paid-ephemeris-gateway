/**
 * @emsenn/content-codecs — content codecs.
 *
 * Geometric morphisms between external content representations and this
 * workspace's records. News ⊂ content: the news publishing codecs live
 * here as content codecs, beside the demand and document-serialization
 * ones. Each module is also reachable as a subpath:
 *
 * - search-console (./search-console) — Google Search Console demand: the
 *   RS256 service-account assertion (encode), the OAuth2 token grant
 *   (decode), the Search Analytics query body (encode), and result rows as
 *   DemandAssertion records (decode), with the scope/audience constants.
 * - frontmatter (./frontmatter) — YAML-front-matter markdown documents:
 *   decode/encode a { frontMatter, body } document.
 * - ninjs (./ninjs) — IPTC ninjs news articles: build and serialize a
 *   ninjs record / artifact (the news-publishing codec).
 * - vault (./vault) — the front-matter corpus read as a content mill: resolve
 *   the genre facet (`type` canonical, `kind` variant, `class` refinement),
 *   census its vocabulary and crosswalk, find per-record conformance defects,
 *   and emit the facet as a SKOS concept scheme (JSON-LD / Turtle).
 * - references (./references) — the bibliographic layer: decode the two
 *   `references:` dialects (CSL/citeproc seq-of-maps and the bespoke
 *   citekey-map) and normalize both to valid CSL-JSON; and the write side —
 *   encode CSL-JSON back to a canonical `references:` block and splice it into
 *   a document (encodeReferencesBlock / setReferences).
 * - relational (./relational) — the bridge to @emsenn/relating: a
 *   document's citations and typed relations (depends-on, derived_from, …) read
 *   as EAVT witnesses / charged cells (documentToEavt / documentToCells)
 *   and back (relationFieldsFromCells / referencesFromCells). Reference
 *   information as re-admissible relational marks.
 *
 * Codec law (L4): zero runtime dependencies; pure functions over values;
 * no network, no filesystem, no clock — time enters as parameters.
 * TypeError for malformed shapes only; meaningful absences decode to
 * values.
 */

export {
  SEARCH_CONSOLE_SCOPE,
  SEARCH_CONSOLE_TOKEN_AUDIENCE,
  searchAnalyticsEndpoint,
  encodeServiceAccountAssertion,
  encodeSearchAnalyticsQuery,
  decodeTokenResponse,
  decodeSearchAnalyticsRows,
} from "./search-console.mjs";
export type {
  DemandAssertion,
  TokenGrant,
  ServiceAccountAssertionInput,
  SearchAnalyticsQueryInput,
  SearchAnalyticsQuery,
} from "./search-console.mjs";

export {
  decodeFrontMatterDocument,
  encodeFrontMatterDocument,
} from "./frontmatter.mjs";
export type {
  FrontMatterScalar,
  FrontMatterValue,
  FrontMatterRecord,
  FrontMatterDocument,
} from "./frontmatter.mjs";

export {
  NINJS_VERSION,
  NINJS_MEDIA_TYPE,
  createNinjsArticle,
  createNinjsArtifact,
  serializeNewsArtifact,
  assertNinjsArticle,
} from "./ninjs.mjs";
export type {
  JsonScalar,
  JsonValue,
  IptcCode,
  NinjsPerson,
  NinjsBody,
  NinjsArticleInput,
  NinjsArticle,
  NewsCodecArtifact,
} from "./ninjs.mjs";

export {
  GENRE_CANONICAL_KEY,
  GENRE_VARIANT_KEYS,
  GENRE_REFINEMENT_KEY,
  genreFacet,
  conformRecord,
  referenceConformance,
  censusVault,
  summarizeFindings,
  genreConceptScheme,
  encodeGenreSchemeJsonLd,
  encodeGenreSchemeTurtle,
} from "./vault.mjs";
export type {
  GenreSourceKey,
  GenreConflict,
  GenreFacet,
  FindingSeverity,
  VaultRule,
  VaultFinding,
  VaultEntry,
  GenreValueRow,
  VaultCrosswalk,
  VaultCensus,
  ConformanceSummary,
  GenreConcept,
  GenreConceptScheme,
} from "./vault.mjs";

export {
  decodeReferences,
  decodeReferencesFromHead,
  encodeCslJson,
  encodeReferencesBlock,
  normalizeReferencesDocument,
  setReferences,
  CITATION_FIELDS,
  RELATION_FIELDS,
  internalReferenceTargets,
  referenceSlug,
  internalCitationItem,
} from "./references.mjs";
export type {
  CslName,
  CslDate,
  CslItem,
  ReferenceDialect,
  DecodedReferences,
  InternalReferenceKind,
  InternalReferenceTarget,
} from "./references.mjs";

export {
  newsArticle,
  newsArticleScript,
} from "./jsonld.mjs";
export type {
  JsonLdAuthor,
  JsonLdPublisher,
  NewsArticleInput,
} from "./jsonld.mjs";

export {
  MAX_URLS_PER_SITEMAP,
  escapeXml,
  escapeXmlAttr,
  escapeHtml,
  assertHttpUrl,
  escapeHtmlText,
  joinUrl,
  slugify,
  normalizePath,
  scalars,
  maybeString,
  parseRfc3339,
  imfFixdate,
  rfc3339ToRfc822,
  rfc3339ToUtc,
  rfc3339ToDate,
  effectiveAuthor,
  effectiveUpdated,
  feedUpdated,
  webSubLinks,
  rss2,
  rssItem,
  atom,
  atomEntry,
  jsonFeedObject,
  jsonFeedItem,
  jsonFeed,
  sitemap,
  sitemapIndex,
  splitSitemaps,
  newsSitemap,
  robots,
  defaultRobots,
  feedPage,
} from "./feed.mjs";
export type {
  FeedAuthor,
  FeedChannel,
  FeedItem,
  SitemapUrl,
  SitemapRef,
  NewsSitemapPublication,
  NewsSitemapUrl,
  WebSubDiscovery,
  RobotsGroup,
  RobotsOptions,
  FeedPagingLinks,
  FeedPage,
  FeedPagingOptions,
} from "./feed.mjs";

export {
  PREDICATE_MAP,
  escapeAttr,
  attrs,
  classes,
  el,
  p,
  u,
  dt,
  e,
  hCard,
  hCite,
  hEntry,
  hEntryFromProperties,
  hEntryFromProjection,
  projectMicroformatPairs,
  projectFiniteAlgebra,
  projectSelectedCells,
  propsFromPairs,
  microformatDocument,
  hFeed,
  hFeedDocument,
  feedNavigation,
  entryFromFiniteAlgebra,
  entryFromSelectedCells,
  entryDocumentFromFiniteAlgebra,
  entryDocumentFromSelectedCells,
} from "./microformats.mjs";
export type {
  MicroformatAuthor,
  RsvpValue,
  MicroformatEntry,
  MicroformatPagingLinks,
  MicroformatFeed,
  MicroformatCite,
  MicroformatProperties,
  PredicatePair,
  PredicatePolarity,
  SelectedCell,
  FiniteAlgebra,
  PredicateRule,
  MicroformatProjectionOmissionReason,
  MicroformatProjectionOmission,
  MicroformatProjection,
  MicroformatDocumentOptions,
} from "./microformats.mjs";

export {
  CITES_PREDICATE,
  SUBJECT_KEYS,
  documentSubject,
  documentToEavt,
  documentToCells,
  relationFieldsFromCells,
  referencesFromCells,
} from "./relational.mjs";
export type {
  EAVT,
  ChargedCell,
  DocumentRelationalOptions,
} from "./relational.mjs";
