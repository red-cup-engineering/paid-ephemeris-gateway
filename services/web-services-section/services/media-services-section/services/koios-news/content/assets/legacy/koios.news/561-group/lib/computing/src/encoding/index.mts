/**
 * Charge-faithful serialization of the computing carriers.
 *
 * Mirrors the `@emsenn/gaming/encoding` idiom: pure, total, round-tripping
 * `encodeX(x): Json` / `decodeX(unknown): X` pairs that reuse the algebra's own
 * constructors, so a decoded carrier is a real frozen carrier — not a look-alike
 * literal. The genuinely new computing carriers are serialized here:
 *
 *   - `morphism`    — a category 1-cell (source, target, strategy);
 *   - `observation` — a settled CGS observation and its derivation provenance.
 *   - `telnet`      — terminal transport negotiation and GMCP/MSDP frames.
 *   - `mud`         — MUD room/status/perception projections onto GMCP events.
 *
 * The underlying arena/strategy/event carriers are serialized by
 * `@emsenn/gaming/encoding`, which these codecs reuse rather than re-encode; the
 * `Json` type is re-exported for convenience.
 */
export { type Json } from "@emsenn/gaming/encoding";
export * from "./morphism.mjs";
export * from "./observation.mjs";
export * from "./telnet.mjs";
export * from "./mud.mjs";
export * from "./environmental-configuration.mjs";
