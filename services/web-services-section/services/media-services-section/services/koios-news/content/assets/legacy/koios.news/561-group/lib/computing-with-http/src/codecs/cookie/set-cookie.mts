// set-cookie.mts — the Set-Cookie response field representation.
//
// Semantic value: one cookie with its attributes. Wire form: the
// Set-Cookie field text. The pair is a RETRACTION: parseSetCookie ∘
// serializeSetCookie recovers the cookie with attribute casing
// normalized; the opposite composite drops attributes the grammar does
// not admit (unknown names, unparseable dates, non-finite ages).

import { assertCookieName, decodeCookieValue, isCookieName, isFieldValue } from "./grammar.mjs";

export type SameSite = "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
export type CookiePriority = "Low" | "Medium" | "High" | "low" | "medium" | "high";

export type CookieOptions = Readonly<{
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSite | boolean;
  priority?: CookiePriority;
  partitioned?: boolean;
  encode?: (value: string) => string;
}>;

/** A decoded Set-Cookie field: the cookie and the attributes the grammar admitted. */
export type SetCookie = Readonly<{
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  priority?: "Low" | "Medium" | "High";
  partitioned: boolean;
}>;

export function serializeSetCookie(name: string, value: string, options: CookieOptions = {}): string {
  assertCookieName(name);
  const encode = options.encode ?? encodeURIComponent;
  const encoded = encode(value);
  if (!isFieldValue(encoded)) throw new TypeError(`serializeSetCookie: encoded value for ${name} contains invalid characters`);
  const parts = [`${name}=${encoded}`];
  if (options.maxAge !== undefined) {
    if (!Number.isFinite(options.maxAge)) throw new TypeError("serializeSetCookie: maxAge must be finite");
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.domain !== undefined) parts.push(`Domain=${validAttributeValue("domain", options.domain)}`);
  if (options.path !== undefined) parts.push(`Path=${validAttributeValue("path", options.path)}`);
  if (options.expires !== undefined) {
    if (!Number.isFinite(options.expires.getTime())) throw new TypeError("serializeSetCookie: expires must be a valid Date");
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite !== undefined && options.sameSite !== false) parts.push(`SameSite=${sameSiteValue(options.sameSite)}`);
  if (options.priority !== undefined) parts.push(`Priority=${priorityValue(options.priority)}`);
  if (options.partitioned) parts.push("Partitioned");
  return parts.join("; ");
}

export function parseSetCookie(text: string): SetCookie | null {
  const [pair = "", ...attributes] = text.split(";");
  const equals = pair.indexOf("=");
  if (equals <= 0) return null;
  const name = pair.slice(0, equals).trim();
  if (!isCookieName(name)) return null;

  const cookie: {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    priority?: "Low" | "Medium" | "High";
    partitioned: boolean;
  } = {
    name,
    value: decodeCookieValue(pair.slice(equals + 1).trim()),
    httpOnly: false,
    secure: false,
    partitioned: false,
  };

  for (const attribute of attributes) {
    const split = attribute.indexOf("=");
    const key = (split === -1 ? attribute : attribute.slice(0, split)).trim().toLowerCase();
    const value = split === -1 ? "" : attribute.slice(split + 1).trim();
    switch (key) {
      case "domain":
        if (value) cookie.domain = value;
        break;
      case "path":
        if (value) cookie.path = value;
        break;
      case "expires": {
        const date = new Date(value);
        if (Number.isFinite(date.getTime())) cookie.expires = date;
        break;
      }
      case "max-age": {
        const age = Number(value);
        if (Number.isFinite(age)) cookie.maxAge = age;
        break;
      }
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "samesite": {
        const normalized = value.toLowerCase();
        if (normalized === "strict") cookie.sameSite = "Strict";
        else if (normalized === "lax") cookie.sameSite = "Lax";
        else if (normalized === "none") cookie.sameSite = "None";
        break;
      }
      case "priority": {
        const normalized = value.toLowerCase();
        if (normalized === "low") cookie.priority = "Low";
        else if (normalized === "medium") cookie.priority = "Medium";
        else if (normalized === "high") cookie.priority = "High";
        break;
      }
      case "partitioned":
        cookie.partitioned = true;
        break;
      default:
        break;
    }
  }
  return Object.freeze(cookie);
}

function validAttributeValue(name: string, value: string): string {
  if (!isFieldValue(value)) throw new TypeError(`serializeSetCookie: ${name} contains invalid characters`);
  return value;
}

function sameSiteValue(value: SameSite | true): "Strict" | "Lax" | "None" {
  if (value === true) return "Strict";
  const normalized = value.toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "lax") return "Lax";
  if (normalized === "none") return "None";
  throw new TypeError("serializeSetCookie: sameSite must be Strict, Lax, or None");
}

function priorityValue(value: CookiePriority): "Low" | "Medium" | "High" {
  const normalized = value.toLowerCase();
  if (normalized === "low") return "Low";
  if (normalized === "medium") return "Medium";
  if (normalized === "high") return "High";
  throw new TypeError("serializeSetCookie: priority must be Low, Medium, or High");
}
