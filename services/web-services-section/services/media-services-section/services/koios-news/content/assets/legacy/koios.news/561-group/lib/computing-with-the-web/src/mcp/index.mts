// @emsenn/computing-with-the-web/mcp
//
// MCP's protocol vocabulary is HTTP-adjacent, so its reusable value layer lives
// in @emsenn/computing-with-http. Service bindings such as createMcpApp live in
// @emsenn/http-server; this library package deliberately does not import
// service packages.

export {
  DEFAULT_MCP_PROTOCOL_VERSION,
  MCP_JSON_TYPE,
  mcpInitializeResult,
  mcpOk,
  mcpReachability,
  mcpRpcError,
  mcpToolStructuredResult,
  mcpToolTextError,
  mcpToolTextResult,
  mcpToolsListResult,
} from "@emsenn/computing-with-http/codecs/mcp";
export type {
  Json,
  JsonObject,
  JsonRpcEnvelope,
  JsonRpcFailure,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcSuccess,
  McpCapabilities,
  McpInitializeResult,
  McpReachability,
  McpServerInfo,
  McpTool,
  McpToolAnnotations,
  McpToolCallResult,
  McpToolsCapability,
  McpToolsListResult,
} from "@emsenn/computing-with-http/codecs/mcp";
