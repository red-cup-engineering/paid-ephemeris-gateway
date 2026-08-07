# @emsenn/content - best practices

This is a how-to guide for consuming `@emsenn/content` well.
It assumes you know what the package is for; if you do not, read the overview explanation first.
The rules below are specific to this package, not generic advice.

## Import the named subpaths, not deep paths

The package publishes a fixed set of subpath exports.
Import those.
Do not reach into `dist/`, into a `.mjs` file by hand, or into any path the `exports` map does not list - an unlisted path is not part of the contract and will move.

```ts
// good - named subpath exports
import { markdownToHtml } from "@emsenn/content/markdown";
import { decodeImageHeader } from "@emsenn/content/image";
import { decodeFrontMatterDocument } from "@emsenn/content/codecs/frontmatter";
import { parseFeed, fetchFeed } from "@emsenn/content/syndication";
import { demandCharge, addDemand, demandRanking } from "@emsenn/content/topology/demand";
```

```ts
// avoid - deep / dist / internal paths
import { markdownToHtml } from "@emsenn/content/dist/markdown/index.mjs";
import { demandCharge } from "../../node_modules/@emsenn/content/dist/topology/demand.mjs";
```

The root entry (`@emsenn/content`) re-exports each module as a namespace (`topology`, `codecs`, `markdown`, `image`, `syndication`, `propaganda`) for discoverability.
That is good for exploring in a REPL; for real code, import the specific subpath so you get the flat symbol surface and the tightest dependency.

### Which subpath for which task

- Encode markdown to HTML/text: `@emsenn/content/markdown`.
- Read an image's dimensions/format from bytes: `@emsenn/content/image`.
- Read/write YAML front matter: `@emsenn/content/codecs/frontmatter`.
- Decode/encode `references:` blocks (CSL-JSON): `@emsenn/content/codecs/references`.
- Document citations/relations as datoms/cells: `@emsenn/content/codecs/relational`.
- Build/serialize IPTC ninjs for publishing: `@emsenn/content/codecs/ninjs`.
- Google Search Console demand: `@emsenn/content/codecs/search-console`.
- Census/conform a front-matter corpus, emit SKOS: `@emsenn/content/codecs/vault`.
- Parse/fetch RSS, Atom, arXiv, JSON Feed: `@emsenn/content/syndication`.
- Project a syndicated item into the news bundle: `@emsenn/content/syndication/holography`.
- Track demand as an exact charge: `@emsenn/content/topology/demand`.
- Make assignments and drafts: `@emsenn/content/topology/production`.
- Prose fitness findings: `@emsenn/content/topology/gates`.
- Local editorial closure operators: `@emsenn/content/topology/copyedit`.
- News-article drafting prompts/judgment: `@emsenn/content/topology/article`.
- Documentation production for code: `@emsenn/content/topology/documentation`.
- The news subject core: `@emsenn/content/topology/news`.
- Propaganda telos + furtherance: `@emsenn/content/propaganda` and `@emsenn/content/propaganda/furtherance`.

## Hand I/O in as values; the library never reaches for it

The library performs no I/O it was not handed.
`./topology`, `./codecs`, `./markdown`, and `./image` are pure: no network, no filesystem, no clock.
Where the domain needs time, time enters as a parameter, not as a `Date.now()` call.

The one module that does network I/O - `./syndication` - still does not reach for it.
The fetchers take an injectable `fetchImpl` (typed `FetchLike`, the signature of global `fetch`) and an injectable `backoff`, so you decide what actually goes over the wire.

```ts
import { fetchFeed, parseFeed } from "@emsenn/content/syndication";

// production: hand in the real fetch (or your own retrying/proxied one)
const items = await fetchFeed({ url: "https://example.com/rss" }, { fetchImpl: fetch });

// tests: hand in a stub so nothing touches the network
const stub: typeof fetch = async () => new Response("<rss>...</rss>");
const sameItems = await fetchFeed({ url: "https://x/" }, { fetchImpl: stub });

// or stay fully pure: fetch the bytes yourself, parse them as a value
const xml = await readFileFromYourLayer();
const parsed = parseFeed(xml);
```

Apply the same discipline to clock and filesystem: read the bytes / take the timestamp in your own outer shell (the bins under `src/scripts/` are exactly such a shell) and pass them in.
Codecs take time as a parameter; holography takes the `asserted` ISO 8601 timestamp as an option.
Never expect the library to know "now" or to read a file.

## sideEffects: false and tree-shaking

`package.json` declares `"sideEffects": false`.
Every module is free of import-time side effects, so a tree-shaking bundler may drop any export you do not use.
To benefit:

- Import only the named subpath you need (above), and only the symbols you use.
- Do not rely on importing a module "for its side effects" - there are none, and such an import may be eliminated entirely.

Importing `@emsenn/content/image` to use one decoder will not pull in the markdown encoder or the syndication fetchers.

## Semver and the no-promise surface

Every entry in the `exports` map is part of the package contract.
There is no `*/internal` subpath in this package - nothing is published under an internal path - so the rule is simpler than in some siblings: if a path is not in the `exports` map, it is not public.
Reaching into `dist/`, into a `src/scripts/` file, or into any unmapped `.mjs` means you are coupling to an implementation detail that carries no semver promise and may change or vanish in any release.
Stay on the mapped subpaths and you stay on the contract.

## Tests are theorem-shaped

Each test name in this package is a single falsifiable claim about the code, and the test body is its proof.
Read them as the executable spec.
Real examples from the suite:

- "parseDocReply throws on a reply with no SUMMARY (a malformed shape)"
- "hallucinatedApiFindings flags an invented bare call but not a vouched one or a method"
- "overviewPrompt composes from summaries, not source - no signatures leak in"
- "formatReadme frames the model's overview with our structure - title, usage, API list"

When you change behavior, change or add the claim, do not weaken it.
When you are unsure what a function guarantees, find the test whose name asserts it.
When you write a new test, give it a name that is a claim that could be false, not a label like "works".

## Common pitfalls specific to this package

- Treating findings as verdicts.
  `./topology/gates` functions (`prophecyFindings`, `repetitionFindings`, `numberFaithfulnessFindings`, etc.) return findings - raw evidence - not pass/fail.
  The gate verdict is computed from findings; do not collapse a finding list into a boolean at the call site when a verdict carrier already exists.

- Expecting a boolean where the domain returns a charge or judgment.
  `demandParity`, `furtherance`, and the gate/Lasswell readings return judgments with evidence-for and evidence-against.
  Read the judgment; do not coerce it to true/false and throw away the evidence.

- Removing instead of appending.
  A demand charge and a propaganda effect trace are append-only.
  To "remove" demand, append a negative `DemandEntry` (a retraction-as-assertion).
  To record a new effect, `witnessEffect` - the trace only accumulates.
  Do not filter or mutate the entries array.

- Assuming codecs throw on absence.
  By codec law, malformed shapes throw TypeError, but meaningful absences decode to values (an empty list, an absent optional field).
  Do not wrap a decode in try/catch expecting it to throw for "no items"; check the decoded value.

- Trusting markdown HTML to pass raw HTML through.
  `markdownToHtml` escapes raw HTML in the source rather than emitting it; it is built to be safe on untrusted input.
  If you need raw HTML pass-through, this encoder is the wrong tool.

- Decoding image pixels.
  `./image` reads container headers only - format and dimensions.
  It never decompresses pixel data.
  Do not reach for it to read pixels.

- Crossing the syndication/news boundary by hand.
  Bare `./syndication` knows nothing of news.
  To get a syndicated item into news-algebra, go through `./syndication/holography`, which projects into `ClaimStateBundle` with every claim as force "alleges", status "supported" - a wire reports what a source says, it does not endorse.
  Do not hand-build a news bundle from a `SyndicationItem`.
