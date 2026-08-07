/**
 * desks - topical production standing as content-farm carriers.
 *
 * A desk is where a newswire's intake standing becomes assignable content-farm
 * work: one beat, its source roll, seed vocabulary, public section, editorial
 * frame, and corpus count. Sites may derive the labels and frames locally; the
 * reusable packet shape belongs to producing-content.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

import { SourceRollSourceSchema } from "../cable/source-roll.mjs";
import type { SourceRollSource } from "../cable/source-roll.mjs";

export const ContentDeskAxesSchema = Type.Object({
  desk: Type.String({ minLength: 1 }),
  department: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/desk-axes",
  title: "ContentDeskAxes",
  additionalProperties: false,
});

export const ContentDeskSchema = Type.Object({
  kind: Type.Literal("producing-content.desk"),
  beat: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  wireTitle: Type.String({ minLength: 1 }),
  sectionSlug: Type.String({ minLength: 1 }),
  sectionUrl: Type.String({ minLength: 1 }),
  keyword: Type.String(),
  description: Type.String(),
  editorialFrame: Type.String(),
  relatedBeats: Type.Array(Type.String({ minLength: 1 })),
  seedTerms: Type.Array(Type.String({ minLength: 1 })),
  sourceCount: Type.Integer({ minimum: 0 }),
  sources: Type.Array(SourceRollSourceSchema),
  wireItemCount: Type.Integer({ minimum: 0 }),
  latestWireItemAt: Type.Optional(Type.String({ minLength: 1 })),
  articleCount: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-farm/desk",
  title: "ContentDesk",
  additionalProperties: false,
});

export const ContentDesksReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.desks"),
  generatedAt: Type.String({ minLength: 1 }),
  deskCount: Type.Integer({ minimum: 0 }),
  desks: Type.Array(ContentDeskSchema),
  axes: ContentDeskAxesSchema,
}, {
  $id: "producing-content/content-farm/desks",
  title: "ContentDesksReading",
  additionalProperties: false,
});

export type ContentDeskAxes = Static<typeof ContentDeskAxesSchema>;
export type ContentDesk = Static<typeof ContentDeskSchema>;
export type ContentDesksReading = Static<typeof ContentDesksReadingSchema>;

export const contentDeskCarrier = carrierFrom(ContentDeskSchema);

export const contentDesksReadingCarrier = carrierFrom(ContentDesksReadingSchema);

export function contentDesk(input: Omit<ContentDesk, "kind" | "relatedBeats" | "seedTerms" | "sources"> & Readonly<{
  relatedBeats: readonly string[];
  seedTerms: readonly string[];
  sources: readonly SourceRollSource[];
}>): ContentDesk {
  return contentDeskCarrier.assert({
    kind: "producing-content.desk" as const,
    ...input,
    relatedBeats: [...input.relatedBeats],
    seedTerms: [...input.seedTerms],
    sources: input.sources.map((source) => ({ ...source })),
  }, "content desk");
}

export function contentDesksReading(input: Omit<ContentDesksReading, "kind" | "deskCount" | "desks"> & Readonly<{
  desks: readonly ContentDesk[];
}>): ContentDesksReading {
  const desks = [...input.desks].map((desk) => contentDesk(desk))
    .sort((left, right) => left.name.localeCompare(right.name) || left.beat.localeCompare(right.beat));
  return contentDesksReadingCarrier.assert({
    kind: "producing-content.desks" as const,
    generatedAt: input.generatedAt,
    deskCount: desks.length,
    desks,
    axes: { ...input.axes },
  }, "content desks reading");
}

export function contentDeskTerm(input: ContentDesk): Tm {
  return carrierToTerm(jsonResource(contentDeskCarrier.assert(input), "content desk"));
}

export function contentDesksReadingTerm(input: ContentDesksReading): Tm {
  return carrierToTerm(jsonResource(contentDesksReadingCarrier.assert(input), "content desks reading"));
}
