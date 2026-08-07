// @emsenn/syndication-holography — projects SyndicationItem into
// ClaimStateBundle form so news-algebra can work with syndicated content.
//
// Syndication is downstream of content and upstream of news. This lib is the
// bridge: it takes a decoded syndication item and produces the canonical wire
// resource (ClaimStateBundle) that news-algebra operates on.
//
// All claims carry force "alleges" and status "supported": a wire reports
// what a source says; it does not confirm, compute, or endorse.

import type { SyndicationItem } from "./index.mjs";
import { newsSlug, type ClaimStateBundle, type AssertedClaim } from "../topology/news/index.mjs";

export type { SyndicationItem } from "./index.mjs";

/**
 * Options for projecting a SyndicationItem into a ClaimStateBundle: witness is
 * the asserting agent (a wire or pipeline name) recorded in each claim's
 * provenance, and asserted is the ISO 8601 timestamp stamped on each claim's
 * time.
 */
export type SyndicationBundleOptions = Readonly<{
  /** The witnessing agent (a wire name, a pipeline name, etc.). */
  witness: string;
  /** ISO 8601 assertion timestamp. */
  asserted: string;
}>;

/**
 * Project one SyndicationItem into a ClaimStateBundle.
 *
 * Claims produced (all force "alleges", status "supported"):
 *   title       — the item's headline
 *   url         — the canonical URL
 *   summary     — the lede/summary, when present
 *   published   — the publication instant, when present
 *
 * Subject is derived from the item's title or URL via newsSlug.
 * provenance.citation is the item's URL so every claim traces back to the
 * citable artifact.
 */
export function syndicationBundle(
  item: SyndicationItem,
  options: SyndicationBundleOptions,
): ClaimStateBundle {
  const subject = newsSlug(item.title || item.url);
  const { witness, asserted } = options;
  const provenance = Object.freeze({ witness, citation: item.url });
  const time = Object.freeze({ asserted });

  const claims: AssertedClaim[] = [
    Object.freeze({
      id: "title",
      proposition: Object.freeze({ predicate: "title", object: item.title }),
      time,
      force: "alleges" as const,
      provenance,
      status: "supported" as const,
    }),
    Object.freeze({
      id: "url",
      proposition: Object.freeze({ predicate: "url", object: item.url }),
      time,
      force: "alleges" as const,
      provenance,
      status: "supported" as const,
    }),
  ];

  if (item.summary !== undefined) {
    claims.push(Object.freeze({
      id: "summary",
      proposition: Object.freeze({ predicate: "summary", object: item.summary }),
      time,
      force: "alleges" as const,
      provenance,
      status: "supported" as const,
    }));
  }

  if (item.published !== undefined) {
    claims.push(Object.freeze({
      id: "published",
      proposition: Object.freeze({ predicate: "published", object: item.published }),
      time,
      force: "alleges" as const,
      provenance,
      status: "supported" as const,
    }));
  }

  return Object.freeze({ subject, claims: Object.freeze(claims) });
}
