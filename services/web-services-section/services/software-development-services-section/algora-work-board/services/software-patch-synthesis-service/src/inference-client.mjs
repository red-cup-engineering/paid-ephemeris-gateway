import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { discoverSignedAgentCard } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { assayTypedInferenceCandidate } from "@red-cup-engineering/inference-work-lot-service/customer-assay-typed-inference";
import { resolutionCreditPolicy, validateConsiderationPolicy } from "@red-cup-engineering/inference-work-lot-service/consideration";
import { loadProviderAdmissions, standingOfferFromAgentCard } from "@red-cup-engineering/inference-work-lot-service/provider-admission";
import { demandCommitment, procureTypedInference } from "@red-cup-engineering/inference-work-lot-service/typed-rmn-inference-procurement";
import { SYNTHESIS_ACTOR as ACTOR, SYNTHESIS_ROOT as ROOT, SYNTHESIS_SERVICES as SERVICES } from "./service-bindings.mjs";

const ACCOUNT = JSON.parse(readFileSync(resolve(ROOT, "content/evm/accounts/eip155-31337.json"), "utf8")).account.caip10;
const ADMISSIONS = loadProviderAdmissions(resolve(ROOT, "content/provider-admissions/inference-providers.nq"), { admissionGraph: `${ACTOR}:provider-admissions` });

function suppliers(signal) {
  return ADMISSIONS.map((provider) => ({
    actor: provider.actor,
    agentCard: provider.agentCard,
    async exchange(activity) {
      const card = await discoverSignedAgentCard({ agentUrl: provider.agentCard, signal });
      return standingOfferFromAgentCard(provider, card, activity, activity.object, demandCommitment);
    },
  }));
}

export async function procureJson({ messages, schema, maxTokens = 1024, difficulty = 0.5, workType = "software-engineering", requiredCapabilities = ["software-engineering", "json-schema-output"], considerationPolicy = resolutionCreditPolicy(31), signal } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("typed inference requires one or more bounded messages");
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) throw new Error("typed inference requires one customer-owned JSON Schema");
  const admitted = suppliers(signal);
  const workLot = `${ACTOR}:work-lot:${randomUUID()}`;
  const request = {
    workLot: { id: workLot, producer: ACTOR },
    context: { messages, purpose: "Produce one advisory patch candidate for customer assay and sandboxed execution." },
    actuatorTerms: {
      workType,
      requiredCapabilities: [...new Set([...requiredCapabilities, "json-output", "json-schema-output"])],
      difficulty,
      maxTokens,
      considerationPolicy: validateConsiderationPolicy(considerationPolicy),
      mode: "live",
      outputContract: { format: "json", mode: "json_schema", schema },
      agentCards: admitted.map(({ actor, agentCard }) => ({ actor, url: agentCard })),
    },
  };
  const procurement = await procureTypedInference({
    residue: { type: "AlgoraSoftwareWorkInferenceResidue", workLot, reason: "no deterministic resolver covered this bounded software-work operation", customerAcceptanceRequired: true },
    request,
    suppliers: admitted,
    caller: { actor: ACTOR, account: ACCOUNT },
    customerServices: SERVICES,
    settlementRoot: ROOT,
    dataRoot: resolve(ROOT, "data"),
  });
  if (procurement.disposition !== "candidate-pending-customer-assay") throw new Error(`typed inference refused: ${procurement.disposition}`);
  const assay = await assayTypedInferenceCandidate(procurement, { customer: ACTOR, customerServices: SERVICES, settlementRoot: ROOT, dataRoot: resolve(ROOT, "data") });
  if (!assay.accepted) throw new Error(`typed inference schema assay refused: ${assay.problems.join("; ")}`);
  return Object.freeze({
    value: JSON.parse(procurement.settlement.candidate),
    provider: procurement.selection.selected.provider.actor,
    consideration: procurement.selection.selectedConsideration,
    settlement: procurement.settlement.completion,
    schemaAssay: assay.id,
    semanticCustomerAcceptance: false,
  });
}

export async function complete({ messages, maxTokens = 1024, difficulty = 0.5, signal } = {}) {
  const result = await procureJson({
    messages,
    maxTokens,
    difficulty,
    signal,
    schema: { type: "object", required: ["text"], properties: { text: { type: "string" } }, additionalProperties: false },
  });
  return result.value.text;
}

export function extractDiff(text) {
  const source = String(text ?? "").trim();
  const fenced = source.match(/```diff\s*([\s\S]*?)```/iu);
  const candidate = (fenced?.[1] ?? source).trim();
  return /^(?:diff --git |--- )/u.test(candidate) ? `${candidate}\n` : null;
}

export async function estimateDifficulty({ title, body, signal } = {}) {
  const result = await procureJson({
    messages: [
      { role: "system", content: "Estimate software-issue difficulty from 0 (trivial) to 1 (research-hard). Supply evidence only through the contracted JSON." },
      { role: "user", content: `Title: ${title ?? ""}\n\n${String(body ?? "").slice(0, 4000)}` },
    ],
    maxTokens: 128,
    difficulty: 0.25,
    workType: "classification",
    requiredCapabilities: ["classification", "json-schema-output"],
    schema: { type: "object", required: ["difficulty"], properties: { difficulty: { type: "number", minimum: 0, maximum: 1 } }, additionalProperties: false },
    signal,
  });
  return result.value.difficulty;
}

export async function contractRefinementCandidate({ task, context = {}, difficulty = 0.45 } = {}) {
  const failures = (context.failures ?? []).map((failure) => failure.test ?? failure.apply ?? "").filter(Boolean).slice(-2);
  const result = await procureJson({
    messages: [
      { role: "system", content: "Propose one minimal unified diff. Customer application, sandbox verification, and acceptance remain outside your authority." },
      { role: "user", content: `TASK: ${task?.title ?? ""}\n${task?.body ?? ""}\n\nFOCUS:\n${JSON.stringify(context.focusFiles ?? [])}\n\nSOURCE:\n${String(context.source ?? "").slice(0, 50000)}\n\nPRIOR FAILURES:\n${failures.join("\n")}` },
    ],
    maxTokens: 900,
    difficulty: Math.min(difficulty, 0.45),
    schema: { type: "object", required: ["patch", "rationale"], properties: { patch: { type: "string", minLength: 20 }, rationale: { type: "string", minLength: 10 } }, additionalProperties: false },
  });
  return { patch: result.value.patch, rationale: result.value.rationale, provider: result.provider, consideration: result.consideration, settlement: result.settlement };
}
