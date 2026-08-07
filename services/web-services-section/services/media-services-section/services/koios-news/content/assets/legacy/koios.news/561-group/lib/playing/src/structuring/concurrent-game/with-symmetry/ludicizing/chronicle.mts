/**
 * Chronicles — Girard 2001 §4.7 plays-along-one-branch of a design.
 *
 * The chronicle note (corpus, ludics/chronicle, "Definition (Girard 2001
 * §4.7)") defines a **chronicle** of a design as a maximal alternating,
 * justified sequence of actions along one unit-step strict $\preceq$-chain of
 * loci — one *branch* of the design's play, equivalently one focused path, and
 * (Faggian–Hyland 2002) one Hyland–Ong *play*.  A design is the union of its
 * chronicles; its chronicle-tree's root-to-leaf paths ARE its chronicles.
 *
 * We read chronicles off the EXISTING valuation `Design` of `design.mjs` (no
 * new design datatype).  By the action note's uniqueness theorem ("the
 * action-realization of a design's partial valuation is unique") the actions of
 * a `Design` are determined: at each supported locus $\xi$ the variety is
 * `charge → type` and the ramification is $I = \{\,i : \xi \cdot i \in
 * \mathrm{support}\,\}$.  Justification/visibility reuse the locus `prefixes`
 * order; the `Design` stores no base locus, so roots are the $\sqsubseteq$-
 * minimal support loci.
 *
 * The validity judgment realizes the four chronicle conditions (Ch1)–(Ch4):
 * unit-step child chain, polarity alternation, ramification respect, and
 * maximality (end at a Daimon or at an empty ramification).
 */
import {
  type Action,
  type ActionVariety,
  actionPolarity,
  chargeAction,
  daimonAction,
  negativeAction,
  parityRespectJudgment,
  positiveAction,
} from "./action.mjs";
import { polarityName } from "../../../polarity.mjs";
import {
  type Locus,
  child,
  locusKey,
  prefixes,
  sameLocus,
} from "./locus.mjs";
import { type Design, designCharge, designFromActs, support } from "./design.mjs";

/** A chronicle — an ordered sequence of actions along one $\preceq$-chain. */
export interface Chronicle {
  readonly kind: "game.chronicle";
  readonly actions: readonly Action[];
}

export function chronicle(actions: readonly Action[] = []): Chronicle {
  return Object.freeze({
    kind: "game.chronicle" as const,
    actions: Object.freeze([...actions]),
  });
}

export function isChronicle(value: unknown): value is Chronicle {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Chronicle>;
  return candidate.kind === "game.chronicle" && Array.isArray(candidate.actions);
}

/* ------------------------------------------------------------------------- *
 * Reading actions off the existing valuation `Design`.
 * ------------------------------------------------------------------------- */

const varietyConstructor = (
  variety: ActionVariety,
  xi: Locus,
  ramification: readonly number[],
): Action => {
  switch (variety) {
    case "positive":
      return positiveAction(xi, ramification);
    case "negative":
      return negativeAction(xi, ramification);
    case "daimon":
      return daimonAction(xi);
  }
};

/**
 * The action realized at a locus by a design (action note, uniqueness theorem),
 * or `null` if the locus is outside the support ($\bot$ = no action).  The
 * ramification is the set of immediate children the design also supports.
 */
export function designAction(d: Design, xi: Locus): Action | null {
  const variety = chargeAction(designCharge(d, xi));
  if (variety === null) return null;
  const ramification: number[] = [];
  // immediate children of xi that are in the support
  for (const sigma of support(d)) {
    const addr = sigma.address;
    if (addr.length === xi.address.length + 1 && prefixes(xi, sigma)) {
      const i = addr[addr.length - 1];
      if (i !== undefined) ramification.push(i);
    }
  }
  return varietyConstructor(variety, xi, ramification);
}

/**
 * The set of actions of a design — its support, read as actions (action note,
 * uniqueness theorem).  Each supported locus contributes exactly one action.
 */
export function designActions(d: Design): readonly Action[] {
  const out: Action[] = [];
  for (const xi of support(d)) {
    const a = designAction(d, xi);
    if (a !== null) out.push(a);
  }
  return Object.freeze(out);
}

/**
 * The base loci of a design — the $\sqsubseteq$-minimal support loci (the
 * `Design` carrier stores no base locus, so we derive the roots of its
 * chronicle-forest).
 */
export function designRoots(d: Design): readonly Locus[] {
  const supp = support(d);
  const roots = supp.filter(
    (xi) => !supp.some((zeta) => !sameLocus(zeta, xi) && prefixes(zeta, xi)),
  );
  return Object.freeze(roots);
}

/**
 * The chronicles of a design (chronicle note, "Lemma. The chronicle-tree of
 * $\mathfrak{D}$ has its set of root-to-leaf paths in bijection with
 * $\mathrm{Chr}(\mathfrak{D})$").  Walks each root-to-leaf path of the
 * design's chronicle-forest, following the ramification opened at each step.
 */
export function designChronicles(d: Design): readonly Chronicle[] {
  const out: Chronicle[] = [];

  const walk = (xi: Locus, prefix: readonly Action[]): void => {
    const a = designAction(d, xi);
    if (a === null) {
      // dangling prefix that doesn't reach a supported locus: still a branch end
      if (prefix.length > 0) out.push(chronicle(prefix));
      return;
    }
    const here = [...prefix, a];
    const children = a.ramification
      .map((i) => child(xi, i))
      .filter((zeta) => designAction(d, zeta) !== null);
    if (a.variety === "daimon" || children.length === 0) {
      out.push(chronicle(here)); // (Ch4) maximality: Daimon or empty ramification
      return;
    }
    for (const zeta of children) walk(zeta, here);
  };

  for (const r of designRoots(d)) walk(r, []);
  return Object.freeze(out);
}

/* ------------------------------------------------------------------------- *
 * Chronicle validity — the four conditions (Ch1)–(Ch4).
 * ------------------------------------------------------------------------- */

export interface ChronicleWitness {
  readonly kind: "game.chronicle.valid:witness";
  readonly chronicle: Chronicle;
}

export interface ChronicleObstruction {
  readonly kind: "game.chronicle.valid-obstruction";
  readonly chronicle: Chronicle;
  readonly reason: string;
}

export type ChronicleJudgment = ChronicleWitness | ChronicleObstruction;

const isImmediateChild = (xi: Locus, zeta: Locus): boolean =>
  zeta.address.length === xi.address.length + 1 && prefixes(xi, zeta);

/**
 * Witness/obstruction for chronicle validity (chronicle note, "Definition
 * (Girard 2001 §4.7)"):
 *   (Ch1) unit-step strict $\preceq$-chain (each next locus an immediate child);
 *   (Ch2) polarity strictly alternates;
 *   (Ch3) ramification respect — next index lies in the previous ramification;
 *   (Ch4) maximality — ends at a Daimon or at an empty ramification (a leaf).
 * Linearity is automatic: a chronicle visits each locus once along its chain.
 */
export function chronicleJudgment(c: Chronicle): ChronicleJudgment {
  const acts = c.actions;
  const ok = (): ChronicleWitness =>
    Object.freeze({ kind: "game.chronicle.valid:witness" as const, chronicle: c });
  const bad = (reason: string): ChronicleObstruction =>
    Object.freeze({ kind: "game.chronicle.valid-obstruction" as const, chronicle: c, reason });

  if (acts.length === 0) return ok(); // the empty chronicle is vacuously valid

  for (let k = 0; k + 1 < acts.length; k++) {
    const a = acts[k]!;
    const b = acts[k + 1]!;
    // (Ch4 mid-chain): a non-terminal Daimon would end the play
    if (a.variety === "daimon") {
      return bad(`Daimon at position ${k} is not maximal (the chronicle continues past give-up)`);
    }
    // (Ch1) unit-step child chain
    if (!isImmediateChild(a.locus, b.locus)) {
      return bad(`step ${k}→${k + 1}: ${locusKey(b.locus)} is not an immediate child of ${locusKey(a.locus)}`);
    }
    // (Ch3) ramification respect: the descended index lies in a's ramification
    const i = b.locus.address[b.locus.address.length - 1];
    if (i === undefined || !a.ramification.includes(i)) {
      return bad(`step ${k}→${k + 1}: index ${String(i)} not in ramification ${JSON.stringify(a.ramification)} of action at ${locusKey(a.locus)}`);
    }
    // (Ch2) polarity strictly alternates
    if (polarityName(actionPolarity(a)) === polarityName(actionPolarity(b))) {
      return bad(`step ${k}→${k + 1}: polarity does not alternate (both ${polarityName(actionPolarity(a))})`);
    }
  }

  // (Ch4) maximality of the last action: Daimon or empty ramification (leaf)
  const last = acts[acts.length - 1]!;
  if (last.variety !== "daimon" && last.ramification.length !== 0) {
    return bad(`final action at ${locusKey(last.locus)} is non-maximal: it is neither the Daimon nor a leaf (ramification ${JSON.stringify(last.ramification)})`);
  }

  return ok();
}

export const isValidChronicle = (c: Chronicle): boolean =>
  chronicleJudgment(c).kind === "game.chronicle.valid:witness";

/* ------------------------------------------------------------------------- *
 * Design-from-action-set (optional; returns the EXISTING valuation `Design`).
 * ------------------------------------------------------------------------- */

/**
 * Assemble a `Design` from a set of actions (chronicle note, "a design is the
 * union of its chronicles"; design note, the backward map of the realization
 * bijection).  This RETURNS the existing valuation `Design` — it does not
 * introduce a new carrier; the action variety at each locus becomes that
 * locus's `DesignAct` charge.  Distinct named to avoid shadowing the existing
 * `designFromActs`.
 */
export function designFromActionSet(actions: readonly Action[]): Design {
  const acts = new Map<string, ReturnType<typeof actionToDesignAct>>();
  for (const a of actions) acts.set(locusKey(a.locus), actionToDesignAct(a));
  return designFromActs(acts);
}

const actionToDesignAct = (a: Action): "proponent" | "opponent" | "daimon" =>
  a.variety === "positive" ? "proponent" : a.variety === "negative" ? "opponent" : "daimon";

/** Round-trip helper: rebuild a `Design` from a single chronicle's actions. */
export const designFromChronicle = (c: Chronicle): Design => designFromActionSet(c.actions);

/* ------------------------------------------------------------------------- *
 * Design coherence — the four conditions (C1)–(C4) of the design note.
 * ------------------------------------------------------------------------- */

export interface DesignCoherenceWitness {
  readonly kind: "game.design.coherence:witness";
  readonly design: Design;
}

export interface DesignCoherenceObstruction {
  readonly kind: "game.design.coherence-obstruction";
  readonly design: Design;
  /** Which of the four conditions failed: alternation / linearity / focusing / rootedness. */
  readonly condition: "alternation" | "linearity" | "focusing" | "rootedness";
  readonly reason: string;
}

export type DesignCoherenceJudgment = DesignCoherenceWitness | DesignCoherenceObstruction;

/**
 * Witness/obstruction for the four Girard design coherence conditions
 * (design note, "Definition (Girard 2001 §4.3)", (C1)–(C4)):
 *
 *   (C1) **Alternation** — actions strictly alternate polarity along each
 *        $\preceq$-chain; equivalently each action's polarity respects its
 *        locus parity (a Belnap-class chain $t \to f \to t \to \cdots$).
 *   (C2) **Linearity** — each locus carries at most one action (automatic for
 *        the valuation `Design`, since `designCharge` is a function — checked
 *        here for completeness).
 *   (C3) **Focusing** — once a positive action opens children at $\xi^+$, those
 *        children carry actions; a positive action's ramification is realized
 *        (no opened-but-empty child branches that strand the focus).
 *   (C4) **Rootedness** — the design's $\sqsubseteq$-minimal support locus
 *        carries an action (the support is non-empty and has a unique root, or
 *        every root is itself a committed action).
 *
 * Because `designChronicles` builds root-to-leaf paths from a coherent design,
 * the invariant "every chronicle of a coherent design is valid" is self-
 * policing: feed a `coherence:witness` design and every `designChronicles`
 * output passes `chronicleJudgment`.
 */
export function designCoherenceJudgment(d: Design): DesignCoherenceJudgment {
  const supp = support(d);
  const witness = (): DesignCoherenceWitness =>
    Object.freeze({ kind: "game.design.coherence:witness" as const, design: d });
  const obstruct = (
    condition: DesignCoherenceObstruction["condition"],
    reason: string,
  ): DesignCoherenceObstruction =>
    Object.freeze({ kind: "game.design.coherence-obstruction" as const, design: d, condition, reason });

  // (C4) rootedness — the design must commit somewhere, with a committed root.
  if (supp.length === 0) {
    return obstruct("rootedness", "the empty design commits at no locus (no rooted action and no Daimon)");
  }
  const roots = designRoots(d);
  for (const r of roots) {
    if (designAction(d, r) === null) {
      return obstruct("rootedness", `root locus ${locusKey(r)} carries no action`);
    }
  }

  for (const xi of supp) {
    const a = designAction(d, xi);
    if (a === null) continue; // (C2) impossible: support is exactly the non-⊥ region
    // (C1) alternation: each action's polarity respects its locus parity.
    const parity = parityRespectJudgment(a);
    if (parity.kind === "game.action.parityRespect-obstruction") {
      return obstruct("alternation", parity.reason);
    }
    // (C3) focusing: a positive action's opened children must carry actions.
    if (a.variety === "positive") {
      for (const i of a.ramification) {
        const kid = child(xi, i);
        if (designAction(d, kid) === null) {
          return obstruct("focusing", `positive action at ${locusKey(xi)} opens child ${locusKey(kid)} but the design commits nothing there`);
        }
      }
    }
  }

  return witness();
}

export const isCoherentDesign = (d: Design): boolean =>
  designCoherenceJudgment(d).kind === "game.design.coherence:witness";
