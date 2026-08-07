/** A primitive JSON value: a string, number, boolean, or null. */
export type JsonScalar = string | number | boolean | null;
/**
 * Any JSON value: a scalar, a readonly array of values, or a readonly
 * string-keyed object of values.
 */
export type JsonValue = JsonScalar | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * An IPTC-style controlled-vocabulary term: a required display name with an
 * optional code and an optional scheme uri that names the vocabulary the code
 * belongs to.
 */
export type IptcCode = Readonly<{
  code?: string;
  name: string;
  scheme?: string;
}>;

/**
 * A person credited on a ninjs article: a required name with an optional uri
 * identifying the person and an optional literal byline string.
 */
export type NinjsPerson = Readonly<{
  name: string;
  uri?: string;
  literal?: string;
}>;

/**
 * The body content of an article in two optional representations: plain text
 * and html.
 */
export type NinjsBody = Readonly<{
  text?: string;
  html?: string;
}>;

/**
 * The loose input shape accepted when building a ninjs article: a required uri
 * and title plus optional metadata, where bylines, subjects, genres, services,
 * and organizations may be given as code objects, plain strings, or (for by) a
 * single string, and extra carries arbitrary additional JSON fields.
 */
export type NinjsArticleInput = Readonly<{
  uri: string;
  guid?: string;
  title: string;
  description?: string;
  body?: NinjsBody;
  by?: readonly NinjsPerson[] | readonly string[] | string;
  language?: string;
  firstCreated?: string;
  versionCreated?: string;
  pubStatus?: string;
  subjects?: readonly IptcCode[] | readonly string[];
  genres?: readonly IptcCode[] | readonly string[];
  services?: readonly IptcCode[] | readonly string[];
  organizations?: readonly IptcCode[] | readonly string[];
  extra?: Readonly<Record<string, JsonValue>>;
}>;

/**
 * A normalized ninjs text record using the spec's field names (uri, guid, type,
 * version, pubstatus, subject, genre, service, organisation, etc.), extensible
 * with arbitrary additional JSON, person, or code fields.
 */
export type NinjsArticle = Readonly<{
  uri: string;
  guid: string;
  type: "text";
  version: string;
  title: string;
  description_text?: string;
  body_text?: string;
  body_html?: string;
  by?: readonly NinjsPerson[];
  language: string;
  firstcreated?: string;
  versioncreated?: string;
  pubstatus: string;
  subject?: readonly IptcCode[];
  genre?: readonly IptcCode[];
  service?: readonly IptcCode[];
  organisation?: readonly IptcCode[];
} & Readonly<Record<string, JsonValue | readonly NinjsPerson[] | readonly IptcCode[] | undefined>>>;

/**
 * A produced news artifact: the ninjs codec tag and media type, the subject it
 * belongs to, the record's uri, and the normalized ninjs record itself.
 */
export type NewsCodecArtifact = Readonly<{
  codec: "ninjs";
  mediaType: "application/vnd.iptc.ninjs+json";
  subject: string;
  uri: string;
  record: NinjsArticle;
}>;

/**
 * The ninjs schema version uri (2.1) stamped onto every produced record's
 * version field.
 */
export const NINJS_VERSION = "http://www.iptc.org/std/ninjs/2.1/";
/** The IANA media type for ninjs JSON, used as the artifact's media type. */
export const NINJS_MEDIA_TYPE = "application/vnd.iptc.ninjs+json";

/**
 * Builds a normalized, frozen ninjs article from loose input: validates and
 * canonicalizes the uri, defaults the guid to the uri, requires a non-empty
 * title, defaults language to "en" and pubstatus to "usable", validates
 * ISO-like dates, normalizes people and code lists, omits empty optional
 * fields, and merges any extra fields.
 */
export function createNinjsArticle(input: NinjsArticleInput): NinjsArticle {
  const uri = absoluteHttpUrl(input.uri, "ninjs.uri");
  const guid = stringValue(input.guid) ?? uri;
  const title = requiredString(input.title, "ninjs.title");
  const firstCreated = isoString(input.firstCreated, "ninjs.firstCreated");
  const versionCreated = isoString(input.versionCreated, "ninjs.versionCreated");
  const article: Record<string, JsonValue | readonly NinjsPerson[] | readonly IptcCode[] | undefined> = {
    uri,
    guid,
    type: "text",
    version: NINJS_VERSION,
    title,
    language: input.language ?? "en",
    pubstatus: input.pubStatus ?? "usable",
    ...(stringValue(input.description) === undefined ? {} : { description_text: stringValue(input.description)! }),
    ...(stringValue(input.body?.text) === undefined ? {} : { body_text: stringValue(input.body?.text)! }),
    ...(stringValue(input.body?.html) === undefined ? {} : { body_html: stringValue(input.body?.html)! }),
    ...(normalizePeople(input.by).length === 0 ? {} : { by: normalizePeople(input.by) }),
    ...(firstCreated === undefined ? {} : { firstcreated: firstCreated }),
    ...(versionCreated === undefined ? {} : { versioncreated: versionCreated }),
    ...(normalizeCodes(input.subjects).length === 0 ? {} : { subject: normalizeCodes(input.subjects) }),
    ...(normalizeCodes(input.genres).length === 0 ? {} : { genre: normalizeCodes(input.genres) }),
    ...(normalizeCodes(input.services).length === 0 ? {} : { service: normalizeCodes(input.services) }),
    ...(normalizeCodes(input.organizations).length === 0 ? {} : { organisation: normalizeCodes(input.organizations) }),
    ...(input.extra ?? {}),
  };
  return Object.freeze(article as NinjsArticle);
}

/**
 * Builds a frozen news codec artifact for the given subject: creates the
 * normalized ninjs record from the input and wraps it with the ninjs codec tag,
 * media type, subject, and the record's uri.
 */
export function createNinjsArtifact(subject: string, input: NinjsArticleInput): NewsCodecArtifact {
  const record = createNinjsArticle(input);
  return Object.freeze({
    codec: "ninjs",
    mediaType: NINJS_MEDIA_TYPE,
    subject,
    uri: record.uri,
    record,
  });
}

/**
 * Serializes an artifact's ninjs record to a JSON string with a trailing
 * newline.
 */
export function serializeNewsArtifact(artifact: Pick<NewsCodecArtifact, "record">): string {
  return `${JSON.stringify(artifact.record)}\n`;
}

/**
 * Type-guard assertion that throws a TypeError unless the value is a non-array
 * object with a non-empty uri, guid, and title, a type of "text", and the
 * supported ninjs version.
 */
export function assertNinjsArticle(value: unknown): asserts value is NinjsArticle {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("ninjs record must be an object");
  const record = value as Record<string, unknown>;
  requiredString(record.uri, "ninjs.uri");
  requiredString(record.guid, "ninjs.guid");
  if (record.type !== "text") throw new TypeError("ninjs.type must be text");
  if (record.version !== NINJS_VERSION) throw new TypeError("ninjs.version is unsupported");
  requiredString(record.title, "ninjs.title");
}

function normalizePeople(value: NinjsArticleInput["by"]): readonly NinjsPerson[] {
  if (value === undefined) return Object.freeze([]);
  const values = Array.isArray(value) ? value : [value];
  return Object.freeze(values.flatMap((entry): NinjsPerson[] => {
    if (typeof entry === "string") return entry.trim() ? [Object.freeze({ name: entry.trim() })] : [];
    const name = entry.name.trim();
    if (!name) return [];
    return [Object.freeze({
      name,
      ...(entry.uri ? { uri: entry.uri } : {}),
      ...(entry.literal ? { literal: entry.literal } : {}),
    })];
  }));
}

function normalizeCodes(value: NinjsArticleInput["subjects"]): readonly IptcCode[] {
  if (value === undefined) return Object.freeze([]);
  return Object.freeze(value.flatMap((entry): IptcCode[] => {
    if (typeof entry === "string") return entry.trim() ? [Object.freeze({ name: entry.trim() })] : [];
    const name = entry.name.trim();
    if (!name) return [];
    return [Object.freeze({
      name,
      ...(entry.code ? { code: entry.code } : {}),
      ...(entry.scheme ? { scheme: entry.scheme } : {}),
    })];
  }));
}

function absoluteHttpUrl(value: string, path: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError();
    return url.href;
  } catch {
    throw new TypeError(`${path} must be an absolute http(s) URL`);
  }
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function isoString(value: unknown, path: string): string | undefined {
  const text = stringValue(value);
  if (text === undefined) return undefined;
  if (Number.isNaN(Date.parse(text))) throw new TypeError(`${path} must be an ISO-like date string`);
  return text;
}
