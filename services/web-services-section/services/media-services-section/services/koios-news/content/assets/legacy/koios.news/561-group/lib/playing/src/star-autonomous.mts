/**
 * star-autonomous — playing's *-autonomous category surface and proof layer.
 *
 * The first action wave (`actions.mts`) exposed the cut and the play-readings. This
 * file exposes the rest of playing's domain: the **category of behaviours**. Objects
 * are behaviours `B = B^⊥⊥`; composition is the cut (`computational-ludics`); the
 * identity is **Fax** (`ludicizing/identity`); the category is *-autonomous, carrying
 * the MALL connectives and the exponentials as configurations of the one bi-orthogonal
 * Galois closure (`ludicizing/settling`). It also surfaces the proof layer: the
 * fragment lattice, focusing (with the new shifts ↑/↓), and the four sub-*-autonomous
 * embeddings into CGS. See dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md.
 *
 * Every morphism is a schema-first `action` over the existing tested pure functions —
 * `domainSchema`/`codomainSchema` `$ref` carrier `$id`s under `playing/…`. json in,
 * json out; carrier outputs projected with the package's own encoders.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import {
  decodeDesign,
  encodeDesign,
  encodeLocus,
  encodeBehaviour,
} from "./encoding/index.mjs";
import {
  type Design,
  type Connective,
  type BehaviourWitness,
  convergenceJudgment,
  generatedBehaviour,
  orthogonalOf,
  behaviourJudgment,
  incarnation,
  tensorBehaviour,
  parBehaviour,
  withBehaviour,
  plusBehaviour,
  lollipopBehaviour,
  negateBehaviour,
  ofCourseBehaviour,
  whyNotBehaviour,
  normalizationWitness,
  cutElimination,
  faxResponderJudgment,
  faxIdentity,
  fragmentPoset,
  focusingDuality,
  embeddings,
  polarityName,
} from "./structuring/concurrent-game/with-symmetry/index.mjs";
import {
  behaviourCarrier,
  embeddingCarrier,
  focusingCarrier,
  fragmentCarrier,
  identityCarrier,
  incarnationCarrier,
  normalizationCarrier,
  orthogonalityCarrier,
  statementCarrier,
} from "./carriers/index.mjs";

// ── carrier $id vocabulary (the *-autonomous + proof carriers) ──

const CARRIER = Object.freeze({
  design: "playing/design",
  orthogonality: "playing/orthogonality",
  behaviour: "playing/behaviour",
  incarnation: "playing/incarnation",
  normalization: "playing/normalization",
  identity: "playing/identity",
  statement: "playing/statement",
  fragment: "playing/fragment",
  focusing: "playing/focusing",
  embedding: "playing/embedding",
});

const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });
const obj = (properties: JsonRecord, required: readonly string[] = []): JsonRecord =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const arr = Object.freeze({ type: "array" });
const num = Object.freeze({ type: "number" });
const str = Object.freeze({ type: "string" });

// ── boundary helpers ──

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

function requireString(record: JsonRecord, key: string, verb: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires "${key}"`);
  return value;
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

/** Project a behaviour witness to its wire carrier (playing/behaviour). */
function behaviourOut(witness: BehaviourWitness, context: string): JsonValue {
  return jsonResource({ kind: "playing.behaviour", ...(encodeBehaviour(witness) as object) } as JsonValue, context);
}

/** Wrap a raw design-set as a behaviour witness, then project. */
function carrierOut(carrier: readonly Design[], context: string): JsonValue {
  return behaviourOut(Object.freeze({ kind: "game.behaviour:witness" as const, carrier: Object.freeze([...carrier]) }), context);
}

// ── the *-autonomous TOPOLOGY: orthogonality, behaviours, connectives, exponentials ──

/** orthogonal — D ⊥ E: does the cut of two designs converge to a Daimon? */
export const orthogonalAction: Action = action({
  verb: "orthogonal",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designA: ref(CARRIER.design), designB: ref(CARRIER.design) }, ["designA", "designB"]),
  codomain: orthogonalityCarrier,
  summary: "Judge orthogonality D ⊥ E — whether the interaction of two designs converges (reaches a Daimon ⊤).",
  description: "Domain: { designA: <playing/design>, designB: <playing/design> }. Codomain: the orthogonality verdict (playing/orthogonality): converges, the Daimon loci, or the divergence reason, with the normal form.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "orthogonal");
    const judgment = convergenceJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (judgment.kind === "game.convergence:witness") {
      return jsonResource({
        kind: "playing.orthogonality",
        orthogonal: true,
        daimonLoci: judgment.daimonLoci.map((l) => encodeLocus(l)),
        normalForm: encodeDesign(judgment.normalForm),
      } as JsonValue, "playing orthogonality");
    }
    return jsonResource({
      kind: "playing.orthogonality",
      orthogonal: false,
      reason: judgment.reason,
      normalForm: encodeDesign(judgment.normalForm),
    } as JsonValue, "playing orthogonality");
  },
});

/** close — the bi-orthogonal Galois closure B^⊥⊥: the behaviour GENERATED by a set. */
export const closeAction: Action = action({
  verb: "close",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr, universe: arr }, ["designs"]),
  codomain: behaviourCarrier,
  summary: "Close a design-set to a behaviour: the bi-orthogonal Galois closure B^⊥⊥.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the behaviour (playing/behaviour) generated as B^⊥⊥ over the finite universe.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "close");
    const designs = designsAt(record, "designs", "close");
    return behaviourOut(generatedBehaviour(designs, universeOf(record, designs)), "playing behaviour");
  },
});

/** dual-behaviour — B^⊥: the designs orthogonal to every member, over the universe. */
export const dualBehaviourAction: Action = action({
  verb: "dual-behaviour",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr, universe: arr }, ["designs"]),
  codomain: behaviourCarrier,
  summary: "The orthogonal behaviour B^⊥ — the designs orthogonal to every member of B.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the orthogonal behaviour B^⊥ (playing/behaviour).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "dual-behaviour");
    const designs = designsAt(record, "designs", "dual-behaviour");
    return carrierOut(orthogonalOf(designs, universeOf(record, designs)), "playing behaviour dual");
  },
});

/** behave — judge whether a design-set IS a behaviour (closed under (-)^⊥⊥). */
export const behaveAction: Action = action({
  verb: "behave",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr, universe: arr }, ["designs"]),
  codomain: behaviourCarrier,
  summary: "Judge whether a design-set is a behaviour: closed under (-)^⊥⊥ within the universe.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the behaviour judgment (playing/behaviour): the carrier and whether it is closed (with the closure when not).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "behave");
    const designs = designsAt(record, "designs", "behave");
    const judgment = behaviourJudgment(designs, universeOf(record, designs));
    if (judgment.kind === "game.behaviour:witness") {
      return jsonResource({ kind: "playing.behaviour", closed: true, carrier: judgment.carrier.map((d) => encodeDesign(d)) } as JsonValue, "playing behaviour judgment");
    }
    return jsonResource({
      kind: "playing.behaviour",
      closed: false,
      carrier: judgment.carrier.map((d) => encodeDesign(d)),
      closure: judgment.closure.map((d) => encodeDesign(d)),
    } as JsonValue, "playing behaviour judgment");
  },
});

/** incarnate — the material core |B| (Girard §11): strip ballast loci no counter visits. */
export const incarnateAction: Action = action({
  verb: "incarnate",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr, universe: arr }, ["designs"]),
  codomain: incarnationCarrier,
  summary: "The material core |B| of a behaviour: strip ballast loci no counter-design visits.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the incarnation (playing/incarnation): the material designs and their count.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "incarnate");
    const designs = designsAt(record, "designs", "incarnate");
    const material = incarnation(designs, universeOf(record, designs));
    return jsonResource({ kind: "playing.incarnation", material: material.map((d) => encodeDesign(d)), size: material.length } as JsonValue, "playing incarnation");
  },
});

/** A binary MALL connective on behaviours (left ⊗/⅋/&/⊕/⊸ right over a universe). */
function binaryConnectiveAction(
  verb: string,
  symbol: string,
  fn: (b1: readonly Design[], b2: readonly Design[], universe: readonly Design[]) => BehaviourWitness,
  needsUniverse: boolean,
): Action {
  return action({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    domainSchema: obj({ left: arr, right: arr, universe: arr }, ["left", "right"]),
    codomain: behaviourCarrier,
    summary: `The ${symbol} of two behaviours — a MALL connective configuring the bi-orthogonal closure.`,
    description: `Domain: { left: <playing/design>[], right: <playing/design>[], universe?: <playing/design>[] }. Codomain: the ${symbol} behaviour (playing/behaviour).`,
    run: (input: unknown): JsonValue => {
      const record = asRecord(input, verb);
      const left = designsAt(record, "left", verb);
      const right = designsAt(record, "right", verb);
      const universe = universeOf(record, [...left, ...right]);
      return behaviourOut(fn(left, right, universe), `playing behaviour ${verb}`);
    },
  });
}

export const tensorAction: Action = binaryConnectiveAction("tensor", "⊗ (tensor)", (a, b, u) => tensorBehaviour(a, b, u), true);
export const parAction: Action = binaryConnectiveAction("par", "⅋ (par)", (a, b, u) => parBehaviour(a, b, u), true);
export const withAction: Action = binaryConnectiveAction("with", "& (with)", (a, b, _u) => withBehaviour(a, b), false);
export const plusAction: Action = binaryConnectiveAction("plus", "⊕ (plus)", (a, b, u) => plusBehaviour(a, b, u), true);
export const lollipopAction: Action = binaryConnectiveAction("lollipop", "⊸ (lollipop)", (a, b, u) => lollipopBehaviour(a, b, u), true);

/** negate-behaviour — B^⊥ as the *-autonomous negation (over the universe). */
export const negateBehaviourAction: Action = action({
  verb: "negate-behaviour",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ carrier: arr, universe: arr }, ["carrier"]),
  codomain: behaviourCarrier,
  summary: "The *-autonomous negation B^⊥ of a behaviour (the linear negation as a behaviour).",
  description: "Domain: { carrier: <playing/design>[], universe?: <playing/design>[] }. Codomain: the negated behaviour B^⊥ (playing/behaviour).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "negate-behaviour");
    const carrier = designsAt(record, "carrier", "negate-behaviour");
    return behaviourOut(negateBehaviour(carrier, universeOf(record, carrier)), "playing behaviour negate");
  },
});

/** An exponential on behaviours (!B / ?B at a finite copy-stage). */
function exponentialAction(verb: string, symbol: string, fn: (b: readonly Design[], copies: number, universe: readonly Design[]) => BehaviourWitness): Action {
  return action({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    domainSchema: obj({ carrier: arr, copies: num, universe: arr }, ["carrier"]),
    codomain: behaviourCarrier,
    summary: `The exponential ${symbol} at a finite copy-stage — closure of superposed disjoint-delocated copies.`,
    description: `Domain: { carrier: <playing/design>[], copies?: number, universe?: <playing/design>[] }. Codomain: the ${symbol} behaviour (playing/behaviour). This is where the ! of Eff ≃ Kl(!_CGS) lives.`,
    run: (input: unknown): JsonValue => {
      const record = asRecord(input, verb);
      const carrier = designsAt(record, "carrier", verb);
      const copies = typeof record["copies"] === "number" && Number.isFinite(record["copies"]) ? Math.max(1, Math.trunc(record["copies"])) : 2;
      return behaviourOut(fn(carrier, copies, universeOf(record, carrier)), `playing behaviour ${verb}`);
    },
  });
}

export const ofCourseAction: Action = exponentialAction("of-course", "! (of course)", (b, c, u) => ofCourseBehaviour(b, c, u));
export const whyNotAction: Action = exponentialAction("why-not", "? (why not)", (b, c, u) => whyNotBehaviour(b, c, u));

// ── computational ludics: cut-elimination ──

/** normalize — the cut as explicit reduction (computational ludics): the normal form + convergence. */
export const normalizeAction: Action = action({
  verb: "normalize",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designA: ref(CARRIER.design), designB: ref(CARRIER.design) }, ["designA", "designB"]),
  codomain: normalizationCarrier,
  summary: "Cut-normalize two dual designs: the normal form, and whether it converges (Terui's reduction).",
  description: "Domain: { designA: <playing/design>, designB: <playing/design> }. Codomain: the normalization (playing/normalization): the cut normal form, convergence, and the Daimon loci or the divergence reason. The interaction normal form IS cut-elimination.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "normalize");
    const judgment = normalizationWitness(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (judgment.kind === "game.logic.normalization:witness") {
      return jsonResource({
        kind: "playing.normalization",
        converges: true,
        normalForm: encodeDesign(judgment.normalForm),
        daimonLoci: judgment.daimonLoci.map((l) => encodeLocus(l)),
      } as JsonValue, "playing normalization");
    }
    return jsonResource({
      kind: "playing.normalization",
      converges: false,
      normalForm: encodeDesign(judgment.normalForm),
      reason: judgment.reason,
    } as JsonValue, "playing normalization");
  },
});

/** cut-elimination — the Girard 2001/Terui 2011 Hauptsatz statement (the category is well-defined). */
export const cutEliminationAction: Action = action({
  verb: "cut-elimination",
  inputFormat: "json",
  outputFormat: "json",
  codomain: statementCarrier,
  summary: "The cut-elimination (strong-normalization) Hauptsatz that makes the category of behaviours well-defined.",
  description: "Domain: ignored. Codomain: the cut-elimination statement (playing/statement): the design-level Hauptsatz (Girard 2001 / Terui 2011).",
  run: (): JsonValue => jsonResource({ ...cutElimination() } as JsonValue, "playing cut-elimination"),
});

// ── the identity: Fax (the unit of the category of behaviours) ──

/** fax — the copycat responder at a behaviour (its convergence-shadow in B^⊥; the unit's flat-grain witness). */
export const faxAction: Action = action({
  verb: "fax",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr, universe: arr }, ["designs"]),
  codomain: identityCarrier,
  summary: "The copycat responder at a behaviour — the design in B^⊥ that accepts every member (Fax's flat-grain shadow).",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the identity witness (playing/identity): the responder design, its interface loci, and that it accepts all members — the categorical unit's convergence content. See fax-law for the full identity.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "fax");
    const designs = designsAt(record, "designs", "fax");
    const judgment = faxResponderJudgment(designs, universeOf(record, designs));
    if (judgment.kind === "game.identity.fax-responder:witness") {
      return jsonResource({
        kind: "playing.identity",
        responder: encodeDesign(judgment.responder),
        interface: judgment.interface.map((l) => encodeLocus(l)),
        acceptsAll: true,
      } as JsonValue, "playing identity");
    }
    return jsonResource({
      kind: "playing.identity",
      responder: encodeDesign(judgment.responder),
      acceptsAll: false,
      rejected: encodeDesign(judgment.rejected),
    } as JsonValue, "playing identity");
  },
});

/** fax-law — the categorical identity law for Fax, with its grain made explicit. */
export const faxLawAction: Action = action({
  verb: "fax-law",
  inputFormat: "json",
  outputFormat: "json",
  codomain: statementCarrier,
  summary: "The Fax identity law (cut(Fax_B, d) ≃ d) and the grain at which it lives.",
  description: "Domain: ignored. Codomain: the Fax identity statement (playing/statement): behaviours form a category with composition = cut and identity = Fax; the reactive copycat lives at the chronicle grain, its convergence shadow at the valuation grain.",
  run: (): JsonValue => jsonResource({ ...faxIdentity() } as JsonValue, "playing fax-law"),
});

// ── the proof layer: the fragment lattice, focusing (+ shifts), the embeddings ──

/** fragments — the subtheory lattice MLL ⊂ MALL ⊂ {ILL, CLL} ⊂ LL as an explicit poset. */
export const fragmentsAction: Action = action({
  verb: "fragments",
  inputFormat: "json",
  outputFormat: "json",
  codomain: fragmentCarrier,
  summary: "The linear-logic fragment lattice MLL ⊂ MALL ⊂ {ILL, CLL} ⊂ LL (ILL ⊥ CLL incomparable).",
  description: "Domain: ignored. Codomain: the fragment poset (playing/fragment): the five fragments and the covering (Hasse) edges of the *-autonomous embedding order.",
  run: (): JsonValue => {
    const poset = fragmentPoset();
    return jsonResource({
      kind: "playing.fragment",
      elements: poset.elements.map((f) => f.name),
      coverings: poset.coverings.map(([lo, hi]) => [lo, hi]),
    } as JsonValue, "playing fragment lattice");
  },
});

/** focusing-duality — Andreoli polarity duality of a connective; demonstrates the shifts ↑/↓. */
export const focusingDualityAction: Action = action({
  verb: "focusing-duality",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ connective: str }, ["connective"]),
  codomain: focusingCarrier,
  summary: "The Andreoli focusing-polarity duality of a connective (incl. the shifts up/down): polarity(c^⊥) = dual(polarity(c)).",
  description: "Domain: { connective: tensor|par|with|plus|one|bottom|top|zero|ofCourse|whyNot|up|down }. Codomain: the focusing-duality verdict (playing/focusing): the connective's dual polarity and the negated polarity, and whether they cohere.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "focusing-duality");
    const connective = requireString(record, "connective", "focusing-duality") as Connective;
    const judgment = focusingDuality(connective);
    if (judgment.kind === "game.logic.focusingDuality:witness") {
      return jsonResource({
        kind: "playing.focusing",
        connective: judgment.connective,
        coheres: true,
        dualPolarity: polarityName(judgment.dualPolarity),
        negatedPolarity: polarityName(judgment.negatedPolarity),
      } as JsonValue, "playing focusing duality");
    }
    return jsonResource({
      kind: "playing.focusing",
      connective: judgment.connective,
      coheres: false,
      reason: judgment.reason,
    } as JsonValue, "playing focusing duality");
  },
});

/** embeddings — the four full sub-*-autonomous embeddings into CGS (the theory-of-computing claim). */
export const embeddingsAction: Action = action({
  verb: "embeddings",
  inputFormat: "json",
  outputFormat: "json",
  codomain: embeddingCarrier,
  summary: "The four full sub-*-autonomous embeddings into CGS: Hyland-Ong, Dialectica, Nominal/AGMOS, Caires-Pfenning.",
  description: "Domain: ignored. Codomain: the embeddings catalog (playing/embedding): for each, the source theory, the CGS sub-category, the constraint, citation, and full-abstraction theorem.",
  run: (): JsonValue => jsonResource({
    kind: "playing.embedding",
    embeddings: embeddings().map((e) => ({
      name: e.name,
      source: e.source,
      subcategory: e.subcategory,
      constraint: e.constraint,
      citation: e.citation,
      theorem: e.theorem,
    })),
  } as JsonValue, "playing embeddings"),
});

/** The *-autonomous + proof-layer actions — aggregated into the package surface by actions.mts. */
export const starAutonomousActions: readonly Action[] = Object.freeze([
  orthogonalAction,
  closeAction,
  dualBehaviourAction,
  behaveAction,
  incarnateAction,
  tensorAction,
  parAction,
  withAction,
  plusAction,
  lollipopAction,
  negateBehaviourAction,
  ofCourseAction,
  whyNotAction,
  normalizeAction,
  cutEliminationAction,
  faxAction,
  faxLawAction,
  fragmentsAction,
  focusingDualityAction,
  embeddingsAction,
]);
