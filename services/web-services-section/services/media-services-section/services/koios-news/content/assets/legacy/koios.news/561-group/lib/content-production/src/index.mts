/**
 * @emsenn/content-production — content + computing.
 *
 * The marriage of the two branches off the relationality apex: the content
 * domain (the WHAT — `@emsenn/content`, specialized relationality) run on the
 * computer (the HOW — `@emsenn/computing`, specialized agent/gaming/relating).
 * Producing content is content settled by the computer.
 *
 * Modules:
 *   - `./computer` — the content domain's computing (the former content-computer,
 *     folded in): the OpenAI-compatible `ask`, Search Console `demand` intake, and
 *     the demand-meets-supply `production` cycle. Pure; performs no I/O it was not
 *     handed.
 *   - `./content-farm` — produce / enrich: witnessed cultivation cycles that turn
 *     demand + witnessed intake into opinionated drafts, judged by gates, over the
 *     `./computer` primitives.
 *   - `./content-mill` — form cultivated content for distribution: a
 *     publication's claim sets → feeds, sitemaps, robots, NewsArticle JSON-LD,
 *     h-entry bodies, ninjs, and the editorial-gate audit. Web-free; returns
 *     strings and plain objects a site mounts on HTTP transport.
 *
 * Pure logic, no transport. Each module's runnable units are scripts (see
 * `./scripts/`); a generic server mounts them over HTTP when a site wants them.
 * `koios.news` is a parameterized server of this package.
 */
export * as computer from "./computer/index.mjs";
export * as contentFarm from "./content-farm/index.mjs";
export * as contentMill from "./content-mill/index.mjs";
export * as cable from "./cable/index.mjs";
