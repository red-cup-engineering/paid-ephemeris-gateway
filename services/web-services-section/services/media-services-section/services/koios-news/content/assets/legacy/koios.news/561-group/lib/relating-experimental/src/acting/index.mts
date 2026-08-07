/**
 * acting — the boundary: actions (cocone legs), the dispatcher, induceBins, and
 * invocation witnessing.
 *
 * Register each operation once as an `action`; `induceBins` assembles the
 * coproduct apex (the discovery carrier) from which CLI/OpenAPI/MCP/web are
 * projected; one `dispatch` (node:util.parseArgs) runs any verb and witnesses the
 * play as EAVT in the package's own ledger.
 */
export {
  action,
  isAction,
  fact,
  actionUtterances,
  type Action,
  type ActionSpec,
} from "./action.mjs";

export {
  stringCodec,
  jsonCodec,
  eavtCodec,
  formCodec,
  wireCodec,
  WIRE_CODEC_NAMES,
  type WireCodec,
} from "./codecs.mjs";

export {
  dispatch,
  actionsByVerb,
  type DispatchOptions,
  type DispatchResult,
} from "./dispatch.mjs";

export {
  resource,
  isResource,
  resourceDescriptor,
  resourceUtterances,
  literalResource,
  type ResourceCarrier,
  type ResourceSpec,
  type ResourceDescriptor,
} from "./resource.mjs";

export {
  prompt,
  isPrompt,
  promptDescriptor,
  promptUtterances,
  actionPrompt,
  userMessage,
  type PromptCarrier,
  type PromptSpec,
  type PromptDescriptor,
  type PromptArgument,
  type PromptMessage,
} from "./prompt.mjs";

export {
  induceBins,
  collectActions,
  collectResources,
  collectPrompts,
  type InducedBins,
  type InduceOptions,
  type ActionEndpoint,
  type ActionDiscovery,
} from "./induce.mjs";

export {
  witnessInvocation,
  invocationStore,
  invocationFeed,
  projectInvocations,
  type Invocation,
} from "./invocation.mjs";

export {
  serve,
  routeRequest,
  actionOpenApi,
  actionMcpTools,
  actionMcpResources,
  actionMcpPrompts,
  actionMcpHandle,
  actionFormHtml,
  actionIndexHtml,
  type ServeOptions,
  type ServedRequest,
  type ServedResponse,
} from "./serving.mjs";
