/**
 * circulation - reader-return channel carriers.
 *
 * Circulation is the reader-return surface. The mill owns the channel packet;
 * a site owns the masthead and route where those channels are mounted.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const CirculationChannelKindSchema = Type.Union([
  Type.Literal("rss"),
  Type.Literal("atom"),
  Type.Literal("json-feed"),
]);

export const CirculationChannelSchema = Type.Object({
  kind: CirculationChannelKindSchema,
  title: Type.String({ minLength: 1 }),
  href: Type.String({ minLength: 1 }),
  mediaType: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-mill/circulation-channel",
  title: "CirculationChannel",
  additionalProperties: false,
});

export const CirculationReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.circulation-reading"),
  channels: Type.Array(CirculationChannelSchema),
  identifierPolicy: Type.Literal("none"),
}, {
  $id: "producing-content/content-mill/circulation-reading",
  title: "CirculationReading",
  additionalProperties: false,
});

export type CirculationChannelKind = Static<typeof CirculationChannelKindSchema>;
export type CirculationChannel = Static<typeof CirculationChannelSchema>;
export type CirculationReading = Static<typeof CirculationReadingSchema>;

export const circulationChannelCarrier = carrierFrom(CirculationChannelSchema);

export const circulationReadingCarrier = carrierFrom(CirculationReadingSchema);

export function circulationChannel(input: CirculationChannel): CirculationChannel {
  return circulationChannelCarrier.assert(input, "circulation channel");
}

export function circulationReading(input: Readonly<{
  channels: readonly CirculationChannel[];
  identifierPolicy?: "none";
}>): CirculationReading {
  return circulationReadingCarrier.assert({
    kind: "producing-content.circulation-reading" as const,
    channels: input.channels.map((channel) => circulationChannel(channel)),
    identifierPolicy: input.identifierPolicy ?? "none",
  }, "circulation reading");
}

export function feedNativeCirculationReading(input: Readonly<{
  siteUrl: string;
}>): CirculationReading {
  const base = input.siteUrl.replace(/\/$/, "");
  return circulationReading({
    channels: [
      circulationChannel({ kind: "rss", title: "RSS", href: `${base}/feed.xml`, mediaType: "application/rss+xml" }),
      circulationChannel({ kind: "atom", title: "Atom", href: `${base}/feed.atom`, mediaType: "application/atom+xml" }),
      circulationChannel({ kind: "json-feed", title: "JSON Feed", href: `${base}/feed.json`, mediaType: "application/feed+json" }),
    ],
    identifierPolicy: "none",
  });
}

export function circulationChannelTerm(input: CirculationChannel): Tm {
  return carrierToTerm(jsonResource(circulationChannelCarrier.assert(input), "circulation channel"));
}

export function circulationReadingTerm(input: CirculationReading): Tm {
  return carrierToTerm(jsonResource(circulationReadingCarrier.assert(input), "circulation reading"));
}
