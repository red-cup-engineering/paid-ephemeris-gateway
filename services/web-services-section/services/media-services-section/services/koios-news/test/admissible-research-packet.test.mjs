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

const NOW = "2026-07-18T18:00:00.000Z";
const CUSTOMER = "https://customer-publication.test/activitypub/actor";
const PRIMARY = "https://example.test/project-revival";
const SECONDARY = "https://example.net/project-revival-analysis";
process.env["KOIOS_NEWS_DATA_ROOT"] = mkdtempSync(join(tmpdir(), "koios-news-source-intelligence-test-"));

function publicWebTextDigest(value) {
  return digest(value);
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
      deliveryDigest: digest({ results, obstructions }),
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
    object: { type: "PublicWebSourceDelivery", purpose: "journalistic-source-research", results, obstructions, deliveryDigest: digest({ results, obstructions }), customerTerritoryMutation: false, acquiredAt: NOW },
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
  web.object.deliveryDigest = digest({ results: web.object.results, obstructions: web.object.obstructions });
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
  web.object.deliveryDigest = digest({ results: web.object.results, obstructions: web.object.obstructions });
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
