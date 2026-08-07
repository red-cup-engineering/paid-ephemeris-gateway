export const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_JSON_TYPE = "application/json";

export type JsonObject = { readonly [key: string]: Json };
export type Json = null | boolean | number | string | readonly Json[] | JsonObject;

export type McpToolAnnotations = Readonly<{
  readOnlyHint?: boolean;
  openWorldHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  title?: string;
}>;

export type McpTool = Readonly<{
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Readonly<Record<string, unknown>>;
  outputSchema?: Readonly<Record<string, unknown>>;
  annotations?: McpToolAnnotations;
}>;

export type McpServerInfo = Readonly<{
  name: string;
  version: string;
}>;

export type McpToolsCapability = Readonly<{
  listChanged: boolean;
}>;

export type McpCapabilities = Readonly<{
  tools: McpToolsCapability;
}>;

export type McpInitializeResult = Readonly<{
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
  instructions?: string;
}>;

export type McpReachability = Readonly<{
  status: "ok";
  transport: "mcp";
  protocol: "streamable_http";
  serverInfo: McpServerInfo;
  capabilities: McpCapabilities;
  tools: readonly string[];
}>;

export type McpToolCallResult = Readonly<{
  content: readonly [Readonly<{ type: "text"; text: string }>];
  structuredContent?: JsonObject;
  isError?: true;
}>;

export type McpToolsListResult = Readonly<{
  tools: readonly McpTool[];
  nextCursor?: string;
}>;

export type JsonRpcId = string | number | null | undefined;

export type JsonRpcRequest = Readonly<{
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}>;

export type JsonRpcSuccess = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}>;

export type JsonRpcFailure = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  error: Readonly<{
    code: number;
    message: string;
  }>;
}>;

export type JsonRpcEnvelope = JsonRpcSuccess | JsonRpcFailure;

const CAPABILITIES: McpCapabilities = Object.freeze({ tools: Object.freeze({ listChanged: false }) });

function rpcId(id: JsonRpcId): string | number | null {
  return id ?? null;
}

export function mcpOk(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return Object.freeze({ jsonrpc: "2.0" as const, id: rpcId(id), result });
}

export function mcpRpcError(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return Object.freeze({
    jsonrpc: "2.0" as const,
    id: rpcId(id),
    error: Object.freeze({ code, message }),
  });
}

export function mcpInitializeResult(options: {
  serverInfo: McpServerInfo;
  protocolVersion?: string;
  instructions?: string;
}): McpInitializeResult {
  return Object.freeze({
    protocolVersion: options.protocolVersion ?? DEFAULT_MCP_PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    serverInfo: options.serverInfo,
    ...(options.instructions === undefined ? {} : { instructions: options.instructions }),
  });
}

export function mcpReachability(serverInfo: McpServerInfo, tools: readonly McpTool[]): McpReachability {
  return Object.freeze({
    status: "ok" as const,
    transport: "mcp" as const,
    protocol: "streamable_http" as const,
    serverInfo,
    capabilities: CAPABILITIES,
    tools: Object.freeze(tools.map((tool) => tool.name)),
  });
}

export function mcpToolsListResult(tools: readonly McpTool[], nextCursor?: string): McpToolsListResult {
  return Object.freeze({
    tools: Object.freeze([...tools]),
    ...(nextCursor === undefined ? {} : { nextCursor }),
  });
}

export function mcpToolTextResult(value: unknown): McpToolCallResult {
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) as McpToolCallResult["content"],
  });
}

export function mcpToolStructuredResult(value: JsonObject): McpToolCallResult {
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) as McpToolCallResult["content"],
    structuredContent: value,
  });
}

export function mcpToolTextError(error: unknown): McpToolCallResult {
  const text = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text }]) as McpToolCallResult["content"],
    isError: true as const,
  });
}
