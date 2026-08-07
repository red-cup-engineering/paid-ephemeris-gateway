/**
 * @emsenn/communicating/speaking/listening/codecs — the codec layer of language.
 *
 * Codecs are representation-boundary morphisms. This subpath owns the
 * structure → surface projection for settled communicating parses.
 *
 * The other legs live in their home objects:
 *   - load:       raw fiber data  ⇄  compiled fiber        (@emsenn/communicating/speaking/listening/algebra)
 *   - admit:      surface string  →   relating utterance    (@emsenn/communicating/speaking/listening/parsing)
 *   - parse:      admitted carrier →  settled structure     (@emsenn/communicating/speaking/listening/parsing)
 *   - render:     settled structure →  surface string       (this subpath)
 *
 * The codec law (after the research archive's `interpret(note; rules) → fiber`):
 *   1. Determinism — `parse(surface; fiber)` and `render(structure)` are
 *      functions: byte-identical inputs yield byte-identical outputs. The fiber
 *      bundle is the *rules*, supplied as content, never hard-coded.
 *   2. Source-of-truth — the surface is authoritative; the structure is derived.
 *
 * Note on direction: `render` is a *faithful presentation* of a parse (a human
 * view — TOKENS / ARCS / ROLES / TOWER), NOT the inverse codec. The genuine
 * structure→surface inverse is *realization* (`generate`/`realizeClause` in
 * `@emsenn/communicating-in-english`); it is fiber-bound, because choosing
 * articles and word order is language-specific. parse↔realize cross a lossy
 * semantic bottleneck (surface → roles → frames → surface drops article/tense/
 * order detail), so there is no exact round-trip — only the determinism above.
 * See codec-law.test / residuation.test for the checked invariants.
 */


export { default as render, renderArcs } from "./rendering.mjs";
