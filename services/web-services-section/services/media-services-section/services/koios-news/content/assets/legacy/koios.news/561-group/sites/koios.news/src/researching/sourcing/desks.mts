// researching/sourcing/desks — the desk as a first-class editorial unit.
//
// Koios has two orthogonal structures that the word "department" had been
// quietly conflating:
//
//   - a DESK is topical standing — WHAT the publication covers. A desk owns a
//     beat, a newscable wire (its sources), a seed-term vocabulary, a public
//     section, and an editorial frame. Climate, Finance, Politics, Technology,
//     Degrowth, Decolonization are desks.
//   - a DEPARTMENT is the production line — HOW any desk's stories are made:
//     researching → writing → editing → publishing → managing. A department is
//     a gerund office, not a subject.
//
// Every story passes through every department; it belongs to exactly one desk.
// The pieces of a desk were already in the system but scattered — the wire and
// its sources in the newscable, the seeds and section label in the farm
// property, the frame in the taxonomy. This module gathers them into one desk
// carrier so "the degrowth desk" is a thing you can read, not an emergent
// coincidence of four config blocks. It reads only owned config, the wire
// stores, and (optionally) the published corpus; it asserts no new state.

import { readFileSync } from "node:fs";

import { koiosFarmProperty, SEED_KEYWORDS, type KoiosBeat } from "../../demand.mjs";
import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "../../config.mjs";
import { sourceRollReading, type IntakeSourceReading } from "./sources.mjs";
import { taxonomyReading } from "./taxonomy.mjs";

export type DeskReading = Readonly<{
  kind: "koios.desk";
  /** The beat/wire id, e.g. "degrowth". */
  beat: string;
  /** The public desk name (its section label), e.g. "Degrowth". */
  name: string;
  /** The wire's masthead title, e.g. "Collapse: Degrowth". */
  wireTitle: string;
  /** The desk's section slug and public URL. */
  sectionSlug: string;
  sectionUrl: string;
  /** The wire's defining keyword. */
  keyword: string;
  description: string;
  editorialFrame: string;
  relatedBeats: readonly KoiosBeat[];
  /** The seed terms the desk assigns from. */
  seedTerms: readonly string[];
  /** Configured intake sources for the desk's wire. */
  sourceCount: number;
  sources: readonly IntakeSourceReading[];
  /** Owned evidence: bundles in the wire store right now. */
  wireItemCount: number;
  latestWireItemAt?: string;
  /** Published articles standing under the desk's section. */
  articleCount: number;
}>;

export type DesksReading = Readonly<{
  kind: "koios.desks";
  generatedAt: string;
  deskCount: number;
  desks: readonly DeskReading[];
  /** The distinction this module makes explicit, carried in the reading so any
   * consumer (operator, crawler, agent) sees the two axes named. */
  axes: Readonly<{
    desk: string;
    department: string;
  }>;
}>;

function slugLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type WireKeyword = Readonly<{ name: string; keyword: string }>;

/** The wire keywords, read straight from the newscable config. */
function wireKeywords(configPath: string): ReadonlyMap<string, string> {
  const document = JSON.parse(readFileSync(configPath, "utf8")) as { newscable?: { wires?: readonly { name?: unknown; keyword?: unknown }[] } };
  const map = new Map<string, string>();
  for (const wire of document.newscable?.wires ?? []) {
    if (typeof wire.name === "string") map.set(wire.name, typeof wire.keyword === "string" ? wire.keyword : "");
  }
  return map;
}

export type DesksOptions = Readonly<{
  configPath?: string;
  now?: () => string;
  /** Published article facts, for per-desk article counts. Each entry is a
   * public item's section label and date; omit to report zero counts. */
  articles?: readonly Readonly<{ section?: string | undefined; published?: string | undefined; isPublic?: boolean | undefined }>[];
}>;

/** Project every configured wire into a desk reading. */
export function desksReading(options: DesksOptions = {}): DesksReading {
  const configPath = options.configPath ?? DEFAULT_CONTENT_PRODUCTION_CONFIG;
  const property = koiosFarmProperty(configPath);
  const roll = sourceRollReading({ configPath });
  const keywords = wireKeywords(configPath);
  const beatCategory = property.beatCategory ?? {};

  // Per-section published counts and freshness, from the optional corpus facts.
  const counts = new Map<string, { count: number; latest?: string }>();
  for (const article of options.articles ?? []) {
    if (article.isPublic === false || article.section === undefined) continue;
    const slug = slugLabel(article.section);
    const entry = counts.get(slug) ?? { count: 0 };
    entry.count += 1;
    if (article.published !== undefined && (entry.latest === undefined || article.published > entry.latest)) entry.latest = article.published;
    counts.set(slug, entry);
  }

  const desks = roll.wires.map((wire): DeskReading => {
    const beat = wire.name;
    const name = (beatCategory[beat] ?? wire.title.replace(/^Collapse:\s*/i, "").trim()) || beat;
    const sectionSlug = slugLabel(name);
    const seedTerms = SEED_KEYWORDS.filter((seed) => seed.beat === beat).map((seed) => seed.term);
    const count = counts.get(sectionSlug);
    const taxonomy = taxonomyReading({
      taxonomy: "section",
      slug: sectionSlug,
      title: name,
      count: count?.count ?? 0,
      url: `/topics/${sectionSlug}`,
      ...(count?.latest === undefined ? {} : { latestPublished: count.latest }),
    });
    return Object.freeze({
      kind: "koios.desk" as const,
      beat,
      name,
      wireTitle: wire.title,
      sectionSlug,
      sectionUrl: `/topics/${sectionSlug}`,
      keyword: keywords.get(beat) ?? "",
      description: taxonomy.description,
      editorialFrame: taxonomy.editorialFrame,
      relatedBeats: taxonomy.relatedBeats,
      seedTerms: Object.freeze([...new Set(seedTerms)].sort()),
      sourceCount: wire.sourceCount,
      sources: wire.sources,
      wireItemCount: wire.wireItemCount,
      ...(wire.latestWireItemAt === undefined ? {} : { latestWireItemAt: wire.latestWireItemAt }),
      articleCount: count?.count ?? 0,
    });
  });

  return Object.freeze({
    kind: "koios.desks" as const,
    generatedAt: (options.now ?? (() => new Date().toISOString()))(),
    deskCount: desks.length,
    desks: Object.freeze(desks),
    axes: Object.freeze({
      desk: "Topical standing — what Koios covers. A desk owns a beat, a newscable wire and its sources, a seed-term vocabulary, a public section, and an editorial frame.",
      department: "The production line — how a desk's stories are made: researching → writing → editing → publishing → managing. Every story crosses every department; it belongs to one desk.",
    }),
  });
}
