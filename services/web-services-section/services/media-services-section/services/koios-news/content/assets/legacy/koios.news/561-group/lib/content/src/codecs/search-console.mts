/**
 * search-console — the geometric morphism between Google Search Console's
 * representations and this workspace's demand records.
 *
 * Pure functions over values: no network, no filesystem, no clock. The
 * encoders produce exactly the bytes/objects Google's OAuth2 token endpoint
 * and Search Analytics API expect; the decoders read Google's responses
 * into frozen records. Time enters only as parameters (`issuedAt`,
 * `expiresAt`, seconds) — the caller supplies the clock as testimony.
 *
 * `TypeError` is thrown for malformed shapes only; absences that the API
 * defines as meaningful (a response with no `rows`) decode to values.
 */

import { createSign } from "node:crypto";

// ---------- objects ----------

/** One demand assertion from Search Console: what was searched for, and
 *  how the property fared. Numbers are exact-as-given by the vendor. */
export type DemandAssertion = Readonly<{
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}>;

/** The decoded OAuth2 token grant. */
export type TokenGrant = Readonly<{
  accessToken: string;
  expiresIn: number;
}>;

/**
 * Inputs for an RS256 service-account JWT assertion: the service account's
 * client email and private-key PEM, the OAuth2 scope and token audience claims
 * (each defaulting to the read-only webmasters scope and Google's token
 * endpoint), and the issued-at and expiry instants in seconds since epoch
 * supplied as parameters rather than read from a clock.
 */
export type ServiceAccountAssertionInput = Readonly<{
  clientEmail: string;
  privateKeyPem: string;
  /** OAuth2 scope claim; defaults to the read-only webmasters scope. */
  scope?: string;
  /** Token audience claim; defaults to Google's token endpoint. */
  audience?: string;
  /** Issued-at, seconds since epoch — a parameter, never read from a clock here. */
  issuedAt: number;
  /** Expiry, seconds since epoch — likewise a parameter. */
  expiresAt: number;
}>;

/**
 * Inputs for a Search Analytics query: the inclusive start and end dates as
 * YYYY-MM-DD strings, optional report dimensions (defaulting to ["query"]), and
 * an optional row bound (defaulting to 250).
 */
export type SearchAnalyticsQueryInput = Readonly<{
  /** Inclusive start date, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end date, YYYY-MM-DD. */
  endDate: string;
  /** Report dimensions; defaults to ["query"]. */
  dimensions?: readonly string[];
  /** Row bound; defaults to 250. */
  rowLimit?: number;
}>;

/**
 * The encoded Search Analytics request body: start and end dates, dimensions,
 * and row limit with all optional inputs resolved to their concrete defaults.
 */
export type SearchAnalyticsQuery = Readonly<{
  startDate: string;
  endDate: string;
  dimensions: readonly string[];
  rowLimit: number;
}>;

// ---------- constants ----------

/**
 * The default OAuth2 scope claim for assertions: the read-only webmasters
 * scope.
 */
export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
/**
 * The default token audience claim for assertions: Google's OAuth2 token
 * endpoint.
 */
export const SEARCH_CONSOLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";

/** The Search Analytics query endpoint for one property
 *  (e.g. "sc-domain:koios.news" or "https://example.com/"). */
export function searchAnalyticsEndpoint(property: string): string {
  const name = requiredString(property, "searchConsole.property");
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(name)}/searchAnalytics/query`;
}

// ---------- morphisms: encoding ----------

function base64UrlJson(value: unknown): string {
  // Serialization for transport, not identity: the JWT spec defines the
  // signing input as base64url(JSON) segments.
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

/**
 * The signed RS256 service-account assertion (JWT compact serialization,
 * header.payload.signature, base64url without padding) for Google's OAuth2
 * jwt-bearer grant. Pure: the signature is a function of the inputs alone.
 */
export function encodeServiceAccountAssertion(input: ServiceAccountAssertionInput): string {
  const clientEmail = requiredString(input.clientEmail, "assertion.clientEmail");
  const privateKeyPem = requiredString(input.privateKeyPem, "assertion.privateKeyPem");
  const scope = input.scope === undefined ? SEARCH_CONSOLE_SCOPE : requiredString(input.scope, "assertion.scope");
  const audience = input.audience === undefined ? SEARCH_CONSOLE_TOKEN_AUDIENCE : requiredString(input.audience, "assertion.audience");
  const issuedAt = requiredSeconds(input.issuedAt, "assertion.issuedAt");
  const expiresAt = requiredSeconds(input.expiresAt, "assertion.expiresAt");
  if (expiresAt <= issuedAt) throw new TypeError("assertion.expiresAt must be after assertion.issuedAt");
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({ iss: clientEmail, scope, aud: audience, iat: issuedAt, exp: expiresAt });
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKeyPem).toString("base64url");
  return `${signingInput}.${signature}`;
}

/** The Search Analytics request body for one date window.
 *  Defaults: dimensions ["query"], rowLimit 250. */
export function encodeSearchAnalyticsQuery(input: SearchAnalyticsQueryInput): SearchAnalyticsQuery {
  const startDate = isoDate(input.startDate, "searchAnalytics.startDate");
  const endDate = isoDate(input.endDate, "searchAnalytics.endDate");
  const dimensions = input.dimensions === undefined
    ? Object.freeze(["query"])
    : Object.freeze(input.dimensions.map((dimension, index) => requiredString(dimension, `searchAnalytics.dimensions[${index}]`)));
  const rowLimit = input.rowLimit === undefined ? 250 : requiredCount(input.rowLimit, "searchAnalytics.rowLimit");
  return Object.freeze({ startDate, endDate, dimensions, rowLimit });
}

// ---------- morphisms: decoding ----------

/** Read Google's token response into a grant. Malformed shape is the only
 *  failure mode (TypeError); HTTP/transport failures are the caller's. */
export function decodeTokenResponse(json: unknown): TokenGrant {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new TypeError("token response must be an object");
  }
  const record = json as { access_token?: unknown; expires_in?: unknown };
  const accessToken = requiredString(record.access_token, "tokenResponse.access_token");
  if (typeof record.expires_in !== "number" || !Number.isFinite(record.expires_in)) {
    throw new TypeError("tokenResponse.expires_in must be a finite number");
  }
  return Object.freeze({ accessToken, expiresIn: record.expires_in });
}

/**
 * Read a Search Analytics response into demand assertions. A missing
 * `rows` field is Google's empty result — a value, not an error; numbers
 * pass through exact-as-given.
 */
export function decodeSearchAnalyticsRows(json: unknown): readonly DemandAssertion[] {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new TypeError("search analytics response must be an object");
  }
  const rows = (json as { rows?: unknown }).rows;
  if (rows === undefined) return Object.freeze([]);
  if (!Array.isArray(rows)) throw new TypeError("searchAnalytics.rows must be an array when present");
  return Object.freeze(rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`searchAnalytics.rows[${index}] must be an object`);
    }
    const record = row as { keys?: unknown; clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown };
    if (!Array.isArray(record.keys) || typeof record.keys[0] !== "string") {
      throw new TypeError(`searchAnalytics.rows[${index}].keys must lead with the query string`);
    }
    return Object.freeze({
      query: record.keys[0],
      clicks: metricNumber(record.clicks, `searchAnalytics.rows[${index}].clicks`),
      impressions: metricNumber(record.impressions, `searchAnalytics.rows[${index}].impressions`),
      ctr: metricNumber(record.ctr, `searchAnalytics.rows[${index}].ctr`),
      position: metricNumber(record.position, `searchAnalytics.rows[${index}].position`),
    });
  }));
}

// ---------- shape guards ----------

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function metricNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${path} must be a finite number`);
  return value;
}

function requiredSeconds(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative integer of seconds`);
  }
  return value;
}

function requiredCount(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive integer`);
  }
  return value;
}

function isoDate(value: unknown, path: string): string {
  const text = requiredString(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${path} must be a YYYY-MM-DD date string`);
  return text;
}
