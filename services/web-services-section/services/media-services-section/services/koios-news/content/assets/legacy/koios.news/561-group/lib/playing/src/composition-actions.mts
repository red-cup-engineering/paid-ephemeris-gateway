/**
 * composition-actions — playing's categorical-composition surface: the REAL
 * ludics cut / Hyland–Ong composition, the copycat **Fax** identity, and the
 * three category laws, exposed as schema-first `action`s over the genuine engine
 * in `ludicizing/composition.mts`.
 *
 * Where `star-autonomous.mts` exposes the *-autonomous topology and `interact`
 * exposes the symmetric-join shadow cut (the orthogonality / normal-form engine),
 * THIS file exposes the categorical composition that hides the cut interface and
 * transports the copycat copy — the structure that makes behaviours a genuine
 * category (objects = behaviours, morphisms = designs `A ⊸ B`, composition =
 * `cut`, identity = `fax`). The identity/associativity laws are run for real.
 *
 * Each verb is a schema-first `action` carrying its wire codecs and its carrier
 * schemas — `domainSchema`/`codomainSchema` `$ref` the carrier `$id`s authored in
 * `src/carriers/index.mts` (bare descent paths under `playing/…`). json in, json out; carrier outputs projected with the
 * package's own encoders.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { decodeDesign, encodeDesign } from "./encoding/index.mjs";
import {
  type Design,
  cut,
  fax,
  composeChronicles,
  leftIdentityJudgment,
  rightIdentityJudgment,
  associativityJudgment,
  isCoherentFax,
} from "./structuring/concurrent-game/with-symmetry/index.mjs";
import {
  compositionCarrier,
  copycatCarrier,
  identityLawCarrier,
} from "./carriers/index.mjs";

// ── carrier $id vocabulary (the categorical-composition carriers) ──

const CARRIER = Object.freeze({
  design: "playing/design",
  composition: "playing/composition",
  copycat: "playing/copycat",
  identityLaw: "playing/identity-law",
});

const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });
const obj = (properties: JsonRecord, required: readonly string[] = []): JsonRecord =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const arr = Object.freeze({ type: "array" });

// ── boundary helpers ──

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

/** Decode a required array of encoded designs into Design carriers. */
function designsAt(record: JsonRecord, key: string, verb: string): Design[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${verb}: requires array of designs "${key}"`);
  return value.map((d) => decodeDesign(d));
}

/** The finite universe a closure is taken relative to: `universe`, else the given designs. */
function universeOf(record: JsonRecord, fallback: readonly Design[]): Design[] {
  const value = record["universe"];
  return Array.isArray(value) ? value.map((d) => decodeDesign(d)) : [...fallback];
}

// ── the categorical composition: cut, copycat, the laws ──

/** compose — THE CATEGORICAL CUT: the composite design A⊸C of two composable designs
 *  f:A⊸B and g:B⊸C. Runs the dispute on the shared interface B, transports the copycat
 *  copy across it, and HIDES B (unlike `interact`, the symmetric-join shadow that keeps
 *  the union of supports). Partial: the empty design when no play converges (a non-dual B). */
export const composeAction: Action = action({
  verb: "compose",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ f: ref(CARRIER.design), g: ref(CARRIER.design) }, ["f", "g"]),
  codomain: compositionCarrier,
  summary: "The categorical cut: compose two composable designs f:A⊸B and g:B⊸C into A⊸C, hiding the interface B.",
  description: "Domain: { f: <playing/design>, g: <playing/design> } — f's codomain side and g's domain side share the interface behaviour B (dual polarities). Codomain: the composition (playing/composition): the composite design A⊸C with B hidden and the copycat copy transported, whether it is empty (the cut's partiality on a non-dual B), and the count of converging composed plays.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "compose");
    if (record["f"] === undefined || record["g"] === undefined) {
      throw new TypeError(`compose: requires "f" and "g"`);
    }
    const f = decodeDesign(record["f"]);
    const g = decodeDesign(record["g"]);
    const composite = cut(f, g);
    const plays = composeChronicles(f, g).filter((p) => p.converged).length;
    return jsonResource({
      kind: "playing.composition",
      composite: encodeDesign(composite),
      empty: composite.entries.length === 0,
      plays,
    } as JsonValue, "playing composition");
  },
});

/** copycat — the categorical UNIT: the copycat identity Fax_B : B ⊸ B over a behaviour B.
 *  The η-expanded coherent design over the doubled interface (codomain copy 1·1·ξ as-is,
 *  domain copy 0·0·ξ polarity-dual). Reports the Fax design and the anti-fake coherence guard. */
export const copycatAction: Action = action({
  verb: "copycat",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr, universe: arr }, ["designs"]),
  codomain: copycatCarrier,
  summary: "The categorical unit: the copycat identity Fax_B : B ⊸ B — the η-expanded coherent copycat design over the doubled interface.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] } — the behaviour B (its material generators). Codomain: the copycat (playing/copycat): the Fax design (the categorical identity) and whether it is a coherent design (the anti-fake coherence guard).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "copycat");
    const designs = designsAt(record, "designs", "copycat");
    const universe = universeOf(record, designs);
    return jsonResource({
      kind: "playing.copycat",
      fax: encodeDesign(fax(designs, universe)),
      coherent: isCoherentFax(designs, universe),
    } as JsonValue, "playing copycat");
  },
});

/** identity-law — the categorical LAWS: the left identity cut(Fax_B, d) ≃ d, the right
 *  identity cut(d, Fax_B) ≃ d, and (when f/g/h are supplied) associativity
 *  cut(cut(f,g),h) ≃ cut(f, cut(g,h)). Run for real over the genuine engine. */
export const identityLawAction: Action = action({
  verb: "identity-law",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({
    designs: arr,
    universe: arr,
    f: ref(CARRIER.design),
    g: ref(CARRIER.design),
    h: ref(CARRIER.design),
  }, ["designs"]),
  codomain: identityLawCarrier,
  summary: "The category laws: left/right identity for Fax (cut(Fax_B,d) ≃ d, cut(d,Fax_B) ≃ d) and, with f/g/h, associativity — run for real.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[], f?, g?, h?: <playing/design> } — the behaviour B for the identity laws and an optional composable triple for associativity. Codomain: the identity-law verdict (playing/identity-law): leftIdentity, rightIdentity, optional associative, and a reason on first failure.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "identity-law");
    const designs = designsAt(record, "designs", "identity-law");
    const universe = universeOf(record, designs);
    const left = leftIdentityJudgment(designs, universe);
    const right = rightIdentityJudgment(designs, universe);
    const out: Record<string, JsonValue> = {
      kind: "playing.identity-law",
      leftIdentity: left.kind === "game.composition.identity:witness",
      rightIdentity: right.kind === "game.composition.identity:witness",
    };
    if (left.kind === "game.composition.identity-obstruction") out["reason"] = left.reason;
    else if (right.kind === "game.composition.identity-obstruction") out["reason"] = right.reason;
    if (record["f"] !== undefined && record["g"] !== undefined && record["h"] !== undefined) {
      const assoc = associativityJudgment(decodeDesign(record["f"]), decodeDesign(record["g"]), decodeDesign(record["h"]));
      out["associative"] = assoc.kind === "game.composition.associativity:witness";
      if (assoc.kind === "game.composition.associativity-obstruction" && out["reason"] === undefined) out["reason"] = assoc.reason;
    }
    return jsonResource(out as JsonValue, "playing identity law");
  },
});

/** The categorical-composition actions — aggregated into the package surface by actions.mts. */
export const compositionActions: readonly Action[] = Object.freeze([
  composeAction,
  copycatAction,
  identityLawAction,
]);
