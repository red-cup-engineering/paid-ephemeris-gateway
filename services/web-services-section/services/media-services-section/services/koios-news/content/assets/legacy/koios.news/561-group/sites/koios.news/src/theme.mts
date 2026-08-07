// theme.mts — the Koios.News theme: a web-theming Theme whose context carries
// the revenue and measurement surfaces (ad slots, view beacon) as declared,
// optional readings. Slots render only when configured; the beacon posts no
// identifying material — path and referrer host only.
//
// The visual identity is the Koios.News "mill" look: brutalist/Bauhaus news —
// cream paper, near-black ink, one red accent, heavy uppercase Archivo
// headlines over Georgia text, hard rules, no motion.
//
// web-theming's render() supplies the landmark elements (header/main/footer);
// head/header/footer/wrap here return inner markup only.

import { assembleCss, type NormalizedThemeContext, type Theme, type ThemePalette } from "@emsenn/computing-with-the-web/theming";

import { escapeHtml } from "./markdown.mjs";

export type KoiosThemeContext = Readonly<{
  /** The masthead byline; falls back to the page description when absent. */
  tagline?: string;
  /** AdSense (or compatible) publisher id, e.g. "ca-pub-…". Absent → no ad markup at all. */
  adClient?: string;
  /** Ad slot ids by position. Only positions present render. */
  adSlots?: Readonly<{ header?: string; inArticle?: string; footer?: string }>;
  /** Enable the first-party view beacon (POST /hit). */
  beacon?: boolean;
  /** Absolute or site-relative social preview image for this rendering. */
  socialImage?: string;
  /** Media type for the social preview image when the URL alone is ambiguous. */
  socialImageType?: string;
  /** Human alternative text for social preview images. */
  socialImageAlt?: string;
  /** Open Graph locale, e.g. en_US. */
  socialLocale?: string;
  /** Article first-publication timestamp for Open Graph article metadata. */
  articlePublishedTime?: string;
  /** Article last-modified timestamp for Open Graph article metadata. */
  articleModifiedTime?: string;
  /** Article author profile URL for Open Graph article metadata. */
  articleAuthor?: string;
  /** Article section for Open Graph article metadata. */
  articleSection?: string;
  /** Article tags for Open Graph article metadata. */
  articleTags?: readonly string[];
  /** Article fingerprint carrier exposed beside the SVG glyph. */
  articleFingerprintJson?: string;
  /** Site-wide A-Ads units available until AdSense takes over. */
  aAdsUnits?: readonly string[];
  /** Suppress the site-wide masthead A-Ads slot on pages with their own lead inventory. */
  suppressMastheadAAds?: boolean;
  /** Article-specific ad units declared by frontmatter. */
  articleAdUnits?: Readonly<{ aAds?: string }>;
}>;

export const DEFAULT_A_ADS_UNITS = Object.freeze(["2381631", "2382509", "2382510", "2382512"]);

const SANS = `"Archivo", system-ui, -apple-system, "Segoe UI", sans-serif`;
const SERIF = `Georgia, "Times New Roman", serif`;

// The Koios "mill" palette as data — cream paper, near-black ink, one red accent,
// in light and dark. paletteCss emits dark behind prefers-color-scheme.
const koiosPalette: ThemePalette = {
  light: {
    ink: "#121212",
    inkSoft: "#6a655c",
    surface: "#f4f1e8",
    surfaceDeep: "#ece7d8",
    surfaceEdge: "#cfc8b6",
    rule: "#121212",
    accent: "#d11a1a",
    tint: "rgba(18,18,18,0.05)",
    sans: SANS,
    serif: SERIF,
    measure: "40rem",
    radius: "0",
  },
  dark: {
    ink: "#ece8de",
    inkSoft: "#9a958a",
    surface: "#141310",
    surfaceDeep: "#1c1a16",
    surfaceEdge: "#3a352c",
    rule: "#ece8de",
    accent: "#ff5a42",
    tint: "rgba(236,232,222,0.06)",
  },
};

const CHROME_CSS = `

/* === BASE === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { color-scheme: light dark; -webkit-text-size-adjust: 100%; }
body {
  background: var(--surface); color: var(--ink);
  font-family: var(--serif); font-size: 1.0625rem; line-height: 1.55;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  overflow-wrap: break-word; hyphens: auto;
  max-width: 66rem; margin: 0 auto; padding: 0 1.5rem;
}
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
h1, h2, h3, h4 { font-family: var(--sans); font-weight: 800; line-height: 1.05; letter-spacing: -.02em;
  text-wrap: balance; overflow-wrap: break-word; }
p { text-wrap: pretty; }
::selection { background: var(--accent); color: var(--surface); }

/* === MASTHEAD === */
header[role=banner] { border-bottom: 5px solid var(--rule); padding-top: 1.5rem; margin-bottom: 2rem; }
.site-title { font-family: var(--sans); font-weight: 900; font-size: clamp(2rem, 8vw, 3.5rem);
  text-transform: uppercase; letter-spacing: -.03em; line-height: .9; color: var(--ink); text-decoration: none; display: inline-block; }
.site-title:hover { color: var(--accent); }
.site-tagline { display: block; font-family: var(--sans); font-size: .78rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: .14em; color: var(--accent); margin-top: .5rem; }
header[role=banner] nav { display: flex; flex-wrap: wrap; gap: 1.4rem; margin-top: 1.1rem; padding: .6rem 0;
  border-top: 2px solid var(--rule); font-family: var(--sans); font-size: .8rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em; }
header[role=banner] nav a { text-decoration: none; color: var(--ink); }
header[role=banner] nav a:hover { color: var(--accent); }

/* === HOME: the story list === */
.stories { display: grid; grid-template-columns: 1fr; }
@media (min-width: 46rem) {
  .stories { grid-template-columns: 1fr 1fr; column-gap: 2.5rem; }
  .story--lead { grid-column: 1 / -1; }
}
.story { min-width: 0; padding: 1.4rem 0; border-bottom: 1px solid var(--rule); }
.story__image { display: block; margin-bottom: .8rem; border: 3px solid var(--rule); background: var(--surface-deep); }
.story__image img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border: 0; margin: 0; }
.story__kicker { display: inline-block; font-family: var(--sans); font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em; color: var(--accent); margin-bottom: .45rem; }
.story__head { font-size: 1.45rem; margin-bottom: .4rem; }
.story__head a { text-decoration: none; color: var(--ink); }
.story__head a:hover { color: var(--accent); }
.story__sum { color: var(--ink); margin-bottom: .5rem; max-width: 60ch; }
.story__meta { font-family: var(--sans); font-size: .72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: var(--ink-soft); }
.story--lead { border-bottom-width: 5px; padding-bottom: 1.8rem; }
.story--lead .story__head { font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.0; }
.story--lead .story__sum { font-size: 1.15rem; line-height: 1.45; }
.story--lead .story__image { border-width: 5px; margin-bottom: 1rem; }

/* === ARTICLE === */
article.h-entry { max-width: var(--measure); margin: 0 auto; }
article.h-entry > .p-name { font-size: clamp(1.8rem, 5vw, 2.7rem); line-height: 1.02; letter-spacing: -.02em; margin-bottom: .7rem; }
article.h-entry > a.u-uid { display: none; }
article.h-entry > .dt-published, article.h-entry > .p-author {
  font-family: var(--sans); font-size: .74rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
  color: var(--ink-soft); margin-right: 1.1rem; }
article.h-entry > .p-author { color: var(--accent); font-weight: 700; }
article.h-entry > .p-summary { font-size: 1.15rem; line-height: 1.45; color: var(--ink);
  padding: .6rem 0 1rem; margin-bottom: 1.6rem; border-bottom: 2px solid var(--rule); }
.e-content { font-size: 1.15rem; line-height: 1.65; }
.e-content > * + *, .e-content article > * + * { margin-top: 1.1rem; }
.e-content h2 { font-family: var(--sans); font-weight: 800; font-size: 1.4rem; text-transform: uppercase;
  letter-spacing: -.01em; margin-top: 2.2rem; padding-top: .8rem; border-top: 2px solid var(--rule); }
.e-content h3 { font-family: var(--sans); font-weight: 800; font-size: 1.15rem; margin-top: 1.6rem; }
.e-content a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.e-content strong { font-weight: 700; }
.e-content blockquote { border-left: 5px solid var(--accent); padding: .3rem 0 .3rem 1.2rem; margin: 1.6rem 0;
  font-style: italic; }
.e-content ul, .e-content ol { padding-left: 1.4rem; }
.e-content li + li { margin-top: .4rem; }
.e-content img { border: 1px solid var(--rule); margin: 1.6rem 0; }
.e-content pre { overflow-x: auto; border: 1px solid var(--rule); padding: 1rem; font-size: .9rem; }
.citation { font-family: var(--sans); font-size: .72em; font-weight: 800; text-decoration: none; color: var(--accent); vertical-align: super; }
.citation--missing { color: var(--ink-soft); vertical-align: baseline; }
.bibliography { margin-top: 2rem; padding-top: 1rem; border-top: 5px solid var(--rule); }
.bibliography h2 { font-size: 1.2rem; text-transform: uppercase; }
.bibliography ol { margin-top: .8rem; padding-left: 1.4rem; }
.bibliography li { padding: .35rem 0; font-size: .95rem; }
.bibliography cite { font-style: normal; font-weight: 700; }
.reference__domain, .reference__kind { font-family: var(--sans); font-size: .72rem; font-weight: 700; text-transform: uppercase; color: var(--ink-soft); }

/* === TAGS === */
.tags { max-width: var(--measure); margin: 1.8rem auto 0; }
.tags a, .p-category { display: inline-block; font-family: var(--sans); font-size: .7rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; text-decoration: none; border: 1.5px solid var(--rule); padding: .2rem .5rem; margin: 0 .35rem .35rem 0; color: var(--ink); }
.tags a:hover, a.p-category:hover { background: var(--ink); color: var(--surface); }

/* === LIST / TAXONOMY PAGES === */
main > h1 { font-family: var(--sans); font-weight: 900; font-size: clamp(1.8rem, 5vw, 2.6rem);
  text-transform: uppercase; letter-spacing: -.02em; margin-bottom: 1.2rem; }
ul.pages { list-style: none; }
ul.pages li { padding: .9rem 0; border-bottom: 1px solid var(--rule); }
ul.pages li a { font-family: var(--sans); font-weight: 800; font-size: 1.2rem; text-decoration: none; color: var(--ink); }
ul.pages li a:hover { color: var(--accent); }
.section-index { margin-top: 1.4rem; border-top: 5px solid var(--rule); }
.section-summary { padding: 1.1rem 0; border-bottom: 1px solid var(--rule); }
.section-summary h2 { font-size: 1.35rem; text-transform: uppercase; }
.section-summary a { text-decoration: none; color: var(--ink); }
.section-summary a:hover { color: var(--accent); }
.section-summary p { margin-top: .25rem; font-family: var(--sans); font-size: .75rem; font-weight: 700; text-transform: uppercase; color: var(--ink-soft); }
.section-summary__dek, .tag-summary__dek { max-width: 58rem; font-family: var(--serif) !important; font-size: .98rem !important; font-weight: 400 !important; line-height: 1.45; text-transform: none !important; color: var(--ink) !important; }
.tag-index { margin-top: 1.4rem; border-top: 5px solid var(--rule); }
.tag-summary { padding: 1.1rem 0; border-bottom: 1px solid var(--rule); }
.tag-summary h2 { font-size: 1.35rem; text-transform: uppercase; }
.tag-summary a { text-decoration: none; color: var(--ink); }
.tag-summary a:hover { color: var(--accent); }
.tag-summary p { margin-top: .25rem; font-family: var(--sans); font-size: .75rem; font-weight: 700; text-transform: uppercase; color: var(--ink-soft); }
.taxonomy-intro { max-width: 48rem; margin-bottom: 1.4rem; padding-bottom: 1.2rem; border-bottom: 5px solid var(--rule); }
.taxonomy-intro p { margin-top: .65rem; }
.taxonomy-meta { font-family: var(--sans); font-size: .75rem; font-weight: 800; text-transform: uppercase; color: var(--ink-soft); }
.taxonomy-terms { display: flex; flex-wrap: wrap; gap: .35rem; }
.taxonomy-terms span { display: inline-block; border: 1.5px solid var(--rule); padding: .18rem .45rem; font-family: var(--sans); font-size: .68rem; font-weight: 700; text-transform: uppercase; color: var(--ink); }
.archive-index { margin: 1.4rem 0; border-top: 5px solid var(--rule); }
.archive-year, .archive-month { padding: 1.1rem 0; border-bottom: 1px solid var(--rule); }
.archive-year h2, .archive-month h2 { font-size: 1.35rem; text-transform: uppercase; }
.archive-year a, .archive-month a { text-decoration: none; color: var(--ink); }
.archive-year a:hover, .archive-month a:hover { color: var(--accent); }
.archive-year p, .archive-month p { margin-top: .25rem; font-family: var(--sans); font-size: .75rem; font-weight: 700; text-transform: uppercase; color: var(--ink-soft); }
.archive-year ul { margin-top: .8rem; padding-left: 1.2rem; }
.source-domain-index, .source-reference-index { margin: 1.4rem 0; border-top: 5px solid var(--rule); }
.source-domain, .source-reference { padding: 1.1rem 0; border-bottom: 1px solid var(--rule); }
.source-domain h2, .source-reference h2 { font-size: 1.35rem; text-transform: uppercase; }
.source-domain a, .source-reference a { text-decoration: none; color: var(--ink); }
.source-domain a:hover, .source-reference a:hover { color: var(--accent); }
.source-domain p, .source-reference p { margin-top: .25rem; font-family: var(--sans); font-size: .75rem; font-weight: 700; text-transform: uppercase; color: var(--ink-soft); }
.source-reference ul { margin-top: .8rem; padding-left: 1.2rem; }

/* === FORMS (search) === */
input, button, textarea, select { font-family: var(--sans); font-size: .9rem; color: var(--ink); background: var(--surface);
  border: 2px solid var(--rule); border-radius: 0; padding: .35rem .6rem; }
textarea { width: 100%; min-height: 6rem; resize: vertical; line-height: 1.35; }
select { max-width: 100%; }
button { font-weight: 700; text-transform: uppercase; letter-spacing: .05em; cursor: pointer; }
button:hover { background: var(--ink); color: var(--surface); }
.operator-form form { display: grid; gap: .85rem; max-width: var(--measure); margin-top: 1rem; }
.operator-form label { display: grid; gap: .25rem; font-family: var(--sans); font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.operator-form small { font-family: var(--serif); font-size: .85rem; font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--ink-soft); }
.operator-work-item { padding: .9rem 0; border-top: 1px solid var(--rule); }
.operator-work-item h3 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0; }
.operator-work-item p { margin-top: .35rem; font-size: .95rem; }
.operator-work-item form { margin-top: .55rem; }
.operator-work-item textarea[hidden] { display: none; }

/* === ADS: declared surfaces, quiet frames === */
.ad-slot { min-height: 90px; margin: 1.6rem auto; display: grid; place-items: center;
  font-family: var(--sans); font-size: .7rem; color: var(--ink-soft); }
.ad-slot--a-ads { max-width: var(--measure); border-top: 2px solid var(--rule); border-bottom: 2px solid var(--rule); padding: .7rem 0; }
.ad-slot--a-ads iframe { border: 0; padding: 0; width: min(100%, 44rem); min-height: 90px; overflow: hidden; display: block; margin: auto; }
.stories > .ad-slot { grid-column: 1 / -1; width: 100%; }

.article-fingerprint { max-width: var(--measure); margin: 0 auto 1.8rem; border: 5px solid var(--rule); background: var(--surface-deep); }
.article-fingerprint img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border: 0; margin: 0; }
.correction-notice { max-width: var(--measure); margin: 0 auto 1.8rem; padding: .9rem 0; border-top: 5px solid var(--rule); border-bottom: 2px solid var(--rule); }
.correction-notice h2 { font-size: 1rem; text-transform: uppercase; margin: 0 0 .5rem; padding: 0; border: 0; }
.correction-notice ol { padding-left: 1.3rem; }
.correction-notice li { margin-top: .35rem; }
.correction-notice p { margin-top: .6rem; font-family: var(--sans); font-size: .72rem; font-weight: 800; text-transform: uppercase; }
.article-rights { max-width: var(--measure); margin: 2rem auto 0; padding-top: .9rem; border-top: 2px solid var(--rule); font-family: var(--sans); font-size: .78rem; line-height: 1.45; color: var(--ink-soft); }
.article-rights h2 { font-size: .95rem; text-transform: uppercase; margin: 0 0 .45rem; padding: 0; border: 0; color: var(--ink); }
.article-rights p + p { margin-top: .45rem; }
.article-rights a { color: var(--accent); }
.related-stories { max-width: var(--measure); margin: 2.2rem auto 0; padding-top: 1rem; border-top: 5px solid var(--rule); }
.related-stories > h2 { font-size: 1.1rem; text-transform: uppercase; margin-bottom: .3rem; }
.related-stories__grid { display: grid; gap: 0; border-top: 1px solid var(--rule); }
.related-story { padding: .9rem 0; border-bottom: 1px solid var(--rule); }
.related-story h3 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0; }
.related-story a { color: var(--ink); text-decoration: none; }
.related-story a:hover { color: var(--accent); }
.related-story p { margin-top: .35rem; font-size: .95rem; line-height: 1.4; }
.related-story__meta { font-family: var(--sans); font-size: .68rem !important; font-weight: 800; text-transform: uppercase; color: var(--ink-soft); }
@media (min-width: 50rem) {
  .related-stories__grid { grid-template-columns: repeat(3, 1fr); border-left: 1px solid var(--rule); }
  .related-story { border-right: 1px solid var(--rule); padding: .9rem .8rem; }
}

/* === FOOTER === */
footer[role=contentinfo] { border-top: 5px solid var(--rule); margin-top: 3rem; padding: 1.5rem 0 3rem;
  font-family: var(--sans); font-size: .78rem; line-height: 1.5; }
footer[role=contentinfo] a { color: var(--accent); text-decoration: underline; }
footer[role=contentinfo] .inner { display: flex; flex-wrap: wrap; gap: 1rem; }
footer[role=contentinfo] .inner span:first-child { flex-basis: 100%; font-family: var(--serif); font-style: italic; }

/* === ACCESSIBILITY === */
.skip-to-content { position: absolute; left: -9999px; }
.skip-to-content:focus { position: static; }

/* === PRINT === */
@media print {
  :root { --ink: #121212; --surface: #ffffff; --rule: #121212; }
  header[role=banner], footer[role=contentinfo], .ad-slot { display: none !important; }
  body { max-width: 100%; padding: 0; }
  a { text-decoration: underline; color: var(--ink) !important; }
}
`;

const CSS = assembleCss(koiosPalette, CHROME_CSS);

function koiosContext(ctx: NormalizedThemeContext): KoiosThemeContext {
  return ctx as NormalizedThemeContext & KoiosThemeContext;
}

function inferSocialImageType(image: string): string | undefined {
  const path = (() => {
    try {
      return new URL(image).pathname;
    } catch {
      return image;
    }
  })().toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return undefined;
}

function socialLocale(ctx: NormalizedThemeContext, koios: KoiosThemeContext): string {
  if (koios.socialLocale) return koios.socialLocale;
  const lang = (ctx.lang || "en").replace("-", "_");
  return lang.includes("_") ? lang : `${lang}_US`;
}

/** Social-card metadata from the standard theme context. og:type reads the
 * canonical's path: /posts/ pages are articles, everything else the site. */
function socialMeta(ctx: NormalizedThemeContext): string {
  if (!ctx.canonical) return "";
  let origin = "";
  let type = "website";
  try {
    const url = new URL(ctx.canonical);
    origin = url.origin;
    if (url.pathname.startsWith("/posts/")) type = "article";
  } catch {
    return "";
  }
  const title = ctx.title || ctx.siteName;
  const koios = koiosContext(ctx);
  const socialImage = koios.socialImage ?? "/og.png";
  const image = new URL(socialImage, origin).toString();
  const imageType = koios.socialImageType ?? inferSocialImageType(image);
  const imageAlt = koios.socialImageAlt ?? title;
  const articleTags = type === "article" ? koios.articleTags ?? [] : [];
  return [
    `<meta property="og:site_name" content="${escapeHtml(ctx.siteName)}">`,
    `<meta property="og:locale" content="${escapeHtml(socialLocale(ctx, koios))}">`,
    `<meta property="og:type" content="${escapeHtml(type)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    ctx.description ? `<meta property="og:description" content="${escapeHtml(ctx.description)}">` : "",
    `<meta property="og:url" content="${escapeHtml(ctx.canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="675">',
    imageType === undefined ? "" : `<meta property="og:image:type" content="${escapeHtml(imageType)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">`,
    '<meta name="robots" content="max-snippet:-1, max-image-preview:large, max-video-preview:-1">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    ctx.description ? `<meta name="twitter:description" content="${escapeHtml(ctx.description)}">` : "",
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">`,
    type === "article" && koios.articlePublishedTime ? `<meta property="article:published_time" content="${escapeHtml(koios.articlePublishedTime)}">` : "",
    type === "article" && koios.articleModifiedTime ? `<meta property="article:modified_time" content="${escapeHtml(koios.articleModifiedTime)}">` : "",
    type === "article" && koios.articleAuthor ? `<meta property="article:author" content="${escapeHtml(koios.articleAuthor)}">` : "",
    type === "article" && koios.articleSection ? `<meta property="article:section" content="${escapeHtml(koios.articleSection)}">` : "",
    ...articleTags.map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`),
  ].filter(Boolean).join("\n");
}

function articleFingerprintLink(ctx: NormalizedThemeContext): string {
  const href = koiosContext(ctx).articleFingerprintJson;
  if (!href) return "";
  return `<link rel="alternate" type="application/ld+json" title="Koios article fingerprint" href="${escapeHtml(href)}">`;
}

function adSlot(ctx: NormalizedThemeContext, position: "header" | "inArticle" | "footer"): string {
  const koios = koiosContext(ctx);
  const client = koios.adClient;
  const slot = koios.adSlots?.[position];
  if (!client || !slot) return "";
  return [
    `<div class="ad-slot" data-position="${escapeHtml(position)}">`,
    `<ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtml(client)}"`,
    ` data-ad-slot="${escapeHtml(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`,
    "<script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>",
    "</div>",
  ].join("");
}

function adLoader(ctx: NormalizedThemeContext): string {
  const koios = koiosContext(ctx);
  if (!koios.adClient) return "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(koios.adClient)}" crossorigin="anonymous"></script>`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

export function chooseAAdsUnit(key: string, units: readonly string[] = DEFAULT_A_ADS_UNITS): string | undefined {
  const usable = units.map((unit) => unit.trim()).filter((unit) => unit.length > 0);
  if (usable.length === 0) return undefined;
  return usable[hashString(key) % usable.length];
}

export function aAdsSlotHtml(unit: string | undefined, placement: string): string {
  if (!unit) return "";
  return [
    `<div class="ad-slot ad-slot--a-ads" data-provider="a-ads" data-placement="${escapeHtml(placement)}" data-unit="${escapeHtml(unit)}">`,
    `<iframe title="Advertisement" data-aa="${escapeHtml(unit)}" src="https://acceptable.a-ads.com/${escapeHtml(encodeURIComponent(unit))}/?size=Adaptive" loading="lazy"></iframe>`,
    "</div>",
  ].join("");
}

function siteAAdsSlot(ctx: NormalizedThemeContext, placement: string): string {
  const koios = koiosContext(ctx);
  if (placement === "masthead" && koios.suppressMastheadAAds) return "";
  return aAdsSlotHtml(chooseAAdsUnit(`${ctx.canonical || ctx.title || ctx.siteName}:${placement}`, koios.aAdsUnits), placement);
}

function beacon(ctx: NormalizedThemeContext): string {
  if (!koiosContext(ctx).beacon) return "";
  // Privacy-light: path + referrer host only, fired once, no cookies, no ids.
  return "<script>(function(){try{var r='';try{r=document.referrer?new URL(document.referrer).host:''}catch(e){}" +
    "var u='/hit?p='+encodeURIComponent(location.pathname)+(r?'&r='+encodeURIComponent(r):'');" +
    "if(navigator.sendBeacon){navigator.sendBeacon(u)}else{fetch(u,{method:'POST',keepalive:true})}}catch(e){}})();</script>";
}

export const koiosTheme: Theme = {
  name: "koios",
  css: CSS,
  head(ctx) {
    return [
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800;900&display=swap" rel="stylesheet">',
      `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(ctx.siteName)} RSS" href="/feed.xml">`,
      `<link rel="alternate" type="application/feed+json" title="${escapeHtml(ctx.siteName)} JSON Feed" href="/feed.json">`,
      `<link rel="alternate" type="application/atom+xml" title="${escapeHtml(ctx.siteName)} Atom" href="/feed.atom">`,
      socialMeta(ctx),
      articleFingerprintLink(ctx),
      adLoader(ctx),
    ].filter(Boolean).join("\n");
  },
  header(ctx) {
    const nav = ctx.nav.map((item) =>
      `<a href="${escapeHtml(item.href)}"${item.current ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`).join("");
    return [
      '<div class="site-identity">',
      `<a class="site-title" href="/">${escapeHtml(ctx.siteName)}</a>`,
      `<span class="site-tagline">${escapeHtml(koiosContext(ctx).tagline ?? ctx.description)}</span>`,
      "</div>",
      `<nav>${nav}</nav>`,
      siteAAdsSlot(ctx, "masthead"),
      adSlot(ctx, "header"),
    ].join("");
  },
  footer(ctx) {
    return [
      siteAAdsSlot(ctx, "footer"),
      adSlot(ctx, "footer"),
      '<div class="inner">',
      `<span>© ${escapeHtml(String(ctx.year ?? ""))} ${escapeHtml(ctx.siteName)} · Edited by ${escapeHtml(ctx.author)}</span>`,
      '<a href="/about">About</a> <a href="/standards">Standards</a> <a href="/privacy">Privacy</a> <a href="/archive">Archive</a> <a href="/bibliography">Sources</a> <a href="/search">Search</a> <a href="/tags">Tags</a> <a href="/feed.xml">RSS</a> <a href="/feed.json">JSON Feed</a> <a href="/sitemap.xml">Sitemap</a> <a href="/newswire-audit.json">Gate audit</a>',
      "</div>",
      beacon(ctx),
    ].join("");
  },
  wrap(articleHtml, ctx) {
    return `${articleHtml}${adSlot(ctx, "inArticle")}`;
  },
};
