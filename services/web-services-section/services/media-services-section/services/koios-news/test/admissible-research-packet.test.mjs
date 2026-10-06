import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CORPUS_MANAGEMENT_ACTOR,
  formAdmissibleResearchPacket,
  invokeAdmissibleResearchPacket,
  NEWSCABLE_ACTOR,
  solicitAdmissibleResearchPacket,
  WEB_SOURCE_ACTOR,
} from "../src/contract-admissible-research-packet.mjs";
import { ACTOR, CONTEXT, digest } from "../src/contract-licensed-editorial-state.mjs";

const PUBLIC_WEB_SOURCE_OBJECT_KIND = "rsc-quiescent.record";
const NOW = "2026-07-18T18:00:00.000Z";
const CUSTOMER = "https://customer-publication.test/activitypub/actor";
const PRIMARY = "https://example.test/project-revival";
const SECONDARY = "https://example.net/project-revival-analysis";
process.env["KOIOS_NEWS_DATA_ROOT"] = mkdtempSync(join(tmpdir(), "koios-news-source-intelligence-test-"));

function publicWebTextDigest(value) {
  return digest(value, PUBLIC_WEB_SOURCE_OBJECT_KIND);
}

function bundle(subject, url, title, summary, published = "2026-07-18T12:00:00Z") {
  const value = {
    subject,
    claims: [
      { id: `${subject}:title`, proposition: { predicate: "title", object: title }, force: "reports", status: "supported", provenance: { citation: url }, time: { asserted: published } },
      { id: `${subject}:url`, proposition: { predicate: "url", object: url }, force: "reports", status: "supported", provenance: { citation: url }, time: { asserted: published } },
      { id: `${subject}:published`, proposition: { predicate: "published", object: published }, force: "reports", status: "supported", provenance: { citation: url }, time: { asserted: published } },
      { id: `${subject}:summary`, proposition: { predicate: "summary", object: summary }, force: "reports", status: "supported", provenance: { citation: url }, time: { asserted: published } },
    ],
  };
  return { wire: "technology", subject, digest: digest(value), bundle: value };
}

function currentEvidence(published = "2026-07-18T12:00:00Z") {
  const bundles = [
    bundle("project-revival", PRIMARY, "Example project revival begins", "The Example project revival began under new leadership and published a tested roadmap.", published),
    bundle("project-revival-analysis", SECONDARY, "Analysis of the Example project revival", "Independent maintainers analyzed the Example project revival and its public compatibility work.", published),
  ];
  return {
    "@context": CONTEXT,
    type: "Accept",
    actor: NEWSCABLE_ACTOR,
    target: CUSTOMER,
    published: NOW,
    object: {
      type: "SourceBundleDelivery",
      deliveryDigest: digest(bundles),
      bundles,
      results: [],
      providerExchange: { provider: "newscable-source-broker", service: "source-bundle-refresh", price: { amount: 0, currency: "USD" } },
    },
  };
}

function priorResearch() {
  const contextualBundle = {
    type: "ContextualBundle",
    terms: ["Example project revival"],
    sourceCount: 2,
    sources: [
      {
        path: "/territory/notes/prior-project-analysis.md",
        relativeToRoot: "notes/prior-project-analysis.md",
        digest: "sha256:prior-note",
        snippets: [{ line: 4, matchedTerms: ["revival"], text: "Prior research asks whether project custody is distributed or merely rebranded." }],
      },
      {
        path: "/definitely/not/readable/secret.txt",
        digest: "sha256:unreadable-source",
        snippets: [],
      },
    ],
  };
  const gapBundle = { type: "GapBundle", gapCount: 1, gaps: [{ type: "unmatched-term", term: "release date" }] };
  return {
    "@context": CONTEXT,
    type: "Accept",
    actor: CORPUS_MANAGEMENT_ACTOR,
    target: CUSTOMER,
    published: NOW,
    object: {
      id: "urn:sha256:prior-recovery",
      type: "PriorResearchProjectionResult",
      contextualBundle,
      contextualBundleDigest: digest(contextualBundle),
      gapBundle,
      gapBundleDigest: digest(gapBundle),
      filesystemReads: 0,
      customerTerritoryMutation: false,
    },
  };
}

function publicWebEvidence(text = `Full article text records names, dates, institutions, and attributed observations. ${"Further reporting detail remains source-bound and materially useful to a reporter. ".repeat(60)}`) {
  const results = [{
    type: "PublicWebSource",
    requestedUrl: PRIMARY,
    finalUrl: PRIMARY,
    contentType: "text/html",
    responseBytes: 8000,
    responseDigest: "sha256:response",
    text,
    textDigest: publicWebTextDigest(text),
    title: "Example project revival begins",
    published: "2026-07-18T12:00:00Z",
    rights: "public-access-observed; license-and-republication-rights-not-inferred",
    accessMethod: "unauthenticated-public-http",
    networkRequests: 1,
    acquiredAt: NOW,
  }];
  const obstructions = [];
  return {
    "@context": CONTEXT,
    type: "Accept",
    actor: WEB_SOURCE_ACTOR,
    target: CUSTOMER,
    published: NOW,
    object: {
      type: "PublicWebSourceDelivery",
      purpose: "journalistic-source-research",
      results,
      obstructions,
      deliveryDigest: digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND),
      customerTerritoryMutation: false,
      acquiredAt: NOW,
    },
  };
}

function publicWebCorroboration() {
  const text = `Independent reporting describes the Example project revival, its new leadership, and the published compatibility roadmap. ${"The report attributes concrete details to named maintainers and public records. ".repeat(40)}`;
  const results = [{
    type: "PublicWebSource",
    requestedUrl: SECONDARY,
    finalUrl: SECONDARY,
    contentType: "text/html",
    responseBytes: 9_000,
    responseDigest: "sha256:secondary-response",
    text,
    textDigest: publicWebTextDigest(text),
    title: "Independent reporting on the Example project revival",
    published: "2026-07-18T13:00:00Z",
    rights: "public-access-observed; license-and-republication-rights-not-inferred",
    accessMethod: "unauthenticated-public-http",
    networkRequests: 1,
    acquiredAt: NOW,
  }];
  const obstructions = [];
  return {
    "@context": CONTEXT,
    type: "Accept",
    actor: WEB_SOURCE_ACTOR,
    target: CUSTOMER,
    published: NOW,
    object: { type: "PublicWebSourceDelivery", purpose: "journalistic-source-research", results, obstructions, deliveryDigest: digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND), customerTerritoryMutation: false, acquiredAt: NOW },
  };
}

function demand(overrides = {}) {
  const { assignment: assignmentOverride = {}, evidenceBudget: evidenceBudgetOverride = {}, ...rest } = overrides;
  const baseAssignment = { assignmentId: "technology-example-revival", term: "Example project revival", beat: "technology", leadSourceUrl: PRIMARY };
  const baseEvidenceBudget = {
    minimumCurrentSources: 2,
    maximumCurrentSources: 4,
    minimumPrimarySources: 1,
    minimumIndependentDomains: 2,
    minimumDistinctAssertions: 2,
    minimumLeadAssertions: 1,
    targetMinimumWords: 100,
    maximumWordsPerAssertion: 50,
  };
  return {
    type: "AdmissibleResearchPacketDemand",
    assignment: { ...baseAssignment, ...assignmentOverride },
    sourcePolicyDigest: digest({ type: "SourcePolicy", version: 1 }),
    freshness: { maximumAgeHours: 48 },
    evidenceBudget: { ...baseEvidenceBudget, ...evidenceBudgetOverride },
    primarySourceUrls: [PRIMARY],
    currentEvidence: currentEvidence(),
    priorResearch: priorResearch(),
    ...rest,
  };
}

function solicitation(value = demand()) {
  const sourceActivity = { "@context": CONTEXT, type: "Create", actor: CUSTOMER, object: value };
  return { "@context": CONTEXT, type: "Offer", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
}

test("forms an admissible packet from independently contracted evidence without promoting prior notes to claims", () => {
  const result = formAdmissibleResearchPacket(demand(), NOW);
  assert.equal(result.status, "admitted");
  assert.equal(result.packet.selectedCount, 2);
  assert.equal(result.packet.intakeSources[0].url, PRIMARY);
  assert.ok(result.packet.claims.length >= 8);
  assert.ok(result.packet.claims.every((claim) => [PRIMARY, SECONDARY].includes(claim.sourceUrl)));
  assert.ok(result.packet.context.some((line) => line.includes("Prior research asks whether project custody")));
  assert.equal(result.packet.claims.some((claim) => claim.object.includes("project custody is distributed")), false);
  assert.equal(result.custody.priorResearch.treatment, "context-only");
  assert.equal(result.custody.customerTerritoryMutation, false);
});

test("does not require the customer to mislabel its lead article as a primary source", () => {
  const result = formAdmissibleResearchPacket(demand({
    evidenceBudget: { minimumCurrentSources: 2, maximumCurrentSources: 4, minimumPrimarySources: 0, minimumIndependentDomains: 2 },
    primarySourceUrls: [],
  }), NOW);
  assert.equal(result.status, "admitted");
  assert.equal(result.packet.intakeSources.every((source) => source.primary === false), true);
  assert.equal(result.packet.editorialRisks.some((risk) => risk.code === "primary-source-unproven"), true);
});

test("refuses before assignment when source prose cannot carry the commissioned assertion and word budget", () => {
  const result = formAdmissibleResearchPacket(demand({
    evidenceBudget: {
      minimumPrimarySources: 0,
      minimumDistinctAssertions: 9,
      minimumLeadAssertions: 6,
      targetMinimumWords: 600,
      maximumWordsPerAssertion: 70,
    },
    primarySourceUrls: [],
  }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "commission-evidence-budget-insufficient");
  assert.equal(result.diagnosis.failureLayer, "source-acquisition");
  assert.equal(result.diagnosis.requiredMove, "acquire-fuller-reporting-or-narrow-the-commissioned-genre");
  assert.equal(result.diagnosis.evidence.assertionCount, 2);
  assert.equal(result.diagnosis.evidence.leadAssertionCount, 1);
  assert.equal(result.diagnosis.evidence.licensedMaximumWords, 140);
});

test("refuses a source collection whose incidental words do not support the named event", () => {
  const evidence = currentEvidence();
  evidence.object.bundles = [
    bundle("eva-profile", PRIMARY, "Eva Longoria profile", "Eva Longoria discussed an unrelated project."),
    bundle("new-york-brief", SECONDARY, "New York City brief", "New York City officials discussed an unrelated appearance."),
  ];
  evidence.object.deliveryDigest = digest(evidence.object.bundles);
  const result = formAdmissibleResearchPacket(demand({
    assignment: { assignmentId: "culture-eva-longoria", term: "Eva Longoria appears in New York City", beat: "culture" },
    evidenceBudget: { minimumCurrentSources: 2, maximumCurrentSources: 4, minimumPrimarySources: 0, minimumIndependentDomains: 2 },
    primarySourceUrls: [],
    currentEvidence: evidence,
  }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "assignment-lens-unsupported");
  assert.equal(result.diagnosis.failureLayer, "source-acquisition");
});

test("preserves substantive current-source context for the writer", () => {
  const longReport = `The reported event includes concrete names, dates, institutions, and attributed observations. ${"Further witnessed detail remains material to the article. ".repeat(120)}`;
  const evidence = currentEvidence();
  evidence.object.bundles[0] = bundle("project-revival", PRIMARY, "Example project revival begins", longReport);
  evidence.object.deliveryDigest = digest(evidence.object.bundles);
  const result = formAdmissibleResearchPacket(demand({ currentEvidence: evidence }), NOW);
  assert.equal(result.status, "admitted");
  assert.equal(result.packet.intakeSources[0].summary, longReport.trim());
  assert.ok(result.packet.intakeSources[0].summary.length > 5_000);
  const summaryClaim = result.packet.claims.find((claim) => claim.sourceUrl === PRIMARY && claim.predicate === "summary");
  assert.equal(summaryClaim.object, longReport.trim());
});

test("uses separately acquired public article text when a syndication description is thin", () => {
  const web = publicWebEvidence();
  const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
  assert.equal(result.status, "admitted");
  assert.equal(result.packet.intakeSources[0].summary, web.object.results[0].text.trim());
  const summaryClaim = result.packet.claims.find((claim) => claim.sourceUrl === PRIMARY && claim.predicate === "summary");
  assert.equal(summaryClaim.object, web.object.results[0].text.trim().slice(0, 12_000));
  assert.equal(result.custody.publicWebEvidence.provider, WEB_SOURCE_ACTOR);
  assert.deepEqual(result.custody.publicWebEvidence.selectedTextDigests, [web.object.results[0].textDigest]);
});

test("admits a separately discovered and retrieved public source absent from Newscable", () => {
  const evidence = currentEvidence();
  evidence.object.bundles = [evidence.object.bundles[0]];
  evidence.object.deliveryDigest = digest(evidence.object.bundles);
  const web = publicWebCorroboration();
  const result = formAdmissibleResearchPacket(demand({ currentEvidence: evidence, publicWebEvidence: web }), NOW);
  assert.equal(result.status, "admitted");
  assert.deepEqual([...result.packet.sourceUrls].sort(), [PRIMARY, SECONDARY].sort());
  assert.equal(result.packet.intakeSources[1].path.startsWith("urn:public-web-source:"), true);
  assert.equal(result.packet.intakeSources[1].summary, web.object.results[0].text.trim());
  assert.equal(result.custody.currentEvidence.selectedBundleDigests.length, 1);
  assert.deepEqual(result.custody.publicWebEvidence.selectedTextDigests, [web.object.results[0].textDigest]);
});

test("a public-Web commission does not carry the whole unrelated Newscable corpus", () => {
  const web = publicWebEvidence();
  const corroboration = publicWebCorroboration();
  web.object.results.push(...corroboration.object.results);
  web.object.deliveryDigest = digest({ results: web.object.results, obstructions: web.object.obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND);
  const value = demand({
    evidenceBudget: { minimumCurrentSources: 2, maximumCurrentSources: 4, minimumPrimarySources: 0, minimumIndependentDomains: 2 },
    primarySourceUrls: [],
    publicWebEvidence: web,
  });
  delete value.currentEvidence;
  const result = formAdmissibleResearchPacket(value, NOW);
  assert.equal(result.status, "admitted");
  assert.deepEqual([...result.packet.sourceUrls].sort(), [PRIMARY, SECONDARY].sort());
  assert.equal(result.custody.currentEvidence, undefined);
  assert.equal(result.custody.publicWebEvidence.provider, WEB_SOURCE_ACTOR);
});

test("admits producer-domain public-Web commitments while retaining Koios-owned identities", () => {
  const web = publicWebEvidence();
  web.object.results.push(...publicWebCorroboration().object.results);
  const { results, obstructions } = web.object;
  web.object.deliveryDigest = digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND);
  assert.notEqual(web.object.deliveryDigest, digest({ results, obstructions }));
  for (const source of results) {
    assert.equal(source.textDigest, digest(source.text, PUBLIC_WEB_SOURCE_OBJECT_KIND));
    assert.notEqual(source.textDigest, digest(source.text));
  }
  const value = demand({ publicWebEvidence: web });
  delete value.currentEvidence;
  const result = formAdmissibleResearchPacket(value, NOW);
  assert.equal(result.status, "admitted");
  assert.deepEqual([...result.packet.sourceUrls].sort(), [PRIMARY, SECONDARY].sort());
  assert.equal(result.custody.currentEvidence, undefined);
  assert.equal(result.custody.publicWebEvidence.deliveryDigest, web.object.deliveryDigest);
  assert.deepEqual([...result.custody.publicWebEvidence.selectedTextDigests].sort(), results.map((source) => source.textDigest).sort());
  for (const source of results) {
    const intake = result.packet.intakeSources.find((entry) => entry.url === source.finalUrl);
    assert.equal(intake.summary, source.text.trim());
    const identity = { requestedUrl: source.requestedUrl, finalUrl: source.finalUrl, textDigest: source.textDigest };
    assert.equal(digest(identity), digest(identity, "koios-news.record"));
    assert.equal(intake.subject, `public-web:${digest(identity).slice("ni:///sha-256;".length)}`);
    assert.equal(intake.path, `urn:public-web-source:${source.textDigest.slice("ni:///sha-256;".length)}`);
  }
  assert.equal(result.packetDigest, digest(result.packet, "koios-news.record"));
  assert.notEqual(result.packetDigest, digest(result.packet, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  assert.equal(result.custodyDigest, digest(result.custody, "koios-news.record"));
  assert.notEqual(result.custodyDigest, digest(result.custody, PUBLIC_WEB_SOURCE_OBJECT_KIND));
});

test("refuses a consumer-domain public-Web delivery even when its text uses the producer domain", () => {
  const web = publicWebEvidence();
  const { results, obstructions } = web.object;
  web.object.deliveryDigest = digest({ results, obstructions }, "koios-news.record");
  assert.notEqual(web.object.deliveryDigest, digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  assert.equal(results[0].textDigest, digest(results[0].text, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "public-web-custody-unproven");
  assert.equal(result.reason, "public Web delivery digest does not bind its acquired results and obstructions");
});

test("refuses consumer-domain text inside a correctly committed producer-domain public-Web delivery", () => {
  const web = publicWebEvidence();
  const { results, obstructions } = web.object;
  results[0].textDigest = digest(results[0].text, "koios-news.record");
  web.object.deliveryDigest = digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND);
  assert.notEqual(results[0].textDigest, digest(results[0].text, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "public-web-custody-unproven");
  assert.equal(result.reason, "public Web result text is not bound to its declared digest and requested URL");
});

test("refuses independent result-metadata and obstruction tampering while text commitments remain valid", () => {
  const mutations = [
    ["result metadata", (delivery) => { delivery.results[0].title += " changed"; }],
    ["obstructions", (delivery) => { delivery.obstructions.push({ type: "PublicWebSourceObstruction", requestedUrl: SECONDARY, code: "source-unavailable", reason: "changed", observedAt: NOW }); }],
  ];
  for (const [label, mutate] of mutations) {
    const web = publicWebEvidence();
    mutate(web.object);
    const { results, obstructions } = web.object;
    assert.equal(results[0].textDigest, digest(results[0].text, PUBLIC_WEB_SOURCE_OBJECT_KIND), label);
    assert.notEqual(web.object.deliveryDigest, digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND), label);
    const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
    assert.equal(result.status, "refused", label);
    assert.equal(result.code, "public-web-custody-unproven", label);
    assert.equal(result.reason, "public Web delivery digest does not bind its acquired results and obstructions", label);
  }
});

test("refuses stale public-Web textDigest after the producer-domain delivery digest is recomputed", () => {
  const web = publicWebEvidence();
  const { results, obstructions } = web.object;
  const originalTextDigest = results[0].textDigest;
  const originalDeliveryDigest = web.object.deliveryDigest;
  results[0].text += " changed";
  web.object.deliveryDigest = digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND);
  assert.equal(results[0].textDigest, originalTextDigest);
  assert.notEqual(results[0].textDigest, digest(results[0].text, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  assert.notEqual(web.object.deliveryDigest, originalDeliveryDigest);
  const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "public-web-custody-unproven");
  assert.equal(result.reason, "public Web result text is not bound to its declared digest and requested URL");
});

test("refuses public article text whose provider digest no longer binds it", () => {
  const web = publicWebEvidence();
  web.object.results[0].text += " changed";
  const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "public-web-custody-unproven");
});

test("does not turn a provider-returned path into ambient filesystem read authority", () => {
  const result = formAdmissibleResearchPacket(demand(), NOW);
  assert.equal(result.status, "admitted");
  assert.equal(result.packet.context.some((line) => line.includes("secret.txt")), false);
  assert.equal(result.packet.context.some((line) => line.includes("root:")), false);
});

test("refuses stale current evidence before writer inference", () => {
  const result = formAdmissibleResearchPacket(demand({ currentEvidence: currentEvidence("2026-07-10T12:00:00Z") }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "fresh-evidence-insufficient");
  assert.equal(result.diagnosis.replayFrom, "provider-procurement");
});

test("normalizes explicit RSS publication dates without confusing them with ingestion time", () => {
  const result = formAdmissibleResearchPacket(demand({ currentEvidence: currentEvidence("Sat, 18 Jul 2026 12:00:00 +0000") }), NOW);
  assert.equal(result.status, "admitted");
  assert.ok(result.packet.intakeSources.every((source) => source.published === "2026-07-18T12:00:00.000Z"));
});

test("normalizes ISO publication offsets returned by public-Web providers", () => {
  const web = publicWebEvidence();
  web.object.results[0].published = "2026-07-18T07:00:00-05:00";
  web.object.deliveryDigest = digest({ results: web.object.results, obstructions: web.object.obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND);
  const result = formAdmissibleResearchPacket(demand({ publicWebEvidence: web }), NOW);
  assert.equal(result.status, "admitted");
  assert.equal(result.packet.intakeSources[0].published, "2026-07-18T12:00:00.000Z");
});

test("does not let current ingestion time launder an invalid publication date", () => {
  const evidence = currentEvidence();
  for (const delivery of evidence.object.bundles) {
    const published = delivery.bundle.claims.find((claim) => claim.proposition.predicate === "published");
    published.proposition.object = "recently";
    published.time.asserted = NOW;
    delivery.digest = digest(delivery.bundle);
  }
  evidence.object.deliveryDigest = digest(evidence.object.bundles);
  const result = formAdmissibleResearchPacket(demand({ currentEvidence: evidence }), NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "fresh-evidence-insufficient");
});

test("refuses raw corpus scope in place of a Corpus Management receipt", async () => {
  const rawGrant = { roots: ["/"], terms: ["Example project revival"] };
  const result = await solicitAdmissibleResearchPacket(solicitation(demand({ priorResearch: rawGrant })), NOW);
  assert.equal(result.type, "Reject");
  assert.equal(result.code, "prior-research-custody-unproven");
});

test("rejects a changed provider delivery after the exact offer is accepted", async () => {
  const offered = await solicitAdmissibleResearchPacket(solicitation(), NOW);
  assert.equal(offered.type, "Offer");
  offered.object.sourceActivity.object.primarySourceUrls.push("https://changed.test/source");
  const invocation = { "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceContract", offer: offered } };
  const response = await invokeAdmissibleResearchPacket(invocation, "2026-07-18T18:00:01.000Z");
  assert.equal(response.type, "Reject");
  assert.equal(response.code, "changed-demand");
});

test("solicitation and invocation produce an exact zero-price provider receipt", async () => {
  const offered = await solicitAdmissibleResearchPacket(solicitation(), NOW);
  assert.equal(offered.type, "Offer");
  assert.deepEqual(offered.object.dependencies[0].providers, ["newscable-source-broker", "web-source-acquisition"]);
  assert.equal(offered.object.dependencies[0].mode, "one-or-both-current-evidence-carriers");
  assert.equal(offered.object.dependencies[1].provider, "corpus-management-team");
  const invocation = { "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceContract", offer: offered } };
  const response = await invokeAdmissibleResearchPacket(invocation, "2026-07-18T18:00:01.000Z");
  assert.equal(response.type, "Accept");
  assert.equal(response.object.result.status, "admitted");
  assert.equal(response.object.providerExchange.price.amount, 0);
});

// Combined-candidate cross-change regressions: UNEXECUTED local proposals.
// The frozen test-local identity-only module imports the real Koios boundary.
// No extra environment setup, skipped comparison, or semantic stub is used.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const IDENTITY_ONLY_SHA256 = "4f36b3b8d8c9f18a2b6d52d5804af4de0e39f75fd1d06a550d82a56f0cbb96bd";
let identityOnlyPromise;
function identityOnlyModule() {
  if (identityOnlyPromise === undefined) {
    const baselineUrl = new URL("./fixtures/identity-only/contract-admissible-research-packet.mjs", import.meta.url);
    assert.equal(createHash("sha256").update(readFileSync(baselineUrl)).digest("hex"), IDENTITY_ONLY_SHA256, "identity-only baseline bytes must match the reviewed candidate");
    identityOnlyPromise = import(baselineUrl.href);
  }
  return identityOnlyPromise;
}

async function compareActualConsumers(value) {
  const { formAdmissibleResearchPacket: identityOnly } = await identityOnlyModule();
  const baseline = identityOnly(structuredClone(value), NOW);
  const combined = formAdmissibleResearchPacket(structuredClone(value), NOW);
  return { baseline, combined };
}

function expectedBoundedSummary(value) {
  const clean = value.replace(/\s+/gu, " ").trim();
  return clean.length <= 12_000 ? clean : `${clean.slice(0, 11_997).trimEnd()}...`;
}

function recommitPublicWeb(web) {
  const { results, obstructions } = web.object;
  web.object.deliveryDigest = digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND);
  return web;
}

function singlePublicDemand(text, { finalUrl = PRIMARY, leadSourceUrl = PRIMARY, evidenceBudget = {} } = {}) {
  const web = publicWebEvidence(text);
  web.object.results[0].finalUrl = finalUrl;
  recommitPublicWeb(web);
  const value = demand({
    assignment: { leadSourceUrl },
    evidenceBudget: { minimumCurrentSources: 1, maximumCurrentSources: 1, minimumPrimarySources: 1, minimumIndependentDomains: 1, minimumDistinctAssertions: 1, minimumLeadAssertions: 1, targetMinimumWords: 50, maximumWordsPerAssertion: 50, ...evidenceBudget },
    publicWebEvidence: web,
  });
  delete value.currentEvidence;
  return value;
}

const SHORT_BODY = "The Example project revival began under a documented public consultation plan. Named maintainers published specific compatibility milestones for public review.";
const SHARED_LONG_BODY = `${SHORT_BODY} Independent participants recorded the approved meeting agenda and dates. ${"Neutral background padding stays available for the reporting record. ".repeat(220)}The omitted final paragraph describes a separate scheduled committee hearing.`;
// One shared leading entry; one long clipped entry and two entries only in the tail.
const OMITTED_TAIL_BODY = `The Example project revival began under a documented public consultation plan. ${"background context ".repeat(900)}ends with a published record. The final appendix identifies the named committee and its scheduled hearing. A separate closing paragraph records the approved route for written comments.`;
const REPEATED_BODY = "The consultation remains open for public comment. ".repeat(241);
const CORROBORATION_BODY = "Independent maintainers documented the Example project revival and its review process. A second public record specifies the consultation timetable and responsible committee.";

function twoPublicDemand(text, evidenceBudget = {}) {
  const value = demand({ evidenceBudget, publicWebEvidence: publicWebEvidence(text) });
  delete value.currentEvidence;
  const second = structuredClone(publicWebCorroboration().object.results[0]);
  second.text = CORROBORATION_BODY;
  second.textDigest = publicWebTextDigest(second.text);
  value.publicWebEvidence.object.results.push(second);
  recommitPublicWeb(value.publicWebEvidence);
  return value;
}

function assertKoiosIdentities(result, value) {
  assert.equal(result.status, "admitted");
  assert.equal(result.packetDigest, digest(result.packet, "koios-news.record"));
  assert.equal(result.custodyDigest, digest(result.custody, "koios-news.record"));
  assert.notEqual(result.packetDigest, digest(result.packet, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  assert.notEqual(result.custodyDigest, digest(result.custody, PUBLIC_WEB_SOURCE_OBJECT_KIND));
  assert.equal(result.custody.priorResearch.contextualBundleDigest, value.priorResearch.object.contextualBundleDigest);
  assert.equal(result.custody.priorResearch.gapBundleDigest, value.priorResearch.object.gapBundleDigest);
  assert.equal(value.priorResearch.object.contextualBundleDigest, digest(value.priorResearch.object.contextualBundle, "koios-news.record"));
  assert.equal(value.priorResearch.object.gapBundleDigest, digest(value.priorResearch.object.gapBundle, "koios-news.record"));
  for (const source of value.publicWebEvidence?.object.results ?? []) {
    const intake = result.packet.intakeSources.find((entry) => entry.url === source.finalUrl);
    if (intake?.path.startsWith("urn:public-web-source:")) {
      const identity = { requestedUrl: source.requestedUrl, finalUrl: source.finalUrl, textDigest: source.textDigest };
      assert.equal(intake.subject, `public-web:${digest(identity, "koios-news.record").slice("ni:///sha-256;".length)}`);
      assert.notEqual(intake.subject, `public-web:${digest(identity, PUBLIC_WEB_SOURCE_OBJECT_KIND).slice("ni:///sha-256;".length)}`);
    }
  }
}

function assertBudgetRefusal(result, { assertionCount, leadAssertionCount, licensedMaximumWords, deficit }) {
  assert.equal(result.status, "refused");
  assert.equal(result.code, "commission-evidence-budget-insufficient");
  assert.equal(result.reason, `the contracted reporting cannot yet support this commission: ${deficit}`);
  assert.equal(result.diagnosis.failureLayer, "source-acquisition");
  assert.equal(result.diagnosis.requiredMove, "acquire-fuller-reporting-or-narrow-the-commissioned-genre");
  assert.equal(result.diagnosis.replayFrom, "provider-procurement");
  assert.equal(result.diagnosis.evidence.assertionCount, assertionCount);
  assert.equal(result.diagnosis.evidence.leadAssertionCount, leadAssertionCount);
  assert.equal(result.diagnosis.evidence.licensedMaximumWords, licensedMaximumWords);
}

test("composition group 1: short public-Web acceptance and Koios, Newscable, and prior commitments match identity-only", async () => {
  const value = singlePublicDemand(SHORT_BODY, { evidenceBudget: { minimumDistinctAssertions: 2, minimumLeadAssertions: 2, targetMinimumWords: 100 } });
  const { baseline, combined } = await compareActualConsumers(value);
  assertKoiosIdentities(combined, value);
  assert.deepEqual(combined, baseline);
  assert.equal(combined.packet.intakeSources[0].summary, SHORT_BODY);
  assert.equal(combined.custody.currentEvidence, undefined);
  const originalCableDemand = demand();
  const cable = await compareActualConsumers(originalCableDemand);
  assertKoiosIdentities(cable.combined, originalCableDemand);
  assert.deepEqual(cable.combined, cable.baseline);
  assert.equal(cable.combined.custody.currentEvidence.deliveryDigest, digest(originalCableDemand.currentEvidence.object.bundles, "koios-news.record"));
  assert.deepEqual(cable.combined.custody.currentEvidence.selectedBundleDigests, originalCableDemand.currentEvidence.object.bundles.map((entry) => entry.digest));
});

test("composition group 2: long accepted public-Web custody binds full text while packet fields and redirect lead budgets stay bounded", async () => {
  assert.ok(SHARED_LONG_BODY.length > 12_000);
  const finalUrl = "https://example.test/project-revival-final";
  for (const leadSourceUrl of [PRIMARY, finalUrl]) {
    const value = singlePublicDemand(SHARED_LONG_BODY, { finalUrl, leadSourceUrl, evidenceBudget: { minimumDistinctAssertions: 4, minimumLeadAssertions: 4, targetMinimumWords: 200 } });
    const { baseline, combined } = await compareActualConsumers(value);
    assertKoiosIdentities(combined, value);
    assert.deepEqual(combined, baseline);
    const { results, obstructions, deliveryDigest } = value.publicWebEvidence.object;
    const source = results[0];
    const bounded = expectedBoundedSummary(source.text);
    assert.equal(source.text, SHARED_LONG_BODY);
    assert.equal(source.textDigest, publicWebTextDigest(SHARED_LONG_BODY));
    assert.equal(deliveryDigest, digest({ results, obstructions }, PUBLIC_WEB_SOURCE_OBJECT_KIND));
    assert.notEqual(source.textDigest, publicWebTextDigest(bounded));
    assert.equal(combined.packet.intakeSources[0].url, finalUrl);
    assert.equal(combined.packet.intakeSources[0].summary, bounded);
    assert.equal(combined.packet.claims.find((claim) => claim.predicate === "summary").object, bounded);
    assert.ok(combined.packet.context.some((line) => line.endsWith(` - ${bounded}`)));
    assert.ok(!bounded.includes("separate scheduled committee hearing"));
    assert.ok(bounded.length <= 12_000);
    assert.deepEqual(combined.custody.publicWebEvidence.selectedTextDigests, [source.textDigest]);
    assert.equal(combined.custody.publicWebEvidence.deliveryDigest, deliveryDigest);
    // Raise only the word floor to expose the exact four-entry bounded count.
    const probe = structuredClone(value);
    probe.evidenceBudget.targetMinimumWords = 201;
    assertBudgetRefusal(formAdmissibleResearchPacket(probe, NOW), { assertionCount: 4, leadAssertionCount: 4, licensedMaximumWords: 200, deficit: "licenses at most 200 words, below the 201-word commission floor" });
  }
});

test("composition group 3: omitted-tail total, lead, and word deficits are isolated against the identity-only admission baseline", async () => {
  assert.ok(OMITTED_TAIL_BODY.length > 12_000);
  const cases = [
    [{ minimumDistinctAssertions: 4, minimumLeadAssertions: 1, targetMinimumWords: 50 }, "carries 3 distinct source assertions but requires 4"],
    [{ minimumDistinctAssertions: 3, minimumLeadAssertions: 2, targetMinimumWords: 50 }, "carries 1 lead-source assertions but requires 2"],
    [{ minimumDistinctAssertions: 1, minimumLeadAssertions: 1, targetMinimumWords: 151 }, "licenses at most 150 words, below the 151-word commission floor"],
  ];
  for (const [evidenceBudget, deficit] of cases) {
    const value = twoPublicDemand(OMITTED_TAIL_BODY, evidenceBudget);
    const { baseline, combined } = await compareActualConsumers(value);
    assert.equal(baseline.status, "admitted", deficit);
    assertBudgetRefusal(combined, { assertionCount: 3, leadAssertionCount: 1, licensedMaximumWords: 150, deficit });
  }
  // Both consumers still admit a budget supported by the shared entries.
  const admitted = await compareActualConsumers(twoPublicDemand(OMITTED_TAIL_BODY, { minimumDistinctAssertions: 3, minimumLeadAssertions: 1, targetMinimumWords: 150 }));
  assert.equal(admitted.combined.status, "admitted");
  assert.deepEqual(admitted.combined, admitted.baseline);
});

test("composition group 4: repeated-sentence clipping cannot add an ellipsis assertion or extra word allowance in full admission", async () => {
  assert.ok(REPEATED_BODY.length > 12_000);
  const value = singlePublicDemand(REPEATED_BODY, { finalUrl: "https://example.test/consultation-final", leadSourceUrl: PRIMARY });
  const accepted = await compareActualConsumers(value);
  assert.equal(accepted.combined.status, "admitted");
  assert.deepEqual(accepted.combined, accepted.baseline);
  assert.equal(accepted.combined.packet.intakeSources[0].summary, expectedBoundedSummary(REPEATED_BODY));
  const cases = [
    [{ minimumDistinctAssertions: 2 }, "carries 1 distinct source assertions but requires 2"],
    [{ targetMinimumWords: 100 }, "licenses at most 50 words, below the 100-word commission floor"],
  ];
  for (const [budget, deficit] of cases) {
    const probe = structuredClone(value);
    Object.assign(probe.evidenceBudget, budget);
    const { baseline, combined } = await compareActualConsumers(probe);
    assertBudgetRefusal(combined, { assertionCount: 1, leadAssertionCount: 1, licensedMaximumWords: 50, deficit });
    assert.deepEqual(combined, baseline);
  }
});

test("composition group 5: long outer and inner custody failures precede identical or insufficient bounded budgets", () => {
  const mutations = [
    ["consumer-domain aggregate", "public Web delivery digest does not bind its acquired results and obstructions", (web) => {
      const { results, obstructions } = web.object;
      web.object.deliveryDigest = digest({ results, obstructions }, "koios-news.record");
    }],
    ["consumer-domain inner text", "public Web result text is not bound to its declared digest and requested URL", (web) => {
      web.object.results[0].textDigest = digest(web.object.results[0].text, "koios-news.record");
      recommitPublicWeb(web);
    }],
    ["omitted-tail mutation with stale inner digest", "public Web result text is not bound to its declared digest and requested URL", (web) => {
      const result = web.object.results[0];
      const originalTextDigest = result.textDigest;
      result.text += " A changed omitted tail must still be covered by the original full text commitment.";
      assert.equal(result.textDigest, originalTextDigest);
      assert.notEqual(result.textDigest, publicWebTextDigest(result.text));
      recommitPublicWeb(web);
    }],
  ];
  for (const minimumDistinctAssertions of [1, 2]) {
    for (const [label, reason, mutate] of mutations) {
      const value = singlePublicDemand(REPEATED_BODY, { evidenceBudget: { minimumDistinctAssertions } });
      const bounded = expectedBoundedSummary(value.publicWebEvidence.object.results[0].text);
      mutate(value.publicWebEvidence);
      assert.equal(expectedBoundedSummary(value.publicWebEvidence.object.results[0].text), bounded, label);
      const result = formAdmissibleResearchPacket(value, NOW);
      assert.equal(result.status, "refused", label);
      assert.equal(result.code, "public-web-custody-unproven", label);
      assert.equal(result.reason, reason, label);
      assert.deepEqual(result.diagnosis, { failureLayer: "contract", requiredMove: "repair-demand-or-provider-custody", replayFrom: "contract-solicitation" }, label);
    }
  }
});

test("composition group 6: a selected Newscable overlay budgets acquired text and keeps original cable and full-text commitments", async () => {
  const cable = currentEvidence();
  cable.object.bundles = [
    bundle("selected-cable-lead", PRIMARY, "Example project revival begins", "The Example project revival has a short syndicated description for readers.", "2026-07-18T14:00:00Z"),
    bundle("selected-cable-secondary", SECONDARY, "Analysis of the Example project revival", CORROBORATION_BODY),
  ];
  cable.object.deliveryDigest = digest(cable.object.bundles);
  const cableBytesBefore = JSON.stringify(cable);
  const web = publicWebEvidence(SHARED_LONG_BODY);
  const value = demand({ currentEvidence: cable, publicWebEvidence: web, evidenceBudget: { minimumDistinctAssertions: 6, minimumLeadAssertions: 4, targetMinimumWords: 300 } });
  const { baseline, combined } = await compareActualConsumers(value);
  assertKoiosIdentities(combined, value);
  assert.deepEqual(combined, baseline);
  assert.equal(JSON.stringify(cable), cableBytesBefore);
  const intake = combined.packet.intakeSources.find((entry) => entry.url === PRIMARY);
  assert.equal(intake.subject, "selected-cable-lead");
  assert.equal(intake.path, `urn:newscable-bundle:${cable.object.bundles[0].digest.slice("ni:///sha-256;".length)}`);
  assert.equal(intake.summary, expectedBoundedSummary(SHARED_LONG_BODY));
  assert.equal(combined.packet.claims.find((claim) => claim.sourceSubject === "selected-cable-lead" && claim.predicate === "summary").object, expectedBoundedSummary(SHARED_LONG_BODY));
  assert.ok(combined.packet.context.some((line) => line.endsWith(` - ${expectedBoundedSummary(SHARED_LONG_BODY)}`)));
  assert.equal(cable.object.bundles[0].digest, digest(cable.object.bundles[0].bundle, "koios-news.record"));
  assert.equal(combined.custody.currentEvidence.deliveryDigest, cable.object.deliveryDigest);
  assert.deepEqual(combined.custody.currentEvidence.selectedBundleDigests, cable.object.bundles.map((entry) => entry.digest));
  assert.deepEqual(combined.custody.publicWebEvidence.selectedTextDigests, [web.object.results[0].textDigest]);
  const probe = structuredClone(value);
  probe.evidenceBudget.targetMinimumWords = 301;
  const refusedPair = await compareActualConsumers(probe);
  assert.equal(refusedPair.baseline.status, "admitted");
  assertBudgetRefusal(refusedPair.combined, { assertionCount: 6, leadAssertionCount: 4, licensedMaximumWords: 300, deficit: "licenses at most 300 words, below the 301-word commission floor" });
});

test("composition group 6 control: Newscable-only long summaries use the same bounded budget", async () => {
  const cable = currentEvidence();
  cable.object.bundles = [bundle("long-cable-only", PRIMARY, "Example project revival begins", OMITTED_TAIL_BODY)];
  cable.object.deliveryDigest = digest(cable.object.bundles);
  const value = demand({ currentEvidence: cable, evidenceBudget: { minimumCurrentSources: 1, maximumCurrentSources: 1, minimumIndependentDomains: 1, minimumDistinctAssertions: 1, minimumLeadAssertions: 1, targetMinimumWords: 50 } });
  const admitted = await compareActualConsumers(value);
  assert.equal(admitted.combined.status, "admitted");
  assert.deepEqual(admitted.combined, admitted.baseline);
  assert.equal(admitted.combined.packet.intakeSources[0].summary, expectedBoundedSummary(OMITTED_TAIL_BODY));
  assert.equal(admitted.combined.custody.publicWebEvidence, undefined);
  assert.equal(admitted.combined.custody.currentEvidence.deliveryDigest, cable.object.deliveryDigest);
  const probe = structuredClone(value);
  probe.evidenceBudget.targetMinimumWords = 51;
  const { baseline, combined } = await compareActualConsumers(probe);
  assert.equal(baseline.status, "admitted");
  assertBudgetRefusal(combined, { assertionCount: 1, leadAssertionCount: 1, licensedMaximumWords: 50, deficit: "licenses at most 50 words, below the 51-word commission floor" });
});
