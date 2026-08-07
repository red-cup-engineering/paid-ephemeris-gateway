// @emsenn/web-codecs-esi — codec for the ESI markup representation.
//
// The variable substitution language and the transclusion transform,
// stated over an abstract fragment resolver. The resolver is the whole
// transport boundary: fetching, caching, and binding the W3C request
// variables (HTTP_HOST, …) to actual request values belong to whoever
// holds the request — processEsi substitutes only the bindings it is
// handed via options.vars.

export { substituteVars } from "./variables.mjs";

export { EsiIncludeError, hasEsi, processEsi } from "./transclusion.mjs";
export type { EsiFragment, EsiResolver } from "./transclusion.mjs";
