#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";

import { ACTOR, CONTEXT, assertPublicDns, digest, normalizePublicUrl } from "./contract-public-web-source.mjs";
import { witnessJournalNetworkOptions } from "./witness-journal-network.mjs";

export const DISCOVERY_CONTRACT = "ni:///sha-256;HvRXU-_xnG2uF51yLa-UjPE2aq3CfoepqSU1R93_viU";
export const DEFAULT_DISCOVERY_MODEL = "gemini-3.1-flash-lite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MAXIMUM_CANDIDATES = 6;
const HARD_MAXIMUM_CANDIDATES = 8;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function validInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value));
}

function dataRoot() {
  return resolve(process.env["WEB_SOURCE_ACQUISITION_DATA_ROOT"] ?? join(ROOT, "data"));
}

function providerCredential(name) {
  if (typeof process.env[name] === "string" && process.env[name].trim() !== "") return process.env[name].trim();
  const envPath = resolve(process.env["WEB_SOURCE_ACQUISITION_ENV_FILE"] ?? join(ROOT, ".env"));
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/u)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
      if (match?.[1] !== name) continue;
      const raw = match[2].trim();
      const value = raw.length >= 2 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) ? raw.slice(1, -1) : raw;
      return value === "" ? undefined : value;
    }
  } catch { /* an absent provider credential file becomes a typed refusal */ }
  return undefined;
}

function store(witnessJournalOptions = witnessJournalNetworkOptions()) {
  return createSettlementStore({
    settlementRoot: ROOT,
    agentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT,
    ...witnessJournalOptions,
  });
}
async function record(instant, value, witnessJournalOptions) { return store(witnessJournalOptions).record({ category: `${DISCOVERY_CONTRACT}.events`, recordedAt: instant, record: value }); }

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
  if (object(source)?.type !== "Create" || object(demand)?.type !== "PublicSourceDiscoveryDemand") return undefined;
  return { source, demand };
}

function boundedString(value, maximum) {
  return typeof value === "string" && value.trim() !== "" && value.length <= maximum ? value.trim() : undefined;
}

function normalizedHttpUrl(value) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username !== "" || url.password !== "") return undefined;
    url.hash = "";
    return url.toString();
  } catch { return undefined; }
}

const NON_JOURNALISTIC_DISCOVERY_HOSTS = Object.freeze([
  "beenverified.com", "facebook.com", "fastpeoplesearch.com", "fbref.com", "healthgrades.com", "instagram.com",
  "linkedin.com", "peoplefinders.com", "radaris.com", "spokeo.com", "truepeoplesearch.com", "whitepages.com",
  "wikipedia.org", "x.com",
]);

function admissibleDiscoveryCandidate(url, title) {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./u, "");
  if (NON_JOURNALISTIC_DISCOVERY_HOSTS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return false;
  return typeof title !== "string" || !/\b(?:address|phone number|email & more|criminal records|people search|profiles?)\b/iu.test(title);
}

function inspectDemand(demand) {
  const lead = object(demand?.lead);
  const title = boundedString(lead?.title, 1_000);
  const summary = lead?.summary === undefined ? undefined : boundedString(lead.summary, 4_000);
  const published = lead?.published === undefined ? undefined : boundedString(lead.published, 100);
  const leadUrl = lead?.url === undefined ? undefined : normalizedHttpUrl(lead.url);
  const hints = Array.isArray(demand?.queryHints) && demand.queryHints.length <= 6
    && demand.queryHints.every((value) => boundedString(value, 300) !== undefined)
    ? demand.queryHints.map((value) => value.trim())
    : undefined;
  const excludedUrls = Array.isArray(demand?.excludedUrls) && demand.excludedUrls.length <= 12
    ? demand.excludedUrls.map(normalizedHttpUrl)
    : undefined;
  const maximumCandidates = Number(object(demand?.ceilings)?.maximumCandidates ?? DEFAULT_MAXIMUM_CANDIDATES);
  if (demand?.purpose !== "journalistic-source-discovery") return { error: { code: "invalid-purpose", reason: "the service accepts only journalistic-source-discovery demands" } };
  if (title === undefined || summary === undefined && lead?.summary !== undefined || published === undefined && lead?.published !== undefined || leadUrl === undefined && lead?.url !== undefined) return { error: { code: "invalid-lead", reason: "a bounded title and only valid optional lead URL, publication instant, and summary are required" } };
  if (hints === undefined || excludedUrls === undefined || excludedUrls.some((value) => value === undefined)) return { error: { code: "invalid-search-bounds", reason: "query hints and excluded URLs must be bounded public strings and URLs" } };
  if (!Number.isInteger(maximumCandidates) || maximumCandidates < 1 || maximumCandidates > HARD_MAXIMUM_CANDIDATES) return { error: { code: "invalid-candidate-ceiling", reason: `maximumCandidates must be between one and ${HARD_MAXIMUM_CANDIDATES}` } };
  return Object.freeze({
    lead: Object.freeze({ title, ...(leadUrl === undefined ? {} : { url: leadUrl }), ...(published === undefined ? {} : { published }), ...(summary === undefined ? {} : { summary }) }),
    queryHints: Object.freeze(hints),
    excludedUrls: Object.freeze([...new Set([...(leadUrl === undefined ? [] : [leadUrl]), ...excludedUrls])]),
    maximumCandidates,
  });
}

function discoveryPrompt(inspected) {
  return [
    "Find independent public-Web reporting or primary public records that report, corroborate, or challenge the SAME CONCRETE EVENT in the journalistic lead below.",
    "Do not return generic topical context, merely related news, old stories sharing one entity, profiles, forums, or pages that do not independently establish this event.",
    "Use Google Search. Prefer original reporting, public records, and distinct publishers. Do not cite the lead itself. Do not invent URLs.",
    "Write a concise prose research note; the calling service will obtain candidate URLs from provider-authored grounding metadata rather than parsing your prose.",
    `LEAD TITLE: ${inspected.lead.title}`,
    ...(inspected.lead.url === undefined ? [] : [`LEAD URL: ${inspected.lead.url}`]),
    ...(inspected.lead.published === undefined ? [] : [`LEAD PUBLISHED: ${inspected.lead.published}`]),
    ...(inspected.lead.summary === undefined ? [] : [`LEAD SUMMARY: ${inspected.lead.summary}`]),
    ...(inspected.queryHints.length === 0 ? [] : [`REQUIRED EVENT QUERY: ${inspected.queryHints[0]}`, `SECONDARY QUERY HINTS: ${inspected.queryHints.slice(1).join("; ")}`]),
    `RETURN NO MORE THAN ${inspected.maximumCandidates} DISTINCT USEFUL SOURCES.`,
  ].join("\n");
}

function modelText(candidate) {
  const parts = object(candidate?.content)?.parts;
  return Array.isArray(parts) ? parts.map((part) => object(part)?.text).filter((value) => typeof value === "string").join("\n") : "";
}

function groundingRedirect(url) {
  const parsed = new URL(url);
  return parsed.hostname === "vertexaisearch.cloud.google.com"
    || parsed.hostname === "www.google.com" && parsed.pathname === "/url"
    || parsed.pathname.includes("grounding-api-redirect");
}

async function resolveGroundingUrl(value, io) {
  let current = normalizePublicUrl(value);
  if (!groundingRedirect(current)) return Object.freeze({ url: current, groundingUrl: current, networkRequests: 0, resolved: false });
  const fetchImpl = io.citationFetchImpl ?? fetch;
  let networkRequests = 0;
  try {
    for (let redirect = 0; redirect <= 5; redirect += 1) {
      await assertPublicDns(current, io.dnsLookup);
      networkRequests += 1;
      const response = await fetchImpl(current, { method: "GET", redirect: "manual", headers: { accept: "text/html,*/*;q=0.1", range: "bytes=0-0", "user-agent": "Koios-Source-Discovery/1.0 (+https://koios.news/)" }, signal: AbortSignal.timeout(15_000) });
      if (![301, 302, 303, 307, 308].includes(response.status)) return Object.freeze({ url: current, groundingUrl: value, networkRequests, resolved: current !== value });
      const location = response.headers.get("location");
      if (location === null) break;
      current = normalizePublicUrl(new URL(location, current).toString());
      if (!groundingRedirect(current)) return Object.freeze({ url: current, groundingUrl: value, networkRequests, resolved: true });
    }
  } catch { /* unresolved grounding URLs remain retrievable candidate citations */ }
  return Object.freeze({ url: normalizePublicUrl(value), groundingUrl: value, networkRequests, resolved: false });
}

async function groundedCandidates(candidate, inspected, io) {
  const metadata = object(candidate?.groundingMetadata);
  const chunks = Array.isArray(metadata?.groundingChunks) ? metadata.groundingChunks : [];
  const excluded = new Set(inspected.excludedUrls);
  const seen = new Set();
  const results = [];
  let citationResolutionRequests = 0;
  for (const chunk of chunks) {
    const web = object(object(chunk)?.web);
    const groundingUrl = normalizedHttpUrl(web?.uri);
    if (groundingUrl === undefined) continue;
    const resolved = await resolveGroundingUrl(groundingUrl, io);
    citationResolutionRequests += resolved.networkRequests;
    const url = resolved.url;
    if (excluded.has(url) || excluded.has(groundingUrl) || seen.has(url)) continue;
    const title = boundedString(web?.title, 1_000);
    if (!admissibleDiscoveryCandidate(url, title)) continue;
    seen.add(url);
    results.push(Object.freeze({
      type: "PublicSourceDiscoveryCandidate",
      rank: results.length + 1,
      url,
      ...(resolved.resolved ? { groundingUrl: resolved.groundingUrl } : {}),
      ...(title === undefined ? {} : { title }),
      custody: "google-search-grounding-metadata",
      admission: "candidate-only-requires-independent-retrieval-and-editorial-admission",
    }));
    if (results.length >= inspected.maximumCandidates) break;
  }
  const queries = Array.isArray(metadata?.webSearchQueries)
    ? metadata.webSearchQueries.filter((value) => typeof value === "string" && value.trim() !== "").map((value) => value.trim()).slice(0, 12)
    : [];
  return Object.freeze({ candidates: Object.freeze(results), searchQueries: Object.freeze(queries), citationResolutionRequests });
}

function gdeltQuery(inspected) {
  const value = inspected.queryHints[0] ?? inspected.lead.title;
  const terms = [...new Set(value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim().split(/\s+/u)
    .filter((term) => term.length >= 3 && !["and", "for", "from", "into", "the", "with"].includes(term)))].slice(0, 10);
  return terms.join(" ").slice(0, 300) || inspected.lead.title.slice(0, 300);
}

async function discoverWithGdelt(inspected, instant, io, priorFailure) {
  const query = gdeltQuery(inspected);
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("maxrecords", String(Math.max(inspected.maximumCandidates * 4, 20)));
  url.searchParams.set("timespan", "7d");
  url.searchParams.set("sort", "hybridrel");
  url.searchParams.set("format", "json");
  const fetchImpl = io.gdeltFetchImpl ?? fetch;
  let networkResponse;
  try {
    networkResponse = await fetchImpl(url, {
      headers: { accept: "application/json", "user-agent": "Koios-News-Web-Source-Acquisition/1.0 (+https://koios.news/)" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    return Object.freeze({ status: "refused", code: "all-discovery-carriers-unavailable", reason: `GDELT fallback failed after ${priorFailure.code}: ${error instanceof Error ? error.message : String(error)}`, retryable: true, carrierFailures: Object.freeze([priorFailure, Object.freeze({ carrier: "gdelt-doc-api", code: "carrier-unavailable" })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, gdeltDocRequests: 1, monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  }
  const raw = await networkResponse.text();
  if (!networkResponse.ok) return Object.freeze({ status: "refused", code: "all-discovery-carriers-unavailable", reason: `GDELT returned HTTP ${networkResponse.status} after ${priorFailure.code}`, retryable: networkResponse.status === 429 || networkResponse.status >= 500, carrierFailures: Object.freeze([...(Array.isArray(priorFailure.carrierFailures) ? priorFailure.carrierFailures : [priorFailure]), Object.freeze({ carrier: "gdelt-doc-api", code: `http-${networkResponse.status}` })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, gdeltDocRequests: 1, gdeltResponseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  let body;
  try { body = JSON.parse(raw); }
  catch { return Object.freeze({ status: "refused", code: "all-discovery-carriers-unavailable", reason: `GDELT returned unparseable JSON after ${priorFailure.code}`, retryable: true, carrierFailures: Object.freeze([priorFailure, Object.freeze({ carrier: "gdelt-doc-api", code: "unparseable-response", httpStatus: networkResponse.status })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, gdeltDocRequests: 1, gdeltResponseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) }); }
  const excluded = new Set(inspected.excludedUrls);
  const seenUrls = new Set();
  const seenDomains = new Set();
  const candidates = [];
  for (const article of Array.isArray(body?.articles) ? body.articles : []) {
    const value = normalizedHttpUrl(object(article)?.url);
    if (value === undefined) continue;
    let normalized;
    try { normalized = normalizePublicUrl(value); } catch { continue; }
    if (excluded.has(normalized) || seenUrls.has(normalized)) continue;
    const domain = new URL(normalized).hostname.toLowerCase().replace(/^www\./u, "");
    if (seenDomains.has(domain)) continue;
    const title = boundedString(object(article)?.title, 1_000);
    if (!admissibleDiscoveryCandidate(normalized, title)) continue;
    seenUrls.add(normalized); seenDomains.add(domain);
    candidates.push(Object.freeze({
      type: "PublicSourceDiscoveryCandidate",
      rank: candidates.length + 1,
      url: normalized,
      ...(title === undefined ? {} : { title }),
      custody: "gdelt-doc-api-article-list",
      indexSeenAt: boundedString(object(article)?.seendate, 100) ?? null,
      admission: "candidate-only-requires-independent-retrieval-and-editorial-admission",
    }));
    if (candidates.length >= inspected.maximumCandidates) break;
  }
  if (candidates.length === 0) return Object.freeze({ status: "refused", code: "no-public-source-candidates", reason: `GDELT returned no bounded distinct-domain candidates after ${priorFailure.code}`, retryable: false, carrierFailures: Object.freeze([priorFailure, Object.freeze({ carrier: "gdelt-doc-api", code: "empty-article-list" })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, gdeltDocRequests: 1, gdeltResponseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  const resultCore = Object.freeze({
    type: "PublicSourceDiscoveryDelivery",
    purpose: "journalistic-source-discovery",
    lead: inspected.lead,
    candidates: Object.freeze(candidates),
    searchQueries: Object.freeze([query]),
    carrier: "gdelt-doc-api",
    model: "deterministic-gdelt-doc-api",
    providerResponseDigest: digest(raw),
    fallbackFrom: priorFailure.code,
    factualWarrant: false,
    customerTerritoryMutation: false,
    discoveredAt: instant,
    resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, gdeltDocRequests: 1, gdeltResponseBytes: Buffer.byteLength(raw), candidateCount: candidates.length, monetaryPrice: Object.freeze({ status: "not-observed" }) }),
  });
  return Object.freeze({ status: "settled", ...resultCore, deliveryDigest: digest(resultCore) });
}

function groqSearchPrompt(inspected) {
  return [
    "Use Web Search up to three times to find independent public-Web reporting or primary public records that establish the SAME CONCRETE EVENT as this journalistic lead.",
    "Use complementary searches when needed: (1) named entities plus the reported action or change, (2) the originating organization, production, filing, announcement, or public record, and (3) independent reporting or corroboration. Stop early once enough distinct useful publishers are found.",
    "Reject generic topical context, old stories sharing one entity, profiles, forums, copied syndication presented as corroboration, and merely related news.",
    "Prefer recent original reporting, official records, and distinct publishers. Exclude the lead itself.",
    "Do not use code execution or visit-website. Your prose is not evidence: the caller will read candidate URLs only from the provider-authored executed_tools search results.",
    `LEAD TITLE: ${inspected.lead.title}`,
    ...(inspected.lead.url === undefined ? [] : [`LEAD URL: ${inspected.lead.url}`]),
    ...(inspected.lead.published === undefined ? [] : [`LEAD PUBLISHED: ${inspected.lead.published}`]),
    ...(inspected.lead.summary === undefined ? [] : [`LEAD SUMMARY: ${inspected.lead.summary}`]),
    ...(inspected.queryHints.length === 0 ? [] : [`YOUR WEB-SEARCH QUERY MUST BE BASED ON: ${inspected.queryHints[0]}`, `SECONDARY QUERY HINTS: ${inspected.queryHints.slice(1).join("; ")}`]),
    `SEEK NO MORE THAN ${inspected.maximumCandidates} DISTINCT USEFUL SOURCES.`,
  ].join("\n");
}

function groqExecutedSearchResults(providerBody) {
  const results = [];
  let toolCalls = 0;
  for (const choice of Array.isArray(providerBody?.choices) ? providerBody.choices : []) {
    const tools = object(choice?.message)?.executed_tools;
    for (const tool of Array.isArray(tools) ? tools : []) {
      const searchResults = object(object(tool)?.search_results);
      const values = Array.isArray(searchResults?.results) ? searchResults.results
        : Array.isArray(object(tool)?.search_results) ? object(tool).search_results
          : [];
      if (values.length > 0) toolCalls += 1;
      results.push(...values);
    }
  }
  return Object.freeze({ results: Object.freeze(results), toolCalls });
}

async function discoverWithGroq(inspected, instant, io, priorFailure) {
  const apiKey = io.groqApiKey ?? providerCredential("API_KEY_GROQ");
  if (typeof apiKey !== "string" || apiKey.trim() === "") return Object.freeze({ status: "refused", carrier: "groq-compound-web-search", code: "provider-credential-unavailable", reason: `Groq Compound search has no service credential after ${priorFailure.code}`, retryable: true, carrierFailures: Object.freeze([...(Array.isArray(priorFailure.carrierFailures) ? priorFailure.carrierFailures : [priorFailure]), Object.freeze({ carrier: "groq-compound-web-search", code: "provider-credential-unavailable" })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, groqCompoundRequests: 0, monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  const model = io.groqModel ?? process.env["WEB_SOURCE_DISCOVERY_GROQ_MODEL"] ?? "groq/compound";
  const compoundVersion = "2025-07-23";
  const prompt = groqSearchPrompt(inspected);
  const excludedDomains = [...new Set(inspected.excludedUrls.map((value) => new URL(value).hostname.toLowerCase().replace(/^www\./u, "")))].slice(0, 12);
  const fetchImpl = io.groqFetchImpl ?? fetch;
  let networkResponse;
  try {
    networkResponse = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "groq-model-version": compoundVersion },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], compound_custom: { tools: { enabled_tools: ["web_search"] } }, ...(excludedDomains.length === 0 ? {} : { search_settings: { exclude_domains: excludedDomains } }) }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    return Object.freeze({ status: "refused", carrier: "groq-compound-web-search", code: "discovery-carrier-unavailable", reason: `Groq Compound search failed after ${priorFailure.code}: ${error instanceof Error ? error.message : String(error)}`, retryable: true, carrierFailures: Object.freeze([...(Array.isArray(priorFailure.carrierFailures) ? priorFailure.carrierFailures : [priorFailure]), Object.freeze({ carrier: "groq-compound-web-search", code: "carrier-unavailable" })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, groqCompoundRequests: 1, monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  }
  const raw = await networkResponse.text();
  if (!networkResponse.ok) return Object.freeze({ status: "refused", carrier: "groq-compound-web-search", code: `discovery-provider-http-${networkResponse.status}`, reason: `Groq Compound search returned HTTP ${networkResponse.status} after ${priorFailure.code}`, retryable: networkResponse.status === 429 || networkResponse.status >= 500, carrierFailures: Object.freeze([...(Array.isArray(priorFailure.carrierFailures) ? priorFailure.carrierFailures : [priorFailure]), Object.freeze({ carrier: "groq-compound-web-search", code: `http-${networkResponse.status}` })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, groqCompoundRequests: 1, groqResponseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  let body;
  try { body = JSON.parse(raw); }
  catch { return Object.freeze({ status: "refused", carrier: "groq-compound-web-search", code: "unparseable-provider-response", reason: `Groq Compound search returned unparseable JSON after ${priorFailure.code}`, retryable: true, carrierFailures: Object.freeze([...(Array.isArray(priorFailure.carrierFailures) ? priorFailure.carrierFailures : [priorFailure]), Object.freeze({ carrier: "groq-compound-web-search", code: "unparseable-response" })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, groqCompoundRequests: 1, groqResponseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) }); }
  const executed = groqExecutedSearchResults(body);
  const excluded = new Set(inspected.excludedUrls);
  const seenUrls = new Set();
  const seenDomains = new Set();
  const candidates = [];
  for (const result of executed.results) {
    const value = normalizedHttpUrl(object(result)?.url);
    if (value === undefined) continue;
    let normalized;
    try { normalized = normalizePublicUrl(value); } catch { continue; }
    if (excluded.has(normalized) || seenUrls.has(normalized)) continue;
    const domain = new URL(normalized).hostname.toLowerCase().replace(/^www\./u, "");
    if (seenDomains.has(domain)) continue;
    const title = boundedString(object(result)?.title, 1_000);
    if (!admissibleDiscoveryCandidate(normalized, title)) continue;
    seenUrls.add(normalized); seenDomains.add(domain);
    candidates.push(Object.freeze({
      type: "PublicSourceDiscoveryCandidate",
      rank: candidates.length + 1,
      url: normalized,
      ...(title === undefined ? {} : { title }),
      custody: "groq-executed-tool-search-result",
      admission: "candidate-only-requires-independent-retrieval-and-editorial-admission",
    }));
    if (candidates.length >= inspected.maximumCandidates) break;
  }
  const usage = object(body?.usage);
  if (candidates.length === 0) return Object.freeze({ status: "refused", carrier: "groq-compound-web-search", code: "no-public-source-candidates", reason: `Groq Compound executed-tool results carried no bounded distinct-domain candidates after ${priorFailure.code}`, retryable: false, carrierFailures: Object.freeze([...(Array.isArray(priorFailure.carrierFailures) ? priorFailure.carrierFailures : [priorFailure]), Object.freeze({ carrier: "groq-compound-web-search", code: "empty-executed-tool-results" })]), resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, groqCompoundRequests: 1, groqWebSearchCalls: executed.toolCalls, groqResponseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  const resultCore = Object.freeze({
    type: "PublicSourceDiscoveryDelivery",
    purpose: "journalistic-source-discovery",
    lead: inspected.lead,
    candidates: Object.freeze(candidates),
    searchQueries: Object.freeze([gdeltQuery(inspected)]),
    carrier: "groq-compound-web-search",
    model,
    providerResponseDigest: digest(raw),
    fallbackFrom: priorFailure.code,
    factualWarrant: false,
    customerTerritoryMutation: false,
    discoveredAt: instant,
    resourceAccount: Object.freeze({ priorCarrier: priorFailure.resourceAccount ?? null, groqCompoundRequests: 1, groqWebSearchCalls: executed.toolCalls, compoundVersion, groqResponseBytes: Buffer.byteLength(raw), promptCharacters: prompt.length, candidateCount: candidates.length, promptTokens: Number(usage?.prompt_tokens ?? 0), completionTokens: Number(usage?.completion_tokens ?? 0), monetaryPrice: Object.freeze({ status: "not-observed" }) }),
  });
  return Object.freeze({ status: "settled", ...resultCore, deliveryDigest: digest(resultCore) });
}

export async function discoverPublicSources(demand, instant = new Date().toISOString(), io = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const inspected = inspectDemand(demand);
  if (inspected.error) return Object.freeze({ status: "refused", ...inspected.error });
  const gdeltFallback = async (failure) => io.gdeltEnabled === false ? Object.freeze(failure) : discoverWithGdelt(inspected, instant, io, Object.freeze(failure));
  const fallback = async (failure) => {
    if (io.groqEnabled === false) return gdeltFallback(failure);
    const groq = await discoverWithGroq(inspected, instant, io, Object.freeze(failure));
    return groq.status === "settled" || io.gdeltEnabled === false ? groq : gdeltFallback(groq);
  };
  const apiKey = io.apiKey ?? providerCredential("API_KEY_GOOGLE_GEMINI");
  if (typeof apiKey !== "string" || apiKey.trim() === "") return fallback({ status: "refused", carrier: "google-search-grounding", code: "provider-credential-unavailable", reason: "the discovery provider has no Google Gemini service credential", retryable: true, resourceAccount: Object.freeze({ groundedSearchRequests: 0, monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  const model = io.model ?? process.env["WEB_SOURCE_DISCOVERY_MODEL"] ?? DEFAULT_DISCOVERY_MODEL;
  const prompt = discoveryPrompt(inspected);
  const fetchImpl = io.fetchImpl ?? fetch;
  let networkResponse;
  try {
    networkResponse = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.1, maxOutputTokens: 1_200 } }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    return fallback({ status: "refused", carrier: "google-search-grounding", code: "discovery-carrier-unavailable", reason: error instanceof Error ? error.message : String(error), retryable: true, resourceAccount: Object.freeze({ groundedSearchRequests: 1, monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  }
  const raw = await networkResponse.text();
  let providerBody;
  try { providerBody = JSON.parse(raw); }
  catch { return fallback({ status: "refused", carrier: "google-search-grounding", code: "unparseable-provider-response", reason: "the discovery carrier returned no parseable response", retryable: true, resourceAccount: Object.freeze({ groundedSearchRequests: 1, responseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) }); }
  if (!networkResponse.ok) {
    const retryAfter = networkResponse.headers.get("retry-after");
    return fallback({
      status: "refused",
      carrier: "google-search-grounding",
      code: `discovery-provider-http-${networkResponse.status}`,
      reason: boundedString(object(providerBody?.error)?.message, 1_000) ?? `discovery provider returned HTTP ${networkResponse.status}`,
      retryable: networkResponse.status === 429 || networkResponse.status >= 500,
      ...(retryAfter === null ? {} : { retryAfter }),
      resourceAccount: Object.freeze({ groundedSearchRequests: 1, responseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }),
    });
  }
  const candidate = Array.isArray(providerBody?.candidates) ? providerBody.candidates[0] : undefined;
  const grounded = await groundedCandidates(candidate, inspected, io);
  if (grounded.candidates.length === 0) return fallback({ status: "refused", carrier: "google-search-grounding", code: "no-grounded-source-candidates", reason: "Google Search grounding returned no bounded candidate URLs", retryable: false, responseDigest: digest(raw), resourceAccount: Object.freeze({ groundedSearchRequests: 1, responseBytes: Buffer.byteLength(raw), monetaryPrice: Object.freeze({ status: "not-observed" }) }) });
  const note = modelText(candidate);
  const resultCore = Object.freeze({
    type: "PublicSourceDiscoveryDelivery",
    purpose: "journalistic-source-discovery",
    lead: inspected.lead,
    candidates: grounded.candidates,
    searchQueries: grounded.searchQueries,
    carrier: "google-search-grounding",
    model,
    providerResponseDigest: digest(raw),
    ...(note === "" ? {} : { researchNoteDigest: digest(note) }),
    factualWarrant: false,
    customerTerritoryMutation: false,
    discoveredAt: instant,
    resourceAccount: Object.freeze({ groundedSearchRequests: 1, citationResolutionRequests: grounded.citationResolutionRequests, responseBytes: Buffer.byteLength(raw), promptCharacters: prompt.length, candidateCount: grounded.candidates.length, monetaryPrice: Object.freeze({ status: "not-observed" }) }),
  });
  return Object.freeze({ status: "settled", ...resultCore, deliveryDigest: digest(resultCore) });
}

export async function solicitPublicSourceDiscovery(activity, instant = new Date().toISOString(), io = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Offer" || activity?.target !== ACTOR || object(activity?.object)?.type !== "ServiceSolicitation") return response(activity, instant, "Reject", "invalid-solicitation", "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider");
  const found = demandFrom(activity);
  if (found === undefined) return response(activity, instant, "Reject", "invalid-demand", "solicitation carries no public-source discovery demand");
  const inspected = inspectDemand(found.demand);
  if (inspected.error) return response(activity, instant, "Reject", inspected.error.code, inspected.error.reason);
  const demandDigest = digest(found.demand);
  const offer = Object.freeze({
    "@context": CONTEXT,
    id: digest({ type: "PublicSourceDiscoveryOfferIdentity", provider: ACTOR, demandDigest }),
    type: "Offer",
    actor: ACTOR,
    target: activity.actor,
    published: instant,
    object: Object.freeze({ type: "ServiceOffer", service: "public-source-discovery", demandDigest, sourceActivity: found.source, capability: Object.freeze({ type: "AttenuatedCapability", effect: "discover-grounded-public-source-candidates", demandDigest }), consideration: Object.freeze({ amount: 1, unit: "bounded-public-source-discovery-attempt", carrierCeilings: Object.freeze({ googleGroundedSearchRequests: 1, groqCompoundRequests: 1, gdeltDocRequests: 1 }), monetaryClaim: false }) }),
  });
  await record(instant, { kind: "provider.offer", service: "public-source-discovery", offerId: offer.id, demandDigest }, io.witnessJournalOptions);
  return offer;
}

export async function invokePublicSourceDiscovery(activity, instant = new Date().toISOString(), io = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const contract = object(activity?.object);
  const offer = object(contract?.offer);
  const offerObject = object(offer?.object);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Accept" || activity?.target !== ACTOR || contract?.type !== "ServiceContract" || offer?.actor !== ACTOR || offerObject?.service !== "public-source-discovery") return response(activity, instant, "Reject", "invalid-invocation", "invocation must accept this provider's exact public-source-discovery offer");
  const source = object(offerObject.sourceActivity);
  const demand = object(source?.object);
  if (demand === undefined || digest(demand) !== offerObject.demandDigest || object(offerObject.capability)?.demandDigest !== offerObject.demandDigest) return response(activity, instant, "Reject", "changed-demand", "offer demand or capability digest changed");
  const result = await discoverPublicSources(demand, instant, io);
  if (result.status === "refused") {
    const refused = response(activity, instant, "Reject", result.code, result.reason, result);
    await record(instant, { kind: "provider.refusal", service: "public-source-discovery", demandDigest: offerObject.demandDigest, code: result.code, retryable: result.retryable ?? false, resourceAccount: result.resourceAccount ?? null }, io.witnessJournalOptions);
    return refused;
  }
  const providerExchange = Object.freeze({ exchangeId: digest({ type: "PublicSourceDiscoveryExchangeIdentity", offer: offer.id, instant }), provider: "web-source-acquisition", service: "public-source-discovery", consideration: offerObject.consideration, demandDigest: offerObject.demandDigest, deliveryDigest: result.deliveryDigest, candidateCount: result.candidates.length, resourceAccount: result.resourceAccount, recordedAt: instant });
  const delivery = Object.freeze({ ...result, providerExchange });
  const accepted = response(activity, instant, "Accept", "source-discovery-settled", `discovered ${result.candidates.length} grounded public-source candidates`, delivery);
  await record(instant, { kind: "provider.delivery", ...providerExchange }, io.witnessJournalOptions);
  return accepted;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const instant = process.argv[3] ?? new Date().toISOString();
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const activity = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result = ["solicit-service", "solicit-source-discovery"].includes(command)
    ? await solicitPublicSourceDiscovery(activity, instant)
    : ["invoke-service", "invoke-source-discovery"].includes(command)
      ? await invokePublicSourceDiscovery(activity, instant)
      : response(activity, instant, "Reject", "unknown-command", `unknown command: ${command}`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
