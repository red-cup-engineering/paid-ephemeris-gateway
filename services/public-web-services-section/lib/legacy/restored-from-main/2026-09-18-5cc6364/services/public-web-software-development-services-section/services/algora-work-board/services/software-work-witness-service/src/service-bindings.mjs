import { resolve } from "node:path";
import { loadCustomerServiceAdmissions } from "@red-cup-engineering/inference-work-lot-service/provider-admission";

export const WITNESS_ROOT = resolve(import.meta.dirname, "..");
export const WITNESS_ACTOR = "urn:ame:software-work-witness-service";
export const WITNESS_SERVICES = loadCustomerServiceAdmissions(resolve(WITNESS_ROOT, "content/provider-admissions/semantic-services.nq"), { admissionGraph: `${WITNESS_ACTOR}:service-admissions` });
