# @emsenn/content - overview

This is an explanation document.
It describes what `@emsenn/content` models, how its module subpaths layer together, and the mental model a reader needs to use the package well.
It does not give step-by-step instructions - see the how-to guide for that.

## What the package models

`@emsenn/content` is accountable content production, operationalized as one package.
"Content" here is taken in the communication-studies sense: an utterance with a communicator, a message, a channel, an audience, and an effect (Lasswell's coordinates).
The package treats that domain as an algebra - content is "what content is and how it is produced and edited", for every content kind - and attaches the boundary codecs, encoders, distribution formats, and persuasion layer that a real content operation needs around that core.

The package was assembled from the former `content-*` and `syndication-*` libraries.
Those are now module subpaths under one package; the root module (`@emsenn/content`) re-exports each subpath as a namespace for discoverability, but the flat symbol surface of each module is reached by importing the subpath directly.

Content is described in the package's own words as "a configuration of the relationality apex": the package depends on `@emsenn/relating` and `@emsenn/communicating`, and its carriers are sites and charges in that larger relational vocabulary rather than ad hoc records.

## The mental model

Three ideas carry the whole package.

1. Carriers, not bags of fields.
  A `ContentObject`, a `DraftCarrier`, a `DemandChargeCarrier`, a `PropagandaObjectCarrier` - each is a frozen, kind-tagged record (for example `kind: "content.demand.charge"`).
  You build one with a constructor, extend it by appending, and read it with a reading function.
  You do not mutate it.

2. Append-only traces and folds, never overwrites.
  A demand charge is "an append-only trace of witnessed entries"; its value at a term is the exact fold (signed bigint sum) of its entries.
  A retraction is a negative entry appended, never an entry removed.
  A propaganda object's effect trace works the same way: "time only accumulates".
  This is what makes the domain accountable - the evidence is kept, not summarized away.

3. Charges and judgments, not booleans.
  Where the domain asks a yes/no question
   - did this clear the gate, does this response further the telos, is this demand at parity - the answer comes back as a charge or a judgment carrying evidence-for and evidence-against, not a bare boolean.
     A `furtherance` judgment "is a charge with evidence-for and evidence-against, never a boolean."

## The module layers

The subpaths divide into the pure algebra/codec core, the encoders, the distribution layer, and the persuasion layer.

### ./topology - the content-production algebra

This is the heart of the package: content in the communication-studies sense presented as a site on the meme floor.
Vocabulary enters as namespaced terms; a `ContentObject`'s Lasswell coordinates (communicator, message, channel, audience, effect) admit as utterances; `induceContentTopology` settles them; and readings come back as sections, charges, and gate verdicts.
It is pure and I/O-free.
The subpath bundles several concerns, each also reachable as its own subpath:

- `./topology/demand` - a finitely additive charge over a finite term space: agenda-setting made exact.
  `demandCharge`, `addDemand`, `totalDemand`, `demandAt`, `demandRanking`, `demandParity`.
  The measure at a term is the fold of its appended entries; negative entries are retractions-as-assertions.
- `./topology/production` - the production side: `assignment` (and `assignmentFromDemand`), `draft`, `reviseDraft`, `currentSurfaces`, `messageFromDraft`.
  An assignment can be derived from a demand charge, closing demand into work.
- `./topology/gates` - content-fitness primitives over prose: `wordCount`, `proseLines`, `prophecyFindings`, `extractLinks`, `repetitionFindings`, `proseLintErrors`, `extractNumbers`, `numberFaithfulnessFindings`.
  These return findings, the raw material that gate verdicts are computed from.
- `./topology/copyedit` - editorial closure operators applied locally in post-production: `deprophesy`, `restoreTitles`, `applyLintSuggestions`, `dedupe`, and the composite `copyedit`, with `protectedSpans` marking regions an operator must not touch.
- `./topology/article` - the news specialization of production: `draftPrompt`, `parseDraftReply`, `selectStory`, `judgeDraft`, `titleFidelityFindings`, `templateMonotonyCount`, and the `FORM_EXEMPLAR_DEFAULT`.
  Article production composes LLM prompts and parses/judges the replies as values.
- `./topology/documentation` - documentation production for code, not news: `symbolDocPrompt`, `parseDocReply`, `judgeDoc`, `overviewPrompt`, `parseOverview`, `judgeOverview`, `formatReadme`, plus finding functions like `hallucinatedApiFindings` and `exampleFindings`.
- `./topology/news` - the news subject core (`newsSlug`, `ClaimStateBundle`, `AssertedClaim`, and the rest).
  News is a subject specialization of content; the holography bridge below projects into this form.

### ./codecs - the boundary codecs

Geometric morphisms between external content representations and this workspace's records.
News is a subject of content, so the news publishing codecs live here beside the document-serialization and demand ones.
Every codec obeys "Codec law (L4): zero runtime dependencies; pure functions over values; no network, no filesystem, no clock - time enters as parameters.
TypeError for malformed shapes only; meaningful absences decode to values."
The members, each also a subpath:

- `./codecs/frontmatter` - YAML-front-matter markdown: decode/encode a `{ frontMatter, body }` document.
- `./codecs/ninjs` - IPTC ninjs news articles: build and serialize a ninjs record/artifact (the news-publishing codec).
- `./codecs/references` - the bibliographic layer: decode the two `references:` dialects (CSL/citeproc seq-of-maps and the bespoke citekey-map) to valid CSL-JSON, and encode CSL-JSON back into a canonical `references:` block spliced into a document.
- `./codecs/relational` - the bridge to `@emsenn/relating`: a document's citations and typed relations read as EAVT witness datoms / charged cells (`documentToDatoms`, `documentToCells`) and back.
  Reference information as re-admissible relational marks.
- `./codecs/search-console` - Google Search Console demand: the RS256 service-account assertion (encode), the OAuth2 token grant (decode), the Search Analytics query body (encode), and result rows as `DemandAssertion` records (decode), with the scope/audience constants.
- `./codecs/vault` - the front-matter corpus read as a content mill: resolve the genre facet (`type`/`kind`/`class`), census its vocabulary and crosswalk, find per-record conformance defects, and emit the facet as a SKOS concept scheme (JSON-LD / Turtle).
- `./codecs/jsonld` - schema.org JSON-LD for news articles (the discovery / structured-data projection): a pure functor from an article's fields to a `NewsArticle` node and its `<script type="application/ld+json">` embedding.
- `./codecs/feed` - syndication-format serializers (the distribution projection): RSS 2.0, Atom, JSON Feed, sitemaps, a news sitemap, and robots.txt, with the RFC-3339 instant helpers.
- `./codecs/microformats` - h-card / h-entry / h-feed serializers (the IndieWeb projection), and the projection of a relationality finite algebra / selected cells into microformat properties.

### ./markdown - the CommonMark encoder

`markdownToHtml` and `markdownToText`.
CommonMark markdown to safe HTML or to plain text.
Same codec law: zero runtime dependencies; pure; no network, filesystem, or clock.
Raw HTML in the source is escaped, not passed through, so the output is safe from untrusted input.

### ./image - image container header codecs

`decodeImageHeader` plus the per-format `decodePngHeader`, `decodeJpegHeader`, `decodeGifHeader`, `decodeWebpHeader`.
Bytes (`Uint8Array`) decode to frozen `ImageHeader` records carrying format, pixel dimensions, and cheap per-format extras.
It reads container headers only - it never decompresses pixel data, never touches filesystem or network, carries zero runtime dependencies, and fails only with TypeError on malformed/truncated/unrecognized bytes.

### ./syndication - syndication-format codecs

The distribution packaging of content: richer than bare content (it carries temporal and provenance metadata) but less constrained than news (IPTC/ninjs).
RSS, Atom, arXiv Atom, and JSON Feed are all syndication formats, and this module is the one home for parsing and fetching them.
Parsers (`parseFeed`, `parseArxivAtom`) are pure; fetchers (`fetchFeed`, `fetchArxiv`, `fetchJsonFeed`, `fetchText`) take an injectable `fetchImpl` (typed `FetchLike`) and an injectable backoff so they run hermetically.
The adapter registry (`syndicationAdapters` with `arxivAdapter`, `rssAdapter`, `newswireAdapter`) normalizes every format to the common `SyndicationItem`.
The module "has no knowledge of content or news internals."

- `./syndication/holography` - the bridge from syndication into news: it projects a decoded `SyndicationItem` into a `ClaimStateBundle` so news-algebra can work with syndicated content.
  Every projected claim carries force "alleges" and status "supported": a wire reports what a source says; it does not confirm or endorse.

### ./propaganda - the persuasion / furtherance layer

Propaganda (Jowett and O'Donnell) as a carrier on the content site.
A `PropagandaObjectCarrier` is content plus a declared telos plus an append-only trace of witnessed effects.
`declareTelos` makes the intent first-class and auditable; `witnessEffect` extends the trace (time only accumulates); and `./propaganda/furtherance` judges whether the witnessed response moves toward the telos as a charge with evidence-for and evidence-against.
`effectsAsDemand` closes the loop: witnessed views fold back into the demand charge that creates the next assignment.

## How the modules depend on each other

The dependency arrows run from the distribution and persuasion layers toward the algebra, and from the algebra toward `@emsenn/relating` and `@emsenn/communicating`.

- `./topology` is the foundation.
  `./topology/production` consumes `./topology/demand` (`assignmentFromDemand`).
  `./topology/article` and `./topology/copyedit` build on `./topology/gates` findings.
- News sits inside topology as `./topology/news`.
  `./syndication/holography` imports from `./topology/news` to project syndicated items into the `ClaimStateBundle` form - that is the one place syndication touches the news core.
  Bare `./syndication` stays ignorant of content/news internals.
- `./codecs/relational` bridges documents to `@emsenn/relating`; `./codecs/search-console` produces `DemandAssertion` records that feed the demand side.
  `./codecs/ninjs` serializes the news subject for publishing.
- `./propaganda` wraps the content carrier and folds witnessed effects back into a demand charge (`effectsAsDemand`), closing the production loop: demand -> assignment -> draft -> copyedit -> publish (codecs/syndication) -> witnessed effect -> demand.

## The binaries

The package ships three bins that drive the library from the command line: `content-read`, `content-gate`, and `content-rank`.
Their source lives under `src/scripts/`.
They are the I/O shells that hand real fetch, clock, and filesystem into the otherwise pure library.
