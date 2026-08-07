import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ACTOR,
  CONTEXT,
  formLicensedEditorialState,
  invokeLicensedEditorialState,
  solicitLicensedEditorialState,
} from "../src/contract-licensed-editorial-state.mjs";
import { describeServiceSection, settleMessage } from "../src/service-section.mjs";

const NOW = "2026-07-18T18:00:00.000Z";
const SOURCE = "https://example.test/report";
const REPORT = [
  "The Example project revival began under new leadership on Friday.",
  "Maintainer Jo Doe accepted custody after the prior team stopped work.",
  "The repository now carries a tested port and a public roadmap.",
  "Doe said the next release remains contingent on hardware testing.",
  "Contributors have not yet committed to a release date.",
  "The project plans to publish weekly progress reports.",
  "Three maintainers signed the new custody statement on Thursday.",
  "The statement assigns release authority to the new maintenance group.",
  "A public test suite currently covers the supported hardware targets.",
  "Two older targets remain excluded because their test results are incomplete.",
  "The roadmap places documentation repair before the first candidate release.",
  "Contributors opened a public issue tracker for compatibility reports.",
  "Doe described the present build as a port rather than a finished release.",
  "The former team transferred the repository keys through a witnessed handoff.",
  "No commercial sponsor is named in the custody statement.",
  "The next progress report is scheduled for the following Friday.",
].join(" ");
process.env["KOIOS_NEWS_DATA_ROOT"] = mkdtempSync(join(tmpdir(), "koios-news-service-section-test-"));

function demand(overrides = {}) {
  return {
    type: "LicensedEditorialStateDemand",
    assignment: {
      assignmentId: "technology-example-revival",
      term: "example project revival",
      beat: "technology",
      summary: "Report the revival.",
      angle: "Explain only the systems implications licensed by the report.",
      sourceUrls: [SOURCE],
    },
    researchPacket: {
      sourceUrls: [SOURCE],
      intakeSources: [{
        subject: "example-project-revival",
        title: "Example project revival begins under new leadership",
        url: SOURCE,
        published: "2026-07-18T12:00:00Z",
        summary: REPORT,
      }],
      claims: [{ sourceUrl: SOURCE, predicate: "summary", status: "supported", object: REPORT }],
      accountableAttention: { correctionSurfacePolicy: "invalidate every dependent surface" },
    },
    genreId: "reported-analysis/v2",
    genreLawDigest: "sha256:genre",
    genreRequirements: {
      targetWords: { minimum: 800, maximum: 1100 },
      minimumDistinctAssertions: 15,
      minimumPrimaryAssertions: 15,
      minimumIndependentSources: 1,
      maximumWordsPerAssertion: 55,
      minimumSections: 4,
      sectionPurposes: ["establish the event", "advance the reporting", "show response", "close on unresolved status"],
    },
    writerPromptLaws: ["Keep interpretation subordinate to evidence."],
    publicationPolicyDigest: "sha256:policy",
    ...overrides,
  };
}

test("forms a source-bound plan without promoting demand to evidence", () => {
  const result = formLicensedEditorialState(demand(), NOW);
  assert.equal(result.status, "licensed");
  assert.equal(result.state.assignment.demandStatus, "attention-pressure-not-evidence");
  assert.equal(result.state.plan.sections.length, 4);
  assert.equal(result.state.plan.evidenceBudget.status, "cleared");
  assert.ok(result.state.plan.evidenceBudget.licensedMaximumWords >= 800);
  assert.ok(result.state.assertions.every((claim) => claim.sourceUrl === SOURCE && claim.attribution === "required"));
  const claimIds = new Set(result.state.assertions.map(({ id }) => id));
  assert.ok(result.state.plan.sections.flatMap(({ claimIds }) => claimIds).every((id) => claimIds.has(id)));
});

test("a current-news commission refuses gossip-shaped work without independent sourcing", () => {
  const value = demand({
    genreId: "current-news-brief/v1",
    genreRequirements: {
      targetWords: { minimum: 600, maximum: 850 },
      minimumDistinctAssertions: 9,
      minimumPrimaryAssertions: 6,
      minimumIndependentSources: 2,
      maximumWordsPerAssertion: 80,
      minimumSections: 3,
      sectionPurposes: ["establish the event", "give confirmed context", "close on next status"],
    },
    writerPromptLaws: ["Do not manufacture scandal or intimacy."],
  });
  const result = formLicensedEditorialState(value, NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "independent-sourcing-insufficient");
  assert.equal(result.diagnosis.requiredMove, "acquire-corroborating-or-contrary-reporting");
});

test("refuses a long-form commission when its admitted evidence budget is too thin", () => {
  const value = demand();
  const thin = REPORT.split(". ").slice(0, 7).join(". ");
  value.researchPacket.intakeSources[0].summary = thin;
  value.researchPacket.claims[0].object = thin;
  const result = formLicensedEditorialState(value, NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "evidence-budget-insufficient");
  assert.equal(result.diagnosis.failureLayer, "sources");
  assert.equal(result.diagnosis.replayFrom, "research-packet");
});

test("an assertion-count refusal does not falsely claim the licensed word ceiling is below the floor", () => {
  const value = demand({
    genreId: "current-news-brief/v1",
    genreRequirements: {
      targetWords: { minimum: 600, maximum: 850 },
      minimumDistinctAssertions: 20,
      minimumPrimaryAssertions: 6,
      minimumIndependentSources: 1,
      maximumWordsPerAssertion: 80,
      minimumSections: 3,
      sectionPurposes: ["establish the event", "give confirmed context", "close on next status"],
    },
  });
  const result = formLicensedEditorialState(value, NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "evidence-budget-insufficient");
  assert.match(result.reason, /carries 16 distinct assertions but requires 20/u);
  assert.doesNotMatch(result.reason, /850 words, below the 600-word/u);
});

test("refuses an assignment lens absent from its primary source", () => {
  const value = demand();
  value.assignment.term = "example project merger";
  const result = formLicensedEditorialState(value, NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "assignment-exceeds-primary-source");
  assert.equal(result.reason, "the primary admitted source does not carry the whole assignment lens; unsupported terms: merger");
  assert.equal(result.diagnosis.failureLayer, "assignment");
  assert.equal(result.diagnosis.replayFrom, "assignment");
  assert.equal(result.diagnosis.suggestedAssignment.term, "Example project revival begins under new leadership");
});

test("refuses a thematic keyword match with no primary-report event spine", () => {
  const value = demand();
  value.assignment.term = "infrastructure energy use";
  value.researchPacket.intakeSources[0].summary += " The infrastructure review also discusses energy use.";
  value.researchPacket.claims[0].object = value.researchPacket.intakeSources[0].summary;
  const result = formLicensedEditorialState(value, NOW);
  assert.equal(result.status, "refused");
  assert.equal(result.code, "assignment-lacks-event-spine");
});

test("solicitation and exact offer acceptance return a provider receipt", async () => {
  const sourceActivity = { "@context": CONTEXT, type: "Create", actor: "https://koios.news/activitypub/actor", object: demand() };
  const solicitation = { "@context": CONTEXT, type: "Offer", actor: sourceActivity.actor, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
  const offer = await solicitLicensedEditorialState(solicitation, NOW);
  assert.equal(offer.type, "Offer");
  const invocation = { "@context": CONTEXT, type: "Accept", actor: sourceActivity.actor, target: ACTOR, object: { type: "ServiceContract", offer } };
  const delivery = await invokeLicensedEditorialState(invocation, "2026-07-18T18:00:01.000Z");
  assert.equal(delivery.type, "Accept");
  assert.equal(delivery.object.result.status, "licensed");
  assert.equal(delivery.object.providerExchange.price.amount, 0);
});

test("changed demand cannot use an accepted offer", async () => {
  const sourceActivity = { "@context": CONTEXT, type: "Create", actor: "https://koios.news/activitypub/actor", object: demand() };
  const solicitation = { "@context": CONTEXT, type: "Offer", actor: sourceActivity.actor, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
  const offer = await solicitLicensedEditorialState(solicitation, NOW);
  offer.object.sourceActivity.object.assignment.term = "changed demand";
  const invocation = { "@context": CONTEXT, type: "Accept", actor: sourceActivity.actor, target: ACTOR, object: { type: "ServiceContract", offer } };
  const delivery = await invokeLicensedEditorialState(invocation, "2026-07-18T18:00:01.000Z");
  assert.equal(delivery.type, "Reject");
  assert.equal(delivery.code, "changed-demand");
});

test("the Service Section advertises and settles its real operation through one replay-safe boundary", async () => {
  const description = describeServiceSection();
  assert.equal(description.id, ACTOR);
  assert.deepEqual(description.operations.map(({ service }) => service), ["admissible-research-packet", "licensed-editorial-state", "mathematics-research-intake"]);

  const sourceActivity = { "@context": CONTEXT, type: "Create", actor: "https://customer-publication.test/activitypub/actor", object: demand() };
  const solicitation = { "@context": CONTEXT, type: "Offer", actor: sourceActivity.actor, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
  const offer = await settleMessage(solicitation, "2026-07-18T18:01:00.000Z");
  assert.equal(offer.type, "Offer");
  assert.equal(offer.object.service, "licensed-editorial-state");

  const invocation = { "@context": CONTEXT, type: "Accept", actor: sourceActivity.actor, target: ACTOR, object: { type: "ServiceContract", offer } };
  const delivery = await settleMessage(invocation, "2026-07-18T18:01:01.000Z");
  assert.equal(delivery.type, "Accept");
  assert.equal(delivery.object.result.status, "licensed");

  const replay = await settleMessage(invocation, "2026-07-18T18:01:02.000Z");
  assert.deepEqual(replay, delivery);
});

test("the Service Section refuses messages for capabilities it does not advertise", async () => {
  const unknown = await settleMessage({
    "@context": CONTEXT,
    type: "Offer",
    actor: "https://customer-publication.test/activitypub/actor",
    target: ACTOR,
    object: {
      type: "ServiceSolicitation",
      sourceActivity: { "@context": CONTEXT, type: "Create", object: { type: "WriteAnArticleDemand" } },
    },
  }, "2026-07-18T18:02:00.000Z");
  assert.equal(unknown.type, "Reject");
  assert.equal(unknown.code, "unoffered-operation");
});
