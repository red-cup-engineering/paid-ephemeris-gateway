import type { Middleware, Repr, Resource } from "../types.mjs";
import {
  settleRequestTrace,
  type RequestAdmissionJudgment,
  type RequestTrace,
  type RequestTraceSettlement,
} from "../request.mjs";
import { parseContentType } from "@emsenn/computing-with-http/codecs/http";
import { readJsonBody } from "../http.mjs";
import type { JsonSchema, OpenApiMetadata, OpenApiParameter, OpenApiResponse, OpenApiResponses } from "./openapi.mjs";

type Context = Parameters<Middleware>[0];

export type ValidationIssue = Readonly<{
  path: string;
  keyword: string;
  message: string;
}>;

export type ValidationResult = Readonly<{
  valid: boolean;
  issues: readonly ValidationIssue[];
}>;

export type RequestValidationSpec = Readonly<{
  params?: JsonSchema;
  query?: JsonSchema;
  headers?: JsonSchema;
  body?: JsonSchema;
  contentType?: string | readonly string[];
  maxBytes?: number;
}>;

export type ValidatedRequest = Readonly<{
  params?: unknown;
  query?: unknown;
  headers?: unknown;
  body?: unknown;
}>;

export type ValidatedResource = Resource & Readonly<{
  validation?: RequestValidationSpec;
}>;

export type RequestValidationArea = keyof ValidatedRequest | "contentType";

export type RequestValidationInput = Readonly<{
  trace: RequestTrace;
  spec: RequestValidationSpec;
  values: ValidatedRequest;
  contentType?: string;
}>;

export type RequestValidationReport = Readonly<{
  trace: RequestTrace;
  settled: RequestTraceSettlement;
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: RequestValidationArea | null;
  issues: readonly ValidationIssue[];
  validated?: ValidatedRequest;
}>;

export type ResponseValidationContract = Readonly<{
  description?: string;
  body?: JsonSchema;
  headers?: JsonSchema;
  contentType?: string | readonly string[];
}>;

export type ResponseValidationSpec = Readonly<Record<string | number, ResponseValidationContract>>;

export type ObservedResponse = Readonly<{
  status: number;
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
  contentType?: string;
}>;

export type ResponseValidationArea = "status" | "headers" | "body" | "contentType";

export type ResponseValidationInput = Readonly<{
  trace: RequestTrace;
  spec: ResponseValidationSpec;
  response: ObservedResponse;
}>;

export type ResponseValidationReport = Readonly<{
  trace: RequestTrace;
  settled: RequestTraceSettlement;
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: ResponseValidationArea | null;
  issues: readonly ValidationIssue[];
  contract?: ResponseValidationContract;
}>;

type SchemaObject = Readonly<Record<string, unknown>>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaObject(schema: JsonSchema): SchemaObject {
  return typeof schema === "object" && schema !== null ? schema : {};
}

function issue(path: string, keyword: string, message: string): ValidationIssue {
  return Object.freeze({ path, keyword, message });
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function typeMatches(value: unknown, type: string): boolean {
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isObject(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function allowedTypes(schema: SchemaObject): string[] {
  const raw = schema["type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  return [];
}

function equalJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateString(value: string, schema: SchemaObject, path: string, issues: ValidationIssue[]): void {
  const minLength = schema["minLength"];
  if (typeof minLength === "number" && value.length < minLength) {
    issues.push(issue(path, "minLength", `must be at least ${minLength} characters`));
  }
  const maxLength = schema["maxLength"];
  if (typeof maxLength === "number" && value.length > maxLength) {
    issues.push(issue(path, "maxLength", `must be at most ${maxLength} characters`));
  }
  const pattern = schema["pattern"];
  if (typeof pattern === "string" && !new RegExp(pattern).test(value)) {
    issues.push(issue(path, "pattern", `must match ${pattern}`));
  }
  const format = schema["format"];
  if (format === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    issues.push(issue(path, "format", "must be an email address"));
  } else if (format === "uri") {
    try { new URL(value); } catch { issues.push(issue(path, "format", "must be a URI")); }
  } else if (format === "uuid" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    issues.push(issue(path, "format", "must be a UUID"));
  }
}

function validateNumber(value: number, schema: SchemaObject, path: string, issues: ValidationIssue[]): void {
  const minimum = schema["minimum"];
  if (typeof minimum === "number" && value < minimum) {
    issues.push(issue(path, "minimum", `must be >= ${minimum}`));
  }
  const maximum = schema["maximum"];
  if (typeof maximum === "number" && value > maximum) {
    issues.push(issue(path, "maximum", `must be <= ${maximum}`));
  }
  const exclusiveMinimum = schema["exclusiveMinimum"];
  if (typeof exclusiveMinimum === "number" && value <= exclusiveMinimum) {
    issues.push(issue(path, "exclusiveMinimum", `must be > ${exclusiveMinimum}`));
  }
  const exclusiveMaximum = schema["exclusiveMaximum"];
  if (typeof exclusiveMaximum === "number" && value >= exclusiveMaximum) {
    issues.push(issue(path, "exclusiveMaximum", `must be < ${exclusiveMaximum}`));
  }
}

function validateArray(value: readonly unknown[], schema: SchemaObject, path: string, issues: ValidationIssue[]): void {
  const minItems = schema["minItems"];
  if (typeof minItems === "number" && value.length < minItems) {
    issues.push(issue(path, "minItems", `must contain at least ${minItems} items`));
  }
  const maxItems = schema["maxItems"];
  if (typeof maxItems === "number" && value.length > maxItems) {
    issues.push(issue(path, "maxItems", `must contain at most ${maxItems} items`));
  }
  const items = schema["items"];
  if (items !== undefined && (typeof items === "boolean" || isObject(items))) {
    value.forEach((item, index) => validateInto(item, items as JsonSchema, `${path}/${index}`, issues));
  }
}

function validateObject(value: Record<string, unknown>, schema: SchemaObject, path: string, issues: ValidationIssue[]): void {
  const required = Array.isArray(schema["required"])
    ? schema["required"].filter((item): item is string => typeof item === "string")
    : [];
  for (const key of required) {
    if (!Object.hasOwn(value, key)) issues.push(issue(`${path}/${key}`, "required", "is required"));
  }

  const properties = isObject(schema["properties"]) ? schema["properties"] : {};
  for (const [key, childSchema] of Object.entries(properties)) {
    if (Object.hasOwn(value, key) && (typeof childSchema === "boolean" || isObject(childSchema))) {
      validateInto(value[key], childSchema as JsonSchema, `${path}/${key}`, issues);
    }
  }

  if (schema["additionalProperties"] === false) {
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(properties, key)) issues.push(issue(`${path}/${key}`, "additionalProperties", "is not allowed"));
    }
  }
}

function validateInto(value: unknown, schema: JsonSchema, path: string, issues: ValidationIssue[]): void {
  if (schema === true) return;
  if (schema === false) {
    issues.push(issue(path, "falseSchema", "is not allowed"));
    return;
  }
  const object = schemaObject(schema);
  const types = allowedTypes(object);
  if (types.length && !types.some((type) => typeMatches(value, type))) {
    issues.push(issue(path, "type", `must be ${types.join(" or ")}, got ${typeOf(value)}`));
    return;
  }
  if ("const" in object && !equalJson(value, object["const"])) {
    issues.push(issue(path, "const", "must equal the constant value"));
  }
  const enumValues = object["enum"];
  if (Array.isArray(enumValues) && !enumValues.some((candidate) => equalJson(candidate, value))) {
    issues.push(issue(path, "enum", "must equal one of the allowed values"));
  }
  if (typeof value === "string") validateString(value, object, path, issues);
  if (typeof value === "number") validateNumber(value, object, path, issues);
  if (Array.isArray(value)) validateArray(value, object, path, issues);
  if (isObject(value)) validateObject(value, object, path, issues);
}

export function validateJsonSchema(value: unknown, schema: JsonSchema): ValidationResult {
  const issues: ValidationIssue[] = [];
  validateInto(value, schema, "", issues);
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function queryObject(ctx: Context): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of ctx.url.searchParams) {
    if (!Object.hasOwn(out, key)) out[key] = value;
    else if (Array.isArray(out[key])) (out[key] as string[]).push(value);
    else out[key] = [out[key] as string, value];
  }
  return out;
}

function headerObject(ctx: Context): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctx.req.headers)) {
    if (value !== undefined) out[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}

function contentTypeAllowedValue(contentType: string | undefined, spec: RequestValidationSpec): boolean {
  if (!spec.body || spec.contentType === undefined) return true;
  const parsed = parseContentType(contentType);
  const requestType = parsed?.type ?? "";
  const allowed = [spec.contentType].flat();
  return allowed.some((type) => type.toLowerCase() === requestType);
}

function validationProblem(status: number, title: string, issues: readonly ValidationIssue[]): Repr {
  return {
    status,
    type: "application/problem+json; charset=utf-8",
    cacheControl: { noStore: true },
    body: JSON.stringify({
      type: "urn:561-group:web-server:problem:request-validation",
      title,
      status,
      issues,
    }),
  };
}

function firstInvalid(
  entries: readonly [keyof ValidatedRequest, unknown, JsonSchema | undefined][],
): { area: keyof ValidatedRequest; result: ValidationResult } | null {
  for (const [area, value, schema] of entries) {
    if (schema === undefined) continue;
    const result = validateJsonSchema(value, schema);
    if (!result.valid) return { area, result };
  }
  return null;
}

function selectedValidated(spec: RequestValidationSpec, values: ValidatedRequest): ValidatedRequest {
  return Object.freeze({
    ...(spec.params !== undefined ? { params: values.params } : {}),
    ...(spec.query !== undefined ? { query: values.query } : {}),
    ...(spec.headers !== undefined ? { headers: values.headers } : {}),
    ...(spec.body !== undefined ? { body: values.body } : {}),
  } satisfies ValidatedRequest);
}

function validationProjection(input: RequestValidationInput): {
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: RequestValidationArea | null;
  issues: readonly ValidationIssue[];
  validated?: ValidatedRequest;
} {
  if (!contentTypeAllowedValue(input.contentType, input.spec)) {
    const issues = Object.freeze([
      issue("/body", "contentType", `expected ${[input.spec.contentType].flat().join(", ")}`),
    ]);
    return {
      judgments: Object.freeze([{
        name: "request-validation:content-type",
        value: "active",
        reason: "request body media type was not admitted",
        path: "/body",
      }]),
      valid: false,
      invalidArea: "contentType",
      issues,
    };
  }

  const invalid = firstInvalid([
    ["params", input.values.params, input.spec.params],
    ["query", input.values.query, input.spec.query],
    ["headers", input.values.headers, input.spec.headers],
    ["body", input.values.body, input.spec.body],
  ]);
  if (invalid) {
    return {
      judgments: Object.freeze([{
        name: `request-validation:${invalid.area}`,
        value: "active",
        reason: `request ${invalid.area} did not satisfy schema`,
        path: `/${invalid.area}`,
      }]),
      valid: false,
      invalidArea: invalid.area,
      issues: invalid.result.issues,
    };
  }

  return {
    judgments: Object.freeze([{
      name: "request-validation",
      value: "potential",
      reason: "request contract admitted observed values",
      path: "",
    }]),
    valid: true,
    invalidArea: null,
    issues: Object.freeze([]),
    validated: selectedValidated(input.spec, input.values),
  };
}

export function requestValidationJudgments(input: RequestValidationInput): readonly RequestAdmissionJudgment[] {
  return validationProjection(input).judgments;
}

export function requestValidationReport(input: RequestValidationInput): RequestValidationReport {
  const projection = validationProjection(input);
  const settled = settleRequestTrace(input.trace, projection.judgments);
  return Object.freeze({
    trace: input.trace,
    settled,
    judgments: projection.judgments,
    valid: projection.valid,
    invalidArea: projection.invalidArea,
    issues: projection.issues,
    ...(projection.validated !== undefined ? { validated: projection.validated } : {}),
  });
}

function responseContractFor(spec: ResponseValidationSpec, status: number): ResponseValidationContract | undefined {
  return spec[String(status)] ?? spec[`${Math.floor(status / 100)}XX`] ?? spec[`${Math.floor(status / 100)}xx`] ?? spec.default;
}

function contentTypeMatches(contentType: string | undefined, allowed: string | readonly string[] | undefined): boolean {
  if (allowed === undefined) return true;
  const parsed = parseContentType(contentType);
  const observed = parsed?.type ?? "";
  return [allowed].flat().some((type) => type.toLowerCase() === observed);
}

function responseValidationProjection(input: ResponseValidationInput): {
  judgments: readonly RequestAdmissionJudgment[];
  valid: boolean;
  invalidArea: ResponseValidationArea | null;
  issues: readonly ValidationIssue[];
  contract?: ResponseValidationContract;
} {
  const contract = responseContractFor(input.spec, input.response.status);
  if (!contract) {
    const issues = Object.freeze([issue("/status", "status", `no response contract for status ${input.response.status}`)]);
    return {
      judgments: Object.freeze([{
        name: "response-validation:status",
        value: "active",
        reason: "response status had no admitted contract",
        path: "/status",
      }]),
      valid: false,
      invalidArea: "status",
      issues,
    };
  }

  if (!contentTypeMatches(input.response.contentType, contract.contentType)) {
    const issues = Object.freeze([
      issue("/contentType", "contentType", `expected ${[contract.contentType].flat().join(", ")}`),
    ]);
    return {
      judgments: Object.freeze([{
        name: "response-validation:content-type",
        value: "active",
        reason: "response media type was not admitted",
        path: "/contentType",
      }]),
      valid: false,
      invalidArea: "contentType",
      issues,
      contract,
    };
  }

  if (contract.headers !== undefined) {
    const result = validateJsonSchema(input.response.headers ?? {}, contract.headers);
    if (!result.valid) {
      return {
        judgments: Object.freeze([{
          name: "response-validation:headers",
          value: "active",
          reason: "response headers did not satisfy schema",
          path: "/headers",
        }]),
        valid: false,
        invalidArea: "headers",
        issues: result.issues,
        contract,
      };
    }
  }

  if (contract.body !== undefined) {
    const result = validateJsonSchema(input.response.body, contract.body);
    if (!result.valid) {
      return {
        judgments: Object.freeze([{
          name: "response-validation:body",
          value: "active",
          reason: "response body did not satisfy schema",
          path: "/body",
        }]),
        valid: false,
        invalidArea: "body",
        issues: result.issues,
        contract,
      };
    }
  }

  return {
    judgments: Object.freeze([{
      name: "response-validation",
      value: "potential",
      reason: "response contract admitted observed values",
      path: "",
    }]),
    valid: true,
    invalidArea: null,
    issues: Object.freeze([]),
    contract,
  };
}

export function responseValidationJudgments(input: ResponseValidationInput): readonly RequestAdmissionJudgment[] {
  return responseValidationProjection(input).judgments;
}

export function responseValidationReport(input: ResponseValidationInput): ResponseValidationReport {
  const projection = responseValidationProjection(input);
  const settled = settleRequestTrace(input.trace, projection.judgments);
  return Object.freeze({
    trace: input.trace,
    settled,
    judgments: projection.judgments,
    valid: projection.valid,
    invalidArea: projection.invalidArea,
    issues: projection.issues,
    ...(projection.contract !== undefined ? { contract: projection.contract } : {}),
  });
}

export function requestValidation(spec: RequestValidationSpec): Middleware {
  return async (ctx) => {
    const params = ctx.params;
    const query = queryObject(ctx);
    const headers = headerObject(ctx);
    const bodyContentType = Array.isArray(ctx.req.headers["content-type"])
      ? ctx.req.headers["content-type"][0]
      : ctx.req.headers["content-type"];

    if (!contentTypeAllowedValue(bodyContentType, spec)) {
      const report = requestValidationReport({
        trace: ctx.trace,
        spec,
        values: Object.freeze({ params, query, headers }),
        ...(bodyContentType !== undefined ? { contentType: bodyContentType } : {}),
      });
      return validationProblem(415, "Unsupported Media Type", report.issues);
    }

    const body = spec.body
      ? await readJsonBody(ctx.req, {
          empty: undefined,
          ...(spec.maxBytes !== undefined ? { maxBytes: spec.maxBytes } : {}),
          ...(bodyContentType !== undefined ? { contentType: bodyContentType } : {}),
        })
      : undefined;

    const report = requestValidationReport({
      trace: ctx.trace,
      spec,
      values: Object.freeze({ params, query, headers, body }),
      ...(bodyContentType !== undefined ? { contentType: bodyContentType } : {}),
    });
    if (!report.valid && report.invalidArea) {
      return validationProblem(400, `Invalid ${report.invalidArea}`, report.issues);
    }

    ctx.locals.validated = report.validated ?? Object.freeze({});
  };
}

function schemaParameter(name: string, location: OpenApiParameter["in"], schema: JsonSchema, required = false): OpenApiParameter {
  return Object.freeze({ name, in: location, required, schema });
}

function objectProperties(schema: JsonSchema | undefined): Record<string, JsonSchema> {
  if (!isObject(schema)) return {};
  const properties = schema["properties"];
  if (!isObject(properties)) return {};
  const out: Record<string, JsonSchema> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "boolean" || isObject(value)) out[key] = value as JsonSchema;
  }
  return out;
}

function requiredSet(schema: JsonSchema | undefined): Set<string> {
  if (!isObject(schema) || !Array.isArray(schema["required"])) return new Set();
  return new Set(schema["required"].filter((item): item is string => typeof item === "string"));
}

export function validationOpenApiMetadata(spec: RequestValidationSpec): OpenApiMetadata {
  const parameters: OpenApiParameter[] = [];
  for (const [name, schema] of Object.entries(objectProperties(spec.params))) {
    parameters.push(schemaParameter(name, "path", schema, true));
  }
  const requiredQuery = requiredSet(spec.query);
  for (const [name, schema] of Object.entries(objectProperties(spec.query))) {
    parameters.push(schemaParameter(name, "query", schema, requiredQuery.has(name)));
  }
  const requiredHeaders = requiredSet(spec.headers);
  for (const [name, schema] of Object.entries(objectProperties(spec.headers))) {
    parameters.push(schemaParameter(name, "header", schema, requiredHeaders.has(name)));
  }
  const responses: OpenApiResponses = Object.freeze({
    "400": Object.freeze({ description: "Invalid request" }),
    ...(spec.contentType !== undefined ? { "415": Object.freeze({ description: "Unsupported Media Type" }) } : {}),
  });
  return Object.freeze({
    ...(parameters.length ? { parameters: Object.freeze(parameters) } : {}),
    ...(spec.body !== undefined ? {
      requestBody: Object.freeze({
        required: true,
        content: Object.freeze(Object.fromEntries([spec.contentType ?? "application/json"].flat().map((type) => [
          type,
          Object.freeze({ schema: spec.body }),
        ]))),
      }),
    } : {}),
    responses,
  });
}

function responseContent(contract: ResponseValidationContract): OpenApiResponse["content"] | undefined {
  if (contract.body === undefined) return undefined;
  const body = contract.body;
  return Object.freeze(Object.fromEntries([contract.contentType ?? "application/json"].flat().map((type) => [
    type,
    Object.freeze({ schema: body }),
  ])));
}

function responseHeaders(contract: ResponseValidationContract): OpenApiResponse["headers"] | undefined {
  return isObject(contract.headers) && isObject(contract.headers.properties)
    ? Object.freeze(Object.fromEntries(Object.entries(contract.headers.properties)
      .filter((entry): entry is [string, JsonSchema] => typeof entry[1] === "boolean" || isObject(entry[1]))
      .map(([name, schema]) => [
        name,
        Object.freeze({ schema }),
      ])))
    : undefined;
}

export function responseValidationOpenApiMetadata(spec: ResponseValidationSpec): OpenApiMetadata {
  const responses = Object.freeze(Object.fromEntries(Object.entries(spec).map(([status, contract]) => [
    status,
    Object.freeze({
      description: contract.description ?? (status === "default" ? "Default response" : `HTTP ${status}`),
      ...(responseContent(contract) !== undefined ? { content: responseContent(contract) } : {}),
      ...(responseHeaders(contract) !== undefined ? { headers: responseHeaders(contract) } : {}),
    }),
  ]))) as OpenApiResponses;
  return Object.freeze({ responses });
}

export function validatedResource(
  resource: Resource,
  validation: RequestValidationSpec,
  operation?: OpenApiMetadata | Readonly<Record<string, OpenApiMetadata>>,
): ValidatedResource {
  return Object.freeze({
    ...resource,
    validation,
    middlewares: Object.freeze([requestValidation(validation), ...(resource.middlewares ?? [])]),
    ...(operation !== undefined ? { openapi: operation } : {}),
  }) as ValidatedResource;
}
