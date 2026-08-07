/**
 * proof — playing's logic layer: CLL propositions (the names of behaviours),
 * the fragment lattice membership, focusing (incl. shifts), session types, and
 * the embeddings, all over a Proposition wire codec.
 *
 * "A formula is the name of a behaviour" (Girard 2001): propositions name the
 * bi-orthogonally-closed design-sets of the topology layer. This file exposes the
 * CLL proof reading of playing — `propose`/`dual-prop` (the involutive linear
 * negation), `classify-fragment`/`in-fragment` (the MLL⊂MALL⊂{ILL,CLL}⊂LL poset),
 * `focus` (Andreoli polarity, with the shifts ↑/↓), `formula`/`proves` (the
 * logic↔topology bridge), `session`/`dual-session`/`session-compat` (Caires–
 * Pfenning), and `embed` (the four sub-*-autonomous embeddings into CGS).
 *
 * Proposition wire codec: a proposition is `{ connective, operands, polarity?, label? }`
 * with atom polarity projected to its name; the codec round-trips it through the
 * exported smart constructors so arity and involutivity stay construction-justified.
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
  type Proposition,
  type Connective,
  type FragmentName,
  type SessionType,
  type EmbeddingName,
  type Polarity,
  atom,
  tensor,
  par,
  withProp,
  plus,
  one,
  bottom,
  top,
  zero,
  ofCourse,
  whyNot,
  up,
  down,
  dualProp,
  connectivesOf,
  isProposition,
  polarity,
  polarityName,
  positive,
  polarityOf,
  isFocused,
  classifyFragment,
  inFragment,
  fragmentNames,
  formula,
  denotation,
  proves,
  propositionOfSession,
  dualSession,
  sessionCompatibilityJudgment,
  sessionCorrespondence,
  isSessionType,
  embeddingByName,
  embeddingNames,
} from "./structuring/concurrent-game/with-symmetry/index.mjs";
import {
  embeddingCarrier,
  focusingCarrier,
  formulaCarrier,
  fragmentMembershipCarrier,
  propositionCarrier,
  sessionCarrier,
  sessionCompatCarrier,
} from "./carriers/index.mjs";

const CARRIER = Object.freeze({
  proposition: "playing/proposition",
  fragmentMembership: "playing/fragment-membership",
  focusing: "playing/focusing",
  formula: "playing/formula",
  session: "playing/session",
  sessionCompat: "playing/session-compat",
  embedding: "playing/embedding",
});

const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });
const obj = (properties: JsonRecord, required: readonly string[] = []): JsonRecord =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const objType = Object.freeze({ type: "object" });
const arr = Object.freeze({ type: "array" });
const str = Object.freeze({ type: "string" });

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${verb}: expected a JSON object`);
  return input as JsonRecord;
}
function requireString(record: JsonRecord, key: string, verb: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires "${key}"`);
  return value;
}

// ── the Proposition wire codec ──

const BINARY: Record<string, (l: Proposition, r: Proposition) => Proposition> = {
  tensor, par, with: withProp, plus,
};
const UNARY: Record<string, (p: Proposition) => Proposition> = {
  ofCourse, whyNot, up, down,
};
const NULLARY: Record<string, () => Proposition> = {
  one, bottom, top, zero,
};

/** Encode a proposition to its wire form: `{ connective, operands, polarity?, label? }`. */
function encodeProp(p: Proposition): JsonValue {
  return {
    connective: p.connective,
    operands: p.operands.map(encodeProp),
    ...(p.polarity !== undefined ? { polarity: polarityName(p.polarity) } : {}),
    ...(p.label !== undefined ? { label: p.label } : {}),
  };
}

/** Decode a proposition from its wire form through the exported smart constructors. */
function decodeProp(json: unknown, verb: string): Proposition {
  if (json === null || typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${verb}: a proposition is an object`);
  const record = json as JsonRecord;
  const connective = record["connective"];
  if (typeof connective !== "string") throw new TypeError(`${verb}: proposition requires a "connective"`);
  const rawOperands = Array.isArray(record["operands"]) ? record["operands"] : [];
  const operands = rawOperands.map((o) => decodeProp(o, verb));
  if (connective === "atom") {
    const label = typeof record["label"] === "string" ? record["label"] : "";
    const polName = record["polarity"];
    const p: Polarity = polName === "positive" || polName === "negative" ? polarity(polName) : positive();
    return atom(label, p);
  }
  const nullary = NULLARY[connective];
  if (nullary !== undefined) return nullary();
  const unary = UNARY[connective];
  if (unary !== undefined) {
    if (operands[0] === undefined) throw new TypeError(`${verb}: ${connective} needs one operand`);
    return unary(operands[0]);
  }
  const binary = BINARY[connective];
  if (binary !== undefined) {
    if (operands[0] === undefined || operands[1] === undefined) throw new TypeError(`${verb}: ${connective} needs two operands`);
    return binary(operands[0], operands[1]);
  }
  throw new TypeError(`${verb}: unknown connective ${JSON.stringify(connective)}`);
}

/** A session type from the wire (it is plain JSON; validated structurally). */
function sessionFrom(json: unknown, verb: string): SessionType {
  if (!isSessionType(json)) throw new TypeError(`${verb}: expected a session type (kind game.logic.session.*)`);
  return json;
}

// ── CLL propositions ──

/** propose — admit/validate a CLL proposition; report its signature, focus, and polarity. */
export const proposeAction: Action = action({
  verb: "propose",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ proposition: objType }, ["proposition"]),
  codomain: propositionCarrier,
  summary: "Admit a CLL proposition (the name of a behaviour); report its connective signature, focus, and polarity.",
  description: "Domain: { proposition: <a CLL proposition tree: connective/operands/polarity?/label?> }. Codomain: the proposition (playing/proposition), with its distinct connectives, whether its head is focused, and its Andreoli polarity.",
  run: (input: unknown): JsonValue => {
    const p = decodeProp(asRecord(input, "propose")["proposition"], "propose");
    const pol = polarityOf(p);
    return jsonResource({
      kind: "playing.proposition",
      proposition: encodeProp(p),
      connectives: [...connectivesOf(p)],
      focused: isFocused(p),
      polarity: pol === null ? null : polarityName(pol),
      wellFormed: isProposition(p),
    } as JsonValue, "playing proposition");
  },
});

/** dual-prop — the involutive linear negation (-)^⊥ (De Morgan; (↑P)^⊥ = ↓(P^⊥)). */
export const dualPropAction: Action = action({
  verb: "dual-prop",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ proposition: objType }, ["proposition"]),
  codomain: propositionCarrier,
  summary: "The involutive linear negation (-)^⊥ of a CLL proposition (De Morgan; shifts swap ↑↔↓).",
  description: "Domain: { proposition }. Codomain: the dual proposition (playing/proposition). dual-prop∘dual-prop is the identity.",
  run: (input: unknown): JsonValue => {
    const p = decodeProp(asRecord(input, "dual-prop")["proposition"], "dual-prop");
    const d = dualProp(p);
    const pol = polarityOf(d);
    return jsonResource({
      kind: "playing.proposition",
      proposition: encodeProp(d),
      connectives: [...connectivesOf(d)],
      focused: isFocused(d),
      polarity: pol === null ? null : polarityName(pol),
      wellFormed: true,
    } as JsonValue, "playing proposition dual");
  },
});

/** classify-fragment — the least fragment of the lattice admitting a proposition. */
export const classifyFragmentAction: Action = action({
  verb: "classify-fragment",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ proposition: objType }, ["proposition"]),
  codomain: fragmentMembershipCarrier,
  summary: "Classify a proposition into the least linear-logic fragment that admits all its connectives.",
  description: "Domain: { proposition }. Codomain: the fragment membership (playing/fragment-membership): the least admitting fragment name.",
  run: (input: unknown): JsonValue => {
    const p = decodeProp(asRecord(input, "classify-fragment")["proposition"], "classify-fragment");
    return jsonResource({ kind: "playing.fragment-membership", name: classifyFragment(p).name, inFragment: true } as JsonValue, "playing fragment classification");
  },
});

/** in-fragment — whether a proposition lies in a named fragment (and what it forbids if not). */
export const inFragmentAction: Action = action({
  verb: "in-fragment",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ proposition: objType, fragment: str }, ["proposition", "fragment"]),
  codomain: fragmentMembershipCarrier,
  summary: "Whether a proposition lies in a named fragment (MLL/MALL/ILL/CLL/LL); the forbidden connectives if not.",
  description: "Domain: { proposition, fragment: MLL|MALL|ILL|CLL|LL }. Codomain: the fragment membership (playing/fragment-membership): inFragment, and the forbidden connectives when not.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "in-fragment");
    const p = decodeProp(record["proposition"], "in-fragment");
    const name = requireString(record, "fragment", "in-fragment");
    if (!fragmentNames().includes(name as FragmentName)) throw new TypeError(`in-fragment: unknown fragment ${JSON.stringify(name)}`);
    const judgment = inFragment(p, name as FragmentName);
    if (judgment.kind === "game.logic.inFragment:witness") {
      return jsonResource({ kind: "playing.fragment-membership", name, inFragment: true } as JsonValue, "playing fragment membership");
    }
    return jsonResource({ kind: "playing.fragment-membership", name, inFragment: false, forbidden: [...judgment.forbidden] } as JsonValue, "playing fragment membership");
  },
});

/** focus — the Andreoli focusing polarity of a proposition (positive/negative/unfocused). */
export const focusAction: Action = action({
  verb: "focus",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ proposition: objType }, ["proposition"]),
  codomain: focusingCarrier,
  summary: "The Andreoli focusing polarity of a proposition's head (positive/synchronous vs negative/asynchronous).",
  description: "Domain: { proposition }. Codomain: the focusing reading (playing/focusing): the head polarity and whether the head is focused. The shifts ↑/↓ set this polarity explicitly.",
  run: (input: unknown): JsonValue => {
    const p = decodeProp(asRecord(input, "focus")["proposition"], "focus");
    const pol = polarityOf(p);
    return jsonResource({
      kind: "playing.focusing",
      connective: p.connective,
      coheres: isFocused(p),
      polarity: pol === null ? null : polarityName(pol),
    } as JsonValue, "playing focusing");
  },
});

// ── formulas: the names of behaviours (logic ↔ topology bridge) ──

/** formula — name a behaviour by a generator-set; return the behaviour it denotes. */
export const formulaAction: Action = action({
  verb: "formula",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ name: str, generators: arr, universe: arr }, ["name", "generators"]),
  codomain: formulaCarrier,
  summary: "Name a behaviour by a generator-set (a formula); return the behaviour it denotes (its B^⊥⊥).",
  description: "Domain: { name: string, generators: <playing/design>[], universe?: <playing/design>[] }. Codomain: the formula (playing/formula): its name and the carrier of the behaviour it denotes.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "formula");
    const name = requireString(record, "name", "formula");
    const generators = (Array.isArray(record["generators"]) ? record["generators"] : []).map((d) => decodeDesign(d));
    const universe: Design[] = Array.isArray(record["universe"]) ? record["universe"].map((d) => decodeDesign(d)) : [...generators];
    const f = formula(name, generators);
    const behaviour = denotation(f, universe);
    return jsonResource({ kind: "playing.formula", name, behaviour: behaviour.carrier.map((d) => encodeDesign(d)), size: behaviour.carrier.length } as JsonValue, "playing formula");
  },
});

/** proves — whether a design proves a formula (plays in the behaviour the formula names). */
export const provesAction: Action = action({
  verb: "proves",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ design: ref("playing/design"), name: str, generators: arr, universe: arr }, ["design", "name", "generators"]),
  codomain: formulaCarrier,
  summary: "Whether a design proves a formula — plays in the behaviour the formula names.",
  description: "Domain: { design: <playing/design>, name, generators: <playing/design>[], universe?: <playing/design>[] }. Codomain: the formula membership (playing/formula): proves true/false.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "proves");
    const design = decodeDesign(record["design"]);
    const name = requireString(record, "name", "proves");
    const generators = (Array.isArray(record["generators"]) ? record["generators"] : []).map((d) => decodeDesign(d));
    const universe: Design[] = Array.isArray(record["universe"]) ? record["universe"].map((d) => decodeDesign(d)) : [...generators];
    return jsonResource({ kind: "playing.formula", name, proves: proves(design, formula(name, generators), universe) } as JsonValue, "playing formula membership");
  },
});

// ── session types (Caires–Pfenning) ──

/** session — the CLL proposition a session type corresponds to (Caires–Pfenning). */
export const sessionAction: Action = action({
  verb: "session",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ session: objType }, ["session"]),
  codomain: sessionCarrier,
  summary: "The CLL proposition a session type corresponds to (Caires–Pfenning: session types as linear propositions).",
  description: "Domain: { session: <a session type: kind game.logic.session.{end,wait,send,recv,select,offer,server,client}> }. Codomain: the correspondence (playing/session): the session and its proposition image.",
  run: (input: unknown): JsonValue => {
    const s = sessionFrom(asRecord(input, "session")["session"], "session");
    const c = sessionCorrespondence(s);
    return jsonResource({ kind: "playing.session", session: s as unknown as JsonValue, proposition: encodeProp(c.proposition) } as JsonValue, "playing session");
  },
});

/** dual-session — the dual endpoint of a session, mapping to CLL linear negation. */
export const dualSessionAction: Action = action({
  verb: "dual-session",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ session: objType }, ["session"]),
  codomain: sessionCarrier,
  summary: "The dual endpoint of a session type (its proposition is the linear negation of the original's).",
  description: "Domain: { session }. Codomain: (playing/session) the session, its dual, and both propositions.",
  run: (input: unknown): JsonValue => {
    const s = sessionFrom(asRecord(input, "dual-session")["session"], "dual-session");
    const d = dualSession(s);
    return jsonResource({
      kind: "playing.session",
      session: s as unknown as JsonValue,
      dual: d as unknown as JsonValue,
      proposition: encodeProp(propositionOfSession(s)),
      dualProposition: encodeProp(propositionOfSession(d)),
    } as JsonValue, "playing session dual");
  },
});

/** session-compat — whether two endpoints can communicate (one is the dual of the other). */
export const sessionCompatAction: Action = action({
  verb: "session-compat",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ left: objType, right: objType }, ["left", "right"]),
  codomain: sessionCompatCarrier,
  summary: "Whether two session endpoints are compatible — one is the dual of the other (the channel cut boundary).",
  description: "Domain: { left: <session>, right: <session> }. Codomain: the compatibility verdict (playing/session-compat): compatible + the cut proposition A⊗A^⊥, or the expected dual.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "session-compat");
    const left = sessionFrom(record["left"], "session-compat");
    const right = sessionFrom(record["right"], "session-compat");
    const judgment = sessionCompatibilityJudgment(left, right);
    if (judgment.kind === "game.logic.sessionCompatibility:witness") {
      return jsonResource({ kind: "playing.session-compat", compatible: true, cut: encodeProp(judgment.cut) } as JsonValue, "playing session compatibility");
    }
    return jsonResource({ kind: "playing.session-compat", compatible: false, expectedRight: judgment.expectedRight as unknown as JsonValue, reason: judgment.reason } as JsonValue, "playing session compatibility");
  },
});

// ── the embeddings, applied ──

/** embed — one of the four sub-*-autonomous embeddings into CGS, by name. */
export const embedAction: Action = action({
  verb: "embed",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ name: str }, ["name"]),
  codomain: embeddingCarrier,
  summary: "One sub-*-autonomous embedding into CGS by name (hylandOng | dialectica | nominal | cairesPfenning).",
  description: "Domain: { name: hylandOng|dialectica|nominal|cairesPfenning }. Codomain: the embedding (playing/embedding): its source, sub-category, constraint, citation, and full-abstraction theorem.",
  run: (input: unknown): JsonValue => {
    const name = requireString(asRecord(input, "embed"), "name", "embed");
    if (!embeddingNames().includes(name as EmbeddingName)) throw new TypeError(`embed: unknown embedding ${JSON.stringify(name)} (have ${embeddingNames().join("/")})`);
    const e = embeddingByName(name as EmbeddingName);
    return jsonResource({ kind: "playing.embedding", embeddings: [{ name: e.name, source: e.source, subcategory: e.subcategory, constraint: e.constraint, citation: e.citation, theorem: e.theorem }] } as JsonValue, "playing embedding");
  },
});

/** The logic-layer actions — aggregated into the package surface by actions.mts. */
export const proofActions: readonly Action[] = Object.freeze([
  proposeAction,
  dualPropAction,
  classifyFragmentAction,
  inFragmentAction,
  focusAction,
  formulaAction,
  provesAction,
  sessionAction,
  dualSessionAction,
  sessionCompatAction,
  embedAction,
]);
