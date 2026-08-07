// content.mts — the content store read: markdown posts (content/posts)
// decoded through the front-matter codec and projected into news claim sets.
//
// Each post becomes a claim set whose cells carry the post's front matter as
// potential claims, cited to the post's provenance (its original permalink for
// the WordPress-era archive, the mill's gate trail for new posts). A post that
// shipped (draft: false) carries its editorial gates as claimed evidence —
// the archive posts were published on the predecessor site; that publication
// is the witness. Draft posts assert no status and stay withheld.

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { decodeFrontMatterDocument, type FrontMatterDocument } from "@emsenn/content/codecs/frontmatter";
import { DEFAULT_LIFECYCLE, GATE_PASS, PUBLISHED, STATUS_PREDICATE, type NewsClaim, type NewsClaimSet } from "@emsenn/content/topology/news";

import { renderMarkdownWithBibliography } from "./researching/sourcing/bibliography.mjs";

/** A post projected for the wire: its canonical claim set plus the rendered
 * body. (Koios's own shape — the standalone newswire package is retired; the
 * surfaces are rendered at the site, see surface.mts.) */
export type KoiosWireInput = Readonly<{
  algebra: NewsClaimSet;
  slug: string;
  bodyHtml: string;
  author?: string;
}>;

export type KoiosPost = Readonly<{
  slug: string;
  document: FrontMatterDocument;
  claimSet: NewsClaimSet;
  wireInput: KoiosWireInput;
}>;

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap((item) => strings(item));
  return [String(value)];
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

/** Widen a front-matter date to an RFC-3339 instant; bare dates are midnight UTC. */
function instantString(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
}

function claim(predicate: string, object: unknown, citation: string): NewsClaim {
  return Object.freeze({ predicate, object, citation });
}

/** Project a decoded post document into a news claim set. */
export function postClaimSet(slug: string, document: FrontMatterDocument): NewsClaimSet {
  const fm = document.frontMatter;
  const koios = (fm["koios"] ?? {}) as Readonly<Record<string, unknown>>;
  const citation = maybeString(koios["original_permalink"]) ?? `koios:post:${slug}`;
  const potential: NewsClaim[] = [];
  const headline = maybeString(fm["title"]);
  if (headline) potential.push(claim("headline", headline, citation));
  const summary = maybeString(fm["summary"]) ?? maybeString(fm["description"]);
  if (summary) potential.push(claim("summary", summary, citation));
  const published = maybeString(fm["date"]);
  if (published) potential.push(claim("published-at", instantString(published), citation));
  const author = maybeString(fm["author"]);
  if (author) potential.push(claim("author", author, citation));
  for (const keyword of strings(fm["keywords"])) potential.push(claim("keyword", keyword, citation));
  for (const tag of strings(fm["tags"])) potential.push(claim("tag", tag, citation));
  const categories = strings(fm["categories"]);
  for (const category of categories) potential.push(claim("category", category, citation));
  if (categories[0]) potential.push(claim("section", categories[0], citation));
  const shipped = fm["draft"] !== true && fm["draft"] !== "true";
  if (shipped) {
    for (const stage of DEFAULT_LIFECYCLE) potential.push(claim(stage.gate, GATE_PASS, citation));
    potential.push(claim(STATUS_PREDICATE, PUBLISHED, citation));
  }
  return Object.freeze({ subject: slug, potential: Object.freeze(potential) });
}

/** Decode one post file into its store reading. */
export function postFromFile(path: string): KoiosPost {
  const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
  const slug = maybeString(document.frontMatter["slug"]) ?? basename(path).replace(/\.md$/, "");
  const claimSet = postClaimSet(slug, document);
  const author = maybeString(document.frontMatter["author"]);
  return Object.freeze({
    slug,
    document,
    claimSet,
    wireInput: Object.freeze({
      algebra: claimSet,
      slug,
      bodyHtml: `<article>${renderMarkdownWithBibliography(document.body, document.frontMatter)}</article>`,
      ...(author === undefined ? {} : { author }),
    }),
  });
}

/** Read every post in the content store (ignores section index files). */
export function loadPosts(dir: string): readonly KoiosPost[] {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort();
  return Object.freeze(files.map((name) => postFromFile(join(dir, name))));
}
