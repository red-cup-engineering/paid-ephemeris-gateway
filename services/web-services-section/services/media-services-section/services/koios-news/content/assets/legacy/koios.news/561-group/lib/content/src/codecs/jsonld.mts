/**
 * jsonld — schema.org JSON-LD for news articles (the discovery/structured-data
 * projection). A content codec: a pure functor from an article's fields to a
 * NewsArticle node and its `<script type="application/ld+json">` embedding.
 *
 * News ⊂ content, and JSON-LD is a serialization format, not transport — so it
 * lives here in the shared hub, reachable by content-production (which forms
 * the artifact) and by web (which transports it), neither owning it. Codec law
 * (L4): pure over values, no network/filesystem/clock.
 */

/** An article author, by name (optionally with a URL). */
export type JsonLdAuthor = Readonly<{ name: string; url?: string }>;
/** The publishing organization. */
export type JsonLdPublisher = Readonly<{ name: string; url?: string; logo?: string }>;
/** A structured schema.org image reference. */
export type JsonLdImage = Readonly<{ "@type"?: "ImageObject"; url: string; width?: number; height?: number; caption?: string }>;

/** The fields a NewsArticle node is built from — a lossy projection of a news
 * item, independent of how the item itself is carried. */
export type NewsArticleInput = Readonly<{
  headline: string;
  url: string;
  summary?: string;
  published?: string;
  updated?: string;
  author?: string | JsonLdAuthor;
  section?: string;
  keywords?: readonly string[];
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageCaption?: string;
}>;

function imageValue(item: NewsArticleInput): string | JsonLdImage | undefined {
  if (!item.image) return undefined;
  if (item.imageWidth === undefined && item.imageHeight === undefined && item.imageCaption === undefined) return item.image;
  return {
    "@type": "ImageObject",
    url: item.image,
    ...(item.imageWidth === undefined ? {} : { width: item.imageWidth }),
    ...(item.imageHeight === undefined ? {} : { height: item.imageHeight }),
    ...(item.imageCaption === undefined ? {} : { caption: item.imageCaption }),
  };
}

/** The schema.org NewsArticle node for an item. */
export function newsArticle(item: NewsArticleInput, publisher: JsonLdPublisher): Record<string, unknown> {
  const author = typeof item.author === "string" ? { name: item.author } : item.author;
  const image = imageValue(item);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.headline,
    url: item.url,
    mainEntityOfPage: item.url,
    ...(item.summary ? { description: item.summary } : {}),
    ...(item.published ? { datePublished: item.published } : {}),
    ...(item.updated ? { dateModified: item.updated } : {}),
    ...(author ? { author: { "@type": "Person", name: author.name, ...(author.url ? { url: author.url } : {}) } } : {}),
    publisher: { "@type": "Organization", name: publisher.name, ...(publisher.url ? { url: publisher.url } : {}), ...(publisher.logo ? { logo: publisher.logo } : {}) },
    ...(item.section ? { articleSection: item.section } : {}),
    ...(item.keywords && item.keywords.length > 0 ? { keywords: item.keywords } : {}),
    ...(image === undefined ? {} : { image }),
  };
}

/** The NewsArticle node embedded as an HTML JSON-LD script (with `<` escaped so
 * it cannot break out of the script element). */
export function newsArticleScript(item: NewsArticleInput, publisher: JsonLdPublisher): string {
  return `<script type="application/ld+json">${JSON.stringify(newsArticle(item, publisher)).replace(/</g, "\\u003c")}</script>`;
}
