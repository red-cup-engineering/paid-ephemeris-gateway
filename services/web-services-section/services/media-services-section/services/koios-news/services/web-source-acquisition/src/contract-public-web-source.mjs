#!/usr/bin/env node

import { lookup as dnsLookupCallback } from "node:dns";
import { isIP } from "node:net";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "rsc-quiescent.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { createSettlementStore, relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { witnessJournalNetworkOptions } from "./witness-journal-network.mjs";

export const ACTOR = "urn:ame:web-source-acquisition";
export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const CONTRACT = "ni:///sha-256;4dWqNk8UGBJyC5esUN5GdXNRq35iPDmbSIby-F-Xk8E";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MAXIMUM_SOURCES = 6;
const DEFAULT_MAXIMUM_BYTES = 2_000_000;
const DEFAULT_MAXIMUM_TEXT = 50_000;
const HARD_MAXIMUM_SOURCES = 8;
const HARD_MAXIMUM_BYTES = 3_000_000;
const HARD_MAXIMUM_TEXT = 100_000;
const DEFAULT_USER_AGENT = "Koios-Source-Acquisition/1.0 (+https://koios.news/)";
const dnsLookup = promisify(dnsLookupCallback);

export function digest(value) { return semanticId(value); }

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function validInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value));
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function dataRoot() {
  return resolve(process.env["WEB_SOURCE_ACQUISITION_DATA_ROOT"] ?? join(ROOT, "data"));
}

function store(witnessJournalOptions = witnessJournalNetworkOptions()) {
  return createSettlementStore({
    settlementRoot: ROOT,
    agentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT,
    ...witnessJournalOptions,
  });
}
async function record(instant, value, witnessJournalOptions) { return store(witnessJournalOptions).record({ category: `${CONTRACT}.events`, recordedAt: instant, record: value }); }

function response(activity, instant, type, code, summary, result) {
  return Object.freeze({
    "@context": CONTEXT,
    type,
    actor: ACTOR,
    target: activity?.actor,
    published: instant,
    code,
    summary,
    object: result ?? activity,
  });
}

function demandFrom(activity) {
  const source = object(activity?.object)?.sourceActivity;
  const demand = object(source)?.object;
  if (object(source)?.type !== "Create" || object(demand)?.type !== "PublicWebSourceAcquisitionDemand") return undefined;
  return { source, demand };
}

function inspectDemand(demand) {
  const urls = Array.isArray(demand?.urls) && demand.urls.every((url) => typeof url === "string") ? demand.urls : undefined;
  const ceilings = object(demand?.ceilings);
  const maximumSources = positiveInteger(ceilings?.maximumSources) ?? DEFAULT_MAXIMUM_SOURCES;
  const maximumBytesPerSource = positiveInteger(ceilings?.maximumBytesPerSource) ?? DEFAULT_MAXIMUM_BYTES;
  const maximumTextCharacters = positiveInteger(ceilings?.maximumTextCharacters) ?? DEFAULT_MAXIMUM_TEXT;
  if (demand?.purpose !== "journalistic-source-research") return { error: { code: "invalid-purpose", reason: "the service accepts only journalistic-source-research demands" } };
  if (urls === undefined || urls.length === 0 || urls.length > maximumSources || maximumSources > HARD_MAXIMUM_SOURCES) return { error: { code: "invalid-source-count", reason: `one to ${HARD_MAXIMUM_SOURCES} customer-declared source URLs are required within the stated ceiling` } };
  if (maximumBytesPerSource > HARD_MAXIMUM_BYTES || maximumTextCharacters > HARD_MAXIMUM_TEXT) return { error: { code: "invalid-ceilings", reason: "source byte or returned-text ceiling exceeds provider policy" } };
  const normalized = [];
  try {
    for (const raw of urls) normalized.push(normalizePublicUrl(raw));
  } catch (error) {
    return { error: { code: "non-public-source", reason: error instanceof Error ? error.message : String(error) } };
  }
  return {
    urls: Object.freeze([...new Set(normalized)]),
    ceilings: Object.freeze({ maximumSources, maximumBytesPerSource, maximumTextCharacters }),
  };
}

export function normalizePublicUrl(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`source URL must use HTTP or HTTPS: ${raw}`);
  if (url.username !== "" || url.password !== "") throw new Error(`source URL must not carry credentials: ${raw}`);
  const host = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "0") throw new Error(`source URL names a non-public host: ${raw}`);
  if (isIP(host) !== 0 && !publicAddress(host)) throw new Error(`source URL names a non-public address: ${raw}`);
  url.hash = "";
  return url.toString();
}

function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || /^fe[89ab]/u.test(lower)) return false;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/u)?.[1];
    return mapped === undefined ? true : publicAddress(mapped);
  }
  return false;
}

export async function assertPublicDns(url, lookup = dnsLookup) {
  const host = new URL(url).hostname;
  if (isIP(host) !== 0) {
    if (!publicAddress(host)) throw new Error(`resolved source is not public: ${host}`);
    return;
  }
  const answers = await lookup(host, { all: true, verbatim: true });
  if (!Array.isArray(answers) || answers.length === 0 || answers.some((answer) => !publicAddress(answer.address))) throw new Error(`source host does not resolve exclusively to public addresses: ${host}`);
}

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return String(value)
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&(amp|apos|gt|lt|nbsp|quot);/giu, (_, name) => named[name.toLowerCase()]);
}

function cleanText(value, maximum) {
  const lines = decodeEntities(value).replace(/\r\n?/gu, "\n").split("\n").map((line) => line.replace(/[\t ]+/gu, " ").trim());
  const compact = lines.filter((line, index) => line !== "" || (index > 0 && lines[index - 1] !== "")).join("\n").replace(/\n{3,}/gu, "\n\n").trim();
  return compact.length <= maximum ? compact : compact.slice(0, maximum).trimEnd();
}

function stripHtml(value, maximum) {
  const withoutNoise = String(value)
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(script|style|noscript|svg|canvas|nav|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<(?:br|hr)\b[^>]*>/giu, "\n")
    .replace(/<\/(?:p|div|section|article|main|li|h[1-6]|blockquote|table|tr)>/giu, "\n")
    .replace(/<li\b[^>]*>/giu, "• ")
    .replace(/<[^>]+>/gu, " ");
  return cleanText(withoutNoise, maximum);
}

function jsonLdNodes(value) {
  const queue = Array.isArray(value) ? [...value] : [value];
  const nodes = [];
  while (queue.length > 0) {
    const next = queue.shift();
    if (Array.isArray(next)) queue.push(...next);
    else if (next !== null && typeof next === "object") {
      nodes.push(next);
      if (Array.isArray(next["@graph"])) queue.push(...next["@graph"]);
    }
  }
  return nodes;
}

function structuredArticle(html) {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)) {
    try {
      const nodes = jsonLdNodes(JSON.parse(decodeEntities(match[1])));
      const article = nodes.find((node) => {
        const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        return types.some((type) => typeof type === "string" && /(?:News)?Article|ReportageNewsArticle/iu.test(type)) && typeof node.articleBody === "string";
      });
      if (article !== undefined) return article;
    } catch { /* invalid publisher JSON-LD is not fatal */ }
  }
  return undefined;
}

function metaContent(html, name) {
  const patterns = [
    new RegExp(`<meta\\b[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, "iu"),
    new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["'][^>]*>`, "iu"),
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find((value) => value !== undefined);
}

export function extractArticleText(html, maximumTextCharacters = DEFAULT_MAXIMUM_TEXT) {
  const structured = structuredArticle(html);
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/iu)?.[1];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/iu)?.[1];
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/iu)?.[1];
  const text = typeof structured?.articleBody === "string"
    ? cleanText(structured.articleBody, maximumTextCharacters)
    : stripHtml(articleMatch ?? mainMatch ?? bodyMatch ?? html, maximumTextCharacters);
  const titleHtml = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1];
  const title = cleanText(String(structured?.headline ?? metaContent(html, "og:title") ?? stripHtml(titleHtml ?? "", 500)), 500);
  const published = String(structured?.datePublished ?? metaContent(html, "article:published_time") ?? "").trim();
  return Object.freeze({ text, ...(title === "" ? {} : { title }), ...(published === "" ? {} : { published }) });
}

async function fetchPublicSource(requestedUrl, ceilings, io) {
  let currentUrl = requestedUrl;
  let networkRequests = 0;
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    await assertPublicDns(currentUrl, io.dnsLookup ?? dnsLookup);
    networkRequests += 1;
    const response = await io.fetchImpl(currentUrl, {
      redirect: "manual",
      headers: { accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.1", "user-agent": DEFAULT_USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (location === null) throw new Error(`redirect ${response.status} carried no location`);
      currentUrl = normalizePublicUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) throw new Error(`public source returned HTTP ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > ceilings.maximumBytesPerSource) throw new Error(`public source declares ${contentLength} bytes above the ${ceilings.maximumBytesPerSource}-byte ceiling`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > ceilings.maximumBytesPerSource) throw new Error(`public source returned ${bytes.byteLength} bytes above the ${ceilings.maximumBytesPerSource}-byte ceiling`);
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (contentType !== "" && !["text/html", "text/plain", "application/xhtml+xml"].includes(contentType)) throw new Error(`unsupported public source content type: ${contentType}`);
    const decoded = bytes.toString("utf8");
    const extracted = contentType === "text/plain" ? Object.freeze({ text: cleanText(decoded, ceilings.maximumTextCharacters) }) : extractArticleText(decoded, ceilings.maximumTextCharacters);
    if (extracted.text.length < 200) throw new Error(`public source exposed only ${extracted.text.length} usable text characters`);
    return Object.freeze({
      type: "PublicWebSource",
      requestedUrl,
      finalUrl: currentUrl,
      contentType: contentType || "text/html",
      responseBytes: bytes.byteLength,
      responseDigest: digest(bytes.toString("base64")),
      text: extracted.text,
      textDigest: digest(extracted.text),
      ...(extracted.title === undefined ? {} : { title: extracted.title }),
      ...(extracted.published === undefined ? {} : { published: extracted.published }),
      rights: "public-access-observed; license-and-republication-rights-not-inferred",
      accessMethod: "unauthenticated-public-http",
      networkRequests,
    });
  }
  throw new Error("public source exceeded five validated redirects");
}

export async function acquirePublicWebSources(demand, instant = new Date().toISOString(), io = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const inspected = inspectDemand(demand);
  if (inspected.error) return Object.freeze({ status: "refused", ...inspected.error });
  const fetchImpl = io.fetchImpl ?? fetch;
  const results = [];
  const obstructions = [];
  let responseBytes = 0;
  let networkRequests = 0;
  for (const url of inspected.urls) {
    let sourceNetworkRequests = 0;
    const meteredFetch = async (...args) => {
      sourceNetworkRequests += 1;
      return await fetchImpl(...args);
    };
    try {
      const result = await fetchPublicSource(url, inspected.ceilings, { fetchImpl: meteredFetch, ...(io.dnsLookup === undefined ? {} : { dnsLookup: io.dnsLookup }) });
      results.push(Object.freeze({ ...result, networkRequests: sourceNetworkRequests, acquiredAt: instant }));
      responseBytes += result.responseBytes;
    } catch (error) {
      obstructions.push(Object.freeze({ type: "PublicWebSourceObstruction", requestedUrl: url, code: "source-unavailable", reason: error instanceof Error ? error.message : String(error), observedAt: instant }));
    } finally {
      networkRequests += sourceNetworkRequests;
    }
  }
  return Object.freeze({
    status: "settled",
    type: "PublicWebSourceDelivery",
    purpose: "journalistic-source-research",
    results: Object.freeze(results),
    obstructions: Object.freeze(obstructions),
    deliveryDigest: digest({ results, obstructions }),
    resourceAccount: Object.freeze({ networkRequests, responseBytes, monetaryPrice: Object.freeze({ amount: 0, currency: "USD" }) }),
    customerTerritoryMutation: false,
    acquiredAt: instant,
  });
}

export async function solicitPublicWebSources(activity, instant = new Date().toISOString(), io = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Offer" || activity?.target !== ACTOR || object(activity?.object)?.type !== "ServiceSolicitation") return response(activity, instant, "Reject", "invalid-solicitation", "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider");
  const found = demandFrom(activity);
  if (found === undefined) return response(activity, instant, "Reject", "invalid-demand", "solicitation carries no public-Web source demand");
  const inspected = inspectDemand(found.demand);
  if (inspected.error) return response(activity, instant, "Reject", inspected.error.code, inspected.error.reason);
  const demandDigest = digest(found.demand);
  const offer = Object.freeze({
    "@context": CONTEXT,
    id: digest({ type: "PublicWebSourceOfferIdentity", provider: ACTOR, demandDigest }),
    type: "Offer",
    actor: ACTOR,
    target: activity.actor,
    published: instant,
    object: Object.freeze({ type: "ServiceOffer", service: "public-source-text", demandDigest, sourceActivity: found.source, capability: Object.freeze({ type: "AttenuatedCapability", effect: "retrieve-declared-public-source-text", demandDigest }), price: Object.freeze({ amount: 0, currency: "USD" }) }),
  });
  await record(instant, { kind: "provider.offer", service: "public-source-text", offerId: offer.id, demandDigest }, io.witnessJournalOptions);
  return offer;
}

export async function invokePublicWebSources(activity, instant = new Date().toISOString(), io = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const contract = object(activity?.object);
  const offer = object(contract?.offer);
  const offerObject = object(offer?.object);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Accept" || activity?.target !== ACTOR || contract?.type !== "ServiceContract" || offer?.actor !== ACTOR || offerObject?.service !== "public-source-text") return response(activity, instant, "Reject", "invalid-invocation", "invocation must accept this provider's exact public-source-text offer");
  const source = object(offerObject.sourceActivity);
  const demand = object(source?.object);
  if (demand === undefined || digest(demand) !== offerObject.demandDigest || object(offerObject.capability)?.demandDigest !== offerObject.demandDigest) return response(activity, instant, "Reject", "changed-demand", "offer demand or capability digest changed");
  const result = await acquirePublicWebSources(demand, instant, io);
  if (result.status === "refused") return response(activity, instant, "Reject", result.code, result.reason, result);
  const providerExchange = Object.freeze({ exchangeId: digest({ type: "PublicWebSourceExchangeIdentity", offer: offer.id, instant }), provider: "web-source-acquisition", service: "public-source-text", price: Object.freeze({ amount: 0, currency: "USD" }), demandDigest: offerObject.demandDigest, deliveryDigest: result.deliveryDigest, resultCount: result.results.length, obstructionCount: result.obstructions.length, resourceAccount: result.resourceAccount, recordedAt: instant });
  const delivery = Object.freeze({ ...result, providerExchange });
  const accepted = response(activity, instant, "Accept", "source-acquisition-settled", `acquired ${result.results.length} of ${result.results.length + result.obstructions.length} declared public sources`, delivery);
  await record(instant, { kind: "provider.delivery", ...providerExchange }, io.witnessJournalOptions);
  return accepted;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const instant = process.argv[3] ?? new Date().toISOString();
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const activity = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result = command === "solicit-service"
    ? await solicitPublicWebSources(activity, instant)
    : command === "invoke-service"
      ? await invokePublicWebSources(activity, instant)
      : response(activity, instant, "Reject", "unknown-command", `unknown command: ${command}`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
