/**
 * The Dialectica object $(U, X, \alpha)$ and its $*$-autonomous structure.
 *
 * Corpus (dialectica-category journal, Hyland 2002 "Proof Theory in the
 * Abstract"; de Paiva 1989/1991 "The Dialectica Categories"; descending from
 * Gödel 1958's Dialectica interpretation): an object of $\mathbf{Dial}(\mathbf{Eff})$
 * is a triple $(U, X, \alpha)$ where $U$ is the *witness type* (Player's moves),
 * $X$ is the *challenge type* (Opponent's moves), and
 * $\alpha : U \times X \to \Omega_{\mathbf{Eff}}$ is a computable *acceptance
 * relation*. The interaction is CONCURRENT: P commits a witness $u$ and O commits
 * a challenge $x$ simultaneously, with no causal order, and $\alpha(u, x)$ scores
 * the joint play.
 *
 * We realize the acceptance $\alpha$ valued in the apex bilattice: the
 * effective-topos journal shows the subobject classifier $\Omega_{\mathbf{Eff}}$
 * maps, via the double-negation nucleus $\rho(P) = (\neg\neg P, \neg\neg\neg P)$,
 * onto the four Belnap values $\mathrm{FOUR}$ — which ARE meme-algebra's
 * `ChargeValue`. So $\alpha$ is a `(witness, challenge) ⇒ ChargeValue` scoring,
 * not a fresh datatype.
 *
 * The $*$-autonomous structure (dialectica-category journal, "$*$-autonomous
 * structure"):
 *   - *Dual* $(U, X, \alpha)^\perp = (X, U, \alpha^{\mathrm{op}})$ — SWAP witness
 *     and challenge, transpose acceptance. Strict involution on the nose. The
 *     witness/challenge swap IS the Player/Opponent swap, so the arena image's
 *     polarities are the game-algebra `dual` of the original (witnessed below and
 *     in `embeddings.mts`).
 *   - *Tensor* $(U, X, \alpha) \otimes (V, Y, \beta) = (U \times V, X^V \times Y^U,
 *     \gamma)$ — the witness product and the function-space challenge product.
 *     Under the functor $F$ this maps to PARALLEL composition $F A \| F B$ (the
 *     $\mathbf{CGS}$ tensor); we expose the parallel-tensor carrier and the
 *     witness/challenge data here.
 *   - *Unit* $I = (1, 1, \top)$ — terminal witness and challenge, always-accepted.
 *
 * The object→arena map `dialecticaObjectToArena` is the object component of the
 * $*$-autonomous functor $F : \mathbf{Dial}(\mathbf{Eff}) \to \mathbf{CGS}$
 * (dialectica-to-concurrent-game-category-functor journal): $U$ becomes P-events,
 * $X$ becomes O-events, trivial causality, all-pairs intra-polarity conflict, no
 * cross conflict, trivial symmetry (`discreteArena`). It reuses game-algebra
 * `event`/`eventStructure`/`discreteArena` verbatim — no new arena machinery.
 */
import { type ChargeValue, chargeValue } from "@emsenn/relating";
import {
  type Arena,
  type Event,
  type EventPair,
  type Polarity,
  discreteArena,
  dual,
  event,
  eventStructure,
  negative,
  positive,
} from "../../index.mjs";

/**
 * A Dialectica object $(U, X, \alpha)$. `witnesses` is the witness type $U$
 * (Player's move names), `challenges` is the challenge type $X$ (Opponent's move
 * names), and `accept` is the acceptance relation $\alpha$ as a total scoring of
 * each (witness, challenge) pair into the apex `ChargeValue` (the $\mathrm{FOUR}$
 * image of $\Omega_{\mathbf{Eff}}$). Frozen, pure, no I/O.
 */
export interface DialecticaObject {
  readonly kind: "game.logic.dialectica.object";
  readonly witnesses: readonly string[];
  readonly challenges: readonly string[];
  /** The acceptance relation $\alpha(u, x)$ valued in the four-valued bilattice. */
  readonly accept: (witness: string, challenge: string) => ChargeValue;
}

const freezeNames = (names: readonly string[]): readonly string[] => Object.freeze([...names]);

/**
 * Build a Dialectica object. `accept` defaults to the always-true acceptance
 * $\top$ = `stable` (the unit's acceptance), matching $I = (1, 1, \top)$ when used
 * with singleton types.
 */
export function dialecticaObject(
  witnesses: readonly string[],
  challenges: readonly string[],
  accept: (witness: string, challenge: string) => ChargeValue = () => chargeValue("potential"),
): DialecticaObject {
  return Object.freeze({
    kind: "game.logic.dialectica.object" as const,
    witnesses: freezeNames(witnesses),
    challenges: freezeNames(challenges),
    accept,
  });
}

/**
 * The Dialectica unit $I = (1, 1, \top)$ — one witness, one challenge, always
 * accepted. The "$\top$" here is the Heyting top of $\Omega_{\mathbf{Eff}}$ (the
 * always-true acceptance); under the double-negation image $\rho(P) = (\neg\neg P,
 * \neg\neg\neg P)$ a decidably-true proposition lands at $t = (1, 0)$ =
 * `potential` — NOT the bilattice $\top = (1, 1)$ = `stable`, which never occurs
 * in the $\rho$-image (effective-topos journal: a realizer for both $P$ and
 * $\neg P$ would realize $\bot$). So always-true acceptance is `potential`. The
 * unit's dual is itself ($\bot = I^\perp = I$): self-dual at the unit
 * (dialectica-category journal, "The unit and dualizing object").
 */
export const dialecticaUnit = (): DialecticaObject =>
  dialecticaObject(["*"], ["*"], () => chargeValue("potential"));

/**
 * The Dialectica dual $(U, X, \alpha)^\perp = (X, U, \alpha^{\mathrm{op}})$: swap
 * witness and challenge types, transpose the acceptance ($\alpha^{\mathrm{op}}(x,
 * u) = \alpha(u, x)$). A strict involution — `dualDialectica(dualDialectica(o))`
 * has the same witness/challenge types and the same acceptance on every pair.
 */
export function dualDialectica(object: DialecticaObject): DialecticaObject {
  return dialecticaObject(
    object.challenges,
    object.witnesses,
    (witness, challenge) => object.accept(challenge, witness),
  );
}

/**
 * The Dialectica tensor on witness/challenge DATA, presented in the
 * disjoint-union form that the functor $F$ sends to parallel composition: the
 * witness type is $U \sqcup V$ and the challenge type is $X \sqcup Y$, with the
 * joint acceptance the truth-meet of the two factors' acceptances on the matched
 * coordinates (corpus tensor acceptance $\gamma((u,v),(g,h)) = \alpha(u, g(v))
 * \wedge \beta(v, h(u))$ collapses, under $F$'s constant-challenge reduction, to
 * $\alpha(u, x) \wedge \beta(v, y)$). Names are namespaced `l:`/`r:` so the two
 * factors never collide.
 */
export function tensorDialectica(left: DialecticaObject, right: DialecticaObject): DialecticaObject {
  const witnesses = [
    ...left.witnesses.map((w) => `l:${w}`),
    ...right.witnesses.map((w) => `r:${w}`),
  ];
  const challenges = [
    ...left.challenges.map((x) => `l:${x}`),
    ...right.challenges.map((x) => `r:${x}`),
  ];
  const accept = (witness: string, challenge: string): ChargeValue => {
    // a complete play of the parallel tensor has one witness and one challenge per
    // side; acceptance is the truth-meet of the side that the pair lands in.
    if (witness.startsWith("l:") && challenge.startsWith("l:")) {
      return left.accept(witness.slice(2), challenge.slice(2));
    }
    if (witness.startsWith("r:") && challenge.startsWith("r:")) {
      return right.accept(witness.slice(2), challenge.slice(2));
    }
    // cross-side pairs are not a play of either factor: undefined region = absurd.
    return chargeValue("absurd");
  };
  return dialecticaObject(witnesses, challenges, accept);
}

/** The disjoint-union event id of a witness (Player) move. */
const witnessEventId = (witness: string): string => `u:${witness}`;
/** The disjoint-union event id of a challenge (Opponent) move. */
const challengeEventId = (challenge: string): string => `x:${challenge}`;

/** All-pairs (unordered, stored once) conflict edges within one polarity class. */
function intraConflict(ids: readonly string[]): readonly EventPair[] {
  const pairs: EventPair[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      pairs.push([ids[i]!, ids[j]!] as const);
    }
  }
  return Object.freeze(pairs);
}

/**
 * The object component of the $*$-autonomous functor $F : \mathbf{Dial}(\mathbf{Eff})
 * \to \mathbf{CGS}$ (dialectica-to-concurrent-game-category-functor journal,
 * "Definition on objects"):
 *
 *   $F(U, X, \alpha) = (U \sqcup X, \leq_F, \#_F, \lambda_F, \tilde F)$
 *
 * with $U$ the P-events ($\lambda_F(u) = +$ = `positive`), $X$ the O-events
 * ($\lambda_F(x) = -$ = `negative`), TRIVIAL causality (the diagonal — omitted),
 * all-pairs intra-$U$ and intra-$X$ conflict (the "exactly one move per side per
 * play" discipline), NO cross-polarity conflict (any $(u, x)$ is a valid joint
 * play), and the TRIVIAL symmetry groupoid (`discreteArena`). The acceptance
 * $\alpha$ is a winning-condition predicate on maximal configurations (corpus
 * line 178), kept on the `DialecticaObject` and NOT pushed into the bare event
 * structure. Reuses game-algebra `event`/`eventStructure`/`discreteArena`.
 */
export function dialecticaObjectToArena(object: DialecticaObject): Arena {
  const pEvents: readonly Event[] = object.witnesses.map((w) => event(witnessEventId(w), positive()));
  const oEvents: readonly Event[] = object.challenges.map((x) => event(challengeEventId(x), negative()));
  const events: readonly Event[] = Object.freeze([...pEvents, ...oEvents]);
  const conflict: readonly EventPair[] = Object.freeze([
    ...intraConflict(object.witnesses.map(witnessEventId)),
    ...intraConflict(object.challenges.map(challengeEventId)),
  ]);
  // trivial causality: the diagonal, encoded as no causality edges.
  const structure = eventStructure(events, [], conflict);
  return discreteArena(structure);
}

/**
 * The polarity the functor assigns to a witness move: Player ($+$ = `positive`).
 * Provided so callers (and the `embeddings` dual-reuse witness) can read off
 * witness polarity without rebuilding the arena.
 */
export const witnessPolarity = (): Polarity => positive();
/** The polarity the functor assigns to a challenge move: Opponent ($-$ = `negative`). */
export const challengePolarity = (): Polarity => negative();

export interface DialecticaDualWitness {
  readonly kind: "game.logic.dialecticaDual:witness";
  /** The original witness-move polarity (Player). */
  readonly witnessPolarity: Polarity;
  /** The dual object's image-polarity at the SAME move (now Opponent): `dual(witnessPolarity)`. */
  readonly dualPolarity: Polarity;
}

/**
 * Witness that the Dialectica dual's $F$-image reuses game-algebra `dual` on
 * polarities: under $(U, X, \alpha) \mapsto (X, U, \alpha^{\mathrm{op}})$ a former
 * P-witness becomes an O-challenge, i.e. its arena polarity is `dual(positive())`
 * (corpus, "Dual preservation": $F(A^\perp) = F(A)^\perp$ on the nose — and
 * $\mathbf{CGS}$'s $(-)^\perp$ is the polarity-swap `dual`). This is a free
 * witness; it asserts the reuse, not a new computation.
 */
export function dialecticaDualReuse(): DialecticaDualWitness {
  return Object.freeze({
    kind: "game.logic.dialecticaDual:witness" as const,
    witnessPolarity: positive(),
    dualPolarity: dual(positive()),
  });
}

export function isDialecticaObject(value: unknown): value is DialecticaObject {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DialecticaObject>;
  return (
    candidate.kind === "game.logic.dialectica.object"
    && Array.isArray(candidate.witnesses)
    && Array.isArray(candidate.challenges)
    && typeof candidate.accept === "function"
  );
}
