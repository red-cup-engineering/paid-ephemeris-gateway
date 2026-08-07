/**
 * actions — the package's registered operations, each a cocone leg.
 *
 * These are the relating morphisms presented at the boundary. `induceBins` over
 * this list assembles the discovery apex; the `relate` dispatcher runs any of
 * them. None of these files binds stdin or argv — the dispatcher owns that, once.
 *
 * The chain is THIN: each morphism has an actual domain and codomain, and emits a
 * proper categorical carrier consumable as the next morphism's domain —
 *
 *   utter      : Mark × Mark        → Utterance            (the only admission;
 *                                                            the lone injected datum is the Mark)
 *   articulate : Utterance          → ArticulationCell
 *   predicate  : ArticulationCell   → PredicationSite      (Φ = E × Π × E)
 *   posit      : PredicationSite    → PositPresheaf        (fibers of evidence)
 *   settle     : PositPresheaf      → SettlementFiltration (closure to the extrema)
 *
 * so `relate utter | relate articulate | relate predicate | relate posit | relate
 * settle` is the morphism chain as a POSIX pipe. `induce-relation` is the named
 * full descent (settle∘posit∘predicate∘articulate) from an admitted utterance.
 * Only `utter`/`induce-relation` admit a Mark (the `string`/`form`/`json` wires);
 * every interior morphism takes its predecessor's carrier on the `json` wire.
 */
import { articulate, mark, tokenIdentity, token, utterance, type UtteranceCarrier, type ArticulationCell } from "./articulating/index.mjs";
import { predicate, type PredicationSite } from "./articulating/predicating/index.mjs";
import { posit, type PositPresheaf } from "./articulating/predicating/positing/index.mjs";
import {
  settle,
  induceRelation,
  relateRelations,
  readIncrementsOfSettlementFiltration,
  readFiringsOfSettlementFiltration,
  readLimitStagesOfSettlementFiltration,
  readNonScottFiringsOfSettlementFiltration,
  readFirstCohomologyOfSettlementFiltration,
  readClosureInvariantOfSettlementFiltration,
  readGradedGapOfSettlementFiltration,
  readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration,
  readClassificationOfSettlementFiltration,
  readDepthOfSettlementFiltration,
  readDepthFiniteStageJudgmentOfSettlementFiltration,
  readFiringEventsOfSettlementFiltration,
  readCausalOrderOfSettlementFiltration,
} from "./articulating/predicating/positing/settling/index.mjs";
import type { SettlementFiltration } from "./articulating/predicating/positing/settling/index.mjs";

/** A settlement-filtration read action: a SettlementFiltration JSON in, the read's JSON out. */
function settlementRead(verb: string, summary: string, read: (carrier: SettlementFiltration) => unknown): Action {
  return action({
    verb,
    in: "json",
    out: "json",
    summary,
    description: "Domain: a SettlementFiltration as JSON. Codomain: the read's result as JSON.",
    run: (input: JsonValue): JsonValue => jsonResource(read(input as unknown as SettlementFiltration), verb),
  });
}

/** The settlement-filtration read bins, each a pure invariant of the settled object. */
export const settlementReadActions: readonly Action[] = Object.freeze([
  settlementRead("read-increments-of-settlement-filtration", "The per-stage cell increments of a settling.", readIncrementsOfSettlementFiltration),
  settlementRead("read-firings-of-settlement-filtration", "The increments that add cells.", readFiringsOfSettlementFiltration),
  settlementRead("read-limit-stages-of-settlement-filtration", "The limit-shaped stages of a settling.", readLimitStagesOfSettlementFiltration),
  settlementRead("read-non-scott-firings-of-settlement-filtration", "The cell-adding firings at limit stages.", readNonScottFiringsOfSettlementFiltration),
  settlementRead("read-first-cohomology-of-settlement-filtration", "The degree-1 cohomology of a settling.", readFirstCohomologyOfSettlementFiltration),
  settlementRead("read-closure-invariant-of-settlement-filtration", "The closure invariant (non-Scott additions).", readClosureInvariantOfSettlementFiltration),
  settlementRead("read-graded-gap-of-settlement-filtration", "The graded gap (cells lost at non-Scott firings).", readGradedGapOfSettlementFiltration),
  settlementRead("read-graded-gap-first-cohomology-rank-identity-of-settlement-filtration", "The graded-gap = H¹-rank identity.", readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration),
  settlementRead("read-classification-of-settlement-filtration", "The regime, depth, and cofinality classification.", readClassificationOfSettlementFiltration),
  settlementRead("read-depth-of-settlement-filtration", "The settling depth (ordinal of the last firing).", readDepthOfSettlementFiltration),
  settlementRead("read-depth-finite-stage-judgment-of-settlement-filtration", "The finite-stage judgment on the depth.", readDepthFiniteStageJudgmentOfSettlementFiltration),
  settlementRead("read-firing-events-of-settlement-filtration", "Each designated cell paired with its first-firing stage.", readFiringEventsOfSettlementFiltration),
  settlementRead("read-causal-order-of-settlement-filtration", "The causal order over the settling's firing events.", readCausalOrderOfSettlementFiltration),
]);
import { jsonResource, type JsonRecord, type JsonValue } from "./codecs/json.mjs";
import { action, type Action } from "./acting/index.mjs";
import { generateDeclaration } from "./typing/index.mjs";

/**
 * Admit the token/claim utterance from the input carrier, however it was wired.
 *
 * An Utterance is one object — a pair of opaque Marks (left=token, right=claim) —
 * with several legitimate boundary encodings, all decoded *into the input
 * carrier* (never the options channel, where token/claim are not parameters but
 * the domain itself):
 *   - the `string` wire: two Mark payloads split on the FIRST newline. Idiomatic
 *     Unix admission of two marks from one stream; the claim, being prose, is the
 *     half allowed to carry further newlines.
 *   - the `form`/`json` wire: a `{ token, claim }` object (so HTTP `?token=&claim=`
 *     and script composition build the same carrier).
 * The morphism is indifferent to which encoding arrived: one Utterance results.
 */
function admitUtterance(input: JsonValue, verb: string): UtteranceCarrier {
  if (typeof input === "string") {
    const newline = input.indexOf("\n");
    if (newline < 0) throw new TypeError(`${verb}: expected a token and claim separated by a newline`);
    return utterance(mark(input.slice(0, newline)), mark(input.slice(newline + 1)));
  }
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const record = input as JsonRecord;
    if ("token" in record && "claim" in record) return utterance(mark(record["token"]), mark(record["claim"]));
  }
  throw new TypeError(`${verb}: expected a "token\\nclaim" string or a { token, claim } object`);
}

/** utter — the admission boundary: get two Marks into the system as an utterance.
 *  The only morphism that injects data (a Mark); everything downstream is carrier
 *  → carrier. The pair arrives on the `string` (token\nclaim), `form`
 *  (?token=&claim=), or `json` ({token,claim}) wire. */
export const utterAction: Action = action({
  verb: "utter",
  in: "string",
  out: "json",
  summary: "Admit two Marks as an utterance (token and claim).",
  description: "Domain: a token Mark and a claim Mark, wired as `token\\nclaim` (string), `?token=&claim=` (form), or `{token,claim}` (JSON). Codomain: the UtteranceCarrier as JSON.",
  run: (input: JsonValue): JsonValue => jsonResource(admitUtterance(input, "utter"), "utterance"),
});

/** articulate — Utterance → ArticulationCell: open the articulation category at
 *  the potential cell of an already-admitted utterance carrier. */
export const articulateAction: Action = action({
  verb: "articulate",
  in: "json",
  out: "json",
  summary: "Open the articulation category at the potential cell of an utterance.",
  description: "Domain: an UtteranceCarrier as JSON (the codomain of `utter`). Codomain: the ArticulationCell as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(articulate(input as unknown as UtteranceCarrier), "articulation cell"),
});

/** canonicalize — a JSON carrier to its canonical form: the identity endomorphism
 *  on the JSON wire, witnessing idempotence and representation-independence. */
export const canonicalizeAction: Action = action({
  verb: "canonicalize",
  in: "json",
  out: "json",
  summary: "Re-encode a JSON carrier in canonical form (identity on the JSON wire).",
  run: (input: JsonValue): JsonValue => input,
});

/** coincide — judge whether two Mark payloads coincide as tokens. Domain: a JSON
 *  object `{ left, right }`. Codomain: the coincidence judgment as JSON. */
export const coincideAction: Action = action({
  verb: "coincide",
  in: "json",
  out: "json",
  summary: "Judge whether two Mark payloads coincide as token carriers.",
  run: (input: JsonValue): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("coincide: expected a JSON object { left, right }");
    }
    const record = input as JsonRecord;
    if (!("left" in record) || !("right" in record)) throw new TypeError("coincide: requires left and right");
    return jsonResource(tokenIdentity(token(mark(record["left"])), token(mark(record["right"]))), "coincidence judgment");
  },
});

/** realize — the forgetful functor as a boundary morphism: a JSON Schema in,
 *  its TypeScript declaration out. `--name` sets the root type name. */
export const realizeAction: Action = action({
  verb: "realize",
  in: "json",
  out: "string",
  options: ["name"],
  summary: "Generate a TypeScript declaration from a JSON Schema (realize: Sub(J) → StructuralTypes).",
  description: "Domain: a JSON Schema document. Codomain: TypeScript declaration text; refinements are forgotten and remain the schema's runtime law.",
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const name = typeof args["name"] === "string" ? args["name"] : "Root";
    return generateDeclaration(input, name);
  },
});

/** predicate — ArticulationCell → PredicationSite: materialize Φ = E × Π × E. */
export const predicateAction: Action = action({
  verb: "predicate",
  in: "json",
  out: "json",
  summary: "Materialize the predication site of an articulation cell (Φ = E × Π × E).",
  description: "Domain: an ArticulationCell as JSON (the codomain of `articulate`). Codomain: the PredicationSite as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(predicate(input as unknown as ArticulationCell), "predication site"),
});

/** posit — PredicationSite → PositPresheaf: value the predication as fibers of
 *  evidence, the presheaf settlement closes over. */
export const positAction: Action = action({
  verb: "posit",
  in: "json",
  out: "json",
  summary: "Value a predication site as fibers of evidence (the posit presheaf).",
  description: "Domain: a PredicationSite as JSON (the codomain of `predicate`). Codomain: the PositPresheaf as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(posit(input as unknown as PredicationSite), "posit presheaf"),
});

/** settle — PositPresheaf → SettlementFiltration: close the presheaf to its
 *  extrema, the transfinite paraconsistent fixed-point filtration. */
export const settleAction: Action = action({
  verb: "settle",
  in: "json",
  out: "json",
  summary: "Close a posit presheaf to its settlement filtration (the extrema).",
  description: "Domain: a PositPresheaf as JSON (the codomain of `posit`). Codomain: the SettlementFiltration as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(settle(input as unknown as PositPresheaf), "settlement filtration"),
});

/** induce-relation — the named full descent settle∘posit∘predicate∘articulate
 *  from an admitted utterance: a Mark pair to the settled relation in one play. */
export const induceRelationAction: Action = action({
  verb: "induce-relation",
  in: "string",
  out: "json",
  summary: "Induce the settlement filtration of an utterance (the full relation descent).",
  description: "Domain: an utterance (a token Mark and a claim Mark) wired as `token\\nclaim` (string), `?token=&claim=` (form), or `{token,claim}` (JSON). Codomain: the SettlementFiltration as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(induceRelation(admitUtterance(input, "induce-relation")), "settlement filtration"),
});

/** relate-relations — relate two settled relations: a JSON object `{ left, right }`
 *  of settlement filtrations, uttered against each other and re-induced. */
export const relateRelationsAction: Action = action({
  verb: "relate-relations",
  in: "json",
  out: "json",
  summary: "Relate two settlement filtrations by uttering them against each other.",
  description: "Domain: a JSON object { left, right } of two settlement filtrations. Codomain: the combined SettlementFiltration as JSON.",
  run: (input: JsonValue): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("relate-relations: expected a JSON object { left, right }");
    }
    const record = input as JsonRecord;
    if (!("left" in record) || !("right" in record)) throw new TypeError("relate-relations: requires left and right");
    return jsonResource(relateRelations(record["left"] as unknown as SettlementFiltration, record["right"] as unknown as SettlementFiltration), "settlement filtration");
  },
});

/** The package's actions — the source `induceBins` reads. */
export const actions: readonly Action[] = Object.freeze([
  utterAction,
  articulateAction,
  predicateAction,
  positAction,
  settleAction,
  induceRelationAction,
  relateRelationsAction,
  coincideAction,
  canonicalizeAction,
  ...settlementReadActions,
  realizeAction,
]);
