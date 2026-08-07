// demand.mts — Koios's local projection of the farm demand reading.
//
// Demand math lives in @emsenn/content-production/content-farm: seed demand,
// earned views, Search Console material, and coverage decay fold there. Koios
// owns only its publication-specific seed vocabulary and the fact that covered
// terms are recorded under the `koios` front-matter namespace.

import { readFileSync } from "node:fs";

import {
  contentFarmConfigFromDocument,
  demandTable as farmDemandTable,
  farmRecordPath,
  readSearchConsole as readFarmSearchConsole,
  type DemandEntry as FarmDemandEntry,
  type FarmProperty,
  type SearchConsoleQuery,
  type SeedTerm,
} from "@emsenn/content-production/content-farm";

import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "./config.mjs";
import type { KoiosPost } from "./content.mjs";
import type { ViewCounts } from "./views.mjs";

// A Koios beat is a production assignment pinned to one IPTC Media Topic (see
// researching/sourcing/topics). These slugs are the topic slugs; "collapse" is
// a cross-cutting lens, never a beat.
export type KoiosBeat =
  | "technology"
  | "economy"
  | "culture"
  | "politics"
  | "war"
  | "environment"
  | "degrowth"
  | "decolonization";

export type SeedKeyword = SeedTerm & Readonly<{ beat: KoiosBeat }>;

/** Read Koios's content-farm property from its instance config. The config is
 * the publication-property carrier; this module only projects demand inputs
 * from it for the newsroom desk. */
export function koiosFarmProperty(configPath = DEFAULT_CONTENT_PRODUCTION_CONFIG): FarmProperty {
  const document = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  const property = contentFarmConfigFromDocument(document).properties[0];
  if (property === undefined) throw new TypeError("koiosFarmProperty: content-farm config has no property");
  return property;
}

const KOIOS_FARM_PROPERTY = koiosFarmProperty();

/** The niche seed reading from the farm property. */
export const SEED_KEYWORDS: readonly SeedKeyword[] = KOIOS_FARM_PROPERTY.seeds as readonly SeedKeyword[];

export type { SearchConsoleQuery };

export type DemandEntry = FarmDemandEntry & Readonly<{ beat: KoiosBeat }>;

/** Read records/search-console.json if present. */
export function readSearchConsole(dataDir: string): readonly SearchConsoleQuery[] {
  return readFarmSearchConsole(farmRecordPath(dataDir, "search-console.json"));
}

/** Fold Koios demand through the canonical farm reading. */
export function demandTable(input: Readonly<{
  posts: readonly KoiosPost[];
  views: ViewCounts;
  searchConsole?: readonly SearchConsoleQuery[];
  seeds?: readonly SeedKeyword[];
}>): readonly DemandEntry[] {
  return farmDemandTable({
    posts: input.posts,
    views: input.views,
    seeds: input.seeds ?? SEED_KEYWORDS,
    termKey: KOIOS_FARM_PROPERTY.termKey ?? "koios",
    ...(input.searchConsole === undefined ? {} : { searchConsole: input.searchConsole }),
  }) as readonly DemandEntry[];
}
