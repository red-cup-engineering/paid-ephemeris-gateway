/**
 * @emsenn/content — accountable content production, operationalized.
 *
 * The former content-* and syndication-* packages are now module subpaths; the
 * root re-exports each as a namespace for discoverability. Import the subpaths
 * directly for the flat symbol surface of each module.
 *
 *   - `./topology`     — the content-production algebra: demand, production,
 *     gates, copyedit, article, documentation, and the news subject core
 *     (`./topology/news`). Pure, I/O-free; "what content is and how it is
 *     produced and edited", for every content kind.
 *   - `./codecs`       — the boundary codecs: frontmatter, ninjs, references,
 *     search-console, vault.
 *   - `./markdown`     — the CommonMark markdown encoder (markdown → HTML / text).
 *   - `./image`        — image container header codecs (PNG, JPEG, GIF, WebP).
 *   - `./syndication`  — syndication-format codecs, with `./syndication/holography`
 *     projecting a syndicated item into the news claim-bundle form.
 *   - `./propaganda`   — the persuasion/furtherance layer over content carriers.
 *
 * Content is a configuration of the relationality apex.
 */
export * as topology from "./topology/index.mjs";
export * as codecs from "./codecs/index.mjs";
export * as markdown from "./markdown/index.mjs";
export * as image from "./image/index.mjs";
export * as syndication from "./syndication/index.mjs";
export * as propaganda from "./propaganda/index.mjs";
