/**
 * acting/serving — the four transports as functorial images of the apex.
 *
 * `induceBins` gives one `InducedBins` carrier (the coproduct apex of a module's
 * actions). This module projects it, with no second ontology, to:
 *   - CLI         — `dispatch` (elsewhere; the `relate` bin)
 *   - HTTP        — `POST /:verb` (body→stdin, stdout→response), `GET /` discovery, `GET /health`
 *   - OpenAPI     — `GET /openapi.json` (a 3.1.1 document derived from the actions)
 *   - MCP         — `POST /mcp` (tools, resources, and prompts over one apex)
 *   - web UX      — `GET /:verb` (a basic HTML form) and `GET /` (the index)
 *
 * The MCP projection is the full standard knowledge-vault surface: `tools/list`
 * and `tools/call` run the morphisms; `resources/list` and `resources/read`
 * serve the package's schemas and discovery carrier; `prompts/list` and
 * `prompts/get` serve the guided per-action (and registered) prompts. All three
 * are functorial images of the same `induceBins` apex — no second ontology.
 *
 * Every routed POST goes through `dispatch`, so an HTTP/MCP/form call is a
 * scripted play and is witnessed as EAVT exactly like a CLI call. Pure routing
 * (`routeRequest`) is separated from the thin `node:http` binding (`serve`).
 */
import { createServer, type IncomingMessage, type Server } from "node:http";
import { wireCodec } from "./codecs.mjs";
import type { Action } from "./action.mjs";
import type { ActionDiscovery, ActionEndpoint, InducedBins } from "./induce.mjs";
import { resourceDescriptor, type ResourceCarrier } from "./resource.mjs";
import { promptDescriptor, type PromptCarrier } from "./prompt.mjs";
import type { DispatchOptions } from "./dispatch.mjs";

/** A routed response: status, content type, and body. */
export interface ServedResponse {
  readonly status: number;
  readonly type: string;
  readonly body: string;
}

/** A routed request: method, path, query string, and body. */
export interface ServedRequest {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly body: string;
}

/** Options for serving (the witnessing data root flows to dispatch). */
export interface ServeOptions extends DispatchOptions {
  readonly basePath?: string;
  readonly title?: string;
  readonly version?: string;
}

/** Minimal HTML text escape for the web-UX projection. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] ?? ch));
}

const json = (value: unknown, status = 200): ServedResponse => ({ status, type: "application/json; charset=utf-8", body: `${JSON.stringify(value, null, 2)}\n` });
const html = (body: string, status = 200): ServedResponse => ({ status, type: "text/html; charset=utf-8", body });
const text = (body: string, status: number): ServedResponse => ({ status, type: "text/plain; charset=utf-8", body });

/** The OpenAPI 3.1.1 document derived from the discovery carrier. */
export function actionOpenApi(induced: InducedBins, options: ServeOptions = {}): Record<string, unknown> {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const paths: Record<string, unknown> = {};
  for (const endpoint of induced.discovery.bins) {
    paths[`${base}/${endpoint.name}`] = {
      post: {
        operationId: endpoint.name,
        ...(endpoint.summary === undefined ? {} : { summary: endpoint.summary }),
        ...(endpoint.description === undefined ? {} : { description: endpoint.description }),
        requestBody: {
          required: true,
          content: { [endpoint.input]: { schema: endpoint.inputSchema ?? {} } },
        },
        responses: {
          "200": { description: "OK", content: { [endpoint.output]: { schema: endpoint.outputSchema ?? {} } } },
          "400": { description: "Bad Request" },
        },
      },
    };
  }
  return {
    openapi: "3.1.1",
    info: { title: options.title ?? induced.discovery.package, version: options.version ?? "0.0.0" },
    paths,
  };
}

/** The MCP tools list derived from the actions (one tool per verb). */
export function actionMcpTools(actions: readonly Action[]): readonly Record<string, unknown>[] {
  return actions.map((act) => ({
    name: act.verb,
    ...(act.summary === undefined ? {} : { description: act.summary }),
    inputSchema: {
      type: "object",
      properties: { input: act.inputSchema ?? { description: `The ${act.in} input carrier for ${act.verb}.` } },
      required: ["input"],
    },
    ...(act.outputSchema === undefined ? {} : { outputSchema: act.outputSchema }),
  }));
}

/** The MCP resources list derived from the apex (schemas, discovery, registered). */
export function actionMcpResources(induced: InducedBins): readonly Record<string, unknown>[] {
  return induced.resources.map((res: ResourceCarrier) => ({ ...resourceDescriptor(res) }));
}

/** The MCP prompts list derived from the apex (per-action + registered). */
export function actionMcpPrompts(induced: InducedBins): readonly Record<string, unknown>[] {
  return induced.prompts.map((pr: PromptCarrier) => ({ ...promptDescriptor(pr) }));
}

function mcpResult(id: unknown, result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id, result };
}
function mcpError(id: unknown, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function promptArguments(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = typeof raw === "string" ? raw : JSON.stringify(raw);
  }
  return out;
}

/** The boundary document for an action's input from an MCP `arguments.input`. */
function stdinOf(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Handle one MCP JSON-RPC message against the induced actions. */
export function actionMcpHandle(induced: InducedBins, message: unknown, options: ServeOptions): Record<string, unknown> | undefined {
  if (typeof message !== "object" || message === null) return mcpError(null, -32600, "invalid request");
  const record = message as Record<string, unknown>;
  const id = record["id"];
  const method = record["method"];
  if (record["jsonrpc"] !== "2.0" || typeof method !== "string") return mcpError(id ?? null, -32600, "invalid request");
  if (id === undefined) return undefined; // notification
  if (method === "initialize") {
    return mcpResult(id, { protocolVersion: "2025-06-18", serverInfo: { name: induced.discovery.package, version: options.version ?? "0.0.0" }, capabilities: { tools: {}, resources: {}, prompts: {} } });
  }
  if (method === "ping") return mcpResult(id, {});
  if (method === "tools/list") return mcpResult(id, { tools: actionMcpTools(induced.actions) });
  if (method === "tools/call") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const args = (params["arguments"] ?? {}) as Record<string, unknown>;
    const result = induced.dispatch([name], stdinOf(args["input"]), options);
    if (result.code !== 0) return mcpResult(id, { isError: true, content: [{ type: "text", text: result.stderr.trim() }] });
    return mcpResult(id, { content: [{ type: "text", text: result.stdout.trim() }] });
  }
  if (method === "resources/list") return mcpResult(id, { resources: actionMcpResources(induced) });
  if (method === "resources/read") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const uri = String(params["uri"] ?? "");
    const res = induced.resources.find((candidate) => candidate.uri === uri);
    if (res === undefined) return mcpError(id, -32602, `no such resource: ${uri}`);
    let text: string;
    try {
      text = res.read();
    } catch (error) {
      return mcpError(id, -32603, `resource read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return mcpResult(id, { contents: [{ uri: res.uri, mimeType: res.mimeType, text }] });
  }
  if (method === "prompts/list") return mcpResult(id, { prompts: actionMcpPrompts(induced) });
  if (method === "prompts/get") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const pr = induced.prompts.find((candidate) => candidate.name === name);
    if (pr === undefined) return mcpError(id, -32602, `no such prompt: ${name}`);
    let messages: readonly { readonly role: string; readonly content: { readonly type: "text"; readonly text: string } }[];
    try {
      messages = pr.compose(promptArguments(params["arguments"]));
    } catch (error) {
      return mcpError(id, -32603, `prompt compose failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return mcpResult(id, { ...(pr.description === undefined ? {} : { description: pr.description }), messages });
  }
  return mcpError(id, -32601, "method not found");
}

/** The HTML form for one endpoint (web UX: a textarea for the input, submit POSTs it). */
export function actionFormHtml(endpoint: ActionEndpoint, base: string): string {
  return [
    "<!doctype html><meta charset=utf-8>",
    `<title>${escapeHtml(endpoint.name)}</title>`,
    `<h1><code>${escapeHtml(endpoint.name)}</code></h1>`,
    endpoint.summary === undefined ? "" : `<p>${escapeHtml(endpoint.summary)}</p>`,
    endpoint.description === undefined ? "" : `<p><small>${escapeHtml(endpoint.description)}</small></p>`,
    `<p><small>input: <code>${escapeHtml(endpoint.input)}</code> · output: <code>${escapeHtml(endpoint.output)}</code></small></p>`,
    `<form method="post" action="${escapeHtml(base)}/${escapeHtml(endpoint.name)}" enctype="text/plain">`,
    `<p><textarea name="body" rows="8" cols="72" placeholder="the input carrier on stdin"></textarea></p>`,
    `<p><button type="submit">run</button> <a href="${escapeHtml(base) || "/"}">↩ all operations</a></p>`,
    "</form>",
  ].filter(Boolean).join("\n");
}

/** The HTML index of all operations (web UX). */
export function actionIndexHtml(discovery: ActionDiscovery, base: string): string {
  const items = discovery.bins.map((endpoint) =>
    `<li><a href="${escapeHtml(base)}/${escapeHtml(endpoint.name)}"><code>${escapeHtml(endpoint.name)}</code></a>${endpoint.summary === undefined ? "" : ` — ${escapeHtml(endpoint.summary)}`}</li>`).join("\n");
  return [
    "<!doctype html><meta charset=utf-8>",
    `<title>${escapeHtml(discovery.package)}</title>`,
    `<h1>${escapeHtml(discovery.package)}</h1>`,
    `<p><a href="${escapeHtml(base)}/openapi.json">OpenAPI</a> · <code>POST ${escapeHtml(base)}/mcp</code> (MCP) · <code>GET ${escapeHtml(base)}/health</code></p>`,
    `<ol>${items}</ol>`,
  ].join("\n");
}

/** Route one request against the induced actions — the pure transport projection. */
export function routeRequest(induced: InducedBins, request: ServedRequest, options: ServeOptions = {}): ServedResponse {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(base) ? request.path.slice(base.length) : request.path;
  const verbOf = (p: string): string => decodeURIComponent(p.replace(/^\//, ""));

  if (request.method === "GET" && (path === "" || path === "/")) return html(actionIndexHtml(induced.discovery, base));
  if (request.method === "GET" && path === "/health") return json({ status: "ok", package: induced.discovery.package });
  if (request.method === "GET" && path === "/openapi.json") return json(actionOpenApi(induced, options));
  if (request.method === "GET" && path === "/discovery") return json(induced.discovery);

  if (request.method === "POST" && path === "/mcp") {
    let message: unknown;
    try {
      message = JSON.parse(request.body);
    } catch {
      return json(mcpError(null, -32700, "parse error"), 200);
    }
    const response = actionMcpHandle(induced, message, options);
    return response === undefined ? { status: 202, type: "application/json; charset=utf-8", body: "" } : json(response);
  }

  const verb = verbOf(path);
  const endpoint = induced.discovery.bins.find((bin) => bin.name === verb);
  if (endpoint === undefined) return text(`no such operation: ${verb}\n`, 404);

  // `in`/`out` are codec selectors; every other query field is part of the input
  // carrier, encoded as a form (`?token=foo&claim=bar` is the `form` wire).
  const outName = request.query["out"];
  const carrierFields = Object.entries(request.query).filter(([key]) => key !== "in" && key !== "out");

  // A GET with no carrier fields is the web-UX form; with fields it is an invocation.
  if (request.method === "GET" && carrierFields.length === 0) return html(actionFormHtml(endpoint, base));

  if (request.method === "GET" || request.method === "POST") {
    let stdin: string;
    let inName: string | undefined;
    if (carrierFields.length > 0) {
      // query/form fields ARE the input carrier, in its form encoding.
      stdin = new URLSearchParams(carrierFields).toString();
      inName = request.query["in"] ?? "form";
    } else {
      // a POST body: the web form posts `body=...`; a raw post is the body itself.
      stdin = request.body.startsWith("body=") ? decodeURIComponent(request.body.slice(5).replace(/\+/g, " ")) : request.body;
      inName = request.query["in"];
    }
    const argv = [verb, ...(inName ? ["--in", inName] : []), ...(outName ? ["--out", outName] : [])];
    const result = induced.dispatch(argv, stdin, options);
    if (result.code !== 0) return text(result.stderr, result.code === 2 ? 400 : 422);
    const outType = outName ? wireCodec(outName).mediaType : endpoint.output;
    return { status: 200, type: outType, body: result.stdout };
  }

  return text("method not allowed\n", 405);
}

/** Bind the router to a node:http server. The single transport binding. */
export function serve(actions: readonly Action[], options: ServeOptions & { readonly induced?: InducedBins } = {}): Server {
  // induced may be passed in; otherwise the caller should pass actions + we induce lazily at first request.
  const inducedRef = options.induced;
  const readBody = (req: IncomingMessage): Promise<string> => new Promise((resolve) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
  return createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const query: Record<string, string> = {};
      for (const [key, value] of url.searchParams) query[key] = value;
      const body = req.method === "POST" ? await readBody(req) : "";
      const induced = inducedRef ?? (await import("./induce.mjs")).induceBins(actions);
      const response = routeRequest(induced, { method: req.method ?? "GET", path: url.pathname, query, body }, options);
      res.writeHead(response.status, { "content-type": response.type });
      res.end(response.body);
    })();
  });
}
