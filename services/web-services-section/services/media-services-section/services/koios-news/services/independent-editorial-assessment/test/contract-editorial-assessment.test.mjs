import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { querySettlementRecords } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { startWitnessJournalProviderProcess } from "@lenticule-science/witness-journal-rdf-projection-service/test-provider";

import { ACTOR, CONTEXT, digest, editorialToolSchema, invokeEditorialAssessment, selectionProblems, solicitEditorialAssessment, validateSelection } from "../src/contract-editorial-assessment.mjs";

const CUSTOMER = "urn:ame:test-publication";
const NOW = "2099-07-18T13:00:00.000Z";
const ROUTE = Object.freeze({
  marketAgentCard: "https://market.example/.well-known/agent-card.json",
});
const COMPLETION = Object.freeze({
  tool: "submit_editorial_acceptance", failureLayer: "none", replayFrom: "none", summary: "The exact manuscript is publishable.", requiredRepairs: [], repairTools: [],
  report: "The admitted manuscript and its witnessed evidence support the material claims without a remaining editorial repair. ".repeat(6),
});
function marketCompletion(selection = COMPLETION) {
  return Object.freeze({
    disposition: "completion", selection,
    market: "eip155:31337:0x1111111111111111111111111111111111111111",
    provider: "urn:ame:test-inference-provider", model: "test-model",
    requestNi: digest({}), resultNi: digest({}), compactNi: digest({}),
    settlementNi: digest({}), receiptNi: digest({}), schemaAssayNi: digest({}),
  });
}
const OPTIONS = Object.freeze({ route: ROUTE, infer: async () => marketCompletion() });
let temp;
let priorData;
let priorWitnessJournal;
let witnessJournal;

test.before(async () => { witnessJournal = await startWitnessJournalProviderProcess(); });
test.after(async () => { await witnessJournal.close(); });

test.beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), "independent-editorial-assessment-"));
  priorData = process.env.INDEPENDENT_EDITORIAL_ASSESSMENT_DATA_ROOT;
  priorWitnessJournal = process.env.WITNESS_JOURNAL_RDF_AGENT;
  process.env.INDEPENDENT_EDITORIAL_ASSESSMENT_DATA_ROOT = join(temp, "provider-data");
  process.env.WITNESS_JOURNAL_RDF_AGENT = witnessJournal.agentCardUrl;
});
test.afterEach(() => {
  if (priorData === undefined) delete process.env.INDEPENDENT_EDITORIAL_ASSESSMENT_DATA_ROOT; else process.env.INDEPENDENT_EDITORIAL_ASSESSMENT_DATA_ROOT = priorData;
  if (priorWitnessJournal === undefined) delete process.env.WITNESS_JOURNAL_RDF_AGENT; else process.env.WITNESS_JOURNAL_RDF_AGENT = priorWitnessJournal;
  rmSync(temp, { recursive: true, force: true });
});

function demand(overrides = {}) {
  const bytes = "---\ntitle: Test\ndraft: true\n---\n\nA sufficiently exact manuscript body with a cited source.";
  const standards = { publishable: true, findings: [] };
  const evidence = [{ sourceUrl: "https://example.test/source", claim: "The reported event occurred." }];
  const run = { provider: "newswire-editorial-production" };
  const pipeline = [];
  return {
    type: "EditorialAssessmentDemand",
    slug: "test-manuscript",
    manuscript: { bytes, digest: digest(bytes) },
    editorialContext: { standards, run, evidence, pipeline, digest: digest({ standards, run, evidence, pipeline }) },
    authorities: { publicationPolicyDigest: digest({ policy: "publication" }), genreLawDigest: digest({ law: "genre" }), editorialDutyDigest: digest({ duty: "editorial" }) },
    executionMode: "dry-run",
    ...overrides,
  };
}
function solicitation(value = demand()) { const sourceActivity = { "@context": CONTEXT, id: `urn:source:${digest(value)}`, type: "Create", actor: CUSTOMER, target: ACTOR, object: value }; return { "@context": CONTEXT, id: `urn:solicitation:${digest(sourceActivity)}`, type: "Offer", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceSolicitation", demand: `urn:demand:${digest(value)}`, sourceActivity } }; }
function contract(offer) { const allowedActions = ["invoke-service", ...offer.object.effects]; const capability = { type: "Capability", issuer: CUSTOMER, holder: ACTOR, invocationTarget: ACTOR, parentOffer: offer.id, allowedActions, attenuation: { demandDigest: offer.object.demandDigest, providerScope: offer.object.scope, customerTerritoryMutation: false } }; return { "@context": CONTEXT, type: "Accept", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceContract", offer, capability } }; }

test("the provider offers its own outcome-bound service and dry-run readiness buys no inference", async () => {
  const offer = await solicitEditorialAssessment(solicitation(), NOW, OPTIONS);
  assert.equal(offer.type, "Offer", JSON.stringify(offer));
  assert.equal(offer.object.service, "assess-manuscript");
  assert.equal("inferenceRoute" in offer.object.scope, false);
  assert.equal(offer.object.scope.serviceClass, "editorial-judgment");
  assert.equal(offer.object.scope.toolSchemaDigest, digest(editorialToolSchema()));
  assert.deepEqual(offer.object.effects, ["inference", "provider-local-witness-journal-evidence"]);
  const result = await invokeEditorialAssessment(contract(offer), NOW, OPTIONS);
  assert.equal(result.type, "Accept");
  assert.equal(result.object.disposition, "ready");
  assert.equal(result.object.dryRun, true);
  assert.equal("toolSelection" in result.object, false);
  assert.equal("providerResult" in result.object, false);
  assert.equal(JSON.stringify(result.object).includes("logical-inference-service-section"), false);
  assert.equal((await querySettlementRecords("independent-editorial-assessment.provider.offer")).length, 1);
  assert.equal((await querySettlementRecords("independent-editorial-assessment.upstream.purchase")).length, 0);
  assert.equal((await querySettlementRecords("independent-editorial-assessment.provider.exchange")).length, 1);
});

test("the customer cannot select a model or any downstream inference supplier field", async () => {
  for (const leaked of [
    { model: "claude-sonnet-4-6" },
    { childAgentCard: "https://supplier.example/.well-known/agent-card.json" },
    { childAccount: "eip155:31337:0x1111111111111111111111111111111111111111" },
    { childLaw: digest({}) },
  ]) {
    const result = await solicitEditorialAssessment(solicitation(demand(leaked)), NOW, OPTIONS);
    assert.equal(result.type, "Reject");
    assert.equal(result.object.code, "inadmissible-demand");
    assert.match(result.object.reason, /downstream inference selection is forbidden/u);
  }
});

test("acceptance is a complete tool act and cannot smuggle publication-state work into repairs", () => {
  const report = "Editorial evidence supports this exact manuscript without a remaining material repair. ".repeat(8);
  assert.equal(validateSelection({ tool: "submit_editorial_acceptance", failureLayer: "none", replayFrom: "none", summary: "Publishable.", requiredRepairs: [], repairTools: [], report }), true);
  assert.equal(validateSelection({ tool: "submit_editorial_acceptance", failureLayer: "none", replayFrom: "none", summary: "Publishable.", requiredRepairs: ["toggle draft false"], repairTools: [], report }), false);
  assert.match(editorialToolSchema().properties.requiredRepairs.description, /publication flags are never repairs/u);
});

test("a revision can select an exact body repair but cannot target repeated or absent bytes", () => {
  const report = "The manuscript has one local modality defect and the remaining exact bytes are publication-ready. ".repeat(8);
  const value = { tool: "submit_revision_request", failureLayer: "writer-model", replayFrom: "bounded-body-repair", summary: "Replace one certainty claim.", requiredRepairs: ["replace certainty with supported modality"], repairTools: [{ tool: "replace_exact_body_text", before: "will decide", after: "may decide" }], report };
  assert.equal(validateSelection(value, "---\ntitle: Test\n---\nThe geometry will decide the final."), true);
  assert.equal(validateSelection(value, "---\ntitle: Test\n---\nThe match is open."), false);
  assert.equal(validateSelection(value, "---\ntitle: Test\n---\nIt will decide; perhaps it will decide."), false);
});

test("an otherwise valid revision survives unusable exact coordinates as a prose repair", async () => {
  const report = "The manuscript needs one material sentence repair, but the diagnosis remains valid without an exact byte edit. ".repeat(8);
  const selection = { tool: "submit_revision_request", failureLayer: "writer-model", replayFrom: "draft-repair", summary: "Repair the unsupported sentence.", requiredRepairs: ["remove the unsupported claim"], repairTools: [{ tool: "replace_exact_body_text", before: "a sentence the manuscript does not contain", after: "a supported sentence" }], report };
  const infer = async () => marketCompletion(selection);
  const offer = await solicitEditorialAssessment(solicitation(demand({ executionMode: "live" })), NOW, OPTIONS);
  const result = await invokeEditorialAssessment(contract(offer), NOW, { ...OPTIONS, infer });
  assert.equal(result.type, "Accept");
  assert.deepEqual(result.object.toolSelection.repairTools, []);
  assert.deepEqual(result.object.discardedRepairToolProblems, ["repair-tools[0]-body-span-absent"]);
  assert.equal(result.object.toolSelection.requiredRepairs.length, 1);
  assert.equal("providerResult" in result.object, false);
  const learning = await querySettlementRecords("independent-editorial-assessment.provider.learning");
  assert.equal(learning.length, 1);
});

test("one market obstruction is retained as one refusal without hidden resubmission", async () => {
  let attempts = 0;
  const infer = async (value) => {
    attempts += 1;
    throw new TypeError(`fetch failed for ${value.slug}`);
  };
  const offer = await solicitEditorialAssessment(solicitation(demand({ executionMode: "live" })), NOW, OPTIONS);
  const result = await invokeEditorialAssessment(contract(offer), NOW, { ...OPTIONS, infer });
  assert.equal(result.type, "Reject");
  assert.equal(result.object.code, "inference-obstructed");
  assert.equal(result.object.attempts, 1);
  assert.equal(attempts, 1);
});

test("the editor selects a deterministic surface repair instead of smuggling frontmatter through a body tool", () => {
  const report = "The body is sound, but its projected summary contains a carrier defect that deterministic code can repair. ".repeat(8);
  const manuscript = "---\ntitle: Test\nsummary: Broken summary.\n---\nThe reported body is complete.";
  const surfaceRepair = { tool: "submit_revision_request", failureLayer: "deterministic-gates", replayFrom: "bounded-surface-repair", summary: "Regenerate editorial surfaces.", requiredRepairs: ["project summary from body"], repairTools: [{ tool: "repair_editorial_surfaces" }], report };
  assert.equal(validateSelection(surfaceRepair, manuscript), true);
  const frontmatterThroughBody = { ...surfaceRepair, repairTools: [{ tool: "replace_exact_body_text", before: "summary: Broken summary.", after: "summary: Better summary." }] };
  assert.equal(validateSelection(frontmatterThroughBody, manuscript), false);
  assert.deepEqual(selectionProblems(frontmatterThroughBody, manuscript), ["repair-tools[0]-body-span-absent"]);
  assert.match(editorialToolSchema().properties.repairTools.description, /never address frontmatter bytes/iu);
});

test("customer paths cannot substitute for carried manuscript and evidence values", async () => {
  const result = await solicitEditorialAssessment(solicitation(demand({ roots: ["/"], manuscriptPath: "/customer/draft.md" })), NOW, OPTIONS);
  assert.equal(result.type, "Reject");
  assert.equal(result.object.code, "inadmissible-demand");
  assert.match(result.object.reason, /customer territory authority is inadmissible/u);
});

test("an accepted assessment cannot change manuscript bytes or the tool schema", async () => {
  const offer = await solicitEditorialAssessment(solicitation(), NOW, OPTIONS);
  const changed = structuredClone(contract(offer));
  changed.object.offer.object.sourceActivity.object.manuscript.bytes += " Changed.";
  const result = await invokeEditorialAssessment(changed, NOW, OPTIONS);
  assert.equal(result.type, "Reject");
  assert.equal(result.object.code, "invalid-contract");
  assert.match(result.object.reason, /changed or is no longer admissible/u);
});
