import type { App, Resource, Repr } from "../types.mjs";
import { validationOpenApiMetadata, type RequestValidationSpec } from "./validation.mjs";

export type JsonSchema = boolean | Readonly<Record<string, unknown>>;

export type OpenApiParameter = Readonly<{
  name: string;
  in: "query" | "header" | "path" | "cookie";
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}>;

export type OpenApiMediaType = Readonly<{
  schema?: JsonSchema;
  examples?: Readonly<Record<string, unknown>>;
  example?: unknown;
}>;

export type OpenApiResponse = Readonly<{
  description: string;
  headers?: Readonly<Record<string, unknown>>;
  content?: Readonly<Record<string, OpenApiMediaType>>;
}>;

export type OpenApiResponses = Readonly<Record<string, OpenApiResponse>>;

export type OpenApiOperation = Readonly<{
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: readonly string[];
  parameters?: readonly OpenApiParameter[];
  requestBody?: unknown;
  responses: OpenApiResponses;
  security?: readonly unknown[];
  deprecated?: boolean;
  readonly [extension: `x-${string}`]: unknown;
}>;

export type OpenApiMetadata = Readonly<Omit<OpenApiOperation, "responses"> & {
  responses?: OpenApiResponses;
  hide?: boolean;
}>;

export type OpenApiResource = Resource & Readonly<{
  openapi?: OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>> | false;
  validation?: RequestValidationSpec;
}>;

export type OpenApiRoute = Readonly<{
  path: string;
  methods: readonly string[];
  operation: OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>>;
  produces?: readonly string[];
  languages?: readonly string[];
  validation?: RequestValidationSpec;
}>;

export type OpenApiDocumentOptions = Readonly<{
  title: string;
  version?: string;
  description?: string;
  servers?: readonly Readonly<{ url: string; description?: string }>[];
  components?: Readonly<Record<string, unknown>>;
  webhooks?: Readonly<Record<string, unknown>>;
}>;

export type OpenApiDocument = Readonly<{
  openapi: "3.1.1";
  info: Readonly<{ title: string; version: string; description?: string }>;
  servers?: readonly Readonly<{ url: string; description?: string }>[];
  paths: Readonly<Record<string, unknown>>;
  components?: Readonly<Record<string, unknown>>;
  webhooks?: Readonly<Record<string, unknown>>;
}>;

const HTTP_METHODS = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);

function defaultResponses(): OpenApiResponses {
  return Object.freeze({ "200": Object.freeze({ description: "OK" }) });
}

function methodList(methods: readonly string[] | undefined): readonly string[] {
  return Object.freeze((methods?.length ? methods : ["GET"])
    .map((method) => method.toLowerCase())
    .filter((method) => HTTP_METHODS.has(method)));
}

export function openApiPath(pattern: string): string {
  let wildcard = 0;
  return pattern
    .replace(/:([A-Za-z0-9_]+)\??/g, "{$1}")
    .replace(/\*/g, () => `{wildcard${wildcard++ || ""}}`);
}

export function pathParameterNames(pattern: string): readonly string[] {
  const names: string[] = [];
  for (const match of pattern.matchAll(/:([A-Za-z0-9_]+)\??/g)) {
    if (match[1] && !names.includes(match[1])) names.push(match[1]);
  }
  let wildcard = 0;
  for (const _ of pattern.matchAll(/\*/g)) names.push(`wildcard${wildcard++ || ""}`);
  return Object.freeze(names);
}

function inferredPathParameters(pattern: string, existing: readonly OpenApiParameter[] = []): readonly OpenApiParameter[] {
  const seen = new Set(existing.filter((parameter) => parameter.in === "path").map((parameter) => parameter.name));
  const inferred = pathParameterNames(pattern)
    .filter((name) => !seen.has(name))
    .map((name): OpenApiParameter => Object.freeze({
      name,
      in: "path",
      required: true,
      schema: Object.freeze({ type: "string" }),
    }));
  return Object.freeze([...inferred, ...existing]);
}

function hasHeaderParameter(parameters: readonly OpenApiParameter[] | undefined, name: string): boolean {
  return Boolean(parameters?.some((parameter) => parameter.in === "header" && parameter.name.toLowerCase() === name.toLowerCase()));
}

function negotiationParameters(route: OpenApiRoute, existing: readonly OpenApiParameter[] | undefined): readonly OpenApiParameter[] {
  const parameters: OpenApiParameter[] = [];
  if (route.produces?.length && !hasHeaderParameter(existing, "Accept")) {
    parameters.push(Object.freeze({
      name: "Accept",
      in: "header",
      required: false,
      description: `Preferred response media type. Offered types: ${route.produces.join(", ")}.`,
      schema: Object.freeze({ type: "string" }),
    }));
  }
  if (route.languages?.length && !hasHeaderParameter(existing, "Accept-Language")) {
    parameters.push(Object.freeze({
      name: "Accept-Language",
      in: "header",
      required: false,
      description: `Preferred response language. Offered languages: ${route.languages.join(", ")}.`,
      schema: Object.freeze({ type: "string" }),
    }));
  }
  return Object.freeze(parameters);
}

function responsesWithAdmission(route: OpenApiRoute, responses: OpenApiResponses): OpenApiResponses {
  if ((!route.produces?.length && !route.languages?.length) || responses["406"]) return responses;
  return Object.freeze({
    ...responses,
    "406": Object.freeze({ description: "Not Acceptable" }),
  });
}

function sameParameter(a: OpenApiParameter, b: OpenApiParameter): boolean {
  return a.in === b.in && a.name.toLowerCase() === b.name.toLowerCase();
}

function mergeValidationMetadata(raw: OpenApiMetadata, validation: RequestValidationSpec | undefined): OpenApiMetadata {
  if (!validation) return raw;
  const generated = validationOpenApiMetadata(validation);
  const explicit = raw.parameters ?? [];
  const generatedParameters = (generated.parameters ?? [])
    .filter((parameter) => !explicit.some((candidate) => sameParameter(candidate, parameter)));
  return Object.freeze({
    ...generated,
    ...raw,
    ...(generatedParameters.length || explicit.length
      ? { parameters: Object.freeze([...generatedParameters, ...explicit]) }
      : {}),
    requestBody: raw.requestBody ?? generated.requestBody,
    responses: Object.freeze({
      ...(generated.responses ?? {}),
      ...(raw.responses ?? {}),
    }),
  });
}

function operationFor(method: string, route: OpenApiRoute): OpenApiOperation | null {
  const input = route.operation;
  const keyed = input as Readonly<Record<string, OpenApiMetadata>>;
  const raw = keyed[method] ?? keyed[method.toUpperCase()] ?? (isOperationLike(input) ? input as OpenApiMetadata : undefined);
  if (!raw || raw.hide) return null;
  const merged = mergeValidationMetadata(raw, route.validation);
  const parameters = inferredPathParameters(route.path, [
    ...negotiationParameters(route, merged.parameters),
    ...(merged.parameters ?? []),
  ]);
  return Object.freeze({
    ...merged,
    parameters,
    responses: responsesWithAdmission(route, merged.responses ?? defaultResponses()),
  });
}

function isOperationLike(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (
    "responses" in value ||
    "summary" in value ||
    "description" in value ||
    "operationId" in value ||
    "tags" in value ||
    "requestBody" in value
  ));
}

export function openApiDocument(routes: readonly OpenApiRoute[], options: OpenApiDocumentOptions): OpenApiDocument {
  if (!options.title) throw new TypeError("openApiDocument requires options.title");
  const paths: Record<string, Record<string, OpenApiOperation>> = {};
  for (const route of routes) {
    const path = openApiPath(route.path);
    const pathItem = paths[path] ?? {};
    for (const method of methodList(route.methods)) {
      const operation = operationFor(method, route);
      if (operation) pathItem[method] = operation;
    }
    if (Object.keys(pathItem).length > 0) paths[path] = pathItem;
  }
  const info: { title: string; version: string; description?: string } = {
    title: options.title,
    version: options.version ?? "0.0.0",
  };
  if (options.description) info.description = options.description;
  const doc: {
    openapi: "3.1.1";
    info: typeof info;
    servers?: readonly Readonly<{ url: string; description?: string }>[];
    paths: Record<string, unknown>;
    components?: Readonly<Record<string, unknown>>;
    webhooks?: Readonly<Record<string, unknown>>;
  } = {
    openapi: "3.1.1",
    info: Object.freeze(info),
    paths: Object.freeze(paths),
  };
  if (options.servers) doc.servers = Object.freeze([...options.servers]);
  if (options.components) doc.components = options.components;
  if (options.webhooks) doc.webhooks = options.webhooks;
  return Object.freeze(doc) as OpenApiDocument;
}

export function documentedResource(resource: Resource, operation: OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>>): OpenApiResource {
  return Object.freeze({ ...resource, openapi: operation });
}

export function openApiRoutesFromApp(app: Pick<App, "resources">): readonly OpenApiRoute[] {
  return Object.freeze((app.resources ?? []).flatMap((resource) => {
    const candidate = resource as OpenApiResource;
    const path = typeof candidate.match === "string" ? candidate.match : candidate.route;
    if (candidate.openapi === false || !candidate.openapi || !path) return [];
    const route: OpenApiRoute = Object.freeze({
      path,
      methods: Object.freeze([...(candidate.methods ?? ["GET"])]),
      operation: candidate.openapi,
      produces: candidate.produces ?? [],
      languages: candidate.languages ?? [],
      ...(candidate.validation !== undefined ? { validation: candidate.validation } : {}),
    });
    return [route];
  }));
}

export function openApiResource(document: OpenApiDocument | (() => OpenApiDocument), path = "/openapi.json"): Resource {
  return Object.freeze({
    match: path,
    methods: ["GET"],
    produces: ["application/json"],
    handler: async (ctx) => {
      const doc = typeof document === "function" ? document() : document;
      const repr: Repr = {
        type: "application/json; charset=utf-8",
        body: `${JSON.stringify(doc, null, 2)}\n`,
      };
      const { send } = await import("../http.mjs");
      await send(ctx.req, ctx.res, repr);
    },
  });
}

export function withOpenApi(app: App, options: OpenApiDocumentOptions & { path?: string }): App {
  const document = () => openApiDocument(openApiRoutesFromApp(app), options);
  return Object.freeze({
    ...app,
    resources: Object.freeze([...(app.resources ?? []), openApiResource(document, options.path ?? "/openapi.json")]),
  });
}
