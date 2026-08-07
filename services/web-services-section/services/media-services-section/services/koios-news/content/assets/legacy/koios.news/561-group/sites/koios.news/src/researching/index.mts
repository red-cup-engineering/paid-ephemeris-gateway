// researching — demand and source attention for Koios.News.
//
// The research department does not write. It produces assignments: terms,
// beats, source coverage, and demand evidence that the writing desk can take up.

import { demandTable, readSearchConsole, SEED_KEYWORDS, type DemandEntry, type SearchConsoleQuery } from "../demand.mjs";
import type { KoiosPost } from "../content.mjs";
import type { ViewCounts } from "../views.mjs";
import { sourcingDepartmentReading, type SourcingDepartmentReading } from "./sourcing/index.mjs";

export type ResearchDepartmentReading = Readonly<{
  department: "researching";
  sourcing: SourcingDepartmentReading;
  demand: Readonly<{
    next: DemandEntry | null;
    count: number;
    entries: readonly DemandEntry[];
    searchConsoleQueries: number;
  }>;
}>;

export function researchDepartmentReading(input: Readonly<{
  posts: readonly KoiosPost[];
  views: ViewCounts;
  dataDir: string;
  searchConsole?: readonly SearchConsoleQuery[];
}>): ResearchDepartmentReading {
  const searchConsole = input.searchConsole ?? readSearchConsole(input.dataDir);
  const demand = demandTable({
    posts: input.posts,
    views: input.views,
    searchConsole,
    seeds: SEED_KEYWORDS,
  });
  return Object.freeze({
    department: "researching",
    sourcing: sourcingDepartmentReading(),
    demand: Object.freeze({
      next: demand[0] ?? null,
      count: demand.length,
      entries: Object.freeze(demand),
      searchConsoleQueries: searchConsole.length,
    }),
  });
}

export { sourcingDepartmentReading } from "./sourcing/index.mjs";
export type { SourcingDepartmentReading } from "./sourcing/index.mjs";
