/**
 * organizing-a-content-mill - the content-serving facet.
 *
 * A content mill syndicates and serves settled content projections. It forms
 * feeds, sitemaps, JSON-LD, h-entry bodies, ninjs, audits, and other web-free
 * artifacts for a site to mount on transport.
 */
export * from "../content-mill/index.mjs";
export {
  CORRECTION_POLICY,
  CorrectionCoverageReadingSchema,
  CorrectionKindSchema,
  CorrectionRecordSchema,
  CorrectionRegisterReadingSchema,
  CorrectionValidationFindingSchema,
  DEFAULT_CORRECTION_AFFECTED_SURFACES,
  correctionCoverageReading,
  correctionCoverageReadingCarrier,
  correctionCoverageReadingTerm,
  correctionRecord,
  correctionRecordCarrier,
  correctionRecordTerm,
  correctionRegisterReading,
  correctionRegisterReadingCarrier,
  correctionRegisterReadingTerm,
  correctionValidationFinding,
  correctionValidationFindingCarrier,
} from "../content-mill/corrections.mjs";
export type {
  CorrectionCoverageReading,
  CorrectionKind,
  CorrectionRecord,
  CorrectionRegisterReading,
  CorrectionValidationFinding,
} from "../content-mill/corrections.mjs";
export {
  SyndicationReadingSchema,
  SyndicationSurfaceKindSchema,
  SyndicationSurfaceSchema,
  publicationSyndicationSurfaces,
  syndicationReading,
  syndicationReadingCarrier,
  syndicationReadingTerm,
  syndicationSurface,
  syndicationSurfaceCarrier,
  syndicationSurfaceTerm,
} from "../content-mill/syndication.mjs";
export type {
  SyndicationReading,
  SyndicationSurface,
  SyndicationSurfaceKind,
} from "../content-mill/syndication.mjs";
export {
  AD_PERFORMANCE_CONSTRAINTS,
  AdPerformanceBucketSchema,
  AdPerformanceEventSchema,
  AdPerformanceInputSchema,
  AdPerformanceReadingSchema,
  AdProviderSchema,
  adPerformanceBucket,
  adPerformanceBucketCarrier,
  adPerformanceEvent,
  adPerformanceEventCarrier,
  adPerformanceEventFromRecord,
  adPerformanceEventTerm,
  adPerformanceInputCarrier,
  adPerformanceReading,
  adPerformanceReadingCarrier,
  adPerformanceReadingTerm,
  normalizeAdPerformanceInput,
} from "../content-mill/advertising.mjs";
export type {
  AdPerformanceBucket,
  AdPerformanceEvent,
  AdPerformanceInput,
  AdPerformanceReading,
  AdProvider,
} from "../content-mill/advertising.mjs";
export {
  CirculationChannelKindSchema,
  CirculationChannelSchema,
  CirculationReadingSchema,
  circulationChannel,
  circulationChannelCarrier,
  circulationChannelTerm,
  circulationReading,
  circulationReadingCarrier,
  circulationReadingTerm,
  feedNativeCirculationReading,
} from "../content-mill/circulation.mjs";
export type {
  CirculationChannel,
  CirculationChannelKind,
  CirculationReading,
} from "../content-mill/circulation.mjs";
export {
  CONTENT_PERFORMANCE_CONSTRAINTS,
  ArticlePerformanceSchema,
  ContentPerformanceBucketSchema,
  ContentPerformanceReadingSchema,
  articlePerformance,
  articlePerformanceCarrier,
  articlePerformanceTerm,
  contentPerformanceBucket,
  contentPerformanceBucketCarrier,
  contentPerformanceReading,
  contentPerformanceReadingCarrier,
  contentPerformanceReadingTerm,
} from "../content-mill/performance.mjs";
export type {
  ArticlePerformance,
  ContentPerformanceBucket,
  ContentPerformanceReading,
} from "../content-mill/performance.mjs";
export {
  CONTENT_QUALITY_CONSTRAINTS,
  CONTENT_QUALITY_PLANNED_USES,
  ArticleContentQualitySchema,
  ContentQualityAggregateSchema,
  ContentQualityFindingSchema,
  ContentQualityReadingSchema,
  articleContentQuality,
  articleContentQualityCarrier,
  articleContentQualityTerm,
  contentQualityAggregate,
  contentQualityAggregateCarrier,
  contentQualityFinding,
  contentQualityFindingCarrier,
  contentQualityReading,
  contentQualityReadingCarrier,
  contentQualityReadingTerm,
} from "../content-mill/quality.mjs";
export type {
  ArticleContentQuality,
  ContentQualityAggregate,
  ContentQualityFinding,
  ContentQualityReading,
} from "../content-mill/quality.mjs";
export {
  CONTENT_PREDICATION_CONSTRAINTS,
  CONTENT_PREDICATION_PLANNED_USES,
  ArticlePredicationCellSchema,
  ArticlePredicationMetricsSchema,
  ContentPredicationAggregateSchema,
  ContentPredicationReadingSchema,
  PredicationCellKindSchema,
  articlePredicationCell,
  articlePredicationCellCarrier,
  articlePredicationMetrics,
  articlePredicationMetricsCarrier,
  articlePredicationMetricsTerm,
  contentPredicationAggregate,
  contentPredicationAggregateCarrier,
  contentPredicationReading,
  contentPredicationReadingCarrier,
  contentPredicationReadingTerm,
} from "../content-mill/predication.mjs";
export type {
  ArticlePredicationCell,
  ArticlePredicationMetrics,
  ContentPredicationAggregate,
  ContentPredicationReading,
  PredicationCellKind,
} from "../content-mill/predication.mjs";
export {
  CONTENT_GRAPH_CONSTRAINTS,
  CONTENT_GRAPH_PLANNED_USES,
  ContentGraphEdgeSchema,
  ContentGraphNodeSchema,
  ContentGraphReadingSchema,
  ContentGraphSectionBucketSchema,
  contentGraphEdge,
  contentGraphEdgeCarrier,
  contentGraphNode,
  contentGraphNodeCarrier,
  contentGraphNodeTerm,
  contentGraphReading,
  contentGraphReadingCarrier,
  contentGraphReadingTerm,
  contentGraphSectionBucket,
  contentGraphSectionBucketCarrier,
} from "../content-mill/graph.mjs";
export type {
  ContentGraphEdge,
  ContentGraphNode,
  ContentGraphReading,
  ContentGraphSectionBucket,
} from "../content-mill/graph.mjs";
export {
  BibliographyReferenceSchema,
  CitedArticleSchema,
  DomainBibliographyReadingSchema,
  DomainReferenceReadingSchema,
  SiteBibliographyReadingSchema,
  SourceKindSchema,
  bibliographyReference,
  bibliographyReferenceCarrier,
  bibliographyReferenceTerm,
  citedArticle,
  citedArticleCarrier,
  domainBibliographyReading,
  domainBibliographyReadingCarrier,
  domainBibliographyReadingTerm,
  domainReferenceReading,
  domainReferenceReadingCarrier,
  siteBibliographyReading,
  siteBibliographyReadingCarrier,
  siteBibliographyReadingTerm,
} from "../content-mill/bibliography.mjs";
export type {
  BibliographyReference,
  CitedArticle,
  DomainBibliographyReading,
  DomainReferenceReading,
  SiteBibliographyReading,
  SourceKind,
} from "../content-mill/bibliography.mjs";
