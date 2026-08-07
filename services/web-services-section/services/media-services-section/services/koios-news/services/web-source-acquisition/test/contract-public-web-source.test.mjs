import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { querySettlementRecords } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { startWitnessJournalProviderProcess } from "@lenticule-science/witness-journal-rdf-projection-service/test-provider";
import { createEphemeralWitnessJournalNetworkOptions } from "../src/witness-journal-network.mjs";

import {
  ACTOR,
  CONTRACT,
  CONTEXT,
  acquirePublicWebSources,
  extractArticleText,
  invokePublicWebSources,
  solicitPublicWebSources,
} from "../src/contract-public-web-source.mjs";

const NOW = "2026-07-19T20:00:00.000Z";
const CUSTOMER = "https://publication.test/activitypub/actor";
let witnessJournal; const dataRoot = mkdtempSync(join(tmpdir(), "web-source-acquisition-test-"));
process.env["WEB_SOURCE_ACQUISITION_DATA_ROOT"] = dataRoot;
test.before(async () => { witnessJournal = await startWitnessJournalProviderProcess(); process.env.WITNESS_JOURNAL_RDF_AGENT = witnessJournal.agentCardUrl; });
test.after(async () => { await witnessJournal.close(); rmSync(dataRoot, { recursive: true, force: true }); });

function demand(urls = ["https://news.example/story"]) {
  return { type: "PublicWebSourceAcquisitionDemand", purpose: "journalistic-source-research", urls, ceilings: { maximumSources: 6, maximumBytesPerSource: 100_000, maximumTextCharacters: 20_000 } };
}

function solicitation(value = demand()) {
  const sourceActivity = { "@context": CONTEXT, type: "Create", actor: CUSTOMER, object: value };
  return { "@context": CONTEXT, type: "Offer", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
}

const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];

test("extracts a publisher's structured article body without model summarization", () => {
  const html = `<!doctype html><html><head><title>Fallback title</title><script type="application/ld+json">{"@type":"NewsArticle","headline":"The exact headline","datePublished":"2026-07-19T18:00:00Z","articleBody":"First witnessed paragraph. Second witnessed paragraph with concrete reporting detail."}</script></head><body><nav>noise</nav><article>short fallback</article></body></html>`;
  const extracted = extractArticleText(html);
  assert.equal(extracted.title, "The exact headline");
  assert.equal(extracted.published, "2026-07-19T18:00:00Z");
  assert.match(extracted.text, /Second witnessed paragraph/);
  assert.doesNotMatch(extracted.text, /noise/);
});

test("settles bounded public article text with byte and text custody", async () => {
  const article = `<html><head><meta property="og:title" content="A public report"></head><body><article><h1>A public report</h1><p>${"Reported detail with attribution and context. ".repeat(20)}</p></article></body></html>`;
  const result = await acquirePublicWebSources(demand(), NOW, { dnsLookup: publicDns, fetchImpl: async () => new Response(article, { status: 200, headers: { "content-type": "text/html" } }) });
  assert.equal(result.status, "settled");
  assert.equal(result.results.length, 1);
  assert.equal(result.obstructions.length, 0);
  assert.equal(result.results[0].requestedUrl, "https://news.example/story");
  assert.match(result.results[0].textDigest, /^ni:\/\/\/sha-256;/u);
  assert.match(result.results[0].responseDigest, /^ni:\/\/\/sha-256;/u);
  assert.equal(result.customerTerritoryMutation, false);
});

test("refuses private-network source names before any fetch", async () => {
  let fetched = false;
  const result = await acquirePublicWebSources(demand(["http://127.0.0.1/private"]), NOW, { fetchImpl: async () => { fetched = true; return new Response("never"); } });
  assert.equal(result.status, "refused");
  assert.equal(result.code, "non-public-source");
  assert.equal(fetched, false);
});

test("returns one obstruction without erasing successfully acquired siblings", async () => {
  const result = await acquirePublicWebSources(demand(["https://one.example/report", "https://two.example/report"]), NOW, {
    dnsLookup: publicDns,
    fetchImpl: async (url) => String(url).includes("one.example")
      ? new Response(`<article>${"Substantive public reporting. ".repeat(20)}</article>`, { status: 200, headers: { "content-type": "text/html" } })
      : new Response("unavailable", { status: 503, headers: { "content-type": "text/plain" } }),
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.obstructions.length, 1);
  assert.equal(result.obstructions[0].requestedUrl, "https://two.example/report");
  assert.equal(result.resourceAccount.networkRequests, 2);
});

test("solicitation and invocation bind the exact customer demand", async () => {
  const witnessJournalOptions = createEphemeralWitnessJournalNetworkOptions();
  const offered = await solicitPublicWebSources(solicitation(), NOW, { witnessJournalOptions });
  assert.equal(offered.type, "Offer");
  const invocation = { "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceContract", offer: offered } };
  const response = await invokePublicWebSources(invocation, "2026-07-19T20:00:01.000Z", { dnsLookup: publicDns, fetchImpl: async () => new Response(`<article>${"Exact public source sentence. ".repeat(20)}</article>`, { status: 200, headers: { "content-type": "text/html" } }), witnessJournalOptions });
  assert.equal(response.type, "Accept");
  assert.equal(response.object.type, "PublicWebSourceDelivery");
  assert.equal(response.object.providerExchange.price.amount, 0);
  assert.equal((await querySettlementRecords(`${CONTRACT}.events`, witnessJournalOptions)).length, 2);
  offered.object.sourceActivity.object.urls.push("https://changed.example/");
  const changed = await invokePublicWebSources(invocation, "2026-07-19T20:00:02.000Z", { dnsLookup: publicDns, fetchImpl: async () => new Response("never") });
  assert.equal(changed.type, "Reject");
  assert.equal(changed.code, "changed-demand");
});
