#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requestInferenceWorkLot } from "@red-cup-engineering/inference-work-lot-service/client";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, identifyNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import { assayWitTransition } from "@lenticule-science/wit-transition-assay/client";
import { appendEditorialContributionWitness } from "./editorial-witness.mjs";

export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTOR = "urn:ame:newswire-editorial-production";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
export const OPERATION_TYPE = ["product", ["mark"], ["product", ["mark"], ["product", ["mark"], ["mark"]]]];
export const ACCOUNT = JSON.parse(readFileSync(resolve(ROOT, "content/evm/accounts/eip155-31337.json"), "utf8")).account.caip10;
function response(type, source, object) { return { "@context": CONTEXT, id: `urn:uuid:${randomUUID()}`, type, actor: ACTOR, target: source.actor, inReplyTo: source.id, object }; }
function witAgent() { if (!process.env.WIT_TRANSITION_ASSAY_AGENT) throw new Error("WIT_TRANSITION_ASSAY_AGENT must name the hired WIT transition provider's signed A2A 1.0 Agent Card"); return process.env.WIT_TRANSITION_ASSAY_AGENT; }
function document(value, name) {
  if (value?.type !== "Document" || value.mediaType !== "application/rmn+cbor" || typeof value.id !== "string" || typeof value.content !== "string") throw new Error(`${name} must carry canonical application/rmn+cbor bytes`);
  return value;
}
function sameField(left, right, field) { if (left[field] !== right[field]) throw new Error(`completion changed ${field}`); }
function appendWitnessJournal({ proposal, completion, witness, inference, disposition }) {
  const at = new Date().toISOString();
  return appendEditorialContributionWitness(ROOT, at, { proposal, completion, witness, inference, disposition });
}

function textIntent(term) {
  const mark = (value, label) => { if (!Array.isArray(value) || value[0] !== "mark" || typeof value[1] !== "string") throw new Error(`text work intent lacks ${label}`); return value[1]; };
  if (!Array.isArray(term) || term[0] !== "pair" || !Array.isArray(term[2]) || term[2][0] !== "pair" || !Array.isArray(term[2][2]) || term[2][2][0] !== "pair") throw new Error("text work intent has a foreign RMN shape");
  return Object.freeze({ instruction: mark(term[1], "instruction"), prompt: mark(term[2][1], "prompt"), serviceClass: mark(term[2][2][1], "service class"), executionMode: mark(term[2][2][2], "execution mode") });
}

function identifyTerm(term, semanticType, objectKind) {
  semanticType = inferTy([], term);
  if (semanticType === null) throw new Error(`${objectKind} does not infer one current RMN type`);
  const identified = identifyNormalizedSemanticContent({ objectKind, semanticType, term, witnessRoot: EMPTY_WITNESS_ROOT });
  return { term: identified.token, normalForm: identified.envelope.settledBody, canonicalBytesBase64: Buffer.from(identified.bytes).toString("base64") };
}

export async function invokeProseContribution(source, { marketAgentUrl = process.env.INFERENCE_WORK_LOT_AGENT_CARD_URL, request = requestInferenceWorkLot } = {}) {
  if (source?.["@context"] !== CONTEXT || source.type !== "Accept" || source.target !== ACTOR || source.object?.type !== "ServiceContract") throw new Error("prose contribution must be an ActivityStreams Accept<ServiceContract> addressed to Newswire's RMN law");
  const proposalDoc = document(source.object.proposal, "proposal");
  const proposal = admitJsonSemanticContent({ bytes: Buffer.from(proposalDoc.content, "base64"), token: proposalDoc.id, objectKind: "newswire.prose-contribution-proposal" });
  const cell = proposal.value?.cell, operation = proposal.value?.operation;
  if (cell.provider !== ACCOUNT) throw new Error("proposal is not addressed to Newswire's law, smart account, and service scale");
  if (source.object.callerAccount !== cell.caller) throw new Error("callerAccount does not match the RMN caller");
  if (cell.outcome?.positiveEvidence !== false || cell.outcome?.negativeEvidence !== false) throw new Error("proposal must enter at FOUR-bottom");
  const intentValue = identifyTerm(operation, OPERATION_TYPE, "koios.text-work-intent");
  const intent = textIntent(intentValue.normalForm);
  if (typeof marketAgentUrl !== "string" || !/^https?:\/\//u.test(marketAgentUrl)) throw new Error("INFERENCE_WORK_LOT_AGENT_CARD_URL is required");
  const market = await request({ agentUrl: marketAgentUrl, request: {
    objective: intent.instruction, context: intent.prompt,
    desiredUse: "Return one prose candidate for independent Newswire and Koios assay; do not claim customer acceptance.",
    workType: "chat", requiredCapabilities: [intent.serviceClass, "text-output"], difficulty: 0.45, maxTokens: 4096,
    outputSchema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string", minLength: 1 } } },
    excludeProviders: [], customer: ACTOR, workLotId: `urn:work-lot:newswire:${proposal.term.split(";")[1]}`, mode: intent.executionMode,
    // This commission's article/headline prose regularly needs more than the
    // bounded provider frontier's 700-token, 12000-character allowance
    // (@red-cup-engineering/inference-work-lot-service BOUNDED_CODEX_ROUTING_PROFILE);
    // state the customer rationale the market's own law requires rather than
    // let every over-bound commission die as an unrouted refusal.
    routingProfile: "extended",
    extendedRoutingRationale: "Newswire editorial production commission; bounded profile insufficient for full-length article and headline prose work.",
  } });
  const result = market.result ?? {}, candidate = result.candidate;
  const accepted = result.outcome === "candidate-pending-customer-acceptance" && candidate && typeof candidate === "object" && typeof candidate.text === "string" && candidate.text.length > 0;
  const inference = Object.freeze({ market: market.provider.account, workLot: result.workLot, provider: result.provider, model: result.model, request: market.exchange.inputNi, result: market.resultNi, settlement: result.evidence?.settlement, receipt: result.evidence?.receipt, disposition: result.outcome });
  const completionCell = { ...cell, evidenceRoot: market.resultNi, outcome: { positiveEvidence: accepted, negativeEvidence: !accepted }, measures: [...cell.measures.filter(({ dimension }) => dimension !== "child-inference"), { dimension: "child-inference", quantity: "1", unit: "contract-inference-work" }] };
  for (const field of ["caller", "law", "operation", "parent", "postcondition", "precondition", "provider", "refusal" ]) sameField(cell, completionCell, field);
  const transition = await assayWitTransition({ agentUrl: witAgent(), proposalCell: cell, completionCell, evidence: market.resultNi });
  const completionTerm = ["pair", ["effect", completionCell], operation];
  const completionIdentity = identifyJsonSemanticContent({ objectKind: "newswire.prose-contribution-completion", value: { cell: completionCell, operation }, witnessRoot: EMPTY_WITNESS_ROOT });
  const completion = { term: completionIdentity.token, canonicalBytesBase64: Buffer.from(completionIdentity.bytes).toString("base64") };
  const text = accepted ? candidate.text : "";
  const disposition = accepted ? "completion" : "refused";
  await appendWitnessJournal({ proposal: proposal.token, completion: completion.term, witness: transition.witness, inference: market.resultNi, disposition });
  return response(accepted ? "Accept" : "Reject", source, { type: "RmnProseContributionSettlement", disposition, proposal: proposal.token, completion: completion.term, witness: transition.witness, text, inference, attachment: [{ type: "Document", id: completion.term, mediaType: "application/rmn+cbor", content: completion.canonicalBytesBase64 }] });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await invokeProseContribution(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}
