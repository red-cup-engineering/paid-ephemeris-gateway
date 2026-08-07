/**
 * advertising - aggregate advertising performance carriers.
 *
 * The mill owns the privacy-preserving publication packet. A site owns where it
 * stores event lines and which ad policy it mounts.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const AdProviderSchema = Type.Union([
  Type.Literal("adsense"),
  Type.Literal("a-ads"),
]);

export const AdPerformanceInputSchema = Type.Object({
  provider: AdProviderSchema,
  path: Type.String({ minLength: 1, pattern: "^/[\\x21-\\x7e]{0,512}$" }),
  day: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  impressions: Type.Optional(Type.Integer({ minimum: 0 })),
  clicks: Type.Optional(Type.Integer({ minimum: 0 })),
  revenueMicros: Type.Optional(Type.Integer({ minimum: 0 })),
}, {
  $id: "producing-content/content-mill/ad-performance-input",
  title: "AdPerformanceInput",
  additionalProperties: false,
});

export const AdPerformanceEventSchema = Type.Object({
  kind: Type.Literal("producing-content.ad-performance-event"),
  at: Type.String({ minLength: 1 }),
  provider: AdProviderSchema,
  path: Type.String({ minLength: 1 }),
  day: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  section: Type.Optional(Type.String({ minLength: 1 })),
  tags: Type.Array(Type.String({ minLength: 1 })),
  impressions: Type.Integer({ minimum: 0 }),
  clicks: Type.Integer({ minimum: 0 }),
  revenueMicros: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/ad-performance-event",
  title: "AdPerformanceEvent",
  additionalProperties: false,
});

export const AdPerformanceBucketSchema = Type.Object({
  impressions: Type.Integer({ minimum: 0 }),
  clicks: Type.Integer({ minimum: 0 }),
  revenueMicros: Type.Integer({ minimum: 0 }),
  rpmMicros: Type.Integer({ minimum: 0 }),
  cpcMicros: Type.Integer({ minimum: 0 }),
}, {
  $id: "producing-content/content-mill/ad-performance-bucket",
  title: "AdPerformanceBucket",
  additionalProperties: false,
});

export const AdPerformanceReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.ad-performance-reading"),
  eventCount: Type.Integer({ minimum: 0 }),
  totals: AdPerformanceBucketSchema,
  byProvider: Type.Record(Type.String(), AdPerformanceBucketSchema),
  bySection: Type.Record(Type.String(), AdPerformanceBucketSchema),
  byTag: Type.Record(Type.String(), AdPerformanceBucketSchema),
  constraints: Type.Array(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-mill/ad-performance-reading",
  title: "AdPerformanceReading",
  additionalProperties: false,
});

export type AdProvider = Static<typeof AdProviderSchema>;
export type AdPerformanceInput = Static<typeof AdPerformanceInputSchema>;
export type AdPerformanceEvent = Static<typeof AdPerformanceEventSchema>;
export type AdPerformanceBucket = Static<typeof AdPerformanceBucketSchema>;
export type AdPerformanceReading = Static<typeof AdPerformanceReadingSchema>;

export const AD_PERFORMANCE_CONSTRAINTS = Object.freeze([
  "Aggregate ad-performance records only; do not include IP addresses, user agents, cookies, browser fingerprints, or reader identifiers.",
  "Provider routing can use page, section, tag, day, impressions, clicks, and revenue, but never reader identity.",
]);

export const adPerformanceInputCarrier = carrierFrom(AdPerformanceInputSchema);

export const adPerformanceEventCarrier = carrierFrom(AdPerformanceEventSchema);

export const adPerformanceBucketCarrier = carrierFrom(AdPerformanceBucketSchema);

export const adPerformanceReadingCarrier = carrierFrom(AdPerformanceReadingSchema);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function requiredProvider(value: unknown): AdProvider {
  if (value === "adsense" || value === "a-ads") return value;
  throw new TypeError("provider must be adsense or a-ads");
}

function requiredPath(value: unknown): string {
  const path = maybeString(value);
  if (path === undefined || !/^\/[\x21-\x7e]{0,512}$/.test(path)) throw new TypeError("path must be a site-relative path");
  return path;
}

function requiredDay(value: unknown): string {
  const day = maybeString(value);
  if (day === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new TypeError("day must be YYYY-MM-DD");
  return day;
}

function nonNegativeInteger(value: unknown, field: string): number {
  const number = value === undefined || value === null || value === "" ? 0 : Number(value);
  if (!Number.isInteger(number) || number < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return number;
}

function optionalTags(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError("tags must be an array");
  return Object.freeze(value.map((item, index) => {
    const tag = maybeString(item)?.trim();
    if (tag === undefined || tag === "") throw new TypeError(`tags[${index}] must be a non-empty string`);
    return tag;
  }));
}

export function normalizeAdPerformanceInput(input: unknown): AdPerformanceInput {
  if (!isRecord(input)) throw new TypeError("ad performance input must be a JSON object");
  const section = maybeString(input["section"]);
  return adPerformanceInputCarrier.assert({
    provider: requiredProvider(input["provider"]),
    path: requiredPath(input["path"]),
    day: requiredDay(input["day"]),
    ...(section === undefined ? {} : { section }),
    tags: optionalTags(input["tags"]),
    impressions: nonNegativeInteger(input["impressions"], "impressions"),
    clicks: nonNegativeInteger(input["clicks"], "clicks"),
    revenueMicros: nonNegativeInteger(input["revenueMicros"], "revenueMicros"),
  }, "ad performance input");
}

export function adPerformanceEvent(input: AdPerformanceInput, at = new Date().toISOString()): AdPerformanceEvent {
  return adPerformanceEventCarrier.assert({
    kind: "producing-content.ad-performance-event" as const,
    at,
    provider: input.provider,
    path: input.path,
    day: input.day,
    ...(input.section === undefined ? {} : { section: input.section }),
    tags: [...(input.tags ?? [])],
    impressions: input.impressions ?? 0,
    clicks: input.clicks ?? 0,
    revenueMicros: input.revenueMicros ?? 0,
  }, "ad performance event");
}

export function adPerformanceEventFromRecord(record: Readonly<Record<string, unknown>>): AdPerformanceEvent | undefined {
  if (
    record["kind"] !== "producing-content.ad-performance-event" ||
    (record["provider"] !== "adsense" && record["provider"] !== "a-ads") ||
    typeof record["path"] !== "string" ||
    typeof record["day"] !== "string"
  ) {
    return undefined;
  }
  return adPerformanceEvent({
    provider: record["provider"],
    path: record["path"],
    day: record["day"],
    ...(typeof record["section"] === "string" ? { section: record["section"] } : {}),
    tags: [...optionalTags(record["tags"])],
    impressions: nonNegativeInteger(record["impressions"], "impressions"),
    clicks: nonNegativeInteger(record["clicks"], "clicks"),
    revenueMicros: nonNegativeInteger(record["revenueMicros"], "revenueMicros"),
  }, typeof record["at"] === "string" ? record["at"] : "");
}

function emptyBucket(): { impressions: number; clicks: number; revenueMicros: number } {
  return { impressions: 0, clicks: 0, revenueMicros: 0 };
}

function add(bucket: { impressions: number; clicks: number; revenueMicros: number }, event: AdPerformanceEvent): void {
  bucket.impressions += event.impressions;
  bucket.clicks += event.clicks;
  bucket.revenueMicros += event.revenueMicros;
}

export function adPerformanceBucket(input: Readonly<{
  impressions: number;
  clicks: number;
  revenueMicros: number;
}>): AdPerformanceBucket {
  return adPerformanceBucketCarrier.assert({
    impressions: input.impressions,
    clicks: input.clicks,
    revenueMicros: input.revenueMicros,
    rpmMicros: input.impressions === 0 ? 0 : Math.round((input.revenueMicros * 1000) / input.impressions),
    cpcMicros: input.clicks === 0 ? 0 : Math.round(input.revenueMicros / input.clicks),
  }, "ad performance bucket");
}

function finalized(record: Readonly<Record<string, { impressions: number; clicks: number; revenueMicros: number }>>): Readonly<Record<string, AdPerformanceBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, bucket]) => [key, adPerformanceBucket(bucket)])));
}

export function adPerformanceReading(input: Readonly<{
  events: readonly AdPerformanceEvent[];
  constraints?: readonly string[];
}>): AdPerformanceReading {
  const totals = emptyBucket();
  const byProvider: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  const bySection: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  const byTag: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  for (const event of input.events) {
    add(totals, event);
    byProvider[event.provider] ??= emptyBucket();
    add(byProvider[event.provider]!, event);
    if (event.section !== undefined) {
      bySection[event.section] ??= emptyBucket();
      add(bySection[event.section]!, event);
    }
    for (const tag of event.tags) {
      byTag[tag] ??= emptyBucket();
      add(byTag[tag]!, event);
    }
  }
  return adPerformanceReadingCarrier.assert({
    kind: "producing-content.ad-performance-reading" as const,
    eventCount: input.events.length,
    totals: adPerformanceBucket(totals),
    byProvider: finalized(byProvider),
    bySection: finalized(bySection),
    byTag: finalized(byTag),
    constraints: [...(input.constraints ?? AD_PERFORMANCE_CONSTRAINTS)],
  }, "ad performance reading");
}

export function adPerformanceEventTerm(input: AdPerformanceEvent): Tm {
  return carrierToTerm(jsonResource(adPerformanceEventCarrier.assert(input), "ad performance event"));
}

export function adPerformanceReadingTerm(input: AdPerformanceReading): Tm {
  return carrierToTerm(jsonResource(adPerformanceReadingCarrier.assert(input), "ad performance reading"));
}
