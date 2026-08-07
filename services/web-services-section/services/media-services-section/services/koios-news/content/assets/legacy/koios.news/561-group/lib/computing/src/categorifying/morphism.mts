/**
 * The morphisms of $\mathbf{CGS}$ — strategies as 1-cells, with the copycat
 * identity and interaction-plus-hiding composition.
 *
 * Per `concurrent-game-system.md` (§ "The collection of systems is a
 * $*$-autonomous category"): a morphism $A \to B$ is an equivalence class of
 * concurrent strategies on the compound arena $A^\perp \| B$ (`:154,167`); the
 * identity is the **copycat** $\mathrm{cc}_A$ on $A^\perp \| A$ (`:155,179`),
 * which mirrors every Opponent move in one copy as the corresponding Player move
 * in the other; and composition is **parallel-composition-plus-hiding**
 * (`:156,175-177`): interact $\sigma$ and $\tau$ over the shared $B$ interface,
 * then hide the $B$-moves.
 *
 * We present a strategy as a non-empty, prefix-closed set of valid plays (the
 * `@emsenn/gaming` `Strategy` carrier) and *compute* the category structure on
 * the finite event carriers:
 *
 *   - `copycat(A)` enumerates the receptive plays of $A^\perp \| A$ in which each
 *     Player move copies its already-played Opponent partner;
 *   - `compose(σ, τ)` enumerates every interaction of a $\sigma$-play with a
 *     $\tau$-play that agrees on $B$, then hides $B$ and projects onto
 *     $A^\perp \| C$.
 *
 * The category laws are carried as witness/obstruction judgments over strategy
 * equality (`strategyPlaysEqual`): the left/right identity laws
 * $\mathrm{cc}_B \circ \sigma = \sigma = \sigma \circ \mathrm{cc}_A$ (`:179`) and
 * associativity up to canonical iso (`:177`).
 */
import {
  type Arena,
  type Play,
  type Strategy,
  eventById,
  innocenceJudgment,
  isValidPlay,
  play,
  prefixClosedJudgment,
  receptivityJudgment,
  strategy,
  symmetryInvarianceJudgment,
} from "@emsenn/gaming";
import { lollipop } from "./object.mjs";

/** A morphism $A \to B$: a strategy on the compound arena $A^\perp \| B$. */
export interface Morphism {
  readonly kind: "computing.category.morphism";
  readonly source: Arena;
  readonly target: Arena;
  readonly strategy: Strategy;
}

/** The compound arena $A^\perp \| B = A \multimap B$ a morphism $A \to B$ lives on. */
export const compoundArena = (source: Arena, target: Arena): Arena => lollipop(source, target);

/** Build a morphism from a strategy already presented on $A^\perp \| B$. */
export function morphism(source: Arena, target: Arena, s: Strategy): Morphism {
  return Object.freeze({ kind: "computing.category.morphism" as const, source, target, strategy: s });
}

const polarityName = (a: Arena, id: string): "positive" | "negative" | null =>
  eventById(a.structure, id)?.polarity.name ?? null;

const playKey = (p: Play): string => p.moves.join(" ");

/**
 * Enumerate the prefix-closed set of valid plays of an arena where Opponent
 * (negative) moves are always admitted when configuration-legal — receptivity —
 * and a Player (positive) move is admitted only when `admitPlayer(history, move)`
 * holds. Finite because the event set is finite; every prefix is produced, so
 * the set is prefix-closed by construction.
 */
export function enumeratePlays(a: Arena, admitPlayer: (history: Play, move: string) => boolean): readonly Play[] {
  const out = new Map<string, Play>();
  const empty = play([]);
  out.set(playKey(empty), empty);
  const queue: Play[] = [empty];
  while (queue.length > 0) {
    const current = queue.shift() as Play;
    const used = new Set(current.moves);
    for (const e of a.structure.events) {
      if (used.has(e.id)) continue;
      const candidate = play([...current.moves, e.id]);
      if (!isValidPlay(a, candidate)) continue;
      const pol = polarityName(a, e.id);
      const admitted = pol === "negative" || (pol === "positive" && admitPlayer(current, e.id));
      if (!admitted) continue;
      const key = playKey(candidate);
      if (out.has(key)) continue;
      out.set(key, candidate);
      queue.push(candidate);
    }
  }
  return Object.freeze([...out.values()]);
}

const LEFT = "L|";
const RIGHT = "R|";
const stripSide = (id: string): string => id.slice(2);

/**
 * The copycat (identity) morphism $\mathrm{cc}_A : A \to A$ — the strategy on
 * $A^\perp \| A$ in which every Player move copies its Opponent partner on the
 * other side. In the compound $A^\perp \| A = $ `tensor(dual A, A)`, each
 * $A$-event `id` has a left copy `L|id` (dualised polarity) and a right copy
 * `R|id`; whichever copy is Player waits for the other (Opponent) copy.
 */
export function copycat(a: Arena): Morphism {
  const compound = lollipop(a, a);
  const admitPlayer = (history: Play, move: string): boolean => {
    const partner = (move.startsWith(LEFT) ? RIGHT : LEFT) + stripSide(move);
    return history.moves.includes(partner);
  };
  return morphism(a, a, strategy(compound, enumeratePlays(compound, admitPlayer)));
}

// ── Composition: interaction over shared B, then hide B ─────────────────────

const isLeft = (id: string): boolean => id.startsWith(LEFT);
const isRight = (id: string): boolean => id.startsWith(RIGHT);

/**
 * Every hidden interaction of a $\sigma$-play (on $A^\perp \| B$) with a
 * $\tau$-play (on $B^\perp \| C$). In $\sigma$'s compound, $A$-moves are `L|…`
 * and $B$-moves are `R|…`; in $\tau$'s, $B$-moves are `L|…` and $C$-moves are
 * `R|…`. We merge the two sequences, emitting $A$- and $C$-moves freely (every
 * interleaving), synchronising matched $B$-moves (same id, in order) and hiding
 * them. A pairing that leaves unmatched $B$-moves dead-ends and yields nothing —
 * exactly the "agrees on $B$" filter. The surviving $A$/$C$ moves already carry
 * the `L|…`/`R|…` labels of the composite compound $A^\perp \| C$.
 */
function hiddenInteractions(sigmaMoves: readonly string[], tauMoves: readonly string[]): readonly (readonly string[])[] {
  const results: string[][] = [];
  const recurse = (i: number, j: number, acc: readonly string[]): void => {
    if (i === sigmaMoves.length && j === tauMoves.length) {
      results.push([...acc]);
      return;
    }
    const sm = i < sigmaMoves.length ? sigmaMoves[i] : undefined;
    const tm = j < tauMoves.length ? tauMoves[j] : undefined;
    // An A-move at σ's front (L|… in σ's compound) — emit and advance σ.
    if (sm !== undefined && isLeft(sm)) recurse(i + 1, j, [...acc, sm]);
    // A C-move at τ's front (R|… in τ's compound) — emit and advance τ.
    if (tm !== undefined && isRight(tm)) recurse(i, j + 1, [...acc, tm]);
    // Synchronised B-move: σ's R|b meets τ's L|b with the same b — hide it.
    if (sm !== undefined && tm !== undefined && isRight(sm) && isLeft(tm) && stripSide(sm) === stripSide(tm)) {
      recurse(i + 1, j + 1, acc);
    }
  };
  recurse(0, 0, []);
  return results;
}

const prefixesOf = (moves: readonly string[]): readonly Play[] =>
  moves.map((_, index) => play(moves.slice(0, index + 1)));

/**
 * Composition $\tau \circ \sigma : A \to C$ of $\sigma : A \to B$ and
 * $\tau : B \to C$ by parallel-composition-plus-hiding (`:156`). Collects every
 * hidden interaction of a $\sigma$-play with a $\tau$-play, prefix-closes the
 * projected $A^\perp \| C$ plays, and presents the result as a strategy.
 */
export function compose(sigma: Morphism, tau: Morphism): Morphism {
  const source = sigma.source;
  const middle = sigma.target;
  const target = tau.target;
  const compound = lollipop(source, target);
  const plays = new Map<string, Play>();
  const empty = play([]);
  plays.set("", empty);
  for (const sp of sigma.strategy.plays) {
    for (const tp of tau.strategy.plays) {
      for (const merged of hiddenInteractions(sp.moves, tp.moves)) {
        for (const prefix of prefixesOf(merged)) {
          if (isValidPlay(compound, prefix)) plays.set(prefix.moves.join(" "), prefix);
        }
      }
    }
  }
  // `middle` (B) is named only to document the interface being hidden.
  void middle;
  return morphism(source, target, strategy(compound, Object.freeze([...plays.values()])));
}

// ── Strategy / morphism equality and the category-law witnesses ─────────────

/** Whether two strategies admit exactly the same set of plays (as move sequences). */
export function strategyPlaysEqual(left: Strategy, right: Strategy): boolean {
  const keys = (s: Strategy): Set<string> => new Set(s.plays.map((p) => p.moves.join(" ")));
  const l = keys(left);
  const r = keys(right);
  if (l.size !== r.size) return false;
  for (const key of l) if (!r.has(key)) return false;
  return true;
}

/** Whether two morphisms have the same source, target, and play set. */
export const morphismEqual = (left: Morphism, right: Morphism): boolean =>
  strategyPlaysEqual(left.strategy, right.strategy);

export interface IdentityWitness {
  readonly kind: "computing.category.identity:witness";
  readonly morphism: Morphism;
  readonly hand: "left" | "right";
}
export interface IdentityObstruction {
  readonly kind: "computing.category.identity-obstruction";
  readonly morphism: Morphism;
  readonly hand: "left" | "right";
  readonly composite: Morphism;
}
export type IdentityJudgment = IdentityWitness | IdentityObstruction;

/**
 * Witness an identity law for $\sigma : A \to B$: `left` checks
 * $\mathrm{cc}_B \circ \sigma = \sigma$, `right` checks
 * $\sigma \circ \mathrm{cc}_A = \sigma$ (`concurrent-game-system.md:179`).
 */
export function identityJudgment(sigma: Morphism, hand: "left" | "right" = "left"): IdentityJudgment {
  const composite = hand === "left" ? compose(sigma, copycat(sigma.target)) : compose(copycat(sigma.source), sigma);
  return morphismEqual(composite, sigma)
    ? Object.freeze({ kind: "computing.category.identity:witness" as const, morphism: sigma, hand })
    : Object.freeze({ kind: "computing.category.identity-obstruction" as const, morphism: sigma, hand, composite });
}

export interface AssociativityWitness {
  readonly kind: "computing.category.associativity:witness";
}
export interface AssociativityObstruction {
  readonly kind: "computing.category.associativity-obstruction";
  readonly left: Morphism;
  readonly right: Morphism;
}
export type AssociativityJudgment = AssociativityWitness | AssociativityObstruction;

/** Witness associativity $(\rho \circ \tau) \circ \sigma = \rho \circ (\tau \circ \sigma)$ up to canonical iso (`:177`). */
export function associativityJudgment(sigma: Morphism, tau: Morphism, rho: Morphism): AssociativityJudgment {
  const left = compose(sigma, compose(tau, rho));
  const right = compose(compose(sigma, tau), rho);
  return morphismEqual(left, right)
    ? Object.freeze({ kind: "computing.category.associativity:witness" as const })
    : Object.freeze({ kind: "computing.category.associativity-obstruction" as const, left, right });
}

/**
 * The structural validity of a morphism's strategy as a *concurrent* 1-cell of
 * $\mathbf{CGS}$: all plays valid, prefix-closed, receptive (Player may not
 * refuse Opponent), and symmetry-invariant. Crucially this does NOT require
 * *innocence/determinism* — "at most one P-move enabled after any history" is the
 * Hyland-Ong sequential restriction (a sub-system constraint earned in Phase 4),
 * not a law of the ambient category. A concurrent copycat on a multi-event arena
 * is a valid morphism though it is not innocent.
 */
export interface MorphismValidity {
  readonly kind: "computing.category.morphism.validity";
  readonly validPlays: boolean;
  readonly prefixClosed: boolean;
  readonly receptive: boolean;
  readonly symmetryInvariant: boolean;
  readonly valid: boolean;
}

export function morphismValidity(m: Morphism): MorphismValidity {
  const s = m.strategy;
  const validPlays = s.plays.every((p) => isValidPlay(s.arena, p));
  const prefixClosed = prefixClosedJudgment(s).kind === "game.strategy.prefixClosed:witness";
  const receptive = receptivityJudgment(s).kind === "game.strategy.receptivity:witness";
  const symmetryInvariant = symmetryInvarianceJudgment(s).kind === "game.strategy.symmetryInvariance:witness";
  return Object.freeze({
    kind: "computing.category.morphism.validity" as const,
    validPlays,
    prefixClosed,
    receptive,
    symmetryInvariant,
    valid: validPlays && prefixClosed && receptive && symmetryInvariant,
  });
}

/** Whether a morphism is a valid concurrent 1-cell (structural laws, determinism-agnostic). */
export const isValidMorphism = (m: Morphism): boolean => morphismValidity(m).valid;

/**
 * Whether a morphism is *innocent* (deterministic) — at most one Player move
 * enabled after any history. This is the Hyland-Ong sequential restriction; a
 * sequential strategy is innocent, a genuinely concurrent one need not be.
 */
export const isInnocentMorphism = (m: Morphism): boolean =>
  innocenceJudgment(m.strategy).kind === "game.strategy.innocence:witness";

export function isMorphism(value: unknown): value is Morphism {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Morphism>;
  return candidate.kind === "computing.category.morphism";
}
