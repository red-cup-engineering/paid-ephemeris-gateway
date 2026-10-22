import { resolve } from "node:path";
import { loadCustomerServiceAdmissions } from "@red-cup-engineering/inference-work-lot-service/provider-admission";

export const SYNTHESIS_ROOT = resolve(import.meta.dirname, "..");
export const SYNTHESIS_ACTOR = "urn:ame:software-patch-synthesis-service";
export const SYNTHESIS_SERVICES = loadCustomerServiceAdmissions(resolve(SYNTHESIS_ROOT, "content/provider-admissions/semantic-services.nq"), { admissionGraph: `${SYNTHESIS_ACTOR}:service-admissions` });
