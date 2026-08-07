import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { querySettlementRecords } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { startWitnessJournalProviderProcess } from "@lenticule-science/witness-journal-rdf-projection-service/test-provider";

import { ACTOR, CONTEXT } from "../src/contract-public-web-source.mjs";
import {
  DISCOVERY_CONTRACT,
  discoverPublicSources,
  invokePublicSourceDiscovery,
  solicitPublicSourceDiscovery,
} from "../src/contract-public-source-discovery.mjs";
import { createEphemeralWitnessJournalNetworkOptions } from "../src/witness-journal-network.mjs";

const NOW = "2026-07-19T21:00:00.000Z";
const CUSTOMER = "urn:micro-enterprise:koios.news:journalism-commissioning";
let witnessJournal; const dataRoot = mkdtempSync(join(tmpdir(), "web-source-discovery-test-"));
process.env["WEB_SOURCE_ACQUISITION_DATA_ROOT"] = dataRoot;
test.before(async () => { witnessJournal = await startWitnessJournalProviderProcess(); process.env.WITNESS_JOURNAL_RDF_AGENT = witnessJournal.agentCardUrl; });
test.after(async () => { await witnessJournal.close(); rmSync(dataRoot, { recursive: true, force: true }); });

function demand() {
  return {
    type: "PublicSourceDiscoveryDemand",
    purpose: "journalistic-source-discovery",
    lead: {
      title: "A reported event needing independent corroboration",
      url: "https://lead.example/report",
      published: "2026-07-19T18:00:00Z",
      summary: "The lead reports a concrete event and names several parties.",
    },
    queryHints: ["named parties public records"],
    excludedUrls: [],
    ceilings: { maximumCandidates: 3 },
  };
}

function solicitation(value = demand()) {
  const sourceActivity = { "@context": CONTEXT, type: "Create", actor: CUSTOMER, object: value };
  return { "@context": CONTEXT, type: "Offer", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
}

function groundedResponse(firstCandidate = "https://primary.example/public-record") {
  return new Response(JSON.stringify({
    modelVersion: "gemini-3.1-flash-lite",
    candidates: [{
      content: { parts: [{ text: "A prose note mentions https://hallucinated.example/not-grounding and must not be parsed." }] },
      groundingMetadata: {
        webSearchQueries: ["reported event named parties records"],
        groundingChunks: [
          { web: { uri: "https://lead.example/report", title: "The excluded lead" } },
          { web: { uri: firstCandidate, title: "Primary public record" } },
          { web: { uri: "https://reporter.example/corroboration", title: "Independent reporting" } },
          { web: { uri: "https://primary.example/public-record", title: "Duplicate record" } },
        ],
      },
    }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function groqSearchResponse() {
  return new Response(JSON.stringify({
    model: "groq/compound-mini",
    choices: [{
      message: {
        content: "Model prose may mention https://hallucinated.example/not-a-tool-result and must not be parsed.",
        executed_tools: [{
          type: "search",
          search_results: {
            results: [
              { url: "https://lead.example/report", title: "Excluded lead", score: 0.99 },
              { url: "https://www.whitepages.com/name/Victor-Munoz/CA", title: "Victor Munoz in CA - Address & Phone Number", score: 0.95 },
              { url: "https://records.example/public-record", title: "Primary record", score: 0.91 },
              { url: "https://reporter.example/corroboration", title: "Independent reporting", score: 0.86 },
              { url: "https://reporter.example/duplicate-domain", title: "Same outlet", score: 0.71 },
            ],
          },
        }],
      },
    }],
    usage: { prompt_tokens: 300, completion_tokens: 80 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("constructs source candidates only from provider grounding metadata", async () => {
  const result = await discoverPublicSources(demand(), NOW, { apiKey: "test-key", fetchImpl: async () => groundedResponse() });
  assert.equal(result.status, "settled");
  assert.deepEqual(result.candidates.map((candidate) => candidate.url), [
    "https://primary.example/public-record",
    "https://reporter.example/corroboration",
  ]);
  assert.equal(result.candidates.some((candidate) => candidate.url.includes("hallucinated")), false);
  assert.equal(result.factualWarrant, false);
  assert.equal(result.customerTerritoryMutation, false);
  assert.equal(result.resourceAccount.groundedSearchRequests, 1);
  assert.match(result.providerResponseDigest, /^ni:\/\/\/sha-256;/u);
  assert.match(result.researchNoteDigest, /^ni:\/\/\/sha-256;/u);
});

test("resolves a Google grounding redirect before source independence is evaluated", async () => {
  const groundingUrl = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/example-token";
  const result = await discoverPublicSources(demand(), NOW, {
    apiKey: "test-key",
    fetchImpl: async () => groundedResponse(groundingUrl),
    dnsLookup: async () => [{ address: "142.250.190.14", family: 4 }],
    citationFetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://primary.example/public-record" } }),
  });
  assert.equal(result.status, "settled");
  assert.equal(result.candidates[0].url, "https://primary.example/public-record");
  assert.equal(result.candidates[0].groundingUrl, groundingUrl);
  assert.equal(result.resourceAccount.citationResolutionRequests, 1);
});

test("quota exhaustion is a retryable, metered service refusal", async () => {
  const result = await discoverPublicSources(demand(), NOW, {
    apiKey: "test-key",
    groqEnabled: false,
    gdeltEnabled: false,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "quota exhausted" } }), { status: 429, headers: { "retry-after": "60" } }),
  });
  assert.equal(result.status, "refused");
  assert.equal(result.code, "discovery-provider-http-429");
  assert.equal(result.retryable, true);
  assert.equal(result.retryAfter, "60");
  assert.equal(result.resourceAccount.groundedSearchRequests, 1);
  assert.deepEqual(result.resourceAccount.monetaryPrice, { status: "not-observed" });
});

test("a metered grounding obstruction routes to the keyless GDELT news index", async () => {
  const result = await discoverPublicSources(demand(), NOW, {
    apiKey: "test-key",
    groqEnabled: false,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "quota exhausted" } }), { status: 429 }),
    gdeltFetchImpl: async (url) => {
      assert.equal(new URL(url).hostname, "api.gdeltproject.org");
      return new Response(JSON.stringify({ articles: [
        { url: "https://reporter.example/corroboration", title: "Independent corroboration", seendate: "20260719T204500Z" },
        { url: "https://reporter.example/second", title: "Same outlet duplicate", seendate: "20260719T204600Z" },
        { url: "https://records.example/public-record", title: "Primary public record", seendate: "20260719T204700Z" },
      ] }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(result.status, "settled");
  assert.equal(result.carrier, "gdelt-doc-api");
  assert.equal(result.fallbackFrom, "discovery-provider-http-429");
  assert.deepEqual(result.candidates.map((candidate) => candidate.url), ["https://reporter.example/corroboration", "https://records.example/public-record"]);
  assert.ok(result.candidates.every((candidate) => candidate.type === "PublicSourceDiscoveryCandidate" && candidate.custody === "gdelt-doc-api-article-list"));
  assert.equal(result.resourceAccount.priorCarrier.groundedSearchRequests, 1);
  assert.equal(result.resourceAccount.gdeltDocRequests, 1);
  assert.equal(result.factualWarrant, false);
});

test("a grounding obstruction can use Groq's provider-executed Web Search without parsing model prose", async () => {
  let gdeltCalled = false;
  const result = await discoverPublicSources(demand(), NOW, {
    apiKey: "test-key",
    groqApiKey: "groq-test-key",
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "quota exhausted" } }), { status: 429 }),
    groqFetchImpl: async (url, init) => {
      assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
      assert.match(String(init.headers.authorization), /^Bearer /u);
      assert.equal(init.headers["groq-model-version"], "2025-07-23");
      const request = JSON.parse(init.body);
      assert.equal(request.model, "groq/compound");
      assert.deepEqual(request.compound_custom.tools.enabled_tools, ["web_search"]);
      assert.deepEqual(request.search_settings.exclude_domains, ["lead.example"]);
      assert.match(request.messages[0].content, /provider-authored executed_tools search results/u);
      assert.match(request.messages[0].content, /up to three times/u);
      assert.match(request.messages[0].content, /originating organization, production, filing, announcement, or public record/u);
      return groqSearchResponse();
    },
    gdeltFetchImpl: async () => { gdeltCalled = true; throw new Error("GDELT must not run after a settled Groq delivery"); },
  });
  assert.equal(result.status, "settled");
  assert.equal(result.carrier, "groq-compound-web-search");
  assert.equal(result.fallbackFrom, "discovery-provider-http-429");
  assert.deepEqual(result.candidates.map((candidate) => candidate.url), ["https://records.example/public-record", "https://reporter.example/corroboration"]);
  assert.ok(result.candidates.every((candidate) => candidate.custody === "groq-executed-tool-search-result"));
  assert.equal(result.candidates.some((candidate) => candidate.url.includes("hallucinated")), false);
  assert.equal(result.resourceAccount.groqCompoundRequests, 1);
  assert.equal(result.resourceAccount.groqWebSearchCalls, 1);
  assert.equal(result.factualWarrant, false);
  assert.equal(gdeltCalled, false);
});

test("GDELT HTTP refusals are classified before its non-JSON body is parsed", async () => {
  const result = await discoverPublicSources(demand(), NOW, {
    apiKey: "test-key",
    groqEnabled: false,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "quota exhausted" } }), { status: 429 }),
    gdeltFetchImpl: async () => new Response("Please limit requests to one every 5 seconds.", { status: 429 }),
  });
  assert.equal(result.status, "refused");
  assert.equal(result.code, "all-discovery-carriers-unavailable");
  assert.match(result.reason, /GDELT returned HTTP 429/u);
  assert.equal(result.carrierFailures.at(-1).code, "http-429");
});

test("solicitation and invocation bind the exact discovery purchase", async () => {
  const witnessJournalOptions = createEphemeralWitnessJournalNetworkOptions();
  const request = solicitation();
  const offered = await solicitPublicSourceDiscovery(request, NOW, { witnessJournalOptions });
  assert.equal(offered.type, "Offer");
  assert.equal(offered.object.service, "public-source-discovery");
  assert.equal(offered.object.consideration.unit, "bounded-public-source-discovery-attempt");
  const invocation = { "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceContract", offer: offered } };
  const accepted = await invokePublicSourceDiscovery(invocation, "2026-07-19T21:00:01.000Z", { apiKey: "test-key", fetchImpl: async () => groundedResponse(), witnessJournalOptions });
  assert.equal(accepted.type, "Accept");
  assert.equal(accepted.object.type, "PublicSourceDiscoveryDelivery");
  assert.equal(accepted.object.providerExchange.service, "public-source-discovery");
  assert.equal(accepted.object.providerExchange.candidateCount, 2);
  assert.equal((await querySettlementRecords(`${DISCOVERY_CONTRACT}.events`, witnessJournalOptions)).length, 2);

  offered.object.sourceActivity.object.lead.title = "changed after offer";
  const changed = await invokePublicSourceDiscovery(invocation, "2026-07-19T21:00:02.000Z", { apiKey: "test-key", fetchImpl: async () => groundedResponse() });
  assert.equal(changed.type, "Reject");
  assert.equal(changed.code, "changed-demand");
});

test("refuses malformed and unbounded discovery demands before carrier use", async () => {
  let called = false;
  const invalid = demand();
  invalid.ceilings.maximumCandidates = 99;
  const result = await discoverPublicSources(invalid, NOW, { apiKey: "test-key", fetchImpl: async () => { called = true; return groundedResponse(); } });
  assert.equal(result.status, "refused");
  assert.equal(result.code, "invalid-candidate-ceiling");
  assert.equal(called, false);
});
