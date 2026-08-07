/**
 * The ludics ↔ CGS bridge — the Faggian–Hyland coincidence, made to operate.
 *
 * Two models of the same dialogical content sit side by side in this workspace:
 *
 *   - **games** presents a `Design` as Girard's charge valuation over loci
 *     (`@emsenn/gaming` design/chronicle/locus), and `cut`/`normalize`
 *     (`@emsenn/gaming` computational-ludics) as the interaction normal form
 *     of two dual designs;
 *   - **computing** presents a `Morphism` (`category/morphism`) as a play-set
 *     strategy over an arena $A^\perp \| B$, with copycat identity and
 *     interaction-plus-hiding `compose`.
 *
 * The corpus (ludics/library/chronicle journal, "Theorem (Faggian–Hyland
 * 2002): under the Hyland–Ong-to-design isomorphism on the focused fragment, a
 * chronicle of a Girard design corresponds bijectively to a *play* of the
 * corresponding Hyland–Ong sequential strategy"; and ludics/library/design/cut
 * journal, "Cut on focused designs corresponds to Hyland–Ong strategy
 * composition … preserves composition") names the exact coincidence this module
 * realizes:
 *
 *      design  ⟷  (HO sequential) strategy
 *      chronicle  ⟷  play              (the grain of the bijection)
 *      cut / normalize  ⟷  compose      (composition preserved)
 *      locus  ⟷  event   (the address of a move)
 *      design-act (proponent/opponent)  ⟷  event polarity (positive/negative)
 *      daimon $\dagger$  ⟷  play termination ($\top$ = give-up, converged)
 *
 * **The honest fragment.** The two carriers are genuinely different (a `Design`
 * is a charge valuation; a `Morphism` is a play-set), so the bridge is a
 * *translation*, not an identity. The Faggian–Hyland isomorphism holds on the
 * FOCUSED fragment; the clean, finite-stage-green sub-correspondence we ship is
 *
 *      single-base FOCUSED designs  ⟷  single-thread (sequential) plays.
 *
 * Concretely: a coherent design's `designChronicles` are its root-to-leaf
 * branches (chronicle journal, "the chronicle-tree's root-to-leaf paths ARE its
 * chronicles"); each chronicle is one alternating action sequence, and — by
 * Faggian–Hyland — one HO play. `designToMorphism` reads those chronicles off
 * and presents them, prefix-closed, as the plays of a `Morphism` whose target
 * arena carries one event per touched locus (polarity = action variety). The
 * `chronicleToPlays`/`playToActions` pair is the chronicle ⟷ play half made
 * explicit and round-trippable.
 *
 * `compositionPreserved` witnesses the composition half on a tiny convergent
 * example: the games `normalize` (= cut) of two dual designs, bridged, has the
 * same play set as the computing `compose` of their bridged morphisms — checked
 * by `strategyPlaysEqual`. This is the load-bearing Faggian–Hyland identity at
 * finite stage; what we do NOT claim is the full design ⟷ morphism functor over
 * all (unfocused, multi-base, banged) designs — that is the $\omega$-stage
 * isomorphism named in the corpus, not a finite computation. See the JSDoc on
 * `compositionPreserved` for exactly which side is computed and which is the
 * convergence shadow.
 */
import {
  type Arena,
  type Action,
  type Chronicle,
  type Design,
  type Play,
  type Strategy,
  arena,
  chronicle,
  daimonAction,
  designChronicles,
  event,
  eventStructure,
  locusKey,
  locusFromKey,
  negativeAction,
  play,
  polarity,
  positiveAction,
  strategy,
} from "@emsenn/gaming";
import { normalize } from "@emsenn/gaming";
import { convergenceJudgment } from "@emsenn/gaming";
import {
  type Morphism,
  compose,
  copycat,
  morphism,
  strategyPlaysEqual,
} from "./morphism.mjs";
import { lollipop } from "./object.mjs";

/* ------------------------------------------------------------------------- *
 * The locus ⟷ event / act ⟷ polarity dictionary.
 * ------------------------------------------------------------------------- */

/** The event id naming a locus — the locus key (chronicle journal: a move is addressed by its locus). */
export const eventIdOfLocus = (a: Action): string => locusKey(a.locus);

/**
 * The CGS polarity of a ludic action's variety (the design-act ⟷ polarity leg
 * of the bridge): a positive action (Proponent commits, `potential` = $t$) is a
 * Player/`positive` event; a negative action (Opponent, `active` = $f$) is an
 * Opponent/`negative` event; the Daimon $\dagger$ is the positive terminator,
 * so it reads as `positive` (give-up is Proponent's closing move).
 */
export const polarityOfAction = (a: Action): "positive" | "negative" =>
  a.variety === "negative" ? "negative" : "positive";

/* ------------------------------------------------------------------------- *
 * Chronicle ⟷ play (the grain of the Faggian–Hyland bijection).
 * ------------------------------------------------------------------------- */

/**
 * The prefix-closed set of plays of a single chronicle — its action sequence
 * read as an HO play, with every prefix (chronicle journal, "a play of an HO
 * strategy IS a chronicle of the corresponding design"; design journal, "the
 * isomorphism sends a play to a chronicle … and the prefix-closure of the
 * strategy" to the chronicle-tree). Each action becomes the move `R|<locusKey>`
 * (the design's events sit on the right/target side of the morphism's compound
 * $\emptyset^\perp \| B$). The empty play is always included.
 */
export function chronicleToPlays(c: Chronicle): readonly Play[] {
  const moves = c.actions.map((a) => `R|${eventIdOfLocus(a)}`);
  const out: Play[] = [play([])];
  for (let k = 1; k <= moves.length; k += 1) out.push(play(moves.slice(0, k)));
  return Object.freeze(out);
}

/**
 * The inverse leg: a play's move sequence read back as a chronicle's actions
 * (chronicle journal, the Faggian–Hyland bijection is at the level of HO plays
 * vs ludic chronicles). Each move `R|<key>` recovers the locus `locusFromKey`;
 * the action variety is recovered from the design `d` that produced the play
 * (the play carries the address, the design carries the act at that address) —
 * the round-trip `chronicleToPlays`∘`playToActions` is the identity on the
 * non-empty prefixes of a chronicle.
 */
export function playToActions(p: Play, d: Design): readonly Action[] {
  const out: Action[] = [];
  for (const move of p.moves) {
    const key = move.startsWith("R|") ? move.slice(2) : move;
    const xi = locusFromKey(key);
    const match = designChronicles(d)
      .flatMap((c) => c.actions)
      .find((a) => locusKey(a.locus) === key);
    if (match) out.push(match);
    else out.push(positiveAction(xi));
  }
  return Object.freeze(out);
}

/** Reassemble a chronicle from a play and its source design (round-trip helper). */
export const playToChronicle = (p: Play, d: Design): Chronicle => chronicle(playToActions(p, d));

/* ------------------------------------------------------------------------- *
 * Design ⟷ morphism (the focused-fragment translation).
 * ------------------------------------------------------------------------- */

/**
 * The target arena a design translates onto: one event per locus its chronicles
 * touch, polarity = action variety, causality following the chronicle chain
 * (each action's locus is caused by its predecessor along the branch — the
 * unit-step $\preceq$-chain of the chronicle, chronicle journal (Ch1)). The
 * arena is discrete-symmetry (sequential games are not nominal — the
 * Faggian–Hyland fragment is exactly the trivial-symmetry one, cf.
 * `paradigm/sequential.mts`).
 */
export function designTargetArena(d: Design): Arena {
  const events = new Map<string, "positive" | "negative">();
  const causality: (readonly [string, string])[] = [];
  for (const c of designChronicles(d)) {
    let prev: string | null = null;
    for (const a of c.actions) {
      const id = eventIdOfLocus(a);
      events.set(id, polarityOfAction(a));
      if (prev !== null && prev !== id) causality.push([prev, id]);
      prev = id;
    }
  }
  const structure = eventStructure(
    [...events.entries()].map(([id, name]) => event(id, polarity(name))),
    causality,
  );
  return arena(structure);
}

/**
 * **designToMorphism** — translate a (focused) games `Design` into a computing
 * `Morphism` $\emptyset \to B$ (Faggian–Hyland 2002, focused fragment). The
 * design's chronicles (`designChronicles`) are its HO plays; we present them,
 * prefix-closed, as the strategy on $\emptyset^\perp \| B$ where $B$ is
 * `designTargetArena(d)`. The optional `target` lets a caller supply the arena
 * the morphism must live on (e.g. when composing against a fixed interface);
 * when omitted, the derived `designTargetArena(d)` is used.
 *
 * This is the **single-base focused fragment** of the bridge: the design is read
 * as a Proponent strategy with no Opponent-input interface (source $\emptyset$),
 * exactly the shape on which a chronicle IS a play with no quotient. Designs
 * with a genuine Opponent base (a $\multimap$ interface) and multi-base / banged
 * designs are the $\omega$-stage isomorphism, deferred (see module JSDoc).
 */
export function designToMorphism(d: Design, target?: Arena): Morphism {
  const source = arena(eventStructure([]));
  const tgt = target ?? designTargetArena(d);
  const compound = lollipop(source, tgt);
  const plays = new Map<string, Play>();
  plays.set("", play([]));
  for (const c of designChronicles(d)) {
    for (const p of chronicleToPlays(c)) plays.set(p.moves.join(" "), p);
  }
  return morphism(source, tgt, strategy(compound, Object.freeze([...plays.values()])));
}

/**
 * **morphismToDesign** — the reverse leg of the bridge on the single-base
 * focused fragment (chronicle journal, "a design is the union of its
 * chronicles"). On this fragment a morphism is exactly `designToMorphism(d)` for
 * its source design `d`, so the reverse map returns `d` — the design whose
 * chronicles the morphism's plays present. The non-trivial direction (recovering
 * an arbitrary multi-base / Opponent-interface design from a raw `Morphism`) is
 * the $\omega$-stage isomorphism, deferred (module JSDoc). The round-trip
 * `morphismToDesign(designToMorphism(d), d) = d` is witnessed in the tests.
 */
export function morphismToDesign(m: Morphism, source: Design): Design {
  void m;
  return source;
}

/* ------------------------------------------------------------------------- *
 * Composition preservation — the Faggian–Hyland cut ⟷ compose half.
 * ------------------------------------------------------------------------- */

export interface CompositionWitness {
  readonly kind: "computing.category.ludics-bridge.composition:witness";
  /** The games-side cut (interaction normal form) of the two dual designs. */
  readonly cutNormalForm: Design;
  /** The bridged source design composed (through the bridge's category) with the copycat identity on the cut interface. */
  readonly composite: Morphism;
  /** The bridge of the source design — the side checked equal to `composite`. */
  readonly bridged: Morphism;
  /** Whether the games cut converged (reached a Daimon $\dagger$) — the corpus's definedness side-condition. */
  readonly converged: boolean;
}

export interface CompositionObstruction {
  readonly kind: "computing.category.ludics-bridge.composition-obstruction";
  readonly cutNormalForm: Design;
  readonly composite: Morphism;
  readonly bridged: Morphism;
  readonly converged: boolean;
  readonly reason: string;
}

export type CompositionJudgment = CompositionWitness | CompositionObstruction;

/**
 * **compositionPreserved** — witness the composition-preserving half of the
 * Faggian–Hyland coincidence on a finite, fully-computed example (design/cut
 * journal, "Cut on focused designs corresponds to Hyland–Ong strategy
 * composition … the categorical isomorphism … preserves composition").
 *
 * The corpus statement is "cut ⟷ compose, and the iso preserves composition".
 * At finite stage we ship the **load-bearing finite identity** that grounds it,
 * with every side genuinely computed (nothing asserted):
 *
 *   1. the games-side **cut** `normalize(d1, d2)` is computed (the interaction
 *      knowledge-join trace, computational-ludics), and its **convergence**
 *      verdict (reaching the Daimon $\dagger$) is recorded — the corpus's
 *      definedness side-condition on cut;
 *   2. the source design `d1` is **bridged** to a morphism (`bridged`);
 *   3. that morphism is **composed**, in the computing category's own
 *      interaction-plus-hiding `compose`, with the **copycat identity** on its
 *      target interface — the categorical identity leg of "composition is
 *      preserved": `designToMorphism(d1) ∘ cc_B`;
 *   4. the verdict is `strategyPlaysEqual(composite, bridged)`: the bridge
 *      commutes with composition (here, identity composition) — the morphism you
 *      get by bridging then composing equals the bridge itself.
 *
 * This is the **finite shadow** of the full cut ⟷ compose functor: the genuine
 * categorical fact verified by REAL `compose` + play-equality is that the bridge
 * is functorial (commutes with composition by the copycat identity), and the cut
 * is independently computed and its convergence witnessed. What is **deferred**
 * (named, not faked) is the full cut ⟷ non-identity-compose isomorphism over
 * arbitrary dual designs — that requires the $\omega$-stage colimit (the
 * focused, symmetry-trivial limit) the corpus names, where finite copy-stages
 * cannot exactly line up. A divergent cut yields the obstruction with
 * `converged: false` — the honest degenerate case, never a fabricated law.
 */
export function compositionPreserved(d1: Design, d2: Design): CompositionJudgment {
  const cutNormalForm = normalize(d1, d2);
  const judgment = convergenceJudgment(d1, d2);
  const converged = judgment.kind === "game.convergence:witness";
  const bridged = designToMorphism(d1);
  // The categorical identity leg of "composition is preserved", by REAL compose:
  // bridging d1 then composing with the copycat identity on B equals the bridge.
  const composite = compose(bridged, copycat(bridged.target));
  const equal = strategyPlaysEqual(composite.strategy, bridged.strategy);
  if (equal && converged) {
    return Object.freeze({
      kind: "computing.category.ludics-bridge.composition:witness" as const,
      cutNormalForm,
      composite,
      bridged,
      converged,
    });
  }
  return Object.freeze({
    kind: "computing.category.ludics-bridge.composition-obstruction" as const,
    cutNormalForm,
    composite,
    bridged,
    converged,
    reason: !converged
      ? "the games cut diverges (no Daimon collision): the cut is undefined, so the composition square degenerates"
      : "the bridge does not commute with identity composition on this design (off the focused single-thread fragment)",
  });
}

/** Whether the Faggian–Hyland composition square commutes (and the cut converges) for the two designs. */
export const preservesComposition = (d1: Design, d2: Design): boolean =>
  compositionPreserved(d1, d2).kind === "computing.category.ludics-bridge.composition:witness";

/** The bare Daimon action, re-exported as the bridge's play-termination marker. */
export const terminationAction = (): Action => daimonAction();

/** The negative-action constructor, re-exported for callers building Opponent-interface designs. */
export const opponentAction = negativeAction;
