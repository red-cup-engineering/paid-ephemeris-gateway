// publishing/managing/advertising — advertising policy after publication.
//
// This module is deliberately policy-shaped, not vendor-shaped. Koios can serve
// ads, publish ads.txt, and widen CSP only when the configured policy permits it.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { parseLines, requireJsonValue, serializeLines } from "@emsenn/relating/codecs";

export type AdvertisingPolicy = Readonly<{
  enabled: boolean;
  client?: string;
  aAdsUnits: readonly string[];
  adsTxt?: string;
  privacyParagraph: string;
}>;

export type AdProvider = "adsense" | "a-ads";

export type AdPerformanceInput = Readonly<{
  provider: AdProvider;
  path: string;
  day: string;
  section?: string;
  tags?: readonly string[];
  impressions?: number;
  clicks?: number;
  revenueMicros?: number;
}>;

export type AdPerformanceEvent = Readonly<Required<Pick<AdPerformanceInput, "provider" | "path" | "day" | "impressions" | "clicks" | "revenueMicros">> & {
  kind: "koios.advertising.performance";
  at: string;
  section?: string;
  tags: readonly string[];
}>;

export type AdPerformanceBucket = Readonly<{
  impressions: number;
  clicks: number;
  revenueMicros: number;
  rpmMicros: number;
  cpcMicros: number;
}>;

export type AdPerformanceReading = Readonly<{
  department: "publishing.managing.advertising.performance";
  eventCount: number;
  totals: AdPerformanceBucket;
  byProvider: Readonly<Record<string, AdPerformanceBucket>>;
  bySection: Readonly<Record<string, AdPerformanceBucket>>;
  byTag: Readonly<Record<string, AdPerformanceBucket>>;
  constraints: readonly string[];
}>;

const PATH_PATTERN = /^\/[\x21-\x7e]{0,512}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function advertisingPolicy(adClient: string | undefined, options: Readonly<{ aAdsUnits?: readonly string[] }> = {}): AdvertisingPolicy {
  const aAdsUnits = Object.freeze([...(options.aAdsUnits ?? [])]);
  if ((adClient === undefined || adClient === "") && aAdsUnits.length === 0) {
    return Object.freeze({
      enabled: false,
      aAdsUnits,
      privacyParagraph: "Pages currently carry no third-party advertising. If that changes, this policy will say so before it does.",
    });
  }
  const publisherId = adClient?.replace(/^ca-/, "");
  const privacy = [
    adClient ? "Pages may carry advertising served by Google AdSense. Google and its partners may use cookies or similar technologies to serve and measure ads; see <a href=\"https://policies.google.com/technologies/ads\">Google&#39;s advertising technologies policy</a> for what they collect and how to opt out." : "",
    aAdsUnits.length > 0 ? "Pages may carry A-Ads units in embedded frames. Those frames are served by A-Ads; Koios.News does not send A-Ads reader identifiers, and our own ad-performance records remain aggregate by provider, path, section, tag, day, impressions, clicks, and revenue." : "",
    "We do not pass ad providers anything about you ourselves.",
  ].filter(Boolean).join(" ");
  return Object.freeze({
    enabled: true,
    ...(adClient === undefined || adClient === "" ? {} : { client: adClient }),
    aAdsUnits,
    ...(publisherId === undefined || publisherId === "" ? {} : { adsTxt: `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n` }),
    privacyParagraph: privacy,
  });
}

function adPerformanceLogPath(dataDir: string): string {
  return join(dataDir, "logs", "ad-performance.jsonl");
}

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
  if (typeof value !== "string" || !PATH_PATTERN.test(value)) throw new TypeError("path must be a site-relative path");
  return value;
}

function requiredDay(value: unknown): string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) throw new TypeError("day must be YYYY-MM-DD");
  return value;
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
    if (typeof item !== "string" || item.trim() === "") throw new TypeError(`tags[${index}] must be a non-empty string`);
    return item.trim();
  }));
}

export function normalizeAdPerformanceInput(input: unknown): AdPerformanceInput {
  if (!isRecord(input)) throw new TypeError("ad performance input must be a JSON object");
  const section = maybeString(input["section"]);
  return Object.freeze({
    provider: requiredProvider(input["provider"]),
    path: requiredPath(input["path"]),
    day: requiredDay(input["day"]),
    ...(section === undefined ? {} : { section }),
    tags: optionalTags(input["tags"]),
    impressions: nonNegativeInteger(input["impressions"], "impressions"),
    clicks: nonNegativeInteger(input["clicks"], "clicks"),
    revenueMicros: nonNegativeInteger(input["revenueMicros"], "revenueMicros"),
  });
}

export const adPerformanceJsonSchema = Object.freeze({
  type: "object",
  required: Object.freeze(["provider", "path", "day"]),
  properties: Object.freeze({
    provider: Object.freeze({ type: "string", enum: Object.freeze(["adsense", "a-ads"]) }),
    path: Object.freeze({ type: "string", minLength: 1 }),
    day: Object.freeze({ type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    section: Object.freeze({ type: "string" }),
    tags: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
    impressions: Object.freeze({ type: "integer", minimum: 0 }),
    clicks: Object.freeze({ type: "integer", minimum: 0 }),
    revenueMicros: Object.freeze({ type: "integer", minimum: 0 }),
  }),
  additionalProperties: false,
});

function performanceEvent(input: AdPerformanceInput): AdPerformanceEvent {
  return Object.freeze({
    kind: "koios.advertising.performance" as const,
    at: new Date().toISOString(),
    provider: input.provider,
    path: input.path,
    day: input.day,
    ...(input.section === undefined ? {} : { section: input.section }),
    tags: Object.freeze(input.tags ?? []),
    impressions: input.impressions ?? 0,
    clicks: input.clicks ?? 0,
    revenueMicros: input.revenueMicros ?? 0,
  });
}

export function recordAdPerformance(dataDir: string, input: AdPerformanceInput): AdPerformanceEvent {
  const event = performanceEvent(input);
  const path = adPerformanceLogPath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, serializeLines([requireJsonValue(event, "ad performance")]), "utf8");
  return event;
}

function adPerformanceEvents(dataDir: string): readonly AdPerformanceEvent[] {
  const path = adPerformanceLogPath(dataDir);
  if (!existsSync(path)) return Object.freeze([]);
  const events: AdPerformanceEvent[] = [];
  for (const parsed of parseLines(readFileSync(path, "utf8"))) {
    if (
      isRecord(parsed) &&
      parsed["kind"] === "koios.advertising.performance" &&
      (parsed["provider"] === "adsense" || parsed["provider"] === "a-ads") &&
      typeof parsed["path"] === "string" &&
      typeof parsed["day"] === "string"
    ) {
      events.push(Object.freeze({
        kind: "koios.advertising.performance" as const,
        at: typeof parsed["at"] === "string" ? parsed["at"] : "",
        provider: parsed["provider"],
        path: parsed["path"],
        day: parsed["day"],
        ...(typeof parsed["section"] === "string" ? { section: parsed["section"] } : {}),
        tags: optionalTags(parsed["tags"]),
        impressions: nonNegativeInteger(parsed["impressions"], "impressions"),
        clicks: nonNegativeInteger(parsed["clicks"], "clicks"),
        revenueMicros: nonNegativeInteger(parsed["revenueMicros"], "revenueMicros"),
      }));
    }
  }
  return Object.freeze(events);
}

function emptyBucket(): { impressions: number; clicks: number; revenueMicros: number } {
  return { impressions: 0, clicks: 0, revenueMicros: 0 };
}

function add(bucket: { impressions: number; clicks: number; revenueMicros: number }, event: AdPerformanceEvent): void {
  bucket.impressions += event.impressions;
  bucket.clicks += event.clicks;
  bucket.revenueMicros += event.revenueMicros;
}

function finalize(bucket: { impressions: number; clicks: number; revenueMicros: number }): AdPerformanceBucket {
  return Object.freeze({
    impressions: bucket.impressions,
    clicks: bucket.clicks,
    revenueMicros: bucket.revenueMicros,
    rpmMicros: bucket.impressions === 0 ? 0 : Math.round((bucket.revenueMicros * 1000) / bucket.impressions),
    cpcMicros: bucket.clicks === 0 ? 0 : Math.round(bucket.revenueMicros / bucket.clicks),
  });
}

function finalized(record: Readonly<Record<string, { impressions: number; clicks: number; revenueMicros: number }>>): Readonly<Record<string, AdPerformanceBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, bucket]) => [key, finalize(bucket)])));
}

export function readAdPerformance(dataDir: string): AdPerformanceReading {
  const events = adPerformanceEvents(dataDir);
  const totals = emptyBucket();
  const byProvider: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  const bySection: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  const byTag: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  for (const event of events) {
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
  return Object.freeze({
    department: "publishing.managing.advertising.performance",
    eventCount: events.length,
    totals: finalize(totals),
    byProvider: finalized(byProvider),
    bySection: finalized(bySection),
    byTag: finalized(byTag),
    constraints: Object.freeze([
      "Aggregate ad-performance records only; do not include IP addresses, user agents, cookies, browser fingerprints, or reader identifiers.",
      "Provider routing can use page, section, tag, day, impressions, clicks, and revenue, but never reader identity.",
    ]),
  });
}

export function advertisingContentSecurityPolicy(policy: AdvertisingPolicy): string {
  const adsense = policy.client !== undefined;
  const aAds = policy.aAdsUnits.length > 0;
  const adScript = adsense ? " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com" : "";
  const adImg = adsense ? " https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com" : "";
  const frameHosts = [
    ...(adsense ? ["https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com"] : []),
    ...(aAds ? ["https://acceptable.a-ads.com"] : []),
  ];
  const adFrame = frameHosts.length > 0 ? `frame-src ${frameHosts.join(" ")}; ` : "";
  const adConnect = adsense ? " https://*.googlesyndication.com https://*.doubleclick.net" : "";
  return "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; " +
    `script-src 'self' 'unsafe-inline'${adScript}; ` +
    `img-src 'self' data:${adImg}; ` +
    `connect-src 'self'${adConnect}; ` +
    adFrame +
    "base-uri 'self'; frame-ancestors 'none'; object-src 'none'";
}
