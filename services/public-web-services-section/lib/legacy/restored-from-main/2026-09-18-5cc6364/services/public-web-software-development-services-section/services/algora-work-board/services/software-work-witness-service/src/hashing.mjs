// Witness identities are the canonical typed RMN object identities used everywhere else.
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "rsc-quiescent.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;

export function digestObject(value) {
  return semanticId(value);
}

export function addressed(value) {
  const digest = digestObject(value);
  return { ...value, id: digest, digest };
}
