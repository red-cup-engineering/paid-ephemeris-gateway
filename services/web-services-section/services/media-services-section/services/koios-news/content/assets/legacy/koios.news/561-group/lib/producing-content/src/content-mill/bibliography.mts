/**
 * bibliography - published reference-domain carriers.
 *
 * A site owns how CSL records and body citations are parsed. The mill owns the
 * public bibliography packet: references, cited articles, domain readings, and
 * the site-wide reference-domain rollup.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const SourceKindSchema = Type.Union([
  Type.Literal("commercial-website"),
  Type.Literal("independent-website"),
  Type.Literal("academic-journal"),
  Type.Literal("professional-journal"),
  Type.Literal("personal-writing"),
  Type.Literal("social-media"),
  Type.Literal("unknown"),
]);

export const BibliographyReferenceSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  title: Type.String({ minLength: 1 }),
  url: Type.Optional(Type.String({ minLength: 1 })),
  domain: Type.Optional(Type.String({ minLength: 1 })),
  type: Type.Optional(Type.String({ minLength: 1 })),
  sourceKind: SourceKindSchema,
  author: Type.Array(Type.String({ minLength: 1 })),
  containerTitle: Type.Optional(Type.String({ minLength: 1 })),
  publisher: Type.Optional(Type.String({ minLength: 1 })),
  issued: Type.Optional(Type.String({ minLength: 1 })),
  annotation: Type.Optional(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/bibliography-reference",
  title: "BibliographyReference",
  additionalProperties: false,
});

export const CitedArticleSchema = Type.Object({
  slug: Type.String({ minLength: 1 }),
  title: Type.String({ minLength: 1 }),
  url: Type.String({ minLength: 1 }),
  citationIds: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/cited-article",
  title: "CitedArticle",
  additionalProperties: false,
});

export const DomainReferenceReadingSchema = Type.Composite([
  BibliographyReferenceSchema,
  Type.Object({
    citedBy: Type.Array(CitedArticleSchema),
  }, { additionalProperties: false }),
], {
  $id: "producing-content/content-mill/domain-reference-reading",
  title: "DomainReferenceReading",
  additionalProperties: false,
});

export const DomainBibliographyReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.domain-bibliography"),
  domain: Type.String({ minLength: 1 }),
  url: Type.String({ minLength: 1 }),
  sourceKind: SourceKindSchema,
  citationCount: Type.Integer({ minimum: 0 }),
  articleCount: Type.Integer({ minimum: 0 }),
  references: Type.Array(DomainReferenceReadingSchema),
}, {
  $id: "producing-content/content-mill/domain-bibliography-reading",
  title: "DomainBibliographyReading",
  additionalProperties: false,
});

export const SiteBibliographyReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.site-bibliography"),
  count: Type.Integer({ minimum: 0 }),
  domainCount: Type.Integer({ minimum: 0 }),
  domains: Type.Array(DomainBibliographyReadingSchema),
}, {
  $id: "producing-content/content-mill/site-bibliography-reading",
  title: "SiteBibliographyReading",
  additionalProperties: false,
});

export type SourceKind = Static<typeof SourceKindSchema>;
export type BibliographyReference = Static<typeof BibliographyReferenceSchema>;
export type CitedArticle = Static<typeof CitedArticleSchema>;
export type DomainReferenceReading = Static<typeof DomainReferenceReadingSchema>;
export type DomainBibliographyReading = Static<typeof DomainBibliographyReadingSchema>;
export type SiteBibliographyReading = Static<typeof SiteBibliographyReadingSchema>;

export const bibliographyReferenceCarrier = carrierFrom(BibliographyReferenceSchema);

export const citedArticleCarrier = carrierFrom(CitedArticleSchema);

export const domainReferenceReadingCarrier = carrierFrom(DomainReferenceReadingSchema);

export const domainBibliographyReadingCarrier = carrierFrom(DomainBibliographyReadingSchema);

export const siteBibliographyReadingCarrier = carrierFrom(SiteBibliographyReadingSchema);

export function bibliographyReference(input: Omit<BibliographyReference, "author"> & Readonly<{
  author: readonly string[];
}>): BibliographyReference {
  return bibliographyReferenceCarrier.assert({
    ...input,
    author: [...input.author],
  }, "bibliography reference");
}

export function citedArticle(input: Omit<CitedArticle, "citationIds"> & Readonly<{
  citationIds: readonly string[];
}>): CitedArticle {
  return citedArticleCarrier.assert({
    ...input,
    citationIds: [...input.citationIds],
  }, "cited article");
}

export function domainReferenceReading(input: Omit<DomainReferenceReading, "author" | "citedBy"> & Readonly<{
  author: readonly string[];
  citedBy: readonly CitedArticle[];
}>): DomainReferenceReading {
  return domainReferenceReadingCarrier.assert({
    ...input,
    author: [...input.author],
    citedBy: input.citedBy.map((article) => citedArticle(article)),
  }, "domain reference reading");
}

function sourceKindForReferences(references: readonly DomainReferenceReading[]): SourceKind {
  return references.find((reference) => reference.sourceKind !== "unknown")?.sourceKind ?? "unknown";
}

export function domainBibliographyReading(input: Readonly<{
  domain: string;
  url: string;
  references: readonly DomainReferenceReading[];
  sourceKind?: SourceKind;
}>): DomainBibliographyReading {
  const references = [...input.references].map((reference) => domainReferenceReading(reference))
    .sort((left, right) => left.title.localeCompare(right.title));
  return domainBibliographyReadingCarrier.assert({
    kind: "producing-content.domain-bibliography" as const,
    domain: input.domain,
    url: input.url,
    sourceKind: input.sourceKind ?? sourceKindForReferences(references),
    citationCount: references.reduce((sum, reference) => sum + reference.citedBy.length, 0),
    articleCount: new Set(references.flatMap((reference) => reference.citedBy.map((article) => article.slug))).size,
    references,
  }, "domain bibliography reading");
}

export function siteBibliographyReading(input: Readonly<{
  domains: readonly DomainBibliographyReading[];
}>): SiteBibliographyReading {
  const domains = [...input.domains].map((domain) => domainBibliographyReading(domain))
    .sort((left, right) => right.citationCount - left.citationCount || left.domain.localeCompare(right.domain));
  return siteBibliographyReadingCarrier.assert({
    kind: "producing-content.site-bibliography" as const,
    count: domains.reduce((sum, domain) => sum + domain.citationCount, 0),
    domainCount: domains.length,
    domains,
  }, "site bibliography reading");
}

export function bibliographyReferenceTerm(input: BibliographyReference): Tm {
  return carrierToTerm(jsonResource(bibliographyReferenceCarrier.assert(input), "bibliography reference"));
}

export function domainBibliographyReadingTerm(input: DomainBibliographyReading): Tm {
  return carrierToTerm(jsonResource(domainBibliographyReadingCarrier.assert(input), "domain bibliography reading"));
}

export function siteBibliographyReadingTerm(input: SiteBibliographyReading): Tm {
  return carrierToTerm(jsonResource(siteBibliographyReadingCarrier.assert(input), "site bibliography reading"));
}
