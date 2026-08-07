/**
 * @emsenn/game-codecs — charge-faithful serialization of the game carriers.
 *
 * Pure, total, round-tripping codecs from the frozen carriers of
 * `@emsenn/game-algebra` and `@emsenn/game-topology` to and from plain JSON,
 * plus a JSONL line layer for persistent game logs.  Every carrier of the
 * theory of computing ($\mathbf{CGS}$ and the ludics that underlies it) has an
 * `encodeX(x): Json` and a `decodeX(json): X` such that decode round-trips
 * encode up to structural equality.  Decoders accept `unknown`, throw
 * `TypeError` on malformed input, and reuse the algebra's own constructors, so
 * a decoded carrier is a real frozen carrier — a configuration of the meme apex,
 * not a look-alike literal.  No filesystem I/O: just encode/decode and
 * string<->object line transforms.
 */
export * from "./json.mjs";
export * from "./charge.mjs";
export * from "./polarity.mjs";
export * from "./event-structure.mjs";
export * from "./locus.mjs";
export * from "./design.mjs";
export * from "./behaviour.mjs";
export * from "./interaction.mjs";
export * from "./jsonl.mjs";
