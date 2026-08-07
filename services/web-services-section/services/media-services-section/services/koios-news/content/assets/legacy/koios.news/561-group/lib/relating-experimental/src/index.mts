/**
 * @emsenn/relating-experimental — the relational substrate as one boundary system.
 *
 * The root surface is the universal call surface: the same morphisms shell,
 * OpenAPI, MCP, and TypeScript callers use. Strings and JSON appear only at codec
 * and action boundaries; the mathematical API works over admitted carriers
 * (`Mark`, `UtteranceCarrier`, `ArticulationCell`). Register an operation once as
 * an `action`; `induceBins` projects the whole module to every transport.
 */
export * from "./articulating/index.mjs";
export * as holography from "./holography/index.mjs";
export * as projecting from "./holography/projecting/index.mjs";
export * as codecs from "./codecs/index.mjs";
export * as acting from "./acting/index.mjs";
export * as typing from "./typing/index.mjs";

export {
  action,
  isAction,
  induceBins,
  collectActions,
  dispatch,
  serve,
  routeRequest,
  wireCodec,
  WIRE_CODEC_NAMES,
  witnessInvocation,
  type Action,
  type InducedBins,
  type DispatchOptions,
  type DispatchResult,
  type ServeOptions,
  type ServedRequest,
  type ServedResponse,
  type ActionDiscovery,
  type Invocation,
} from "./acting/index.mjs";

export { actions } from "./actions.mjs";

// The downstream-consumer surface: the bilattice charge algebra and the JSON
// codec helpers a package built ON relating (e.g. @emsenn/communicating) admits
// its own data through. These are core public API, re-exported at the root so a
// downstream package depends on `@emsenn/relating-experimental` alone.
export {
  charge,
  chargeValue,
  valueOf,
  joinKnowledge,
  joinTruth,
  meetTruth,
  leqTruth,
  negate,
  witnessedPotential,
  bottom,
  type ChargeCarrier,
  type ChargeValue,
  type ChargeValueName,
} from "./articulating/predicating/positing/bilattice-charge.mjs";

export {
  canonical,
  requireJsonValue,
  jsonResource,
  parse as parseJson,
  type JsonValue,
  type JsonRecord,
} from "./codecs/json.mjs";
