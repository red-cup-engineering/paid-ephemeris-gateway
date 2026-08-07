# @emsenn/content — API reference

> Generated from source by `jsnode-doc-computer reference`.
> Each entry is the exported symbol's verbatim signature and its leading JSDoc; regenerate after changing the public surface.

## Modules

- `@emsenn/content/codecs`
- `@emsenn/content/image`
- `@emsenn/content/markdown`
- `@emsenn/content/propaganda`
- `@emsenn/content/syndication`
- `@emsenn/content/topology`
- `@emsenn/content/topology/news`

## `@emsenn/content/codecs`

### `assertNinjsArticle` — function

```ts
export function assertNinjsArticle(value: unknown): asserts value is NinjsArticle
```

Type-guard assertion that throws a TypeError unless the value is a non-array object with a non-empty uri, guid, and title, a type of "text", and the supported ninjs version.

### `censusVault` — function

```ts
export function censusVault(entries: readonly VaultEntry[]): VaultCensus
```

Aggregate the genre vocabulary and the type/kind/class crosswalk over a vault.
Pure; total; order of `entries` does not affect the result beyond the deterministic value sort (by total desc, then value asc).

### `CITATION_FIELDS` — variable

```ts
export const CITATION_FIELDS: readonly string[]
```

The front-matter field names treated as bibliographic citations to other corpus pieces (see-also, derives-from, cites, and the like) - the fields that project cleanly to CSL references.

### `CITES_PREDICATE` — variable

```ts
export const CITES_PREDICATE
```

The predicate under which a document's `references:` citations are recorded.

### `ConformanceSummary` — type-alias

```ts
export type ConformanceSummary = Readonly<{ total: number; byRule: Readonly<Record<string, number>>; bySeverity: Readonly<Record<FindingSeverity, number>>; }>
```

Tally findings by rule and severity for a quick conformance summary.

### `conformRecord` — function

```ts
export function conformRecord(path: string, record: FrontMatterRecord): readonly VaultFinding[]
```

All conformance findings for one record.
Pure; total.
The `path` is threaded through verbatim so findings are addressable; this module never reads it.

### `createNinjsArticle` — function

```ts
export function createNinjsArticle(input: NinjsArticleInput): NinjsArticle
```

Builds a normalized, frozen ninjs article from loose input: validates and canonicalizes the uri, defaults the guid to the uri, requires a non-empty title, defaults language to "en" and pubstatus to "usable", validates ISO-like dates, normalizes people and code lists, omits empty optional fields, and merges any extra fields.

### `createNinjsArtifact` — function

```ts
export function createNinjsArtifact(subject: string, input: NinjsArticleInput): NewsCodecArtifact
```

Builds a frozen news codec artifact for the given subject: creates the normalized ninjs record from the input and wraps it with the ninjs codec tag, media type, subject, and the record's uri.

### `CslDate` — type-alias

```ts
export type CslDate = Readonly<{ "date-parts": readonly (readonly number[])[] }>
```

A CSL-JSON date: a date-parts array whose single inner tuple holds the numeric year, optional month, and optional day.

### `CslItem` — type-alias

```ts
export type CslItem = Readonly<{ id?: string; type: string; title?: string; author?: readonly CslName[]; "container-title"?: string; publisher?: string; volume?: string; issue?: string; page?: string; issued?: CslDate; DOI?: string; URL?: string; note?: string; }> & Readonly<Record<string, unknown>>
```

A CSL-JSON reference item: a single bibliographic record with a required type and the standard optional CSL fields (id, title, author, dates, identifiers), open to any further string-keyed CSL fields.

### `CslName` — type-alias

```ts
export type CslName = Readonly<{ family?: string; given?: string; literal?: string }>
```

A CSL-JSON name: a personal name as family/given parts, or a single literal string for unstructured or institutional names.

### `DecodedReferences` — type-alias

```ts
export type DecodedReferences = Readonly<{ dialect: ReferenceDialect; items: readonly CslItem[]; }>
```

The result of decoding a references block: the detected source dialect plus the references normalized to CSL-JSON items.

### `decodeFrontMatterDocument` — function

```ts
export function decodeFrontMatterDocument(text: string): FrontMatterDocument
```

Parses a `---`-fenced front-matter document into a frozen FrontMatterDocument of the decoded head record and the verbatim body that follows the closing fence.
Throws TypeError if the text is not a string or its fences are missing.

### `decodeReferences` — function

```ts
export function decodeReferences(documentText: string): DecodedReferences
```

Decode and normalize a document's `references:` block to CSL-JSON.
Accepts the full markdown document text (front matter fence + body); reads only the front matter.
Returns the detected dialect and the normalized CSL items.
Pure.

### `decodeReferencesFromHead` — function

```ts
export function decodeReferencesFromHead(headText: string): DecodedReferences
```

As decodeReferences, but over the already-extracted front-matter head text (the lines between the `---` fences, no fences).

### `decodeSearchAnalyticsRows` — function

```ts
export function decodeSearchAnalyticsRows(json: unknown): readonly DemandAssertion[]
```

Read a Search Analytics response into demand assertions.
A missing `rows` field is Google's empty result — a value, not an error; numbers pass through exact-as-given.

### `decodeTokenResponse` — function

```ts
export function decodeTokenResponse(json: unknown): TokenGrant
```

Read Google's token response into a grant.
Malformed shape is the only failure mode (TypeError); HTTP/transport failures are the caller's.

### `DemandAssertion` — type-alias

```ts
export type DemandAssertion = Readonly<{ query: string; clicks: number; impressions: number; ctr: number; position: number; }>
```

One demand assertion from Search Console: what was searched for, and how the property fared.
Numbers are exact-as-given by the vendor.

### `DocumentRelationalOptions` — type-alias

```ts
export type DocumentRelationalOptions = Readonly<{ /** Override the document's identity (its subject). Default: read from front * matter via SUBJECT_KEYS, else "document". */ subject?: string; /** The witness (the datom's time/mark). Default: the document's subject — a * document witnesses its own front matter. */ witness?: JsonValue; /** Also emit `[citekey, attribute, value]` datoms for each reference's own * fields (title, container-title, issued year, DOI, URL, authors), making the * reference itself a relational subject. Default: true. */ includeReferenceAttributes?: boolean; }>
```

_Undocumented._

### `documentSubject` — function

```ts
export function documentSubject(documentText: string, override?: string): string
```

A document's identity: an explicit override, else the first present SUBJECT_KEYS front-matter value, else "document".
Pure; total.

### `documentToCells` — function

```ts
export function documentToCells(documentText: string, opts: DocumentRelationalOptions = {}): readonly ChargedCell[]
```

As `documentToDatoms`, lifted to relationality charged cells (each a `absurd`/told-true witness — no negative is ever asserted).

### `documentToDatoms` — function

```ts
export function documentToDatoms(documentText: string, opts: DocumentRelationalOptions = {}): readonly Datom[]
```

Project a markdown document's citations and typed relations to relationality EAVT witness datoms.
Pure; total over any string (a document with no front matter and no references yields no datoms).

### `encodeCslJson` — function

```ts
export function encodeCslJson(items: readonly CslItem[]): readonly CslItem[]
```

The CSL-JSON serialization of decoded references (a plain array the caller JSON-stringifies).

### `encodeFrontMatterDocument` — function

```ts
export function encodeFrontMatterDocument(doc: FrontMatterDocument): string
```

Serializes a FrontMatterDocument to canonical `---`-fenced text: the front-matter entries (normalizing quoting, dropping comments) followed by the body.
Throws TypeError if the document, its body, or its frontMatter record is malformed.

### `encodeGenreSchemeJsonLd` — function

```ts
export function encodeGenreSchemeJsonLd(scheme: GenreConceptScheme): Readonly<Record<string, unknown>>
```

Emit the genre concept scheme as a SKOS JSON-LD document (a plain object the caller serializes).
Concepts are top concepts of the scheme; each carries a document count and the front-matter keys observed to carry it.

### `encodeGenreSchemeTurtle` — function

```ts
export function encodeGenreSchemeTurtle(scheme: GenreConceptScheme): string
```

Emit the genre concept scheme as Turtle.

### `encodeReferencesBlock` — function

```ts
export function encodeReferencesBlock(items: readonly CslItem[]): string
```

Encode CSL-JSON items as a `references:` block (key line included), in the corpus's canonical 2-space sequence-of-maps style.
Pure; total.
An empty list encodes to `references: []`.

### `encodeSearchAnalyticsQuery` — function

```ts
export function encodeSearchAnalyticsQuery(input: SearchAnalyticsQueryInput): SearchAnalyticsQuery
```

The Search Analytics request body for one date window.
Defaults: dimensions ["query"], rowLimit 250.

### `encodeServiceAccountAssertion` — function

```ts
export function encodeServiceAccountAssertion(input: ServiceAccountAssertionInput): string
```

The signed RS256 service-account assertion (JWT compact serialization, header.payload.signature, base64url without padding) for Google's OAuth2 jwt-bearer grant.
Pure: the signature is a function of the inputs alone.

### `FindingSeverity` — type-alias

```ts
export type FindingSeverity = "error" | "warning" | "info"
```

The severity of a vault conformance finding: `error`, `warning`, or `info`.

### `FrontMatterDocument` — type-alias

```ts
export type FrontMatterDocument = Readonly<{ frontMatter: FrontMatterRecord; body: string; }>
```

A parsed front-matter document: the leading YAML-ish record and the body text that follows it.

### `FrontMatterRecord` — type-alias

```ts
export type FrontMatterRecord = Readonly<Record<string, unknown>>
```

The decoded front-matter head: a frozen, readonly record keyed by front-matter key, with values widened to unknown.

### `FrontMatterScalar` — type-alias

```ts
export type FrontMatterScalar = string | number | boolean
```

A leaf front-matter value: a string (including dates kept as ISO strings), number, or boolean.

### `FrontMatterValue` — type-alias

```ts
export type FrontMatterValue = | FrontMatterScalar | readonly FrontMatterScalar[] | Readonly<Record<string, FrontMatterScalar | readonly FrontMatterScalar[]>>
```

A front-matter entry value: a scalar, a readonly array of scalars, or a one-level nested map of scalars and scalar arrays - the full value shape the codec's YAML subset admits.

### `GENRE_CANONICAL_KEY` — variable

```ts
export const GENRE_CANONICAL_KEY
```

The canonical front-matter key for the genre facet.

### `GENRE_REFINEMENT_KEY` — variable

```ts
export const GENRE_REFINEMENT_KEY
```

The key whose value refines the genre named by `type` (a narrower sub-genre).

### `GENRE_VARIANT_KEYS` — variable

```ts
export const GENRE_VARIANT_KEYS: readonly string[]
```

Non-canonical keys that carry the same genre facet as `type`.

### `GenreConcept` — type-alias

```ts
export type GenreConcept = Readonly<{ value: string; slug: string; documents: number; carriedBy: readonly GenreSourceKey[] | readonly string[]; }>
```

One concept in the genre SKOS scheme: the genre `value`, its IRI `slug`, the number of `documents` carrying it, and the front-matter keys (`carriedBy`) observed to carry it.

### `genreConceptScheme` — function

```ts
export function genreConceptScheme( census: VaultCensus, options: Readonly<{ base?: string; minDocuments?: number }> = {}, ): GenreConceptScheme
```

Build a SKOS concept scheme for the genre facet from a census.
Only values that appear at least `minDocuments` times become concepts (the long tail of one-off values is left out of the published vocabulary).
`base` is the IRI stem the scheme and its concepts hang under.
Pure; total.

### `GenreConceptScheme` — type-alias

```ts
export type GenreConceptScheme = Readonly<{ base: string; canonicalKey: string; variantKeys: readonly string[]; refinementKey: string; concepts: readonly GenreConcept[]; }>
```

The genre facet rendered as a SKOS concept scheme: the IRI `base` stem, the canonical/variant/refinement front-matter keys, and the list of genre `concepts`.

### `GenreConflict` — type-alias

```ts
export type GenreConflict = Readonly<{ type: string; kind: string }>
```

A disagreeing pair of genre assertions on one record: `type` and a variant key (`kind`) both present with different values.

### `genreFacet` — function

```ts
export function genreFacet(record: FrontMatterRecord): GenreFacet
```

Resolve the genre facet of a single decoded record.
Pure; total.

### `GenreFacet` — type-alias

```ts
export type GenreFacet = Readonly<{ value: string | null; sourceKey: GenreSourceKey | null; variant: boolean; refinement: string | null; conflict: GenreConflict | null; }>
```

The genre facet resolved for a single record.
`value` is the canonical genre (from `type` when present, else from a variant key).
`variant` marks that the value was read from a non-canonical key.
`conflict` is set when `type` and a variant key are both present and disagree — the record asserts two genres at once and the corpus is holding the contradiction silently.

### `GenreSourceKey` — type-alias

```ts
export type GenreSourceKey = "type" | "kind"
```

The front-matter key a genre value was read from: `type` (canonical) or `kind` (variant).

### `GenreValueRow` — type-alias

```ts
export type GenreValueRow = Readonly<{ value: string; type: number; kind: number; class: number; total: number; }>
```

One genre value, counted by the key it was carried under.
The same value appearing under more than one of these columns is the evidence that `type`, `kind`, and `class` are one facet under three names.

### `internalCitationItem` — function

```ts
export function internalCitationItem( resolved: Readonly<{ slug: string; repoPath: string; title?: string }>, base: string, ): CslItem
```

Build a CSL-JSON reference that links to one of our own pieces.
The target document has been resolved by the caller to a repo path and (optionally) a title; `base` is the public site origin.
Pure; total.

### `InternalReferenceKind` — type-alias

```ts
export type InternalReferenceKind = "citation" | "relation"
```

Which class an internal cross-reference field belongs to: "citation" (bibliographic) or "relation" (typed concept-graph link).

### `InternalReferenceTarget` — type-alias

```ts
export type InternalReferenceTarget = Readonly<{ field: string; kind: InternalReferenceKind; /** The raw slug or relative path as written in the front matter. */ value: string; }>
```

One extracted internal cross-reference: the front-matter field it came from, its kind (citation or relation), and the raw slug or relative path written as the target value.

### `internalReferenceTargets` — function

```ts
export function internalReferenceTargets(record: Readonly<Record<string, unknown>>): readonly InternalReferenceTarget[]
```

Extract every internal cross-reference target from a decoded record, tagged by field and whether the field is bibliographic (citation) or a typed relation.
Pure; total.
Does not resolve targets — that needs the corpus.

### `IptcCode` — type-alias

```ts
export type IptcCode = Readonly<{ code?: string; name: string; scheme?: string; }>
```

An IPTC-style controlled-vocabulary term: a required display name with an optional code and an optional scheme uri that names the vocabulary the code belongs to.

### `JsonScalar` — type-alias

```ts
export type JsonScalar = string | number | boolean | null
```

A primitive JSON value: a string, number, boolean, or null.

### `JsonValue` — type-alias

```ts
export type JsonValue = JsonScalar | readonly JsonValue[] | { readonly [key: string]: JsonValue }
```

Any JSON value: a scalar, a readonly array of values, or a readonly string-keyed object of values.

### `NewsCodecArtifact` — type-alias

```ts
export type NewsCodecArtifact = Readonly<{ codec: "ninjs"; mediaType: "application/vnd.iptc.ninjs+json"; subject: string; uri: string; record: NinjsArticle; }>
```

A produced news artifact: the ninjs codec tag and media type, the subject it belongs to, the record's uri, and the normalized ninjs record itself.

### `NINJS_MEDIA_TYPE` — variable

```ts
export const NINJS_MEDIA_TYPE
```

The IANA media type for ninjs JSON, used as the artifact's media type.

### `NINJS_VERSION` — variable

```ts
export const NINJS_VERSION
```

The ninjs schema version uri (2.1) stamped onto every produced record's version field.

### `NinjsArticle` — type-alias

```ts
export type NinjsArticle = Readonly<{ uri: string; guid: string; type: "text"; version: string; title: string; description_text?: string; body_text?: string; body_html?: string; by?: readonly NinjsPerson[]; language: string; firstcreated?: string; versioncreated?: string; pubstatus: string; subject?: readonly IptcCode[]; genre?: readonly IptcCode[]; service?: readonly IptcCode[]; organisation?: readonly IptcCode[]; } & Readonly<Record<string, JsonValue | readonly NinjsPerson[] | readonly IptcCode[] | undefined>>>
```

A normalized ninjs text record using the spec's field names (uri, guid, type, version, pubstatus, subject, genre, service, organisation, etc.), extensible with arbitrary additional JSON, person, or code fields.

### `NinjsArticleInput` — type-alias

```ts
export type NinjsArticleInput = Readonly<{ uri: string; guid?: string; title: string; description?: string; body?: NinjsBody; by?: readonly NinjsPerson[] | readonly string[] | string; language?: string; firstCreated?: string; versionCreated?: string; pubStatus?: string; subjects?: readonly IptcCode[] | readonly string[]; genres?: readonly IptcCode[] | readonly string[]; services?: readonly IptcCode[] | readonly string[]; organizations?: readonly IptcCode[] | readonly string[]; extra?: Readonly<Record<string, JsonValue>>; }>
```

The loose input shape accepted when building a ninjs article: a required uri and title plus optional metadata, where bylines, subjects, genres, services, and organizations may be given as code objects, plain strings, or (for by) a single string, and extra carries arbitrary additional JSON fields.

### `NinjsBody` — type-alias

```ts
export type NinjsBody = Readonly<{ text?: string; html?: string; }>
```

The body content of an article in two optional representations: plain text and html.

### `NinjsPerson` — type-alias

```ts
export type NinjsPerson = Readonly<{ name: string; uri?: string; literal?: string; }>
```

A person credited on a ninjs article: a required name with an optional uri identifying the person and an optional literal byline string.

### `referenceConformance` — function

```ts
export function referenceConformance(path: string, dialect: string): readonly VaultFinding[]
```

A conformance finding for a record's `references:` dialect.
The bespoke citekey-map form is valid YAML and decodes fine, but it is not CSL/citeproc — the canonical target — so it is flagged for normalization.
Pure; total.
The dialect is computed by the references codec (which needs raw text); this takes the already-detected dialect string so vault.mts stays record-pure.

### `ReferenceDialect` — type-alias

```ts
export type ReferenceDialect = "csl" | "citekey-map" | "empty" | "none" | "mixed"
```

The shape a document's references block was found in: "csl" (CSL sequence of maps), "citekey-map" (bespoke citekey-to-record map), "empty" (a present but empty block), "none" (no references key), or "mixed" (an unrecognized shape).

### `referencesFromCells` — function

```ts
export function referencesFromCells(subject: string, cells: readonly ChargedCell[]): readonly CslItem[]
```

Rebuild CSL-JSON items from charged cells: every `[subject, "cites", citekey]` edge names a reference, and `[citekey, attribute, value]` cells supply its fields.
The inverse of the citation edges in `documentToDatoms`; feed the result to `encodeReferencesBlock`/`setReferences` to write it into a document.
Pure; total.

### `referenceSlug` — function

```ts
export function referenceSlug(value: string): string
```

The slug a target resolves *by*: the last path segment without `.md`, or the bare slug.
(Resolution itself — slug → document — is the caller's.)

### `RELATION_FIELDS` — variable

```ts
export const RELATION_FIELDS: readonly string[]
```

The front-matter field names treated as typed concept-graph relations between corpus pieces (depends-on, part-of, contrasts-with, and the like) - fields whose predicate is information and so are NOT flattened into a bibliography.

### `relationFieldsFromCells` — function

```ts
export function relationFieldsFromCells(subject: string, cells: readonly ChargedCell[]): FrontMatterRecord
```

Rebuild the typed-relation front-matter fields (CITATION ∪ RELATION) from charged cells whose subject is `subject`.
The inverse of the relation edges in `documentToDatoms`.
Pure; total.

### `SEARCH_CONSOLE_SCOPE` — variable

```ts
export const SEARCH_CONSOLE_SCOPE
```

The default OAuth2 scope claim for assertions: the read-only webmasters scope.

### `SEARCH_CONSOLE_TOKEN_AUDIENCE` — variable

```ts
export const SEARCH_CONSOLE_TOKEN_AUDIENCE
```

The default token audience claim for assertions: Google's OAuth2 token endpoint.

### `searchAnalyticsEndpoint` — function

```ts
export function searchAnalyticsEndpoint(property: string): string
```

The Search Analytics query endpoint for one property (e.g. "sc-domain:koios.news" or "https://example.com/").

### `SearchAnalyticsQuery` — type-alias

```ts
export type SearchAnalyticsQuery = Readonly<{ startDate: string; endDate: string; dimensions: readonly string[]; rowLimit: number; }>
```

The encoded Search Analytics request body: start and end dates, dimensions, and row limit with all optional inputs resolved to their concrete defaults.

### `SearchAnalyticsQueryInput` — type-alias

```ts
export type SearchAnalyticsQueryInput = Readonly<{ /** Inclusive start date, YYYY-MM-DD. */ startDate: string; /** Inclusive end date, YYYY-MM-DD. */ endDate: string; /** Report dimensions; defaults to ["query"]. */ dimensions?: readonly string[]; /** Row bound; defaults to 250. */ rowLimit?: number; }>
```

Inputs for a Search Analytics query: the inclusive start and end dates as YYYY-MM-DD strings, optional report dimensions (defaulting to ["query"]), and an optional row bound (defaulting to 250).

### `serializeNewsArtifact` — function

```ts
export function serializeNewsArtifact(artifact: Pick<NewsCodecArtifact, "record">): string
```

Serializes an artifact's ninjs record to a JSON string with a trailing newline.

### `ServiceAccountAssertionInput` — type-alias

```ts
export type ServiceAccountAssertionInput = Readonly<{ clientEmail: string; privateKeyPem: string; /** OAuth2 scope claim; defaults to the read-only webmasters scope. */ scope?: string; /** Token audience claim; defaults to Google's token endpoint. */ audience?: string; /** Issued-at, seconds since epoch — a parameter, never read from a clock here. */ issuedAt: number; /** Expiry, seconds since epoch — likewise a parameter. */ expiresAt: number; }>
```

Inputs for an RS256 service-account JWT assertion: the service account's client email and private-key PEM, the OAuth2 scope and token audience claims (each defaulting to the read-only webmasters scope and Google's token endpoint), and the issued-at and expiry instants in seconds since epoch supplied as parameters rather than read from a clock.

### `setReferences` — function

```ts
export function setReferences(documentText: string, items: readonly CslItem[]): string
```

Write `items` into a document's front matter as a `references:` block, replacing an existing block or inserting one before the closing fence (and creating a front matter head if the document has none).
Every other entry and the body are preserved verbatim.
Pure; total over well-fenced documents.

### `SUBJECT_KEYS` — variable

```ts
export const SUBJECT_KEYS: readonly string[]
```

Front-matter keys, in order, consulted for a document's own identity (the subject of every edge it asserts) when no explicit subject is given.

### `summarizeFindings` — function

```ts
export function summarizeFindings(findings: readonly VaultFinding[]): ConformanceSummary
```

Tally a list of findings into counts by rule and by severity plus a grand total.
Pure; total.

### `TokenGrant` — type-alias

```ts
export type TokenGrant = Readonly<{ accessToken: string; expiresIn: number; }>
```

The decoded OAuth2 token grant.

### `VaultCensus` — type-alias

```ts
export type VaultCensus = Readonly<{ documents: number; withType: number; withVariant: number; withClass: number; withGenre: number; genreValues: readonly GenreValueRow[]; crosswalk: VaultCrosswalk; }>
```

The aggregate census of a vault: document count, how many records carry `type`/variant/`class`/any genre, the per-value genre vocabulary counted by carrying key, and the type/kind/class crosswalk.

### `VaultCrosswalk` — type-alias

```ts
export type VaultCrosswalk = Readonly<{ /** Records whose genre is carried only by a variant key (no `type`). */ variantOnly: number; /** Records where `type` and a variant key agree. */ typeAndVariantAgree: number; /** Records where `type` and a variant key disagree. */ typeAndVariantConflict: number; /** Whether every record carrying `class` also carries `type`. */ classAlwaysWithType: boolean; /** Records carrying `class` but no `type`/variant genre. */ classWithoutGenre: number; }>
```

The type/kind/class crosswalk statistics over a vault: counts of variant-only genres, type/variant agreement and conflict, whether every `class` rides alongside a `type`, and how many `class` records carry no genre at all.

### `VaultEntry` — type-alias

```ts
export type VaultEntry = Readonly<{ path: string; frontMatter: FrontMatterRecord }>
```

One member of a vault: a record's `path` paired with its already-decoded `frontMatter`.

### `VaultFinding` — type-alias

```ts
export type VaultFinding = Readonly<{ path: string; rule: VaultRule; severity: FindingSeverity; message: string; key?: string; value?: string; suggestion?: string; }>
```

One actionable per-record conformance defect: the record `path`, the violated `rule` and its `severity`, a human-readable `message`, and optionally the offending `key`/`value` and a `suggestion` for the fix.

### `VaultRule` — type-alias

```ts
export type VaultRule = | "genre-conflict" | "genre-variant-key" | "genre-class-without-type" | "role-leaked-description" | "tags-not-list" | "references-non-csl" | "broken-internal-reference"
```

The set of conformance rule identifiers a record can violate: genre conflicts and variants, class without type, leaked role descriptions, non-list tags, non-CSL references, and broken internal references.

## `@emsenn/content/image`

### `decodeGifHeader` — function

```ts
export function decodeGifHeader(bytes: Uint8Array): GifHeader
```

Decodes a GIF container's header from bytes: reads the signature and logical screen descriptor and returns a GifHeader with the dimensions, version, colour resolution, and global colour table entry count.
Malformed or truncated bytes throw TypeError.

### `decodeImageHeader` — function

```ts
export function decodeImageHeader(bytes: Uint8Array): ImageHeader
```

Sniffs the container by magic bytes and decodes its header.
Malformed, truncated, or unrecognized bytes throw TypeError.

### `decodeJpegHeader` — function

```ts
export function decodeJpegHeader(bytes: Uint8Array): JpegHeader
```

Decodes a JPEG container's header from bytes: walks marker segments from SOI to the first SOFn frame header and returns a JpegHeader with the dimensions, sample precision, component count, and SOFn marker.
Malformed or truncated bytes, or reaching EOI/SOS before a frame header, throw TypeError.

### `decodePngHeader` — function

```ts
export function decodePngHeader(bytes: Uint8Array): PngHeader
```

Decodes a PNG container's header from bytes: verifies the eight-byte signature and IHDR chunk, then returns a PngHeader with the dimensions, bit depth, and colour type.
Malformed, truncated, or unlawful IHDR bytes throw TypeError.

### `decodeWebpHeader` — function

```ts
export function decodeWebpHeader(bytes: Uint8Array): WebpHeader
```

Decodes a WebP container's header from bytes: verifies the RIFF/WEBP framing and dispatches on the first chunk's fourCC (VP8 , VP8L, or VP8X) to return a WebpHeader with the dimensions and variant.
Malformed, truncated, or unrecognized-chunk bytes throw TypeError.

### `GifHeader` — type-alias

```ts
export type GifHeader = Readonly<{ format: "gif"; width: number; height: number; /** Container version from the header block: "87a" or "89a" (GIF89a §17). */ version: "87a" | "89a"; /** Colour resolution in bits, 1–8, from the logical screen descriptor (GIF89a §18). */ colorResolution: number; /** Global colour table entry count: 0 when the descriptor declares no table. */ globalColorTableEntries: number; }>
```

A frozen header record read from a GIF container's header block and logical screen descriptor: the logical screen dimensions plus the version, colour resolution, and global colour table entry count (GIF89a §17-18).

### `ImageFormat` — type-alias

```ts
export type ImageFormat = "png" | "jpeg" | "gif" | "webp"
```

The four web image container formats this codec recognizes: "png", "jpeg", "gif", or "webp".

### `ImageHeader` — type-alias

```ts
export type ImageHeader = PngHeader | JpegHeader | GifHeader | WebpHeader
```

The carrier produced by decoding any recognized container: a frozen header record, one of PngHeader, JpegHeader, GifHeader, or WebpHeader, discriminated by its format field.

### `JpegHeader` — type-alias

```ts
export type JpegHeader = Readonly<{ format: "jpeg"; width: number; height: number; /** Sample precision P from the SOFn frame header (T.81 §B.2.2). */ precision: number; /** Component count Nf from the SOFn frame header (T.81 §B.2.2). */ components: number; /** The SOFn marker byte the frame was read from (0xC0 baseline, 0xC2 progressive, …). */ marker: number; }>
```

A frozen header record read from a JPEG container's first SOFn frame header: the pixel dimensions plus the sample precision, component count, and the SOFn marker byte (T.
81 §B.
2.2).

### `PngHeader` — type-alias

```ts
export type PngHeader = Readonly<{ format: "png"; width: number; height: number; /** IHDR bit depth: bits per sample — 1, 2, 4, 8, or 16 (ISO 15948 §11.2.2). */ bitDepth: number; /** IHDR colour type: 0, 2, 3, 4, or 6 (ISO 15948 §11.2.2). */ colorType: number; }>
```

A frozen header record read from a PNG container's IHDR chunk: the pixel dimensions plus the IHDR bit depth and colour type (ISO 15948 §11.2.2).

### `WebpHeader` — type-alias

```ts
export type WebpHeader = Readonly<{ format: "webp"; width: number; height: number; /** First RIFF chunk variant: "vp8" (lossy), "vp8l" (lossless), "vp8x" (extended canvas). */ variant: WebpVariant; }>
```

A frozen header record read from a WebP container's first chunk: the pixel dimensions plus the chunk variant the dimensions were read from.

### `WebpVariant` — type-alias

```ts
export type WebpVariant = "vp8" | "vp8l" | "vp8x"
```

The first RIFF chunk variant of a WebP container: "vp8" (lossy), "vp8l" (lossless), or "vp8x" (extended canvas).

## `@emsenn/content/markdown`

### `markdownToHtml` — function

```ts
export function markdownToHtml(md: string): string
```

Encodes CommonMark markdown source into safe HTML: splits on blank lines into blocks, renders ATX headings, fenced code blocks, blockquotes, unordered and ordered lists, and paragraphs, with inline code, bold, italic, and links - escaping all raw HTML so the output is safe from untrusted input.

### `markdownToText` — function

```ts
export function markdownToText(md: string): string
```

Strips markdown markup from source to produce plain text: removes fenced code blocks, heading markers, list markers, blockquote markers, and inline code/bold/italic/link syntax, then collapses whitespace and trims.

## `@emsenn/content/propaganda`

### `declaresTelosPredicate` — function

```ts
export function declaresTelosPredicate(): string
```

The meme-floor predicate mark for a telos declaration: "propaganda.declares-telos", relating content to the telos it declares.

### `declareTelos` — function

```ts
export function declareTelos(input: TelosInput): TelosCarrier
```

Declare a telos.
An undeclared declarant is a malformed shape: the declaration is what makes the intent auditable rather than hidden.

### `effectsAsDemand` — function

```ts
export function effectsAsDemand( effects: readonly EffectWitness[], space: readonly string[] = [], ): DemandChargeCarrier
```

Fold an effect trace into a demand charge: every witnessed response is a demand entry on its term.
This is the demand loop's wire — witnessed views move the demand charge that feeds the next assignment.

### `effectWitness` — function

```ts
export function effectWitness(input: EffectWitnessInput): EffectWitness
```

Construct a frozen EffectWitness from its input, requiring magnitude and stage to be bigints so carrier math stays exact, and freezing a copy of the evidence list.

### `EffectWitness` — interface

```ts
export interface EffectWitness
```

A single witnessed response in the effect trace: the term the response landed on, its exact signed bigint magnitude, the ordinal stage that sequences it, and the evidence that observed it.

### `EffectWitnessInput` — interface

```ts
export interface EffectWitnessInput
```

The arguments for effectWitness: the term, the signed bigint magnitude, the bigint stage ordinal, and optional evidence.

### `furtherance` — function

```ts
export function furtherance(object: PropagandaObjectCarrier): FurtheranceJudgment
```

Judge furtherance: for each term the telos intends to move, compare the realized movement's sign against the intended sign.
Aligned witnesses are evidence-for; opposed witnesses are evidence-against; a target term nobody moved contributes nothing.
The result is a value with evidence — conflict settles to `stable` and keeps its receipts.

### `FurtheranceJudgment` — interface

```ts
export interface FurtheranceJudgment
```

The furtherance verdict for a propaganda object: pairs the object with a bilattice `charge` whose evidence is [witnesses-for-movement-toward-telos, witnesses-against] and with the exact realized `movement` demand charge over the telos target space (widened by any off-target effect terms).

### `furthersPredicate` — function

```ts
export function furthersPredicate(): string
```

The meme-floor predicate mark for furtherance: "propaganda.furthers", relating witnessed effects to the telos they further.

### `propagandaObject` — function

```ts
export function propagandaObject(content: ContentObject, telos: TelosCarrier): PropagandaObjectCarrier
```

Bind content to a declared telos.
The effect trace starts empty: at birth, nothing has been witnessed and furtherance reads absurd.

### `PropagandaObjectCarrier` — interface

```ts
export interface PropagandaObjectCarrier
```

Propaganda as a carrier: a content object bound to its declared telos plus an append-only trace of witnessed effects.

### `TelosCarrier` — interface

```ts
export interface TelosCarrier
```

A declared telos: the intended response a propagandist seeks, carrying its id, named intent, a signed demand charge target over term space, an optional audience coordinate, and the required declarant who declared it.

### `telosDeclarationUtterance` — function

```ts
export function telosDeclarationUtterance(contentId: string, telos: TelosCarrier): UtteranceCarrier
```

Put the declaration on the meme floor: "content declares-telos telos".
The declarant and intent travel on the TelosCarrier itself — provenance is this package's structure, never kernel structure.
The telos is auditable wherever the content's other utterances are.

### `TelosInput` — interface

```ts
export interface TelosInput
```

The arguments for declareTelos: id, named intent, signed demand charge target, optional audience coordinate, and the required declarant.

### `telosTerm` — function

```ts
export function telosTerm(id: string): string
```

Namespaced mark for a telos: "propaganda.telos.<id>".

### `witnessEffect` — function

```ts
export function witnessEffect(object: PropagandaObjectCarrier, input: WitnessEffectInput): PropagandaObjectCarrier
```

Append a witnessed effect at the next stage ordinal.
The original carrier survives untouched; the trace only ever extends.

### `WitnessEffectInput` — interface

```ts
export interface WitnessEffectInput
```

The arguments for witnessEffect: the term, the signed bigint magnitude, and optional evidence; the stage ordinal is assigned from the existing trace length.

## `@emsenn/content/syndication`

### `arxivAdapter` — variable

```ts
export const arxivAdapter: SyndicationAdapter
```

The arXiv syndication adapter: type "arxiv", fetching via fetchArxiv.

### `arxivQueryUrl` — function

```ts
export function arxivQueryUrl({ query, max = 10, sortBy = "submittedDate", sortOrder = "descending" }: Pick<SyndicationConfig, "query" | "max" | "sortBy" | "sortOrder">): string
```

The arXiv API query URL for a configured intake.

### `fetchArxiv` — function

```ts
export async function fetchArxiv(params: Pick<SyndicationConfig, "query" | "max" | "sortBy" | "sortOrder" | "retries">, io: { fetchImpl?: FetchLike } = {}): Promise<readonly SyndicationItem[]>
```

Fetch and parse one arXiv intake.

### `fetchFeed` — function

```ts
export async function fetchFeed(params: Pick<SyndicationConfig, "query" | "url" | "max" | "retries">, io: { fetchImpl?: FetchLike } = {}): Promise<readonly SyndicationItem[]>
```

Fetch and parse one feed intake (`url` preferred, `query` accepted).

### `fetchJsonFeed` — function

```ts
export async function fetchJsonFeed( params: Pick<SyndicationConfig, "url" | "max" | "retries">, io: { fetchImpl?: FetchLike } = {}, ): Promise<readonly SyndicationItem[]>
```

Fetch and parse a JSON Feed from a newswire's /feed.json surface.
`url` is the wire's base URL (e.g. "http://127.0.0.1:18810/newswires/collapse-climate/"); the adapter appends "feed.json".
Each item maps to a SyndicationItem whose `source` is the wire URL so provenance carries forward.

### `FetchLike` — type-alias

```ts
export type FetchLike = typeof fetch
```

The fetch implementation type: the signature of the global `fetch`, used so callers can inject a substitute for hermetic testing.

### `fetchText` — function

```ts
export async function fetchText(url: string, { fetchImpl = fetch, retries = 4, backoff = (attempt) => sleep(1000 * 2 ** attempt) }: FetchTextOptions = {}): Promise<string>
```

Fetch a URL's body as text, retrying 429/5xx with exponential backoff.

### `FetchTextOptions` — type-alias

```ts
export type FetchTextOptions = Readonly<{ fetchImpl?: FetchLike; retries?: number; /** Backoff between retries; defaults to exponential sleep. Injectable so * tests run hermetically without waiting on real time. */ backoff?: (attempt: number) => Promise<void>; }>
```

Options for fetchText: an optional injected fetch implementation, the retry count for 429/5xx responses, and an injectable backoff to delay between retries.

### `main` — function

```ts
export async function main(argv: readonly string[]): Promise<number>
```

The CLI entry point: dispatches argv[0] to the syndication parsers - "parse-feed" runs parseFeed and "parse-arxiv" runs parseArxivAtom over stdin XML, printing the resulting SyndicationItem records as JSON, while "help" prints usage.
Returns the process exit code (0 on success, 2 on an unknown command).

### `newswireAdapter` — variable

```ts
export const newswireAdapter: SyndicationAdapter
```

The newswire JSON Feed syndication adapter: type "newswire", fetching via fetchJsonFeed.

### `parseArxivAtom` — function

```ts
export function parseArxivAtom(xml: string): readonly SyndicationItem[]
```

Parse the arXiv Atom dialect into syndication items.
Pure.

### `parseFeed` — function

```ts
export function parseFeed(xml: string): readonly SyndicationItem[]
```

Parse an RSS or Atom feed into syndication items.
Pure; dialect is detected from the document itself.

### `rssAdapter` — variable

```ts
export const rssAdapter: SyndicationAdapter
```

The RSS/Atom syndication adapter: type "rss", fetching via fetchFeed.

### `SyndicationAdapter` — type-alias

```ts
export type SyndicationAdapter = Readonly<{ type: string; fetch: (params: SyndicationConfig, io?: { fetchImpl?: FetchLike }) => Promise<readonly SyndicationItem[]>; }>
```

The fetch morphism for one syndication format (rss, arxiv, ...).

### `syndicationAdapters` — variable

```ts
export const syndicationAdapters: Readonly<Record<string, SyndicationAdapter>>
```

The default adapter registry.
Consumers extend by spreading.

### `syndicationBundle` — function

```ts
export function syndicationBundle( item: SyndicationItem, options: SyndicationBundleOptions, ): ClaimStateBundle
```

Project one SyndicationItem into a ClaimStateBundle.
Claims produced (all force "alleges", status "supported"): title — the item's headline url — the canonical URL summary — the lede/summary, when present published — the publication instant, when present Subject is derived from the item's title or URL via newsSlug. provenance.citation is the item's URL so every claim traces back to the citable artifact.

### `SyndicationBundleOptions` — type-alias

```ts
export type SyndicationBundleOptions = Readonly<{ /** The witnessing agent (a wire name, a pipeline name, etc.). */ witness: string; /** ISO 8601 assertion timestamp. */ asserted: string; }>
```

Options for projecting a SyndicationItem into a ClaimStateBundle: witness is the asserting agent (a wire or pipeline name) recorded in each claim's provenance, and asserted is the ISO 8601 timestamp stamped on each claim's time.

### `SyndicationConfig` — type-alias

```ts
export type SyndicationConfig = Readonly<{ adapter: string; query?: string; url?: string; max?: number; sourcePrefix?: string; sortBy?: string; sortOrder?: string; retries?: number; }>
```

One configured syndication intake: which adapter, pointed where, bounded how.

### `SyndicationIngest` — type-alias

```ts
export type SyndicationIngest<Write = unknown> = Readonly<{ subject: string; items: readonly SyndicationItem[]; sourceSubjects: readonly string[]; writes: readonly Write[]; }>
```

The result of an intake run.
`Write` is the consumer's write-plan type; this lib fixes no claim vocabulary of its own.

### `SyndicationItem` — type-alias

```ts
export type SyndicationItem = Readonly<{ id?: string; url: string; title: string; summary?: string; authors?: readonly string[]; published?: string; categories?: readonly string[]; source?: string; }>
```

One decoded syndication item, in the common record every adapter normalizes to.

## `@emsenn/content/topology`

### `addDemand` — function

```ts
export function addDemand(left: DemandChargeCarrier, right: DemandChargeCarrier): DemandChargeCarrier
```

Pointwise sum of two charges: union space, concatenated entry traces.
Both arguments survive untouched.

### `addressedToPredicate` — function

```ts
export function addressedToPredicate(): string
```

The addressed-to predicate term: "content.addressed-to", relating a content object to its audience coordinate (Lasswell: to whom).

### `applyLintSuggestions` — function

```ts
export function applyLintSuggestions(body: string, floor = 0): OperatorResult
```

Splice in language-editing's concrete suggestions.
Only splice-safe substitutions (see isSpliceSafe) are applied, only where the span lies in open prose (a suggestion inside a quoted title or URL is left for the human), and only where the recorded `text` still matches the source at its offset (stripMarkdown is length-preserving, so offsets are source-true).
Applied right-to-left and non-overlapping so earlier offsets stay valid, and floor-guarded so a length-reducing splice never crosses `floor` words (keeping the length gate from flipping).

### `ArticleVoice` — type-alias

```ts
export type ArticleVoice = Readonly<{ persona: readonly string[]; exemplar?: readonly string[]; laws?: readonly string[]; }>
```

A property's editorial voice, as a value.
`persona` opens the prompt; `laws` are property craft laws spliced into the universal ones; `exemplar` replaces the default form exemplar.

### `assignment` — function

```ts
export function assignment(input: AssignmentInput): AssignmentCarrier
```

Construct a frozen assignment carrier from an input: copies and freezes the subjects, includes channel and audience only when present, and throws if id is not a non-empty string.

### `AssignmentCarrier` — interface

```ts
export interface AssignmentCarrier
```

A demand-created instruction to produce content: carries the brief and subjects to cover, optional channel and audience coordinates, and the demand charge that called it into being as its warrant.

### `assignmentFromDemand` — function

```ts
export function assignmentFromDemand(demand: DemandChargeCarrier, input: AssignmentFromDemandInput): AssignmentCarrier
```

Derive an assignment from a demand charge: the subjects are exactly the positively demanded terms, in ranked order.
The charge rides along as the assignment's warrant.

### `AssignmentFromDemandInput` — interface

```ts
export interface AssignmentFromDemandInput
```

The fields supplied when deriving an assignment from a demand charge: id, brief, and optional channel and audience coordinates - subjects are taken from the charge rather than given here.

### `AssignmentInput` — interface

```ts
export interface AssignmentInput
```

The fields required to construct an assignment carrier: id, brief, subjects, the originating demand charge, and optional channel and audience coordinates.

### `audience` — function

```ts
export function audience(id: string, evidence: readonly unknown[] = []): AudienceCoordinate
```

The "to whom" coordinate.

### `audienceCharge` — function

```ts
export function audienceCharge(section: SectionCarrier, contentId: string, audienceId: string): ChargeCarrier
```

Charge at "content addressed-to audience".

### `AudienceCoordinate` — interface

```ts
export interface AudienceCoordinate
```

The "to whom" coordinate: a namespaced audience term carrying its evidence.

### `audienceTerm` — function

```ts
export function audienceTerm(id: string): string
```

Namespaced mark for an audience (Lasswell: to whom): "content.audience.<id>".

### `channel` — function

```ts
export function channel(id: string, evidence: readonly unknown[] = []): ChannelCoordinate
```

The "in which channel" coordinate.

### `channelCharge` — function

```ts
export function channelCharge(section: SectionCarrier, contentId: string, channelId: string): ChargeCarrier
```

Charge at "content in-channel channel".

### `ChannelCoordinate` — interface

```ts
export interface ChannelCoordinate
```

The "in which channel" coordinate: a namespaced channel term carrying its evidence.

### `channelTerm` — function

```ts
export function channelTerm(id: string): string
```

Namespaced mark for a channel (Lasswell: in which channel): "content.channel.<id>".

### `clearsGatePredicate` — function

```ts
export function clearsGatePredicate(): string
```

The clears-gate predicate term: "content.clears-gate", claiming that a content object cleared an editorial gate (gatekeeping theory).

### `communicatedByPredicate` — function

```ts
export function communicatedByPredicate(): string
```

The communicated-by predicate term: "content.communicated-by", relating a content object to its communicator coordinate (Lasswell: who).

### `communicator` — function

```ts
export function communicator(id: string, evidence: readonly unknown[] = []): CommunicatorCoordinate
```

The "who" coordinate.
Evidence is the provenance of the attribution.

### `communicatorCharge` — function

```ts
export function communicatorCharge(section: SectionCarrier, contentId: string, communicatorId: string): ChargeCarrier
```

Charge at "content communicated-by communicator".

### `CommunicatorCoordinate` — interface

```ts
export interface CommunicatorCoordinate
```

The "who" coordinate: a namespaced communicator term carrying the evidence that grounds the attribution.

### `communicatorTerm` — function

```ts
export function communicatorTerm(id: string): string
```

Namespaced mark for a communicator (Lasswell: who): "content.communicator.<id>".

### `contentAnalysis` — function

```ts
export function contentAnalysis(section: SectionCarrier, contentId: string): ContentAnalysisCarrier
```

Infer the Lasswell coordinates of a content object from the settled section.
Replicable by construction: same section, same analysis.

### `ContentAnalysisCarrier` — interface

```ts
export interface ContentAnalysisCarrier
```

The full content analysis of one content object: `content` is the analyzed term and `readings` holds one PositionReading per Lasswell position, the inferred coordinates of the content read back from the settled section.

### `contentEntries` — function

```ts
export function contentEntries(section: SectionCarrier, contentId: string): readonly SectionEntry[]
```

All settled cells about one content object.

### `contentKnowledgeSection` — function

```ts
export function contentKnowledgeSection(carrier: ContentTopologyCarrier): SectionCarrier
```

Knowledge-least section of a settled content topology.

### `contentObject` — function

```ts
export function contentObject(input: ContentObjectInput): ContentObject
```

Build a ContentObject from its production-side Lasswell coordinates.
Every occupied coordinate is admitted as a relational utterance; the coordinate itself rides beside it carrying the evidence.

### `ContentObject` — interface

```ts
export interface ContentObject
```

The content carrier: a content object's term, its occupied production-side Lasswell coordinates (communicator, message, channel, audience), the accumulating trace of witnessed effects, the floor admissions for every occupied position, and the optional raw prose body.

### `ContentObjectInput` — interface

```ts
export interface ContentObjectInput
```

The production-side input for building a ContentObject: an id plus the optional Lasswell coordinates (communicator, message, channel, audience) and optional prose body.
Effects are witnessed after publication and are not supplied here.

### `contentTerm` — function

```ts
export function contentTerm(id: string): string
```

Namespaced mark for a content object: "content.object.<id>".

### `ContentTopologyCarrier` — interface

```ts
export interface ContentTopologyCarrier extends MemeTopologyCarrier
```

A meme-topology carrier branded as carrying settled content utterances.

### `contentTruthSection` — function

```ts
export function contentTruthSection(carrier: ContentTopologyCarrier): SectionCarrier
```

Truth-least section of a settled content topology.

### `copyedit` — function

```ts
export function copyedit(body: string, context: CopyEditContext = {}): CopyEditWitness
```

The closure: compose the operators (restore titles → apply lint → deprophesy → dedupe) and iterate to a fixpoint.
The order runs the faithfulness-restoring and substance-neutral operators first and the length-reducing one last.
Re-running on a stable result is a no-op.

### `CopyEdit` — type-alias

```ts
export type CopyEdit = Readonly<{ kind: "content.copyedit.edit"; /** The operator: "deprophesy" | "restore-title" | "dedupe" | `lint:${ruleId}`. */ op: string; before: string; after: string; }>
```

One applied edit: which operator acted, the removed text, and what replaced it (empty for a deletion).
The audit substrate — recording these on the run trace keeps provenance growing monotonically.

### `CopyEditContext` — type-alias

```ts
export type CopyEditContext = Readonly<{ /** Witnessed intake titles, for restoreTitles. */ intakeTitles?: readonly string[]; /** Word floor for length-reducing operators (default 0: unguarded). The * farm passes its length-gate threshold so dedupe never flips that gate. */ floor?: number; /** Fixpoint bound (default 4). Reaching it without stabilizing is a * reported non-convergence, not a silent truncation. */ maxPasses?: number; }>
```

The inputs that parameterize a copyedit run: the witnessed intake titles restoreTitles repairs against, the word floor that guards length-reducing operators from flipping a length gate, and the fixpoint pass bound.

### `CopyEditWitness` — type-alias

```ts
export type CopyEditWitness = Readonly<{ kind: "content.copyedit:witness"; body: string; edits: readonly CopyEdit[]; passes: number; /** A fixpoint was reached: the final pass made no edits (idempotence). */ stable: boolean; }>
```

The witnessed copyedit of a body: the refined text, every applied edit (in order), the passes taken, and whether a fixpoint was reached.

### `currentSurfaces` — function

```ts
export function currentSurfaces(draftCarrier: DraftCarrier): readonly DraftSurface[]
```

Reading: the latest surface per name.
The trace is the truth; this is the rendering-edge value.

### `dedupe` — function

```ts
export function dedupe(body: string, floor = 0): OperatorResult
```

Drop repeated sentences (a sentence that already appeared earlier in the body).
GUARDED two ways so the closure stays gate-monotone and citation- safe: a duplicate that carries a markdown link is kept (its citation is structure, not repetition), and no drop is made that would pull the body below `floor` words (so a passing length gate never flips).
Operates line by line; headings and blank lines pass through untouched.

### `demandAt` — function

```ts
export function demandAt(chargeCarrier: DemandChargeCarrier, terms: readonly string[]): bigint
```

The charge of a subset of terms: the exact sum of every entry landing in the subset.
Finite additivity holds by construction: for disjoint A and B, demandAt(c, A ∪ B) = demandAt(c, A) + demandAt(c, B).

### `demandCharge` — function

```ts
export function demandCharge(space: readonly string[], entries: readonly DemandEntry[] = []): DemandChargeCarrier
```

A demand charge over a finite term space.
Entries must land inside the space; an entry off the space is a malformed shape.

### `DemandChargeCarrier` — interface

```ts
export interface DemandChargeCarrier
```

A finitely additive demand charge over a finite space of terms: an append-only trace of witnessed entries together with the carrier space they land in.
The measure at a term is the fold (exact sum) of its entries.

### `demandEntry` — function

```ts
export function demandEntry(term: string, value: bigint, evidence: readonly unknown[] = []): DemandEntry
```

Construct a frozen DemandEntry, requiring a non-empty string term and a bigint value (carrier math is exact).
The evidence array is copied and frozen.

### `DemandEntry` — interface

```ts
export interface DemandEntry
```

A single witnessed unit of demand on a term: an exact signed bigint magnitude plus the evidence that witnessed it.
Negative values are retractions asserted by appending, never by removal.

### `demandParity` — function

```ts
export function demandParity(left: DemandChargeCarrier, right: DemandChargeCarrier): DemandParityJudgment
```

Mathematical parity of two charges: equal measure at every term of the union space.
Parity is adjudicated on content (the fold), never on the shape of the trace — two different histories may carry the same charge.

### `DemandParityJudgment` — type-alias

```ts
export type DemandParityJudgment = DemandParityWitness | DemandParityObstruction
```

The result of adjudicating parity of two charges: either a DemandParityWitness (equal at every term) or a DemandParityObstruction (some terms disagree).

### `DemandParityObstruction` — interface

```ts
export interface DemandParityObstruction
```

Negative judgment that two charges differ: carries both charges and the terms at which their measures disagree.

### `DemandParityWitness` — interface

```ts
export interface DemandParityWitness
```

Affirmative judgment that two charges have equal measure at every term of their union space, carrying both adjudicated charges.

### `DemandRankEntry` — interface

```ts
export interface DemandRankEntry
```

A folded per-term reading of a charge: the term paired with its exact total demand.
A row in the output of demandRanking.

### `demandRanking` — function

```ts
export function demandRanking(chargeCarrier: DemandChargeCarrier): readonly DemandRankEntry[]
```

Folded per-term reading of the charge, ranked by descending demand (ties broken by term order).
The trace is the truth; this is a reading.

### `deprophesy` — function

```ts
export function deprophesy(body: string): OperatorResult
```

Rewrite future-certainty modals in open prose into the hedged forms the no-prophecy craft law requires.
A vision is never a prophecy.

### `distinctiveTermWords` — function

```ts
export function distinctiveTermWords(term: string, genericWords: ReadonlySet<string> = NO_GENERIC_WORDS): ReadonlySet<string>
```

The words of a term that distinguish its story from the beat at large.
`genericWords` are the property's beat-generic words, which prove nothing.

### `docFindings` — function

```ts
export function docFindings(gates: readonly DocGate[]): readonly string[]
```

Fold failing gates into revision findings for the revise prompt.

### `DocGate` — interface

```ts
export interface DocGate
```

One gate's reading of a documentation reply: a charge with its evidence.

### `DocReply` — interface

```ts
export interface DocReply
```

The three prose surfaces a documenter asks the model for — nothing more.
`summary` is one sentence; `details` is a short paragraph; `example` is an optional code snippet (absent when the model judged none worth showing).

### `DocSymbolKind` — type-alias

```ts
export type DocSymbolKind = | "function" | "class" | "interface" | "type-alias" | "const" | "variable"
```

What kind of declaration a documented symbol is.
Mirrors the TypeScript declaration forms; matches

### `DocumentableSymbol` — interface

```ts
export interface DocumentableSymbol
```

The minimum a documenter needs about one exported symbol: its name, what it is, its verbatim signature, and any existing doc-comment.
Deliberately a structural subset of the app's richer SurfaceSymbol, so this module never depends on the I/O that read it.

### `DocVoice` — interface

```ts
export interface DocVoice
```

A documentation voice: audience and house notes spliced into the prompt.
Kept tiny and optional — the craft laws below are universal.

### `draft` — function

```ts
export function draft(input: DraftInput): DraftCarrier
```

Construct a frozen draft carrier with an empty surfaces trace from an input; throws if id is not a non-empty string.

### `DraftCarrier` — interface

```ts
export interface DraftCarrier
```

A message in production: carries its id, the id of the assignment it answers, and an append-only trace of surface revisions over which the current text is a reading.

### `DraftInput` — interface

```ts
export interface DraftInput
```

The fields required to construct a draft carrier: its id and the id of the assignment it answers.

### `draftPrompt` — function

```ts
export function draftPrompt(input: DraftPromptInput): string
```

The article prompt: one story, one developed argument, judged by the gates the laws below describe.
The lead craft laws end at repetition; the property's own laws splice in before the closing (prophecy, voice, ending, no-h1) laws — matching the koios mill's original order.

### `DraftPromptInput` — type-alias

```ts
export type DraftPromptInput = Readonly<{ voice: ArticleVoice; term: string; story: SourceStory; context?: readonly SourceStory[]; }>
```

The inputs to draftPrompt: the property's voice, the SEO lens term, the single source story the article is about, and optional secondary stories carried as supporting context.

### `DraftSurface` — interface

```ts
export interface DraftSurface
```

One named surface of a draft (headline, body, dek, ...) at a given stage ordinal: pairs the surface name and its text with its position in the draft's revision trace.

### `effect` — function

```ts
export function effect(id: string, evidence: readonly unknown[] = []): EffectCoordinate
```

The "with what effect" coordinate.
Effects are WITNESSED, never presumed: evidence should carry the observation that grounds the effect.

### `effectCharge` — function

```ts
export function effectCharge(section: SectionCarrier, contentId: string, effectId: string): ChargeCarrier
```

Charge at "content effected effect" — the witnessed-effect read.

### `EffectCoordinate` — interface

```ts
export interface EffectCoordinate
```

The "with what effect" coordinate: a namespaced effect term carrying the witnessing observation that grounds the effect.

### `effectedPredicate` — function

```ts
export function effectedPredicate(): string
```

The effected predicate term: "content.effected", relating a content object to a witnessed effect coordinate (Lasswell: with what effect).

### `effectTerm` — function

```ts
export function effectTerm(id: string): string
```

Namespaced mark for an effect (Lasswell: with what effect): "content.effect.<id>".

### `exampleFindings` — function

```ts
export function exampleFindings(example: string, symbolName: string, valueExports: ReadonlySet<string>): readonly string[]
```

Defects in an example code block: a `const/let/var NAME = …` that shadows a runtime VALUE EXPORT the example would import (e.g. `const jsFn = jsFn(...)
`, a TDZ ReferenceError the smaller models reliably emit), and an example that never actually calls the documented symbol.
`valueExports` must be the set of runtime export bindings only — never parameter or type names, which are safe to reuse as local variables.

### `extendContentTopology` — function

```ts
export function extendContentTopology( carrier: ContentTopologyCarrier, delta: readonly UtteranceCarrier[], ): ContentTopologyCarrier
```

Apply a delta of new utterances; evidence is monotone.

### `extractLinks` — function

```ts
export function extractLinks(body: string): readonly string[]
```

All Markdown link URLs found in the body.

### `extractNumbers` — function

```ts
export function extractNumbers(text: string): ReadonlySet<string>
```

All dollar amounts and percentages found in text, normalized for comparison.
Used by the numbers-faithfulness gate.

### `FarmGate` — type-alias

```ts
export type FarmGate = Readonly<{ gate: string; charge: "pass" | "fail"; evidence: string }>
```

One gate's reading of a draft: a charge with its evidence.

### `FORM_EXEMPLAR_DEFAULT` — variable

```ts
export const FORM_EXEMPLAR_DEFAULT: readonly string[]
```

The default FORM exemplar: shape guidance (a lede that names the event, concrete numbers, a three-sentence summary), never words to reuse.

### `formatReadme` — function

```ts
export function formatReadme(input: ReadmeInput): string
```

Assemble a README from the composed parts.
Our code owns every line of structure — the title, the section headings, the API list, the reference link — and the model contributes only the overview prose.
This is the LLM-WRITTEN README the plan asked for, not a manifest skeleton.

### `formatReference` — function

```ts
export function formatReference(packageName: string, intro: string, entries: readonly string[]): string
```

A whole reference document: the package heading, a one-line intent, and one entry per documented symbol in load-bearing order.

### `formatReferenceEntry` — function

```ts
export function formatReferenceEntry(symbol: DocumentableSymbol, reply: DocReply): string
```

Render a documented symbol into a markdown reference entry.
The model supplied only the three prose fields in `reply`; everything structural — the heading, the fenced signature, the example framing — is ours.

### `frameCharge` — function

```ts
export function frameCharge(section: SectionCarrier, contentId: string, frameId: string): ChargeCarrier
```

Charge at "content framed-as frame".

### `framedAsPredicate` — function

```ts
export function framedAsPredicate(): string
```

The framed-as predicate term: "content.framed-as", relating a content object to an interpretive frame coordinate (Entman).

### `frameTerm` — function

```ts
export function frameTerm(id: string): string
```

Namespaced mark for an interpretive frame (Entman): "content.frame.<id>".

### `frameUtterance` — function

```ts
export function frameUtterance(contentId: string, frameId: string): UtteranceCarrier
```

Claim that content is framed as a given interpretive frame (Entman).

### `gateClearedUtterance` — function

```ts
export function gateClearedUtterance(contentId: string, gateName: string): UtteranceCarrier
```

Claim that content clears an editorial gate.
The cell's charge carries the admitting witness; the gate's working evidence (editor reports, …) is the caller's structure to keep beside the utterance.

### `gateRejectedUtterance` — function

```ts
export function gateRejectedUtterance(contentId: string, gateName: string): UtteranceCarrier
```

Claim that an editorial gate rejected the content.
Rejection is its own claim of the contrary predicate (rejected-by-gate) — never a polarity against clears-gate.
A gate that has claimed both ways shows two live contrary cells, read side by side by `gateVerdict`.

### `gateTerm` — function

```ts
export function gateTerm(name: string): string
```

Namespaced mark for an editorial gate (gatekeeping theory): "content.gate.<name>".

### `gateVerdict` — function

```ts
export function gateVerdict(section: SectionCarrier, contentId: string, gateName: string): GateVerdict
```

Reads both gate cells for a content object from the settled section and returns a frozen GateVerdict pairing the clears-gate charge with the rejected-by-gate charge.

### `GateVerdict` — interface

```ts
export interface GateVerdict
```

The editorial gate's two-cell verdict on one content object: gatekeeping theory's object as paired charges.
`cleared` is the charge at "content clears-gate gate" and `rejected` is the charge at "content rejected-by-gate gate" - contrary cells held side by side, where both `potential` means the gate has claimed both ways and both `absurd` means it has not spoken.

### `hallucinatedApiFindings` — function

```ts
export function hallucinatedApiFindings(text: string, known: ReadonlySet<string>): readonly string[]
```

API-shaped references in `text` that the known vocabulary does not vouch for — the model's inventions.
Two shapes are checked, both high-signal: a bare call `name(` (a claimed function/constructor, never a method, since a leading `.
` excludes it), and a backticked PascalCase `` `TypeName` `` (a claimed type).
Lowercase backticked words are left alone — they read as prose far more often than as API, and the call form already catches invented functions.

### `inChannelPredicate` — function

```ts
export function inChannelPredicate(): string
```

The in-channel predicate term: "content.in-channel", relating a content object to its channel coordinate (Lasswell: in which channel).

### `induceContentTopology` — function

```ts
export function induceContentTopology(utterances: readonly UtteranceCarrier[]): ContentTopologyCarrier
```

Settle content utterances (one or many ContentObjects' worth) into a ContentTopologyCarrier on the meme floor.

### `JudgeContext` — type-alias

```ts
export type JudgeContext = Readonly<{ /** The single story's URL — it must be cited; other intake citations are supporting context, at most two. */ storyUrl?: string; /** Witnessed intake titles, for the title-fidelity gate. */ intakeTitles?: readonly string[]; /** Witnessed intake texts (title + summary per article), for the numbers-faithfulness gate. */ intakeTexts?: readonly string[]; }>
```

The witnessed-intake context that sharpens judgeDraft: storyUrl (the single story that must be cited), intakeTitles (for the title-fidelity gate), and intakeTexts (title plus summary per article, for the numbers-faithfulness gate).

### `judgeDoc` — function

```ts
export function judgeDoc( symbol: DocumentableSymbol, reply: DocReply, vocabulary: ReadonlySet<string>, valueExports: ReadonlySet<string> = new Set([symbol.name]), ): readonly DocGate[]
```

Gate a documentation reply for one symbol against the surface's vocabulary.
The keystone is `no-hallucinated-api`; the rest enforce that the doc is about THIS symbol, is the right size, carries a faithful example, and is clean prose.
`vocabulary` is the may-reference set (exports + types + builtins; over-admitting is safe).
`valueExports` is the narrower set of runtime export bindings whose shadowing is a real TDZ hazard — when omitted it defaults to just the documented symbol, the most common offender.

### `judgeDraft` — function

```ts
export function judgeDraft(draft: PostDraft, term: string, citableUrls: readonly string[], context: JudgeContext = {}): readonly FarmGate[]
```

The thirteen gates, judged in one pass.
Every gate reports a charge with evidence; the caller folds the verdict (all-pass = gates clear).

### `judgeOverview` — function

```ts
export function judgeOverview(overview: string, vocabulary: ReadonlySet<string>): readonly DocGate[]
```

Gate a package overview: faithful to the surface vocabulary and the right length.
The keystone no-hallucinated-api applies here too.

### `LasswellCoordinate` — type-alias

```ts
export type LasswellCoordinate = | CommunicatorCoordinate | MessageCoordinate | ChannelCoordinate | AudienceCoordinate | EffectCoordinate
```

The union of the five Lasswell coordinate carriers: communicator, message, channel, audience, or effect.

### `lasswellJudgment` — function

```ts
export function lasswellJudgment( content: ContentObject, positions: readonly LasswellPosition[] = PRODUCTION_POSITIONS, ): LasswellJudgment
```

Judge whether a ContentObject occupies the asked Lasswell positions.
Defaults to the four production positions — effect is witnessed after publication, not presumed at production.
Returns a witness naming the occupied positions or an obstruction naming the missing ones.

### `LasswellJudgment` — type-alias

```ts
export type LasswellJudgment = LasswellWitness | LasswellObstruction
```

The result of a Lasswell completeness judgment: either a LasswellWitness or a LasswellObstruction.

### `LasswellObstruction` — interface

```ts
export interface LasswellObstruction
```

The negative Lasswell judgment: the content object together with the positions it leaves missing.

### `LasswellPosition` — type-alias

```ts
export type LasswellPosition = "communicator" | "message" | "channel" | "audience" | "effect"
```

The five Lasswell coordinate positions: "communicator", "message", "channel", "audience", and "effect".

### `LasswellWitness` — interface

```ts
export interface LasswellWitness
```

The affirmative Lasswell judgment: the content object together with the positions it occupies.

### `message` — function

```ts
export function message(id: string, evidence: readonly unknown[] = []): MessageCoordinate
```

The "says what" coordinate.
Evidence is the message material (surfaces, citations).

### `messageCharge` — function

```ts
export function messageCharge(section: SectionCarrier, contentId: string, messageId: string): ChargeCarrier
```

Charge at "content says message".

### `MessageCoordinate` — interface

```ts
export interface MessageCoordinate
```

The "says what" coordinate: a namespaced message term carrying the evidence (message material - surfaces, citations).

### `messageFromDraft` — function

```ts
export function messageFromDraft(draftCarrier: DraftCarrier): MessageCoordinate
```

Project a draft into the Lasswell message coordinate: the message term is the draft's, and the evidence is its current surfaces.

### `messageTerm` — function

```ts
export function messageTerm(id: string): string
```

Namespaced mark for a message (Lasswell: says what): "content.message.<id>".

### `normalizeTerm` — function

```ts
export function normalizeTerm(value: string): string
```

Canonical comparison key for a term: lowercases, collapses every run of non-alphanumeric characters to a single space, and trims.

### `numberFaithfulnessFindings` — function

```ts
export function numberFaithfulnessFindings(draftBody: string, intakeTexts: readonly string[]): readonly string[]
```

Numbers present in draftBody that are absent from the union of all intakeTexts numbers.
Returns [] when intakeTexts is empty or when the source texts contain no extractable numbers (no false positives on number-free sources).
Used by the numbers-faithfulness gate.

### `OperatorResult` — type-alias

```ts
export type OperatorResult = Readonly<{ body: string; edits: readonly CopyEdit[] }>
```

The result of an editorial operator: the rewritten body and the ordered list of edits it applied (empty when the operator made no change).

### `overviewPrompt` — function

```ts
export function overviewPrompt(input: OverviewPromptInput): string
```

The package-overview prompt: the model sees the package's purpose and the one-line summary of each documented symbol — the distilled surface, not the code — and writes the two-or-three-sentence overview that opens a README.
Context spacesuiting at the next rung up: summaries compose, source does not re-enter.

### `OverviewPromptInput` — interface

```ts
export interface OverviewPromptInput
```

The inputs to overviewPrompt: the package name and description, the per-symbol one-line summaries the overview is composed from, an optional DocVoice, and the optional previous overview and findings for a revision pass.

### `parseDocReply` — function

```ts
export function parseDocReply(reply: string): DocReply
```

Parse a minimal documentation reply into its surfaces.
A reply with no SUMMARY is a malformed shape (thrown); a missing or "none" EXAMPLE is a legitimate absence, not an error.

### `parseDraftReply` — function

```ts
export function parseDraftReply(reply: string): PostDraft
```

Parse a structured drafting reply into its five surfaces and body.
A reply with no TITLE (or no body at all) is a malformed shape — thrown, per the substrate law that exceptions are for malformed shapes only.

### `parseOverview` — function

```ts
export function parseOverview(reply: string): string
```

Parse the overview reply: the prose after the OVERVIEW: marker, or the whole reply when the model omitted the marker.
Throws on empty output.

### `PositionReading` — interface

```ts
export interface PositionReading
```

The reading of one Lasswell position for a content object: `position` names the coordinate and `entries` holds every settled cell placing this content at that position, each with its charge.

### `PostDraft` — type-alias

```ts
export type PostDraft = Readonly<{ title: string; description: string; summary: string; tweet: string; tags: readonly string[]; body: string; }>
```

A produced news draft, parsed from a structured model reply: the headline, the meta description, the summary, the share tweet, the topic tags, and the markdown body.

### `prophecyFindings` — function

```ts
export function prophecyFindings(body: string): readonly string[]
```

Sentences that make modal-certainty claims about the future.
Excludes quoted link text (the source's testimony) and recognized non-prophecy uses of "will" (political will, will of/to).

### `proseLines` — function

```ts
export function proseLines(body: string): string
```

Prose lines only — heading lines are not sentences.

### `proseLintErrors` — function

```ts
export function proseLintErrors(body: string): readonly string[]
```

Prose-lint diagnostics at "error" severity, as `ruleId "text"` strings.

### `proseLintSuggestions` — function

```ts
export function proseLintSuggestions(body: string, max = 8): readonly string[]
```

Prose-lint diagnostics at "suggestion" severity, formatted as revision directives.
`max` caps the output (default 8).

### `protectedSpans` — function

```ts
export function protectedSpans(body: string): readonly Span[]
```

The protected substrate of a body: the spans a copyedit must never edit — markdown links (quoted titles AND their URLs), heading lines, fenced and inline code, and any leading front matter.
Offsets are over the source, so they align with `lint()` diagnostic spans.

### `ReadmeInput` — interface

```ts
export interface ReadmeInput
```

The inputs to formatReadme: the package name, the LLM-written overview paragraph, each symbol's one-line summary for the API section, an optional usage block inserted before the API, and an optional relative path to a separate full-reference file.

### `rejectedByGatePredicate` — function

```ts
export function rejectedByGatePredicate(): string
```

The contrary of clears-gate.
Rejection is its own claim of this predicate, never a polarity against clears-gate.

### `repetitionFindings` — function

```ts
export function repetitionFindings(body: string): readonly string[]
```

Repeated sentences (≥2×) and repeated 8-word phrases (≥3×).
Judged on the writer's own prose: link text is collapsed to "(cited)" before analysis, since exactness of quoted titles is title-fidelity's concern.

### `restoreTitles` — function

```ts
export function restoreTitles(body: string, intakeTitles: readonly string[]): OperatorResult
```

Restore an altered quoted title to the witnessed source.
A link whose text reads as one of the intake titles (≥ 0.6 word overlap) but does not match it exactly has its text replaced with the title verbatim — the "will likely" → "could likely" alteration class, repaired.
Mirrors titleFidelityFindings' similarity and tokenization.

### `reviseDraft` — function

```ts
export function reviseDraft(draftCarrier: DraftCarrier, name: string, text: string): DraftCarrier
```

Append a surface revision at the next stage ordinal.
The earlier text survives in the trace; nothing is overwritten.

### `saysPredicate` — function

```ts
export function saysPredicate(): string
```

The says predicate term: "content.says", relating a content object to its message coordinate (Lasswell: says what).

### `scaleDemand` — function

```ts
export function scaleDemand(chargeCarrier: DemandChargeCarrier, factor: bigint): DemandChargeCarrier
```

Scale every entry by an exact integer factor.

### `selectStory` — function

```ts
export function selectStory<T extends SourceStory>(term: string, articles: readonly T[], options: SelectStoryOptions = {}): Readonly<{ story: T; context: readonly T[] }>
```

The assignment unit is the story, not the keyword: the demand term is the lens, and it selects from the witnessed intake the SINGLE best-supporting source story as the article's subject.
Stories are scored by term-word overlap in title+summary — distinctive term words (those that separate the term's event from the beat at large) count double, because matching the beat proves nothing about the event — with recency as the tiebreak.
At most `contextMax` other intake items travel as supporting context, secondary by law.
Calling with no intake is a malformed call and throws; the cultivate cycle witnesses empty intake as an obstruction before ever selecting.
Generic over the story type so the caller's richer intake item (e.g. a SyndicationItem) is returned unchanged, not narrowed to SourceStory.

### `SelectStoryOptions` — type-alias

```ts
export type SelectStoryOptions = Readonly<{ /** At most this many secondary items travel as supporting context. Default 2. */ contextMax?: number; /** The property's beat-generic words; distinctive term words count double. */ genericWords?: ReadonlySet<string>; }>
```

Options for selectStory: contextMax caps how many secondary intake items travel as supporting context (default 2), and genericWords are the property's beat-generic words, against which distinctive term words count double.

### `SourceStory` — type-alias

```ts
export type SourceStory = Readonly<{ title: string; url: string; summary?: string; published?: string; }>
```

The minimal shape of a source story the article surface needs — a structural subset of a SyndicationItem, so this module never depends on the intake transport (mirrors documentation.mts's DocumentableSymbol).

### `Span` — type-alias

```ts
export type Span = Readonly<{ start: number; end: number }>
```

A half-open character range over a body: [start, end).
Used to mark the protected substrate the copyedit operators must not touch.

### `symbolDocPrompt` — function

```ts
export function symbolDocPrompt(input: SymbolPromptInput): string
```

The per-symbol prompt: the model sees ONLY this symbol's surface (its signature, its JSDoc, the package's purpose, the sibling names) — careful context spacesuiting — and is asked for three small prose fields.
Our code formats the markdown; the model never produces structure.

### `SymbolPromptInput` — interface

```ts
export interface SymbolPromptInput
```

The inputs to symbolDocPrompt: the package name and description, the one DocumentableSymbol being documented, optional sibling export names and DocVoice, and the optional previous reply and findings that drive a revision pass.

### `SymbolSummary` — interface

```ts
export interface SymbolSummary
```

A symbol distilled to its one-line summary — the spacesuited context the higher rungs compose from.
The overview prompt sees these, never raw code.

### `templateMonotonyCount` — function

```ts
export function templateMonotonyCount(body: string): number
```

Count of the banned template construction: As [link] notes/reports/suggests/writes, …

### `termSupportCount` — function

```ts
export function termSupportCount(term: string, articles: readonly SourceStory[], genericWords: ReadonlySet<string> = NO_GENERIC_WORDS): number
```

How many intake articles support a term, judged on the term's distinctive words (beat-generic words prove nothing).
A term with no distinctive words is supported by the whole intake.

### `titleFidelityFindings` — function

```ts
export function titleFidelityFindings(body: string, intakeTitles: readonly string[]): readonly string[]
```

Title-fidelity findings: a markdown link whose text presents itself as a witnessed intake title (high word overlap) but does not match it exactly — the "will likely" → "could likely" alteration class.

### `totalDemand` — function

```ts
export function totalDemand(chargeCarrier: DemandChargeCarrier): bigint
```

The charge of the whole space.

### `withEffect` — function

```ts
export function withEffect(content: ContentObject, effectCoordinate: EffectCoordinate): ContentObject
```

Append a witnessed effect to a ContentObject.
Time only accumulates: the original carrier is untouched; a new carrier extends the trace.

### `witnessDemand` — function

```ts
export function witnessDemand(chargeCarrier: DemandChargeCarrier, entry: DemandEntry): DemandChargeCarrier
```

Append a witnessed demand entry.
The space widens by union if the term is new; nothing already witnessed is touched.

### `wordCount` — function

```ts
export function wordCount(body: string): number
```

Number of words in the body: counts whitespace-separated tokens that contain at least one letter or digit, ignoring pure-punctuation tokens.

## `@emsenn/content/topology/news`

### `assertClaimStateBundle` — function

```ts
export function assertClaimStateBundle(value: unknown): asserts value is ClaimStateBundle
```

Asserts that an unknown value is a well-formed ClaimStateBundle: requires a non-empty subject, a claims list, and for each claim a unique lowercase-atom id, a proposition predicate, an asserted time, a force, a witness, and a status.
Throws TypeError on the first violation.

### `AssertedClaim` — type-alias

```ts
export type AssertedClaim = Readonly<{ /** Stable citation handle, unique within its bundle's subject. */ id: string; proposition: Readonly<{ predicate: string; object: unknown }>; scope?: ClaimScope; time: ClaimTime; force: AssertionForce; provenance: ClaimProvenance; status: EditorialStatus; /** Correction propagation: the id of the claim this one corrects. */ corrects?: string; /** Set on a claim a later correction names; the claim itself remains. */ supersededBy?: string; }>
```

The enriched claim carrier: a proposition (predicate and object) bundled with its scope, bitemporal time, assertion force, provenance, and editorial status under a stable citation id.
Carries optional `corrects` (the id this claim corrects) and `supersededBy` (set when a later correction names it).

### `AssertionForce` — type-alias

```ts
export type AssertionForce = | "alleges" | "confirms" | "denies" | "estimates" | "quotes" | "corrects" /** Deterministic computation with stated method and accuracy. */ | "computes" /** Interpretive synthesis; never stronger than its sources. */ | "interprets"
```

The assertion force of a claim: its modality - whether the claim alleges, confirms, denies, estimates, quotes, corrects, computes, or interprets.
No projection may display a claim stronger than its force.

### `assertNewsCable` — function

```ts
export function assertNewsCable(value: unknown): asserts value is NewsCable
```

Asserts that an unknown value is a well-formed NewsCable: checks name, bare domain, routing scheme, prefix validity, and a non-empty list of wires with unique lowercase-atom names and non-empty title/description/store.
Throws TypeError on any violation.

### `beatSubject` — function

```ts
export function beatSubject(beat: NewsBeat | string): readonly ["news", "beat", string]
```

The subject path for a beat: the frozen tuple ["news", "beat", slug] from a beat or its keyword.

### `cableBaseUrl` — function

```ts
export function cableBaseUrl(cable: Pick<NewsCable, "domain">): string
```

The sheath's own base URL: the cable index and /cable.json live here.

### `CableRouting` — type-alias

```ts
export type CableRouting = "subdomain" | "subfolder"
```

The two routing projections of a cable into URL space: "subdomain" places each wire at `https://<wire>.<domain>/`, "subfolder" at `https://<domain>/<wire>/`.

### `ClaimProvenance` — type-alias

```ts
export type ClaimProvenance = Readonly<{ /** Who or what witnessed the claim (a person, model, or algorithm). */ witness: string; /** The method by which it was witnessed, when one exists. */ method?: string; /** The witness's stated accuracy, in its own terms. */ accuracy?: string; /** A citation URL or handle for the supporting artifact. */ citation?: string; }>
```

The provenance of a claim: the witness (person, model, or algorithm), the optional method by which it was witnessed, the witness's stated accuracy, and a citation handle.
Records who/how, not warrant or truth.

### `ClaimScope` — type-alias

```ts
export type ClaimScope = Readonly<{ event?: string; entity?: string; place?: string; topic?: string; jurisdiction?: string; }>
```

The scope of a claim: the optional event, entity, place, topic, and jurisdiction the claim's proposition is bound to.

### `ClaimStateBundle` — type-alias

```ts
export type ClaimStateBundle = Readonly<{ subject: string; claims: readonly AssertedClaim[]; }>
```

The canonical wire resource: a subject's claim-state, in full.

### `ClaimTime` — type-alias

```ts
export type ClaimTime = Readonly<{ /** When the claimed state of affairs holds (ISO 8601), if time-bound. */ valid?: string; /** When the claim was asserted (ISO 8601). Required: assertions are events. */ asserted: string; }>
```

The bitemporal time of a claim: `valid` is when the claimed state of affairs holds (optional, time-bound), `asserted` is when the claim was asserted (required, since assertions are events).

### `correctionClaims` — function

```ts
export function correctionClaims(bundle: ClaimStateBundle): readonly AssertedClaim[]
```

Every correction in the bundle, newest first — the corrections feed's source.

### `currentPublicationStatus` — function

```ts
export function currentPublicationStatus(claimSet: Pick<NewsClaimSet, "potential">): string | null
```

The subject's current publication status: the last string-valued status cell among its potential claims, or null if none.

### `decisionGate` — function

```ts
export function decisionGate(decision: NewsEditorialDecision): readonly [predicate: string, object: "pass" | "fail"]
```

The gate cell for a decision: the frozen [desk, "pass"|"fail"] tuple, collapsing any non-pass status to fail.

### `DEFAULT_LIFECYCLE` — variable

```ts
export const DEFAULT_LIFECYCLE: readonly LifecycleStage[]
```

The default editorial lifecycle stages: assigned, reported, fact-checked, copy-edited, standards-cleared, and published.

### `editorialDecision` — function

```ts
export function editorialDecision(input: NewsEditorialDecision): NewsEditorialDecision
```

Normalize a decision input into a frozen NewsEditorialDecision: requires a non-empty storyId, keeps the desk and status, and copies the optional reason, timestamp, author, and evidence.

### `editorialGateCharge` — function

```ts
export function editorialGateCharge(claimSet: Pick<NewsClaimSet, "potential" | "active" | "stable">, gate: string): NewsClaimCharge
```

The charge of a gate over a claim set: stable if any stable cell carries the gate, absurd if no cell does, potential if any potential cell is not a fail, otherwise active.

### `editorialGateEvidence` — function

```ts
export function editorialGateEvidence(claimSet: Pick<NewsClaimSet, "potential" | "active" | "stable">, gate: string): readonly string[]
```

The witnesses backing a gate over a claim set: the deduplicated citations from potential and active cells plus the claimedBy and contraryClaimedBy witnesses from active cells.

### `editorialGateReport` — function

```ts
export function editorialGateReport(claimSet: NewsClaimSet, lc: Lifecycle = lifecycle()): GateReport
```

The GateReport for a claim set: the subject, its current status, its publishable shadow, and every lifecycle gate with its charge, cleared/contested/rejected flags, and evidence.

### `EditorialStatus` — type-alias

```ts
export type EditorialStatus = "unverified" | "supported" | "contested" | "corrected" | "retracted"
```

The editorial judgment recorded on a claim: unverified, supported, contested, corrected, or retracted.
Distinct from provenance and from truth - it records the editorial standing, not who witnessed the claim.

### `effectiveClaims` — function

```ts
export function effectiveClaims(bundle: ClaimStateBundle): readonly AssertedClaim[]
```

The claims a correction has not superseded: the bundle's current view.

### `firstBlockingEditorialGate` — function

```ts
export function firstBlockingEditorialGate(claimSet: NewsClaimSet, lc: Lifecycle = lifecycle()): GateReport["gates"][number] | null
```

The first uncleared gate in the report - the obstruction to publication - or null when every gate is cleared.

### `GATE_FAIL` — variable

```ts
export const GATE_FAIL
```

The object value marking a failed editorial gate.

### `GATE_PASS` — variable

```ts
export const GATE_PASS
```

The object value marking a cleared editorial gate.

### `GateReport` — type-alias

```ts
export type GateReport = Readonly<{ subject: string; status: string | null; publishable: boolean; gates: readonly Readonly<{ status: string; gate: string; label: string; charge: NewsClaimCharge; cleared: boolean; contested: boolean; rejected: boolean; evidence: readonly string[]; }>[]; }>
```

The full editorial-gate judgment for a subject: its current status, whether it is publishable, and every lifecycle gate with its charge, cleared/contested/rejected flags, and witnessing evidence.

### `internalPredicates` — function

```ts
export function internalPredicates(lc: Lifecycle = lifecycle()): ReadonlySet<string>
```

The set of predicates the news domain manages internally: the status predicate together with every lifecycle gate.

### `JsonValue` — type-alias

```ts
export type JsonValue = | string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }
```

A JSON value — the metadata/object payload carried by news carriers.
The content domain owns its own JSON type; it borrows none from the agent fleet.

### `lifecycle` — function

```ts
export function lifecycle(stages: readonly Partial<LifecycleStage>[] = DEFAULT_LIFECYCLE, opts: { publishStatus?: string } = {}): Lifecycle
```

Build a resolved Lifecycle from stage specs: normalizes each stage (defaulting gate and label to the status), checks statuses are unique, fixes the publish status, and returns the frozen lifecycle with index and gate lookups.
Throws TypeError on no stages, a missing status, duplicate statuses, or a publishStatus outside the lifecycle.

### `Lifecycle` — type-alias

```ts
export type Lifecycle = Readonly<{ stages: readonly LifecycleStage[]; statuses: readonly string[]; gates: readonly string[]; publishStatus: string; indexOf: (status: string) => number; gateFor: (status: string) => string | undefined; }>
```

The resolved editorial lifecycle: its ordered stages, the status and gate atoms, the publishing status, and lookups from a status to its index or gate.

### `LifecycleStage` — type-alias

```ts
export type LifecycleStage = Readonly<{ status: string; gate: string; label: string }>
```

One stage of the editorial lifecycle: its status, the gate predicate that clears it, and a human label.

### `NEWS_PREDICATES` — variable

```ts
export const NEWS_PREDICATES
```

The frozen registry of news predicate paths: maps each news concept (beat, keyword, source, headline, body, angle, editorial-decision, codecs, and so on) to its predicate path tuple.

### `newsBeat` — function

```ts
export function newsBeat(input: NewsBeat): NewsBeat
```

Normalize a beat input into a frozen NewsBeat: requires a non-empty keyword, trims near-keywords and domain, and copies metadata.
Throws TypeError on empty text fields.

### `NewsBeat` — type-alias

```ts
export type NewsBeat = Readonly<{ keyword: string; nearKeywords?: readonly string[]; domain?: string; metadata?: Readonly<Record<string, JsonValue>>; }>
```

A coverage beat: its keyword, optional near-keywords, optional domain, and optional metadata.

### `NewsCable` — type-alias

```ts
export type NewsCable = Readonly<{ /** The cable's name. */ name: string; /** The apex domain the routing projects under (no scheme, no slash). */ domain: string; routing: CableRouting; /** * For subfolder routing only: a single path segment inserted before the * wire name. Absent means no prefix. Example: "newswires" yields * `https://domain/newswires/<wire>/`. */ routingPrefix?: string; wires: readonly WireBinding[]; }>
```

A cable: a bundle of wires sharing one apex domain and routing scheme, with an optional path prefix for subfolder routing.
Models the sheath that projects each of its wires into URL space.

### `NewsClaim` — type-alias

```ts
export type NewsClaim = Readonly<{ predicate: string; object: unknown; citation?: string; claimedBy?: string | readonly string[]; contraryClaimedBy?: string | readonly string[] }>
```

A single claim cell: a predicate and object, with optional citation and the witnesses who claimed or contrarily claimed it.

### `NewsClaimCharge` — type-alias

```ts
export type NewsClaimCharge = ChargeValueName
```

A claim's charge value, aliased from the relationality algebra: the charge a news cell carries (absurd, potential, active, stable).

### `NewsClaimSet` — type-alias

```ts
export type NewsClaimSet = Readonly<{ subject: string; potential?: readonly NewsClaim[]; active?: readonly NewsClaim[]; stable?: readonly NewsClaim[]; t?: unknown }>
```

The lossy projection of a claim-state onto a subject: claims partitioned by charge into potential, active, and stable cells, with an optional time marker.
The documented LOSSY view of ClaimStateBundle kept for the wire surfaces.

### `NewsClaimWrite` — type-alias

```ts
export type NewsClaimWrite = Readonly<{ subject: string; claims: Readonly<Record<string, unknown>>; citation: string; }>
```

A write request against a subject's claims: the subject, a map of predicate-to-value claims, and the citation backing them.

### `NewsDeskName` — type-alias

```ts
export type NewsDeskName = "assignment" | "research" | "writing" | "editing" | "standards" | "publishing"
```

The newsroom desks: the named editorial offices a story passes through - assignment, research, writing, editing, standards, publishing.

### `NewsEditorialDecision` — type-alias

```ts
export type NewsEditorialDecision = Readonly<{ storyId: string; desk: NewsDeskName; status: "pass" | "fail" | "hold" | "revise"; reason?: string; at?: JsonValue; by?: string; evidence?: readonly string[]; }>
```

A desk's ruling on a story: the storyId, the desk, the pass/fail/hold/revise status, and optional reason, timestamp, author, and evidence.

### `NewsFormat` — type-alias

```ts
export type NewsFormat = "wire" | "article" | "brief" | "profile" | "explainer" | "custom"
```

The output shape of a news item: wire, article, brief, profile, explainer, or custom.

### `newsSlug` — function

```ts
export function newsSlug(value: unknown): string
```

The news domain's public slugger: lowercases, strips diacritics, and joins the value into a hyphenated atom, returning "item" when empty.

### `newsSource` — function

```ts
export function newsSource(input: NewsSource): NewsSource
```

Normalize a source input into a frozen NewsSource: requires non-empty id and adapter, trims optional query and url, and copies max and metadata.
Throws TypeError on empty required text.

### `NewsSource` — type-alias

```ts
export type NewsSource = Readonly<{ id: string; adapter: string; query?: string; url?: string; max?: number; metadata?: Readonly<Record<string, JsonValue>>; }>
```

A news source definition: an id, the adapter that fetches it, an optional query, url, max item count, and metadata.

### `NewsSourceObservation` — type-alias

```ts
export type NewsSourceObservation = Readonly<{ id: string; sourceId: string; url: string; title: string; summary?: string; authors?: readonly string[]; published?: string; categories?: readonly string[]; charge?: ChargeValueName; metadata?: Readonly<Record<string, JsonValue>>; }>
```

A single observation drawn from a source: its id, originating sourceId, url and title, with optional summary, authors, published date, categories, charge, and metadata.

### `NewsStoryCandidate` — type-alias

```ts
export type NewsStoryCandidate = Readonly<{ id: string; beat: NewsBeat; headline: string; angle: string; sources: readonly NewsSourceObservation[]; format: NewsFormat; metadata?: Readonly<Record<string, JsonValue>>; }>
```

A proposed story: its id, beat, headline and angle, the source observations it draws on, its output format, and optional metadata.

### `PUBLISHED` — variable

```ts
export const PUBLISHED
```

The status and gate atom for the published lifecycle stage.

### `routeRequest` — function

```ts
export function routeRequest( cable: NewsCable, host: string, path: string, ): Readonly<{ kind: "wire"; name: string; subPath: string }> | Readonly<{ kind: "sheath"; subPath: string }>
```

Invert the projection: which wire (if any) a request belongs to, from its Host header and path.
Returns the wire name and the path within the wire's namespace, or a "sheath" reading for the cable's own surfaces.

### `sourceObservation` — function

```ts
export function sourceObservation(input: Omit<NewsSourceObservation, "id"> & Partial<Pick<NewsSourceObservation, "id">>): NewsSourceObservation
```

Normalize an observation into a frozen NewsSourceObservation: derives a stable id from sourceId, url, and title when none is given, requires non-empty sourceId, url, and title, normalizes any charge, and copies the optional fields.

### `sourceSubject` — function

```ts
export function sourceSubject(id: string): readonly ["news", "source", string]
```

The subject path for a source: the frozen tuple ["news", "source", slug] from a required source id.

### `STATUS_PREDICATE` — variable

```ts
export const STATUS_PREDICATE
```

The predicate atom under which a subject's current publication status cell is stored.

### `storyCandidate` — function

```ts
export function storyCandidate(input: Omit<NewsStoryCandidate, "id"> & Partial<Pick<NewsStoryCandidate, "id">>): NewsStoryCandidate
```

Normalize a story input into a frozen NewsStoryCandidate: normalizes its beat and source observations, derives an id from the headline, angle, or source urls when none is given, and requires non-empty headline and angle.

### `storySubject` — function

```ts
export function storySubject(id: string): readonly ["news", "story", string]
```

The subject path for a story: the frozen tuple ["news", "story", slug] from a required story id.

### `wireBaseUrl` — function

```ts
export function wireBaseUrl(cable: Pick<NewsCable, "domain" | "routing" | "routingPrefix">, wireName: string): string
```

The routing projection: a wire's canonical base URL under its cable.

### `WireBinding` — type-alias

```ts
export type WireBinding = Readonly<{ /** The wire's name: lowercase atoms joined by hyphens; the URL atom. */ name: string; title: string; description: string; /** The masthead author for the wire's surfaces. */ author?: string | Readonly<{ name: string; url?: string }>; /** Where the wire's claim-state bundles live (a directory path or URL). */ store: string; /** The wire's beat keyword, when one applies. */ keyword?: string; }>
```

One wire in a cable: a provenanced claim stream identified by a lowercase-atom name, carrying its masthead (title, description, optional author and beat keyword) and the store where its claim-state bundles live.

### `withCorrection` — function

```ts
export function withCorrection(bundle: ClaimStateBundle, correction: AssertedClaim): ClaimStateBundle
```

Apply a correction: append the correcting claim and mark its target superseded.
Nothing is removed — retraction is assertion.
Throws TypeError if the target id does not exist or the correction lacks `corrects`.
