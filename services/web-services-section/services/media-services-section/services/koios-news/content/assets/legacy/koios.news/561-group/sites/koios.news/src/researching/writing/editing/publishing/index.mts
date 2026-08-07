// publishing — public distribution surfaces for Koios.News.
//
// Publishing owns the question "what is public, and where can it be read?"
// Management concerns such as advertising, circulation, and syndication sit
// after this department.

import type { KoiosPost } from "../../../../content.mjs";
import { publicItems, type KoiosItem, type KoiosMasthead } from "../../../../surface.mjs";
import type { ViewCounts } from "../../../../views.mjs";
import { publishingManagementReading, type PublishingManagementReading } from "./managing/index.mjs";

export type PublishingDepartmentReading = Readonly<{
  department: "publishing";
  publicCount: number;
  withheldCount: number;
  routes: readonly string[];
  management: PublishingManagementReading;
}>;

export function publishingDepartmentReading(input: Readonly<{
  masthead: KoiosMasthead;
  items: readonly KoiosItem[];
  posts: readonly KoiosPost[];
  views?: ViewCounts;
  dataDir?: string;
  adClient?: string;
}>): PublishingDepartmentReading {
  const publicWireItems = publicItems(input.items);
  return Object.freeze({
    department: "publishing",
    publicCount: publicWireItems.length,
    withheldCount: input.items.length - publicWireItems.length,
    routes: Object.freeze([
      "/",
      "/feed.xml",
      "/feed.atom",
      "/feed.json",
      "/news-sitemap.xml",
      "/sitemap.xml",
      "/newswire-audit.json",
      "/ninjs.json",
      "/circulating.json",
      ...publicWireItems.map((item) => `/${input.masthead.itemPath}/${item.slug}`),
    ]),
    management: publishingManagementReading({
      masthead: input.masthead,
      items: input.items,
      posts: input.posts,
      ...(input.views === undefined ? {} : { views: input.views }),
      ...(input.dataDir === undefined ? {} : { dataDir: input.dataDir }),
      ...(input.adClient === undefined ? {} : { adClient: input.adClient }),
    }),
  });
}

export { publishingManagementReading } from "./managing/index.mjs";
export type { PublishingManagementReading } from "./managing/index.mjs";
