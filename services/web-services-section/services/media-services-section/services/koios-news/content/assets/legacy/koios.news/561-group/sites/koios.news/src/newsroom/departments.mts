// newsroom/departments — the whole Koios.News production line as one reading.

import type { KoiosPost } from "../content.mjs";
import type { SearchConsoleQuery } from "../demand.mjs";
import { administratingOfficeReading, type AdministratingOfficeReading } from "../administrating/index.mjs";
import { researchDepartmentReading, type ResearchDepartmentReading } from "../researching/index.mjs";
import { writingDepartmentReading, type WritingDepartmentReading } from "../researching/writing/index.mjs";
import { editingDepartmentReading, type EditingDepartmentReading } from "../researching/writing/editing/index.mjs";
import { publishingDepartmentReading, type PublishingDepartmentReading } from "../researching/writing/editing/publishing/index.mjs";
import { koiosItems, type KoiosItem, type KoiosMasthead } from "../surface.mjs";
import { desksReading, type DesksReading } from "../researching/sourcing/desks.mjs";
import type { ViewCounts } from "../views.mjs";

export type KoiosNewsroomDepartments = Readonly<{
  kind: "koios.newsroom.departments";
  // The two orthogonal axes of the newsroom: desks are topical standing (what
  // we cover), departments are the production line (how a desk's stories are
  // made). Every story crosses every department and belongs to one desk.
  desks: DesksReading;
  administrating: AdministratingOfficeReading;
  researching: ResearchDepartmentReading & Readonly<{
    writing: WritingDepartmentReading & Readonly<{
      editing: EditingDepartmentReading & Readonly<{
        publishing: PublishingDepartmentReading;
      }>;
    }>;
  }>;
}>;

export function newsroomDepartmentsReading(input: Readonly<{
  posts: readonly KoiosPost[];
  masthead: KoiosMasthead;
  views: ViewCounts;
  dataDir: string;
  adClient?: string;
  searchConsole?: readonly SearchConsoleQuery[];
}>): KoiosNewsroomDepartments {
  const items: readonly KoiosItem[] = koiosItems(input.posts, input.masthead);
  const researching = researchDepartmentReading({
    posts: input.posts,
    views: input.views,
    dataDir: input.dataDir,
    ...(input.searchConsole === undefined ? {} : { searchConsole: input.searchConsole }),
  });
  const writing = writingDepartmentReading(input.posts);
  const editing = editingDepartmentReading(input.posts);
  const publishing = publishingDepartmentReading({
    masthead: input.masthead,
    items,
    posts: input.posts,
    views: input.views,
    dataDir: input.dataDir,
    ...(input.adClient === undefined ? {} : { adClient: input.adClient }),
  });
  return Object.freeze({
    kind: "koios.newsroom.departments",
    desks: desksReading({ articles: items.map((item) => ({ section: item.section, published: item.published, isPublic: item.isPublic })) }),
    administrating: administratingOfficeReading({ adSenseEnabled: input.adClient !== undefined }),
    researching: Object.freeze({
      ...researching,
      writing: Object.freeze({
        ...writing,
        editing: Object.freeze({
          ...editing,
          publishing,
        }),
      }),
    }),
  });
}
