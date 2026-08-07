/**
 * demand — Search Console demand intake: what was searched for, read into
 * demand assertions.
 *
 * The adapter is the I/O binding over @emsenn/content-codecs'
 * search-console codec: the codec does ALL encoding/decoding (assertion,
 * grant, query body, rows); this module only reads the key file and moves
 * bytes. `fetch` and the clock enter as values, so every consumer can run
 * hermetically. The result is a witness-or-obstruction carrier (invariant
 * A1): a missing key file, a refused token exchange, or a failed query are
 * domain outcomes, returned as values, never thrown.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  encodeServiceAccountAssertion,
  decodeTokenResponse,
  encodeSearchAnalyticsQuery,
  decodeSearchAnalyticsRows,
  searchAnalyticsEndpoint,
  SEARCH_CONSOLE_TOKEN_AUDIENCE,
  type DemandAssertion,
} from "@emsenn/content/codecs/search-console";

type FetchLike = typeof fetch;

export type { DemandAssertion };

/** Where the service-account key lives unless the caller says otherwise. */
export function defaultSearchConsoleKeyFile(): string {
  return join(homedir(), ".config", "sites", "search-console-key.json");
}

export type SearchConsoleDemandOptions = Readonly<{
  /** The Search Console property, e.g. "sc-domain:koios.news". */
  property: string;
  /** Inclusive start date, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end date, YYYY-MM-DD. */
  endDate: string;
  /** Service-account key file; defaults to defaultSearchConsoleKeyFile(). */
  keyFile?: string;
  /** Report dimensions; the codec defaults to ["query"]. */
  dimensions?: readonly string[];
  /** Row bound; the codec defaults to 250. */
  rowLimit?: number;
  fetchImpl?: FetchLike;
  /** Seconds-since-epoch supplier for the token lifetime claims. */
  now?: () => number;
}>;

export interface SearchConsoleDemandWitness {
  readonly kind: "content.demand.search-console:witness";
  readonly property: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly queries: readonly DemandAssertion[];
}

export interface SearchConsoleDemandObstruction {
  readonly kind: "content.demand.search-console-obstruction";
  /** Where the pull was obstructed. */
  readonly at: "key-file" | "token-exchange" | "query";
  readonly detail: string;
  /** The HTTP status, where one was witnessed. */
  readonly status?: number;
}

export type SearchConsoleDemandJudgment = SearchConsoleDemandWitness | SearchConsoleDemandObstruction;

function obstruction(at: SearchConsoleDemandObstruction["at"], detail: string, status?: number): SearchConsoleDemandObstruction {
  return Object.freeze({
    kind: "content.demand.search-console-obstruction" as const,
    at,
    detail,
    ...(status === undefined ? {} : { status }),
  });
}

function failureDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Pull one date window of Search Console demand for one property: read the
 * service-account key, exchange a signed assertion for a token, query
 * Search Analytics, decode the rows. Returns the witness with its queries,
 * or the obstruction naming where the pull stopped.
 */
export async function fetchSearchConsoleDemand(options: SearchConsoleDemandOptions): Promise<SearchConsoleDemandJudgment> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Math.floor(Date.now() / 1000)); // law-allow: wall-clock-as-data — token lifetimes are the vendor's clock testimony
  const keyFile = options.keyFile ?? defaultSearchConsoleKeyFile();

  // ---------- the key file ----------
  let clientEmail: string;
  let privateKeyPem: string;
  try {
    const parsed = JSON.parse(await readFile(keyFile, "utf8")) as { client_email?: unknown; private_key?: unknown };
    if (typeof parsed.client_email !== "string" || parsed.client_email === "" || typeof parsed.private_key !== "string" || parsed.private_key === "") {
      return obstruction("key-file", `${keyFile} lacks client_email/private_key`);
    }
    clientEmail = parsed.client_email;
    privateKeyPem = parsed.private_key;
  } catch (error) {
    return obstruction("key-file", `${keyFile}: ${failureDetail(error)}`);
  }

  // ---------- the token exchange ----------
  const issuedAt = Math.floor(now());
  let assertion: string;
  try {
    assertion = encodeServiceAccountAssertion({ clientEmail, privateKeyPem, issuedAt, expiresAt: issuedAt + 3600 });
  } catch (error) {
    // A key that cannot sign is a key-file obstruction, witnessed at signing.
    return obstruction("key-file", `${keyFile}: ${failureDetail(error)}`);
  }
  let grantToken: string;
  try {
    const response = await fetchImpl(SEARCH_CONSOLE_TOKEN_AUDIENCE, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });
    if (!response.ok) {
      return obstruction("token-exchange", `token endpoint answered ${response.status}: ${(await response.text()).slice(0, 200)}`, response.status);
    }
    grantToken = decodeTokenResponse(await response.json()).accessToken;
  } catch (error) {
    return obstruction("token-exchange", failureDetail(error));
  }

  // ---------- the query ----------
  const body = encodeSearchAnalyticsQuery({
    startDate: options.startDate,
    endDate: options.endDate,
    ...(options.dimensions === undefined ? {} : { dimensions: options.dimensions }),
    ...(options.rowLimit === undefined ? {} : { rowLimit: options.rowLimit }),
  });
  try {
    const response = await fetchImpl(searchAnalyticsEndpoint(options.property), {
      method: "POST",
      headers: { authorization: `Bearer ${grantToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return obstruction("query", `search analytics answered ${response.status}: ${(await response.text()).slice(0, 200)}`, response.status);
    }
    const queries = decodeSearchAnalyticsRows(await response.json());
    return Object.freeze({
      kind: "content.demand.search-console:witness" as const,
      property: options.property,
      startDate: body.startDate,
      endDate: body.endDate,
      queries,
    });
  } catch (error) {
    return obstruction("query", failureDetail(error));
  }
}
