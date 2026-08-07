/**
 * syndication - machine-readable publication surface carriers.
 *
 * A site owns its route topology. The mill owns the distribution packet that
 * names which feed, sitemap, record, audit, and article surfaces are exposed.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const SyndicationSurfaceKindSchema = Type.Union([
  Type.Literal("feed"),
  Type.Literal("sitemap"),
  Type.Literal("record"),
  Type.Literal("audit"),
  Type.Literal("article"),
]);

export const SyndicationSurfaceSchema = Type.Object({
  kind: SyndicationSurfaceKindSchema,
  href: Type.String({ minLength: 1 }),
  mediaType: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-mill/syndication-surface",
  title: "SyndicationSurface",
  additionalProperties: false,
});

export const SyndicationReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.syndication-reading"),
  surfaces: Type.Array(SyndicationSurfaceSchema),
}, {
  $id: "producing-content/content-mill/syndication-reading",
  title: "SyndicationReading",
  additionalProperties: false,
});

export type SyndicationSurfaceKind = Static<typeof SyndicationSurfaceKindSchema>;
export type SyndicationSurface = Static<typeof SyndicationSurfaceSchema>;
export type SyndicationReading = Static<typeof SyndicationReadingSchema>;

export const syndicationSurfaceCarrier = carrierFrom(SyndicationSurfaceSchema);

export const syndicationReadingCarrier = carrierFrom(SyndicationReadingSchema);

export function syndicationSurface(input: SyndicationSurface): SyndicationSurface {
  return syndicationSurfaceCarrier.assert(input, "syndication surface");
}

export function syndicationReading(input: Readonly<{
  surfaces: readonly SyndicationSurface[];
}>): SyndicationReading {
  return syndicationReadingCarrier.assert({
    kind: "producing-content.syndication-reading" as const,
    surfaces: input.surfaces.map((surface) => syndicationSurface(surface)),
  }, "syndication reading");
}

export function publicationSyndicationSurfaces(input: Readonly<{
  baseUrl: string;
  itemPath: string;
  articleSlugs?: readonly string[];
  recordPaths?: readonly string[];
  auditPaths?: readonly string[];
}>): SyndicationReading {
  const base = input.baseUrl.replace(/\/$/, "");
  const itemPath = input.itemPath.replace(/^\/+|\/+$/g, "");
  const recordPaths = input.recordPaths ?? [
    "ninjs.json",
    "topics.json",
    "tags.json",
    "archive.json",
    "sources.json",
    "desks.json",
    "bibliography.json",
    "coverage.json",
  ];
  const auditPaths = input.auditPaths ?? ["newswire-audit.json"];
  const recordMediaType = (path: string): string =>
    path.endsWith(".json") && path.includes("coverage")
      ? "application/ld+json"
      : "application/json";

  return syndicationReading({
    surfaces: [
      syndicationSurface({ kind: "feed", href: `${base}/feed.xml`, mediaType: "application/rss+xml" }),
      syndicationSurface({ kind: "feed", href: `${base}/feed.atom`, mediaType: "application/atom+xml" }),
      syndicationSurface({ kind: "feed", href: `${base}/feed.json`, mediaType: "application/feed+json" }),
      syndicationSurface({ kind: "sitemap", href: `${base}/sitemap.xml`, mediaType: "application/xml" }),
      syndicationSurface({ kind: "sitemap", href: `${base}/news-sitemap.xml`, mediaType: "application/xml" }),
      ...recordPaths.map((path) => syndicationSurface({
        kind: "record",
        href: `${base}/${path.replace(/^\/+/, "")}`,
        mediaType: recordMediaType(path),
      })),
      ...auditPaths.map((path) => syndicationSurface({
        kind: "audit",
        href: `${base}/${path.replace(/^\/+/, "")}`,
        mediaType: "application/json",
      })),
      ...(input.articleSlugs ?? []).map((slug) => syndicationSurface({
        kind: "article",
        href: `${base}/${itemPath}/${slug}`,
        mediaType: "text/html",
      })),
    ],
  });
}

export function syndicationSurfaceTerm(input: SyndicationSurface): Tm {
  return carrierToTerm(jsonResource(syndicationSurfaceCarrier.assert(input), "syndication surface"));
}

export function syndicationReadingTerm(input: SyndicationReading): Tm {
  return carrierToTerm(jsonResource(syndicationReadingCarrier.assert(input), "syndication reading"));
}
