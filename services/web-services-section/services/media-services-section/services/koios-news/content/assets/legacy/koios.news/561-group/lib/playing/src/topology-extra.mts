/**
 * topology-extra — the remaining *-autonomous topology and the locative substrate.
 *
 * Rounds out playing's topology surface with the machinery the gaming body
 * implements but had not yet exposed: the **chronicle grain** (chronicles +
 * coherence — the plays-along-one-branch reading the Fax identity law references),
 * **internal completeness** (presentation-independence of B^⊥⊥), **locativity**
 * (delocation-invariance of orthogonality), **chronicle-convergence** (the
 * step-by-step dispute refining the global verdict), the **design knowledge order**
 * (≤_k on designs), and the **locative primitives** (delocate / superpose — the
 * action of the free monoid of loci on designs that builds the multiplicatives and
 * exponentials). See dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { decodeDesign, encodeDesign, decodeLocus, encodeLocus } from "./encoding/index.mjs";
import {
  type Design,
  type Action as LudicAction,
  type PlayerView,
  designChronicles,
  designCoherenceJudgment,
  type PlayerPerspective,
  viewOfChronicle,
  viewsOfDesign,
  innocenceJudgment,
  internalCompletenessJudgment,
  delocationInvarianceJudgment,
  chronicleConvergenceJudgment,
  designLeqJudgment,
  delocate,
  superpose,
} from "./structuring/concurrent-game/with-symmetry/index.mjs";
import {
  chronicleConvergenceCarrier,
  chroniclesCarrier,
  coherenceCarrier,
  designCarrier,
  designLeqCarrier,
  innocenceCarrier,
  internalCompletenessCarrier,
  locativityCarrier,
  viewCarrier,
} from "./carriers/index.mjs";

const CARRIER = Object.freeze({
  design: "playing/design",
  chronicles: "playing/chronicles",
  view: "playing/view",
  innocence: "playing/innocence",
  coherence: "playing/coherence",
  internalCompleteness: "playing/internal-completeness",
  locativity: "playing/locativity",
  chronicleConvergence: "playing/chronicle-convergence",
  designLeq: "playing/design-leq",
});

const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });
const obj = (properties: JsonRecord, required: readonly string[] = []): JsonRecord =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const arr = Object.freeze({ type: "array" });
const str = Object.freeze({ type: "string" });

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${verb}: expected a JSON object`);
  return input as JsonRecord;
}
function designsAt(record: JsonRecord, key: string, verb: string): Design[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${verb}: requires array of designs "${key}"`);
  return value.map((d) => decodeDesign(d));
}
function universeOf(record: JsonRecord, fallback: readonly Design[]): Design[] {
  const value = record["universe"];
  return Array.isArray(value) ? value.map((d) => decodeDesign(d)) : [...fallback];
}
/** A witness/obstruction judgment is a witness iff its kind ends in ":witness". */
const isWitness = (j: { readonly kind: string }): boolean => j.kind.endsWith(":witness");

function perspectiveOf(record: JsonRecord): PlayerPerspective {
  return record["perspective"] === "opponent" ? "opponent" : "proponent";
}

const encodeAction = (a: LudicAction) => ({
  variety: a.variety,
  locus: encodeLocus(a.locus),
  ramification: [...a.ramification],
});

const encodeView = (view: PlayerView) => ({
  perspective: view.perspective,
  actions: view.actions.map(encodeAction),
});

// ── the chronicle grain (plays-along-one-branch; what the Fax identity references) ──

/** chronicles — the chronicles (Girard §4.7 plays) of a design: its root-to-leaf branches. */
export const chroniclesAction: Action = action({
  verb: "chronicles",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ design: ref(CARRIER.design) }, ["design"]),
  codomain: chroniclesCarrier,
  summary: "The chronicles of a design — its maximal alternating justified action-sequences (Girard §4.7 plays).",
  description: "Domain: { design: <playing/design> }. Codomain: the chronicles (playing/chronicles): each a sequence of actions {variety, locus, ramification} along one ≼-chain; a design is the union of its chronicles.",
  run: (input: unknown): JsonValue => {
    const d = decodeDesign(asRecord(input, "chronicles")["design"]);
    const chronicles = designChronicles(d).map((c) => ({
      actions: c.actions.map((a) => ({ variety: a.variety, locus: encodeLocus(a.locus), ramification: [...a.ramification] })),
    }));
    return jsonResource({ kind: "playing.chronicles", chronicles, count: chronicles.length } as JsonValue, "playing chronicles");
  },
});

/** view — the Hyland-Ong/Faggian-Hyland local-memory view of each chronicle. */
export const viewAction: Action = action({
  verb: "view",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ design: ref(CARRIER.design), perspective: str }, ["design"]),
  codomain: viewCarrier,
  summary: "Compute player views of a design's chronicles: the local-memory projection used by innocent strategies.",
  description: "Domain: { design: <playing/design>, perspective?: proponent|opponent }. Codomain: (playing/view) the Hyland-Ong/Faggian-Hyland views of each chronicle, computed from the existing charge-backed ludics actions.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "view");
    const perspective = perspectiveOf(record);
    const views = viewsOfDesign(decodeDesign(record["design"]), perspective).map(encodeView);
    return jsonResource({ kind: "playing.view", perspective, views, count: views.length } as JsonValue, "playing view");
  },
});

/** innocent — same Proponent view implies the same next Proponent action. */
export const innocentAction: Action = action({
  verb: "innocent",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ design: ref(CARRIER.design) }, ["design"]),
  codomain: innocenceCarrier,
  summary: "Judge finite Hyland-Ong innocence: the next Proponent move is determined by the Proponent view.",
  description: "Domain: { design: <playing/design> }. Codomain: (playing/innocence) whether equal Proponent views have equal next Proponent actions across the design's chronicles.",
  run: (input: unknown): JsonValue => {
    const design = decodeDesign(asRecord(input, "innocent")["design"]);
    const judgment = innocenceJudgment(design);
    if (judgment.kind === "game.innocence:witness") {
      return jsonResource({
        kind: "playing.innocence",
        innocent: true,
        decisions: judgment.decisions.map((d) => ({
          view: encodeView(d.view),
          next: encodeAction(d.next),
        })),
      } as JsonValue, "playing innocence");
    }
    return jsonResource({
      kind: "playing.innocence",
      innocent: false,
      reason: judgment.reason,
      view: encodeView(judgment.view),
      expected: encodeAction(judgment.expected),
      actual: encodeAction(judgment.actual),
    } as JsonValue, "playing innocence");
  },
});

/** coherent — whether a design satisfies Girard's four coherence conditions (C1)–(C4). */
export const coherentAction: Action = action({
  verb: "coherent",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ design: ref(CARRIER.design) }, ["design"]),
  codomain: coherenceCarrier,
  summary: "Whether a design is coherent (Girard §4.3 (C1)–(C4): alternation, linearity, focusing, rootedness).",
  description: "Domain: { design: <playing/design> }. Codomain: the coherence judgment (playing/coherence): coherent, and the failing condition + reason if not.",
  run: (input: unknown): JsonValue => {
    const d = decodeDesign(asRecord(input, "coherent")["design"]);
    const j = designCoherenceJudgment(d);
    if (j.kind === "game.design.coherence:witness") {
      return jsonResource({ kind: "playing.coherence", coherent: true } as JsonValue, "playing coherence");
    }
    return jsonResource({ kind: "playing.coherence", coherent: false, condition: j.condition, reason: j.reason } as JsonValue, "playing coherence");
  },
});

// ── internal completeness, locativity, chronicle-convergence, the design order ──

/** internal-completeness — do two generator-sets present the SAME behaviour (presentation-independence)? */
export const internalCompletenessAction: Action = action({
  verb: "internal-completeness",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ left: arr, right: arr, universe: arr }, ["left", "right"]),
  codomain: internalCompletenessCarrier,
  summary: "Whether two generator-sets present the same behaviour — B^⊥⊥ is presentation-independent (internal completeness).",
  description: "Domain: { left: <playing/design>[], right: <playing/design>[], universe?: <playing/design>[] }. Codomain: (playing/internal-completeness) same true/false, the common carrier or a distinguishing design.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "internal-completeness");
    const left = designsAt(record, "left", "internal-completeness");
    const right = designsAt(record, "right", "internal-completeness");
    const j = internalCompletenessJudgment(left, right, universeOf(record, [...left, ...right]));
    if (j.kind === "game.internal-completeness:witness") {
      return jsonResource({ kind: "playing.internal-completeness", same: true, carrier: j.carrier.map((d) => encodeDesign(d)) } as JsonValue, "playing internal completeness");
    }
    return jsonResource({ kind: "playing.internal-completeness", same: false, differing: encodeDesign(j.differing), reason: j.reason } as JsonValue, "playing internal completeness");
  },
});

/** locativity — is orthogonality invariant under delocating BOTH designs by a prefix? */
export const locativityAction: Action = action({
  verb: "locativity",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designA: ref(CARRIER.design), designB: ref(CARRIER.design), prefix: arr }, ["designA", "designB", "prefix"]),
  codomain: locativityCarrier,
  summary: "Delocation-invariance: D⊥E ⟺ ξ·D ⊥ ξ·E — designs/behaviours are placeable anywhere.",
  description: "Domain: { designA, designB, prefix: <locus address int[]> }. Codomain: (playing/locativity) whether orthogonality is invariant under relocating both designs by the prefix.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "locativity");
    const j = delocationInvarianceJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]), decodeLocus(record["prefix"]));
    return jsonResource({ kind: "playing.locativity", invariant: isWitness(j), prefix: encodeLocus(decodeLocus(record["prefix"])) } as JsonValue, "playing locativity");
  },
});

/** chronicle-convergence — the step-by-step dispute, converging at the first Daimon. */
export const chronicleConvergenceAction: Action = action({
  verb: "chronicle-convergence",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designA: ref(CARRIER.design), designB: ref(CARRIER.design) }, ["designA", "designB"]),
  codomain: chronicleConvergenceCarrier,
  summary: "The chronicle-level convergence: the step-by-step dispute, converging at the first Daimon collision.",
  description: "Domain: { designA, designB }. Codomain: (playing/chronicle-convergence) converges, the trace length, the divergence reason if stuck.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "chronicle-convergence");
    const j = chronicleConvergenceJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (j.kind === "game.chronicle-convergence:witness") {
      return jsonResource({ kind: "playing.chronicle-convergence", converges: true, steps: j.trace.length } as JsonValue, "playing chronicle convergence");
    }
    return jsonResource({ kind: "playing.chronicle-convergence", converges: false, steps: j.trace.length, reason: j.reason } as JsonValue, "playing chronicle convergence");
  },
});

/** design-leq — the apex knowledge order ≤_k on designs (the order incarnation minimizes). */
export const designLeqAction: Action = action({
  verb: "design-leq",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designA: ref(CARRIER.design), designB: ref(CARRIER.design) }, ["designA", "designB"]),
  codomain: designLeqCarrier,
  summary: "The knowledge order ≤_k on designs: is design A knowledge-below design B (pointwise on the charge)?",
  description: "Domain: { designA, designB }. Codomain: (playing/design-leq) leq true/false, with the reason when not.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "design-leq");
    const j = designLeqJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (j.kind === "game.design.leq:witness") {
      return jsonResource({ kind: "playing.design-leq", leq: true } as JsonValue, "playing design leq");
    }
    return jsonResource({ kind: "playing.design-leq", leq: false, reason: j.reason } as JsonValue, "playing design leq");
  },
});

// ── the locative primitives: the action of the free monoid of loci on designs ──

/** delocate — relocate a design under a prefix locus ξ (every committed locus ζ ↦ ξ·ζ). */
export const delocateAction: Action = action({
  verb: "delocate",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ design: ref(CARRIER.design), prefix: arr }, ["design", "prefix"]),
  codomain: designCarrier,
  summary: "Relocate a design under a prefix locus ξ — the locative primitive (delocation composes; root is identity).",
  description: "Domain: { design: <playing/design>, prefix: <locus address int[]> }. Codomain: the relocated design (playing/design).",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "delocate");
    return jsonResource(encodeDesign(delocate(decodeDesign(record["design"]), decodeLocus(record["prefix"]))) as JsonValue, "playing design delocated");
  },
});

/** superpose — merge several designs, knowledge-joining any shared locus (disjoint = plain union). */
export const superposeAction: Action = action({
  verb: "superpose",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: obj({ designs: arr }, ["designs"]),
  codomain: designCarrier,
  summary: "Superpose several designs into one — the ⊔_k union of commitments (disjoint delocations never collide).",
  description: "Domain: { designs: <playing/design>[] }. Codomain: the superposed design (playing/design) — how the exponentials combine disjoint-delocated copies.",
  run: (input: unknown): JsonValue => {
    const designs = designsAt(asRecord(input, "superpose"), "designs", "superpose");
    return jsonResource(encodeDesign(superpose(designs)) as JsonValue, "playing design superposed");
  },
});

/** The topology-roundout + locative actions — aggregated into the package surface by actions.mts. */
export const topologyExtraActions: readonly Action[] = Object.freeze([
  chroniclesAction,
  viewAction,
  innocentAction,
  coherentAction,
  internalCompletenessAction,
  locativityAction,
  chronicleConvergenceAction,
  designLeqAction,
  delocateAction,
  superposeAction,
]);
