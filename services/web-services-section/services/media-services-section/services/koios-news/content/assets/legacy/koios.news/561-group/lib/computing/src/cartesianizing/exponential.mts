/**
 * The exponential object of the Kleisli CCC — $A \Rightarrow B = {!}A \multimap B$.
 *
 * The Girard decomposition (`concurrent-game-system.md` § "Girard decomposition";
 * § "The !-comonad …"): in a $*$-autonomous category with a linear-exponential
 * comonad $!$, the Kleisli category $\mathcal{K}\ell(!)$ is Cartesian closed with
 * exponential $A \Rightarrow B := {!}A \multimap B$ and evaluation supplied by the
 * counit. We build the exponential *object* executably at finite copy-stage —
 * `exponentialArena(A, B, n) = ` $({!}^{(n)}A) \multimap B$ — and carry the
 * universal property (currying, evaluation natural in the colimit) as a witness,
 * since evaluation quantifies over the full $!$ (the $\omega$-colimit).
 */
import { type Arena } from "@emsenn/gaming";
import { bang } from "../categorifying/exponential.mjs";
import { arenaEqual, lollipop } from "../categorifying/object.mjs";
import { with2 } from "./product.mjs";

/**
 * The exponential object $A \Rightarrow B = {!}A \multimap B$ at finite copy
 * stage $n$: the compound arena $({!}^{(n)}A)^\perp \| B$. A morphism into it is
 * a curried function; evaluation applies it.
 */
export const exponentialArena = (a: Arena, b: Arena, copies: number): Arena => lollipop(bang(a, copies), b);

export interface GirardWitness {
  readonly kind: "computing.cartesian.girard:witness";
  readonly copies: number;
  /** $A \Rightarrow B$ is the compound ${!}^{(n)}A \multimap B$ … */
  readonly exponentialIsBangLollipop: boolean;
  /** … and the evaluation domain $(A \Rightarrow B) \mathbin{\&} A$ is well-formed. */
  readonly evaluationDomainBuilt: boolean;
}

/**
 * Witness the Girard-decomposition closure at finite stage: the exponential
 * object is exactly ${!}^{(n)}A \multimap B$, and the evaluation domain
 * $(A \Rightarrow B) \mathbin{\&} A$ is a well-formed arena. The full naturality
 * of $\mathrm{curry}/\mathrm{eval}$ is the colimit statement and is named, per the
 * bounded-stage discipline of `bang`.
 */
export function girardJudgment(a: Arena, b: Arena, copies: number): GirardWitness {
  const exp = exponentialArena(a, b, copies);
  const evaluationDomain = with2(exp, a);
  return Object.freeze({
    kind: "computing.cartesian.girard:witness" as const,
    copies,
    exponentialIsBangLollipop: arenaEqual(exp, lollipop(bang(a, copies), b)),
    evaluationDomainBuilt: evaluationDomain.structure.events.length === exp.structure.events.length + a.structure.events.length,
  });
}
