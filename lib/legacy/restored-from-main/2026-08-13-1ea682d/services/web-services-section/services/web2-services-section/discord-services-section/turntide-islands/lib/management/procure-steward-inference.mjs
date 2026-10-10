/**
 * Turntide Islands' customer side of the Union inference market.
 *
 * Inference is a traded resource, never a pinned provider: the supplier roster
 * is content/provider-admissions/inference-suppliers.nq, the acceptable
 * consideration is content/configurations/steward-inference-consideration-policy.json,
 * and selection among competing offers is the market law's own rule
 * (customer-authored alternative order, then pareto dominance). This module
 * holds no provider identity, endpoint, or price in code.
 *
 * Live procurement additionally requires this settlement's sovereign account
 * (content/evm/accounts/eip155-5615611.json) and the two hired customer
 * services (RMN conformance, witness-journal RDF) on the service plate; while any of
 * those are absent the market refuses with typed reasons, never silently.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverValidatedAgentCard } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { demandCommitment, procureTypedInference } from "@red-cup-engineering/inference-work-lot-service/typed-rmn-inference-procurement";
import { loadCustomerServiceAdmissions, loadProviderAdmissions, standingOfferFromAgentCard } from "@red-cup-engineering/inference-work-lot-service/provider-admission";
import { validateConsiderationPolicy } from "@red-cup-engineering/inference-work-lot-service/consideration";
import { assayTypedInferenceCandidate } from "@red-cup-engineering/inference-work-lot-service/customer-assay-typed-inference";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const TTI_ACTOR = "urn:ame:turntide-islands";
export const SUPPLIER_ADMISSIONS = join(ROOT, "content/provider-admissions/inference-suppliers.nq");
export const SUPPLIER_ADMISSION_GRAPH = "urn:ame:turntide-islands:inference-supplier-admissions";
export const CUSTOMER_SERVICE_ADMISSIONS = join(ROOT, "content/service-admissions/inference-customer-services.nq");
export const CUSTOMER_SERVICE_ADMISSION_GRAPH = "urn:ame:turntide-islands:inference-customer-service-admissions";
export const CONSIDERATION_POLICY = join(ROOT, "content/configurations/steward-inference-consideration-policy.json");
export const SOVEREIGN_BINDING = join(ROOT, "content/evm/accounts/eip155-5615611.json");

export function marketSupplier(provider, signal) {
  return Object.freeze({
    actor: provider.actor,
    id: provider.id,
    agentCard: provider.agentCard,
    async exchange(activity) {
      const card = await discoverValidatedAgentCard(provider.agentCard, { requireSignature: true, signal });
      return standingOfferFromAgentCard(provider, card, activity, activity.object, demandCommitment);
    },
  });
}

/** Assemble the steward's market from the settlement's own records. Every
 * missing precondition becomes a typed refusal; nothing is defaulted. */
export function stewardInferenceMarket({ signal } = {}) {
  const refusals = [];
  let suppliers = [];
  try {
    suppliers = loadProviderAdmissions(SUPPLIER_ADMISSIONS, { admissionGraph: SUPPLIER_ADMISSION_GRAPH }).map((provider) => marketSupplier(provider, signal));
    if (suppliers.length === 0) refusals.push("supplier-plate-empty");
  } catch (error) {
    refusals.push(`supplier-plate-unreadable:${error.message}`);
  }
  let considerationPolicy = null;
  try {
    considerationPolicy = JSON.parse(readFileSync(CONSIDERATION_POLICY, "utf8"));
    validateConsiderationPolicy(considerationPolicy);
  } catch (error) {
    considerationPolicy = null;
    refusals.push(`consideration-policy-invalid:${error.message}`);
  }
  let customerServices = null;
  try {
    customerServices = loadCustomerServiceAdmissions(CUSTOMER_SERVICE_ADMISSIONS, { admissionGraph: CUSTOMER_SERVICE_ADMISSION_GRAPH });
  } catch (error) {
    refusals.push(`customer-services-not-admitted:${error.message}`);
  }
  let caller = null;
  if (existsSync(SOVEREIGN_BINDING)) {
    try {
      const binding = JSON.parse(readFileSync(SOVEREIGN_BINDING, "utf8"));
      caller = Object.freeze({ actor: TTI_ACTOR, account: binding.account.caip10 });
    } catch (error) {
      refusals.push(`sovereign-binding-unreadable:${error.message}`);
    }
  } else {
    refusals.push("sovereign-account-not-provisioned:content/evm/accounts/eip155-5615611.json is absent");
  }
  return Object.freeze({ suppliers, considerationPolicy, customerServices, caller, refusals: Object.freeze(refusals) });
}

/**
 * Procure one steward answer as a bounded market product. Returns the market
 * law's TypedRmnInferenceProcurement (candidate text pending the caller's own
 * assay) or a typed market refusal; it never falls back to a direct endpoint.
 */
export async function procureStewardAnswer(prompt, { system, market, now, signal, invokeProvider, record = true } = {}) {
  if (typeof prompt !== "string" || prompt.trim() === "") throw new Error("one nonempty steward prompt is required");
  const resolved = market ?? stewardInferenceMarket({ signal });
  if (resolved.refusals.length > 0) {
    return Object.freeze({ type: "TTIStewardInferenceRefusal", disposition: "market-not-admitted", refusals: resolved.refusals });
  }
  const request = {
    workLot: `tti-steward-${(now ?? new Date().toISOString()).replaceAll(/[:.]/gu, "-")}`,
    context: { suppliedContext: system ?? "" },
    actuatorTerms: {
      workType: "steward-answer",
      taskClass: "conversational-answer",
      requiredCapabilities: ["text-inference"],
      considerationPolicy: resolved.considerationPolicy,
      mode: "live",
      outputContract: { format: "text", schema: { type: "string" } },
      agentCards: resolved.suppliers.map(({ actor, agentCard }) => ({ actor, url: agentCard })),
    },
  };
  const residue = { type: "TTIStewardResidue", prompt };
  const procurement = await procureTypedInference({
    residue,
    request,
    suppliers: resolved.suppliers,
    caller: resolved.caller,
    customerServices: resolved.customerServices,
    settlementRoot: ROOT,
    invokeProvider,
    ...(now ? { now } : {}),
    record,
    signal,
  });
  if (procurement.disposition !== "candidate-pending-customer-assay") return procurement;
  const assay = await assayTypedInferenceCandidate(procurement, {
    customer: TTI_ACTOR,
    customerServices: resolved.customerServices,
    settlementRoot: ROOT,
    ...(now ? { at: now } : {}),
  });
  return Object.freeze({ ...procurement, assay });
}

export function stewardAnswerFromProcurement(procurement) {
  if (procurement?.disposition !== "candidate-pending-customer-assay") return null;
  if (procurement.assay?.accepted !== true) return null;
  const value = procurement.assay.candidateValue;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
