#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { requestInferenceWorkLot } from "@red-cup-engineering/inference-work-lot-service/client";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "rsc-quiescent.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { createSettlementStore, relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";

export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTOR = "urn:ame:independent-editorial-assessment";
export const EDITORIAL_TOOLS = Object.freeze(["submit_editorial_acceptance", "submit_revision_request", "submit_editorial_refusal"]);
export const EDITORIAL_REPAIR_TOOLS = Object.freeze(["replace_exact_body_text", "repair_editorial_surfaces"]);
const FAILURE_LAYERS = Object.freeze(["sources", "assignment", "instructions", "deterministic-gates", "writer-model", "draft-repair", "none"]);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_KEYS = new Set(["root", "roots", "path", "paths", "contentDir", "dataDir", "storeDir", "manuscriptPath", "outputPath", "customerFilesystem"]);
function forbiddenKey(key) { return FORBIDDEN_KEYS.has(key) || /(?:path|paths|root|roots|dir|dirs)$/iu.test(key); }

export function digest(value) { return typeof value === "string" || Buffer.isBuffer(value) || value instanceof Uint8Array
  ? `sha256:${createHash("sha256").update(value).digest("hex")}` : semanticId(value); }
function contentId(value) { return semanticId(value); }
function equivalent(left, right) { return digest(left) === digest(right); }
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validInstant(value) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value)); }
function dataRoot(env = process.env) { return resolve(env["INDEPENDENT_EDITORIAL_ASSESSMENT_DATA_ROOT"] ?? join(ROOT, "data")); }
function store(env = process.env) { return createSettlementStore({ settlementRoot: ROOT, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT }); }
async function append(kind, value, instant, env = process.env) {
  const record = { type: "EditorialAssessmentEvidence", kind, ...value, recordedAt: instant };
  return store(env).record({ category: `independent-editorial-assessment.${kind}`, recordedAt: instant, record });
}
function response(type, source, object, instant) { const body = { actor: ACTOR, type, target: source?.actor ?? "urn:actor:unknown", inReplyTo: source?.id ?? null, object }; return Object.freeze({ "@context": CONTEXT, id: contentId(body), ...body, published: instant }); }
async function refusal(source, code, reason, instant, details = {}) { const result = response("Reject", source, Object.freeze({ type: "Refusal", code, reason, ...details }), instant); await append("provider.refusal", { code, reason, activityDigest: digest(source ?? null), responseDigest: digest(result) }, instant); return result; }
function forbidden(value, prefix = "demand") { if (Array.isArray(value)) return value.flatMap((item, index) => forbidden(item, `${prefix}[${index}]`)).at(0); if (!isRecord(value)) return undefined; for (const [key, child] of Object.entries(value)) { if (forbiddenKey(key)) return `${prefix}.${key}`; const nested = forbidden(child, `${prefix}.${key}`); if (nested !== undefined) return nested; } return undefined; }
function demandFrom(activity) { const sourceActivity = activity?.object?.sourceActivity; const demand = sourceActivity?.object; return sourceActivity?.type === "Create" && demand?.type === "EditorialAssessmentDemand" ? { sourceActivity, demand } : undefined; }
function validateDemand(demand) {
  const failures = []; const overreach = forbidden(demand); if (overreach !== undefined) failures.push(`customer territory authority is inadmissible at ${overreach}`);
  if (typeof demand?.slug !== "string" || demand.slug.trim() === "") failures.push("slug");
  if (typeof demand?.manuscript?.bytes !== "string" || demand.manuscript.bytes.trim() === "" || demand.manuscript.digest !== digest(demand.manuscript.bytes)) failures.push("manuscript exact bytes and digest");
  if (!isRecord(demand?.editorialContext?.standards) || !Array.isArray(demand?.editorialContext?.evidence) || demand.editorialContext.digest !== digest({ standards: demand.editorialContext.standards, run: demand.editorialContext.run ?? null, evidence: demand.editorialContext.evidence, pipeline: demand.editorialContext.pipeline ?? [] })) failures.push("editorialContext exact digest");
  for (const field of ["publicationPolicyDigest", "genreLawDigest", "editorialDutyDigest"]) if (typeof demand?.authorities?.[field] !== "string" || !demand.authorities[field].startsWith("ni:///sha-256;")) failures.push(`authorities.${field}`);
  if (!["dry-run", "live"].includes(demand?.executionMode)) failures.push("executionMode");
  for (const key of ["model", "provider", "tier", "child", "childAgentCard", "childAccount", "childLaw", "childModel"]) if (Object.hasOwn(demand ?? {}, key)) failures.push(`downstream inference selection is forbidden at demand.${key}`);
  return [...new Set(failures)];
}
export function editorialToolSchema() {
  return Object.freeze({ type: "object", additionalProperties: false, properties: Object.freeze({
    tool: Object.freeze({ type: "string", enum: EDITORIAL_TOOLS, description: "Choose acceptance only when no manuscript repair remains; acceptance requires failureLayer=none and requiredRepairs=[]." }),
    failureLayer: Object.freeze({ type: "string", enum: FAILURE_LAYERS, description: "The earliest defective layer. Must be none for submit_editorial_acceptance." }),
    replayFrom: Object.freeze({ type: "string", minLength: 1, maxLength: 120 }),
    summary: Object.freeze({ type: "string", minLength: 1, maxLength: 2000 }),
    requiredRepairs: Object.freeze({ type: "array", maxItems: 20, description: "Material manuscript repairs only. Must be an empty array for submit_editorial_acceptance; publication flags are never repairs.", items: Object.freeze({ type: "string", minLength: 1, maxLength: 1000 }) }),
    repairTools: Object.freeze({ type: "array", maxItems: 20, description: "Executable bounded repairs. Select replace_exact_body_text for one exact unique Markdown-body span. Select repair_editorial_surfaces to have deterministic code regenerate summary and description from the admitted body and prune carrier artifacts. Never address frontmatter bytes with a body tool. Leave empty when replay from an earlier layer or a full prose contribution is genuinely required.", items: Object.freeze({ oneOf: Object.freeze([
      Object.freeze({ type: "object", additionalProperties: false, properties: Object.freeze({
        tool: Object.freeze({ const: "replace_exact_body_text" }),
        before: Object.freeze({ type: "string", minLength: 1, maxLength: 6000 }),
        after: Object.freeze({ type: "string", maxLength: 6000 }),
      }), required: Object.freeze(["tool", "before", "after"]) }),
      Object.freeze({ type: "object", additionalProperties: false, properties: Object.freeze({
        tool: Object.freeze({ const: "repair_editorial_surfaces" }),
      }), required: Object.freeze(["tool"]) }),
    ]) }) }),
    report: Object.freeze({ type: "string", minLength: 500 }),
  }), required: Object.freeze(["tool", "failureLayer", "replayFrom", "summary", "requiredRepairs", "repairTools", "report"]) });
}
function editorialPrompt(demand) {
  return [
    "You hold an independent editorial assessment duty. Do not rewrite the manuscript and do not authorize publication directly. Select exactly one bounded customer tool through the supplied schema and put all substantive judgment in the prose report field.",
    "Select submit_editorial_acceptance only when the deterministic standards reading is clear, every material factual claim is supported by the witnessed evidence, attribution is visible, headline and lede are faithful, and the prose is specific, useful, non-repetitive, and not padded with confident abstraction. Acceptance MUST carry failureLayer=none and requiredRepairs=[] exactly.",
    "Select submit_revision_request when a bounded repair can make the exact manuscript publishable. Select submit_editorial_refusal when the thesis, assignment, or evidence basis requires replay rather than surface repair.",
    "When every material defect is local, fill repairTools with bounded acts instead of asking another model to rewrite the manuscript. For body prose, each replace_exact_body_text before value must copy one exact unique span from the Markdown body; after is the complete replacement and may be empty for deletion. For malformed summary, description, or carrier preamble, select repair_editorial_surfaces; deterministic Koios code projects those surfaces from the admitted body, so never copy or replace frontmatter bytes. Preserve all unmentioned bytes. Use an empty repairTools array only when exact bounded edits cannot faithfully perform the repair.",
    "Diagnose the earliest causal failure layer. Do not blame the writer model for defects compelled by thin sources or an unsupported assignment. Treat historical production gates as provenance, not current truth; the supplied deterministic standards reading governs the current bytes. Never request toggling draft, gates_clear, or other publication-state flags: Koios performs that deterministic work after an accepted editorial selection.",
    "Apply ordinary newsroom verification to model-written prose: model output is never evidence. Prefer original and named sources, check whether consequential assertions are corroborated, preserve uncertainty and source motives, and make explicit what the reporting does not establish.",
    "When the manuscript criticizes a person or institution, alleges wrongdoing, or reports a dispute, require evidence that the criticized subject's response is represented or that a documented opportunity to respond was sought. If the carried sources cannot support fairness, diagnose sources or assignment as the earliest failure layer and replay from reporting rather than polishing the prose.",
    "Check for needless harm, sensationalism, stereotypes, unattributed opinion, and commercial influence. Reported analysis must remain visibly distinct from advocacy, advertising, and unsupported interpretation.",
    "The report must explain findings, audit material claims against witnessed evidence, state required repairs, and explain the pipeline diagnosis. Free-form words resembling ACCEPT or REFUSE have no effect; only the validated tool field is actionable.",
    `SLUG\n${demand.slug}`,
    `DETERMINISTIC STANDARDS\n${JSON.stringify(demand.editorialContext.standards)}`,
    `PRODUCTION RUN\n${JSON.stringify(demand.editorialContext.run ?? null)}`,
    `WITNESSED SOURCE AND CLAIM RECORDS\n${JSON.stringify(demand.editorialContext.evidence)}`,
    `OPERATIVE PIPELINE ARTIFACTS\n${JSON.stringify(demand.editorialContext.pipeline ?? [])}`,
    `MANUSCRIPT\n${demand.manuscript.bytes}`,
  ].join("\n\n");
}
function required(env, name) { const value = env[name]; if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`); return value; }
function inferenceRoute(options = {}) {
  if (options.route) return Object.freeze(structuredClone(options.route));
  const env = options.env ?? process.env;
  return Object.freeze({
    marketAgentCard: required(env, "INFERENCE_WORK_LOT_AGENT_CARD_URL"),
  });
}
function routeProblem(route) {
  if (!/^https?:\/\//u.test(route?.marketAgentCard ?? "")) return "inference procurement must name the hired inference-work market Agent Card";
  for (const key of ["model", "provider", "tier", "child", "childAgentCard", "childAccount", "childLaw", "childModel"]) if (Object.hasOwn(route ?? {}, key)) return `editorial service may not select inference supply through ${key}`;
  return null;
}
async function executeInferenceRoute(demand, route, { request = requestInferenceWorkLot } = {}) {
  const exchange = await request({
    agentUrl: route.marketAgentCard,
    request: {
      objective: `Independently assess the exact Koios manuscript ${demand.slug} and select one bounded editorial tool.`,
      context: editorialPrompt(demand),
      desiredUse: "Return one advisory editorial selection for deterministic provider-local validation; do not authorize publication.",
      workType: "inquiry",
      requiredCapabilities: ["json-output", "json-schema-output"],
      difficulty: 0.7,
      maxTokens: 4096,
      outputSchema: editorialToolSchema(),
      excludeProviders: [],
      customer: ACTOR,
      workLotId: `urn:work-lot:independent-editorial-assessment:${digest(demand).replace("sha256:", "")}`,
      mode: "live",
      routingProfile: "extended",
      extendedRoutingRationale: "independent editorial assessment requires above-bounded difficulty for judgment work",
    },
  });
  if (exchange.result.outcome !== "candidate-pending-customer-acceptance") return Object.freeze({ disposition: "market-residue", marketResult: exchange.result, marketResultNi: exchange.resultNi });
  return Object.freeze({
    disposition: "completion",
    selection: exchange.result.candidate,
    market: exchange.provider.account,
    provider: exchange.result.provider,
    model: exchange.result.model,
    requestNi: exchange.exchange.inputNi,
    resultNi: exchange.resultNi,
    compactNi: exchange.result.evidence?.compact,
    settlementNi: exchange.result.evidence?.settlement,
    receiptNi: exchange.result.evidence?.receipt,
    schemaAssayNi: exchange.result.evidence?.schemaAssay,
  });
}
function marketReceipt(providerResult) {
  return Object.freeze({ type: "InferenceWorkMarketReceipt", market: providerResult.market, provider: providerResult.provider, model: providerResult.model, serviceClass: "editorial-judgment", disposition: providerResult.disposition, requestNi: providerResult.requestNi, resultNi: providerResult.resultNi, compactNi: providerResult.compactNi, settlementNi: providerResult.settlementNi, receiptNi: providerResult.receiptNi, schemaAssayNi: providerResult.schemaAssayNi });
}

export async function solicitEditorialAssessment(activity, instant = new Date().toISOString(), options = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Offer" || activity?.target !== ACTOR || activity?.object?.type !== "ServiceSolicitation") return refusal(activity, "wrong-boundary", "solicitation must be an ActivityStreams Offer<ServiceSolicitation> naming the exact editorial-assessment RMN law", instant);
  const found = demandFrom(activity); if (found === undefined) return refusal(activity, "unrecognized-demand", "source activity must create one EditorialAssessmentDemand", instant);
  const failures = validateDemand(found.demand); if (failures.length > 0) return refusal(activity, "inadmissible-demand", `editorial assessment demand is incomplete or over-authorized: ${failures.join(", ")}`, instant, { failures });
  let route; try { route = inferenceRoute(options); } catch (error) { return refusal(activity, "inference-route-unavailable", error.message, instant); }
  const routeInvalid = routeProblem(route); if (routeInvalid) return refusal(activity, "inference-route-invalid", routeInvalid, instant);
  const demandDigest = digest(found.demand); const effects = Object.freeze(["inference", "provider-local-witness-journal-evidence"]);
  const scope = Object.freeze({ toolSchemaDigest: digest(editorialToolSchema()), serviceClass: "editorial-judgment" });
  const object = Object.freeze({ type: "ExecutableServiceOffer", service: "assess-manuscript", sourceActivity: found.sourceActivity, demandDigest, operation: "invoke-service", scope, effects, requirements: Object.freeze(effects.map((effect) => Object.freeze({ type: "ResourceGrant", effect }))), terms: Object.freeze({ type: "UnpricedServiceTerms", assetPaymentRequired: false }) });
  const offer = response("Offer", activity, object, instant); await append("provider.offer", { offerId: offer.id, demandDigest, upstreamService: "urn:ame:inference-work-lot-service", effects }, instant); return offer;
}
function validateInvocation(activity) { if (activity?.["@context"] !== CONTEXT || activity?.type !== "Accept" || activity?.target !== ACTOR) return "invocation must be an ActivityStreams Accept addressed to Independent Editorial Assessment"; const contract = activity.object; const offer = contract?.offer; if (contract?.type !== "ServiceContract" || offer?.actor !== ACTOR) return "invocation must accept this provider's exact editorial-assessment offer"; const demand = offer.object.sourceActivity?.object; if (digest(demand) !== offer.object.demandDigest || validateDemand(demand).length > 0) return "accepted editorial demand changed or is no longer admissible"; const scope = offer.object.scope; if (scope?.toolSchemaDigest !== digest(editorialToolSchema()) || scope?.serviceClass !== "editorial-judgment") return "accepted editorial tool or service class changed"; const capability = contract.capability; if (capability?.type !== "Capability" || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR || capability.parentOffer !== offer.id || capability.attenuation?.demandDigest !== offer.object.demandDigest || !equivalent(capability.attenuation?.providerScope, offer.object.scope)) return "accepted contract lacks an exact editorial-assessment capability"; for (const effect of offer.object.effects ?? []) if (!capability.allowedActions?.includes(effect)) return `customer capability does not grant ${effect}`; return undefined; }
function manuscriptBody(bytes) { const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/u.exec(bytes); return match?.[1]; }
export function selectionProblems(value, manuscriptBytes) {
  const problems = [];
  if (!isRecord(value)) return Object.freeze(["selection-not-an-object"]);
  if (!EDITORIAL_TOOLS.includes(value.tool)) problems.push("unknown-editorial-tool");
  if (!FAILURE_LAYERS.includes(value.failureLayer)) problems.push("unknown-failure-layer");
  if (typeof value.replayFrom !== "string" || value.replayFrom.length === 0) problems.push("replay-from-missing");
  if (typeof value.summary !== "string" || value.summary.length === 0) problems.push("summary-missing");
  if (!Array.isArray(value.requiredRepairs) || value.requiredRepairs.some((item) => typeof item !== "string")) problems.push("required-repairs-invalid");
  if (!Array.isArray(value.repairTools)) problems.push("repair-tools-invalid");
  if (typeof value.report !== "string" || value.report.length < 500) problems.push("report-too-short");
  const repairTools = Array.isArray(value.repairTools) ? value.repairTools : [];
  for (const [index, repair] of repairTools.entries()) {
    if (!isRecord(repair) || !EDITORIAL_REPAIR_TOOLS.includes(repair.tool)) { problems.push(`repair-tools[${index}]-unknown`); continue; }
    if (repair.tool === "replace_exact_body_text" && (typeof repair.before !== "string" || repair.before.length === 0 || typeof repair.after !== "string" || repair.before === repair.after)) problems.push(`repair-tools[${index}]-body-arguments-invalid`);
    if (repair.tool === "repair_editorial_surfaces" && Object.keys(repair).some((key) => key !== "tool")) problems.push(`repair-tools[${index}]-surface-arguments-forbidden`);
  }
  if (value.tool !== "submit_revision_request" && repairTools.length !== 0) problems.push("repair-tools-require-revision");
  if (value.tool === "submit_editorial_acceptance" && (value.failureLayer !== "none" || !Array.isArray(value.requiredRepairs) || value.requiredRepairs.length !== 0)) problems.push("acceptance-carries-defects");
  if (manuscriptBytes !== undefined) {
    let body = manuscriptBody(manuscriptBytes); if (body === undefined) problems.push("manuscript-body-unreadable");
    else for (const [index, repair] of repairTools.entries()) {
      if (!isRecord(repair) || repair.tool !== "replace_exact_body_text" || typeof repair.before !== "string" || typeof repair.after !== "string") continue;
      const first = body.indexOf(repair.before);
      if (first < 0) problems.push(`repair-tools[${index}]-body-span-absent`);
      else if (body.indexOf(repair.before, first + repair.before.length) >= 0) problems.push(`repair-tools[${index}]-body-span-not-unique`);
      else body = `${body.slice(0, first)}${repair.after}${body.slice(first + repair.before.length)}`;
    }
  }
  return Object.freeze([...new Set(problems)]);
}
export function validateSelection(value, manuscriptBytes) {
  return selectionProblems(value, manuscriptBytes).length === 0;
}
function discardInapplicableExactRepairs(selection, manuscriptBytes) {
  if (!Array.isArray(selection?.repairTools) || manuscriptBytes === undefined) return Object.freeze({ selection, discardedProblems: Object.freeze([]) });
  let body = manuscriptBody(manuscriptBytes);
  if (body === undefined) return Object.freeze({ selection, discardedProblems: Object.freeze([]) });
  const retained = [], discardedProblems = [];
  for (const [index, repair] of selection.repairTools.entries()) {
    if (!isRecord(repair) || repair.tool !== "replace_exact_body_text" || typeof repair.before !== "string" || typeof repair.after !== "string") {
      retained.push(repair); continue;
    }
    const first = body.indexOf(repair.before);
    if (first < 0) { discardedProblems.push(`repair-tools[${index}]-body-span-absent`); continue; }
    if (body.indexOf(repair.before, first + repair.before.length) >= 0) { discardedProblems.push(`repair-tools[${index}]-body-span-not-unique`); continue; }
    retained.push(repair);
    body = `${body.slice(0, first)}${repair.after}${body.slice(first + repair.before.length)}`;
  }
  const filtered = Object.freeze({ ...selection, repairTools: Object.freeze(retained) });
  if (selectionProblems(filtered, manuscriptBytes).length > 0) return Object.freeze({ selection, discardedProblems: Object.freeze([]) });
  return Object.freeze({ selection: filtered, discardedProblems: Object.freeze(discardedProblems) });
}
export async function invokeEditorialAssessment(activity, instant = new Date().toISOString(), options = {}) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`); const invalid = validateInvocation(activity); if (invalid !== undefined) return refusal(activity, "invalid-contract", invalid, instant);
  const offer = activity.object.offer; const demand = offer.object.sourceActivity.object;
  if (demand.executionMode === "dry-run") {
    const exchangeId = contentId({ offer: offer.id, ready: offer.object.demandDigest, instant });
    const providerExchange = Object.freeze({ id: exchangeId, exchangeId, provider: ACTOR, service: "assess-manuscript", outcome: "ready", terms: offer.object.terms, demandDigest: offer.object.demandDigest, recordedAt: instant });
    const object = Object.freeze({ type: "EditorialToolSelectionDelivery", disposition: "ready", dryRun: true, demandDigest: offer.object.demandDigest, providerExchange });
    const result = response("Accept", activity, object, instant); await append("provider.exchange", { ...providerExchange, responseDigest: digest(result) }, instant); return result;
  }
  const infer = options.infer ?? executeInferenceRoute;
  let providerResult; try { providerResult = await infer(demand, inferenceRoute(options), options); }
  catch (error) { return refusal(activity, "inference-obstructed", error instanceof Error ? error.message : String(error), instant, { attempts: 1 }); }
  if (!providerResult || providerResult.disposition !== "completion") return refusal(activity, "inference-obstructed", "the contracted inference-work market did not return a candidate settlement", instant, { providerResult });
  const upstreamReceipt = marketReceipt(providerResult);
  if (![upstreamReceipt.requestNi, upstreamReceipt.resultNi, upstreamReceipt.compactNi, upstreamReceipt.settlementNi, upstreamReceipt.receiptNi, upstreamReceipt.schemaAssayNi].every((value) => /^ni:\/\/\/sha-256;/u.test(value ?? ""))) return refusal(activity, "inference-obstructed", "inference-work market completed without exact demand, compact, settlement, receipt, and assay evidence", instant, { upstreamReceipt });
  await append("upstream.purchase", { market: upstreamReceipt.market, supplier: upstreamReceipt.provider, model: upstreamReceipt.model, serviceClass: upstreamReceipt.serviceClass, demandDigest: offer.object.demandDigest, requestNi: upstreamReceipt.requestNi, resultNi: upstreamReceipt.resultNi, compactNi: upstreamReceipt.compactNi, settlementNi: upstreamReceipt.settlementNi, receiptNi: upstreamReceipt.receiptNi, schemaAssayNi: upstreamReceipt.schemaAssayNi, disposition: upstreamReceipt.disposition }, instant);
  let selection = providerResult.selection;
  const admitted = discardInapplicableExactRepairs(selection, demand.manuscript.bytes);
  selection = admitted.selection;
  const problems = selectionProblems(selection, demand.manuscript.bytes); if (problems.length > 0) return refusal(activity, "invalid-tool-selection", `the inference-work market delivered an editorial tool selection that failed deterministic admission: ${problems.join(", ")}`, instant, { problems, providerResult });
  const exchangeId = contentId({ offer: offer.id, selection: digest(selection), instant }); const providerExchange = Object.freeze({ id: exchangeId, exchangeId, provider: ACTOR, service: "assess-manuscript", outcome: "completion", terms: offer.object.terms, demandDigest: offer.object.demandDigest, toolSelectionDigest: digest(selection), upstreamReceiptDigest: digest(upstreamReceipt), upstreamReceiptNi: upstreamReceipt.receiptNi, recordedAt: instant });
  const object = Object.freeze({ type: "EditorialToolSelectionDelivery", disposition: "completion", dryRun: false, demandDigest: offer.object.demandDigest, manuscriptDigest: offer.object.sourceActivity.object.manuscript.digest, editorialContextDigest: offer.object.sourceActivity.object.editorialContext.digest, toolSelection: Object.freeze(selection), toolSelectionDigest: digest(selection), ...(admitted.discardedProblems.length === 0 ? {} : { discardedRepairToolProblems: admitted.discardedProblems }), providerExchange }); const result = response("Accept", activity, object, instant); await append("provider.exchange", { ...providerExchange, responseDigest: digest(result) }, instant); await append("provider.learning", { demandDigest: offer.object.demandDigest, toolSelectionDigest: digest(selection), selectedTool: selection.tool, failureLayer: selection.failureLayer, deterministicRepairCapabilities: selection.repairTools.map((repair) => repair.tool), frontierInferenceAvoidableNextTime: selection.repairTools.length > 0 }, instant); return result;
}
function arg(flag) { const index = process.argv.indexOf(flag); return index === -1 ? undefined : process.argv[index + 1]; }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const operation = arg("--operation") ?? "solicit-service"; const instant = arg("--now") ?? new Date().toISOString(); const activity = JSON.parse(readFileSync(arg("--input-file") ?? 0, "utf8")); const result = operation === "solicit-service" ? await solicitEditorialAssessment(activity, instant) : operation === "invoke-service" ? await invokeEditorialAssessment(activity, instant) : await refusal(activity, "unknown-operation", `unknown operation ${operation}`, instant); const output = `${JSON.stringify(result, null, 2)}\n`; const outputPath = arg("--output-file"); if (outputPath === undefined) process.stdout.write(output); else writeFileSync(outputPath, output, "utf8"); if (result.type === "Reject") process.exitCode = 2; }
